import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import {
    userDisplayLanguageTable,
    userSpokenLanguagesTable,
} from "../schema.js";
import {
    isValidDisplayLanguageCode,
    isValidLanguageCode,
    toSupportedSpokenLanguageCode,
    toSupportedDisplayLanguageCode,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type {
    GetLanguagePreferencesResponse,
    UpdateLanguagePreferencesRequest,
} from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";

interface GetLanguagePreferencesOptions {
    db: PostgresDatabase;
    userId: string;
}

export async function getLanguagePreferences({
    db,
    userId,
}: GetLanguagePreferencesOptions): Promise<GetLanguagePreferencesResponse> {
    // Get display language
    const displayLangResult = await db
        .select({
            languageCode: userDisplayLanguageTable.languageCode,
        })
        .from(userDisplayLanguageTable)
        .where(eq(userDisplayLanguageTable.userId, userId))
        .limit(1);

    // Get spoken languages
    const spokenLangsResult = await db
        .select({
            languageCode: userSpokenLanguagesTable.languageCode,
        })
        .from(userSpokenLanguagesTable)
        .where(eq(userSpokenLanguagesTable.userId, userId));

    const displayLanguage = displayLangResult[0]?.languageCode ?? "en";
    const spokenLanguages =
        spokenLangsResult.length > 0
            ? spokenLangsResult.map((row) => row.languageCode)
            : [displayLanguage]; // Default to display language if no spoken languages set

    const validDisplayLanguage =
        toSupportedDisplayLanguageCode(displayLanguage);
    if (validDisplayLanguage == undefined) {
        throw httpErrors.internalServerError(
            `Invalid display language: ${displayLanguage}`,
        );
    }

    const validSpokenLanguageList = spokenLanguages.map((value) => {
        const validLanguage = toSupportedSpokenLanguageCode(value);
        if (validLanguage === undefined) {
            throw httpErrors.internalServerError(
                `Invalid spoken language: ${value}`,
            );
        }
        return validLanguage;
    });

    return {
        displayLanguage: validDisplayLanguage,
        spokenLanguages: validSpokenLanguageList,
    };
}

interface UpdateLanguagePreferencesOptions {
    db: PostgresDatabase;
    userId: string;
    preferences: UpdateLanguagePreferencesRequest;
}

export async function updateLanguagePreferences({
    db,
    userId,
    preferences,
}: UpdateLanguagePreferencesOptions): Promise<void> {
    // Start a transaction to ensure atomicity
    await db.transaction(async (tx) => {
        // Update display language if provided
        if (preferences.displayLanguage !== undefined) {
            if (!isValidDisplayLanguageCode(preferences.displayLanguage)) {
                throw new Error(
                    `Invalid display language code: ${preferences.displayLanguage}`,
                );
            }

            // Delete existing display language preference
            await tx
                .delete(userDisplayLanguageTable)
                .where(eq(userDisplayLanguageTable.userId, userId));

            // Insert new display language preference
            await tx.insert(userDisplayLanguageTable).values({
                userId,
                languageCode: preferences.displayLanguage,
                updatedAt: new Date(),
            });
        }

        // Update spoken languages if provided
        if (
            preferences.spokenLanguages !== undefined &&
            preferences.spokenLanguages.length > 0
        ) {
            // Validate all language codes
            for (const langCode of preferences.spokenLanguages) {
                if (!isValidLanguageCode(langCode)) {
                    throw new Error(`Invalid language code: ${langCode}`);
                }
            }

            // Delete existing spoken languages
            await tx
                .delete(userSpokenLanguagesTable)
                .where(eq(userSpokenLanguagesTable.userId, userId));

            // Insert new spoken languages
            const spokenLanguageValues = preferences.spokenLanguages.map(
                (languageCode) => ({
                    userId,
                    languageCode,
                    createdAt: new Date(),
                }),
            );

            if (spokenLanguageValues.length > 0) {
                await tx
                    .insert(userSpokenLanguagesTable)
                    .values(spokenLanguageValues);
            }
        }
    });
}

interface InitializeLanguagePreferencesOptions {
    db: PostgresDatabase;
    userId: string;
    displayLanguage?: SupportedDisplayLanguageCodes;
    spokenLanguages?: SupportedSpokenLanguageCodes[];
}

/**
 * Initialize language preferences for a new user
 * Called during user registration
 */
export async function initializeLanguagePreferences({
    db,
    userId,
    displayLanguage = "en",
    spokenLanguages,
}: InitializeLanguagePreferencesOptions): Promise<void> {
    const finalSpokenLanguages =
        spokenLanguages && spokenLanguages.length > 0
            ? spokenLanguages
            : [displayLanguage];

    await db.transaction(async (tx) => {
        // Set display language
        await tx
            .insert(userDisplayLanguageTable)
            .values({
                userId,
                languageCode: displayLanguage,
                updatedAt: new Date(),
            })
            .onConflictDoNothing(); // In case it already exists

        // Set spoken languages
        const spokenLanguageValues = finalSpokenLanguages.map(
            (languageCode) => ({
                userId,
                languageCode,
                createdAt: new Date(),
            }),
        );

        if (spokenLanguageValues.length > 0) {
            await tx
                .insert(userSpokenLanguagesTable)
                .values(spokenLanguageValues)
                .onConflictDoNothing(); // In case they already exist
        }
    });
}
