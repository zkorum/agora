import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import { userSpokenLanguagesTable } from "../schema.js";
import {
    isValidLanguageCode,
    toSupportedSpokenLanguageCode,
} from "@/shared/languages.js";
import type {
    GetLanguagePreferencesRequest,
    GetLanguagePreferencesResponse,
    UpdateLanguagePreferencesRequest,
} from "@/shared/types/dto.js";
import { httpErrors } from "@fastify/sensible";

interface GetLanguagePreferencesOptions {
    db: PostgresDatabase;
    userId: string;
    request: GetLanguagePreferencesRequest;
}

export async function getLanguagePreferences({
    db,
    userId,
    request,
}: GetLanguagePreferencesOptions): Promise<GetLanguagePreferencesResponse> {
    // Use a transaction to ensure consistency between read and potential write
    return await db.transaction(async (tx) => {
        // Get spoken languages (excluding soft-deleted ones)
        const spokenLangsResult = await tx
            .select({
                languageCode: userSpokenLanguagesTable.languageCode,
            })
            .from(userSpokenLanguagesTable)
            .where(
                and(
                    eq(userSpokenLanguagesTable.userId, userId),
                    eq(userSpokenLanguagesTable.isDeleted, false),
                ),
            );

        let spokenLanguages: string[];

        if (spokenLangsResult.length > 0) {
            // User has existing preferences, use them
            spokenLanguages = spokenLangsResult.map((row) => row.languageCode);
        } else {
            // No preferences exist, save the display language as default and use it
            const defaultLanguageCode = request.currentDisplayLanguage;

            // Validate the display language is a valid spoken language
            const validDisplayLanguage =
                toSupportedSpokenLanguageCode(defaultLanguageCode);
            if (validDisplayLanguage === undefined) {
                throw httpErrors.internalServerError(
                    `Invalid display language: ${defaultLanguageCode}`,
                );
            }

            // Save the display language as the user's spoken language preference
            await tx.insert(userSpokenLanguagesTable).values({
                userId,
                languageCode: defaultLanguageCode,
                createdAt: new Date(),
            });

            spokenLanguages = [defaultLanguageCode];
        }

        // Reparse to make sure the values from DB are correct
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
            spokenLanguages: validSpokenLanguageList,
        };
    });
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
        // Update spoken languages (now required)
        // Validate all language codes
        for (const langCode of preferences.spokenLanguages) {
            if (!isValidLanguageCode(langCode)) {
                throw new Error(`Invalid language code: ${langCode}`);
            }
        }

        // Soft delete existing active spoken languages
        await tx
            .update(userSpokenLanguagesTable)
            .set({
                isDeleted: true,
                deletedAt: new Date(),
            })
            .where(
                and(
                    eq(userSpokenLanguagesTable.userId, userId),
                    eq(userSpokenLanguagesTable.isDeleted, false),
                ),
            );

        // For each new language, check if a soft-deleted record exists
        for (const languageCode of preferences.spokenLanguages) {
            // Check if a soft-deleted record exists for this language
            const existingDeletedRecord = await tx
                .select({ id: userSpokenLanguagesTable.id })
                .from(userSpokenLanguagesTable)
                .where(
                    and(
                        eq(userSpokenLanguagesTable.userId, userId),
                        eq(userSpokenLanguagesTable.languageCode, languageCode),
                        eq(userSpokenLanguagesTable.isDeleted, true),
                    ),
                )
                .limit(1);

            if (existingDeletedRecord.length > 0) {
                // Reactivate the soft-deleted record
                await tx
                    .update(userSpokenLanguagesTable)
                    .set({
                        isDeleted: false,
                        deletedAt: null,
                        createdAt: new Date(),
                    })
                    .where(
                        eq(
                            userSpokenLanguagesTable.id,
                            existingDeletedRecord[0].id,
                        ),
                    );
            } else {
                // Insert new record
                await tx.insert(userSpokenLanguagesTable).values({
                    userId,
                    languageCode,
                    createdAt: new Date(),
                });
            }
        }
    });
}
