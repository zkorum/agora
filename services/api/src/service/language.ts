import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import {
    userSpokenLanguagesTable,
    userDisplayLanguageTable,
} from "@/shared-backend/schema.js";
import {
    ZodSupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
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
        const spokenLanguagesResult = await tx
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

        if (spokenLanguagesResult.length > 0) {
            // User has existing preferences, use them
            spokenLanguages = spokenLanguagesResult.map(
                (row) => row.languageCode,
            );
        } else {
            // No preferences exist, save the display language as default and use it
            const defaultLanguageCode = request.currentDisplayLanguage;

            // Validate the display language is a valid spoken language using zod
            const spokenLanguageValidation =
                ZodSupportedSpokenLanguageCodes.safeParse(defaultLanguageCode);
            if (!spokenLanguageValidation.success) {
                throw httpErrors.internalServerError(
                    `Invalid display language: ${defaultLanguageCode}`,
                );
            }

            // Validate length constraint to match database varchar(35)
            if (defaultLanguageCode.length > 35) {
                throw httpErrors.internalServerError(
                    `Language code too long: ${defaultLanguageCode} (max 35 characters)`,
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

        // Get display language (excluding soft-deleted ones)
        const displayLanguageResult = await tx
            .select({
                languageCode: userDisplayLanguageTable.languageCode,
            })
            .from(userDisplayLanguageTable)
            .where(
                and(
                    eq(userDisplayLanguageTable.userId, userId),
                    eq(userDisplayLanguageTable.isDeleted, false),
                ),
            )
            .limit(1);

        let displayLanguage: string;

        if (displayLanguageResult.length > 0) {
            // User has existing display language preference, use it
            displayLanguage = displayLanguageResult[0].languageCode;
        } else {
            // No display language preference exists, save the current display language as default
            const defaultDisplayLanguage = request.currentDisplayLanguage;

            // Validate the display language using zod
            const displayLanguageValidation =
                ZodSupportedDisplayLanguageCodes.safeParse(
                    defaultDisplayLanguage,
                );
            if (!displayLanguageValidation.success) {
                throw httpErrors.internalServerError(
                    `Invalid display language: ${defaultDisplayLanguage}`,
                );
            }

            // Validate length constraint to match database varchar(35)
            if (defaultDisplayLanguage.length > 35) {
                throw httpErrors.internalServerError(
                    `Language code too long: ${defaultDisplayLanguage} (max 35 characters)`,
                );
            }

            // Save the display language preference
            await tx.insert(userDisplayLanguageTable).values({
                userId,
                languageCode: defaultDisplayLanguage,
                createdAt: new Date(),
            });

            displayLanguage = defaultDisplayLanguage;
        }

        // Validate all spoken language values from DB using zod
        const validSpokenLanguageList = spokenLanguages.map((value) => {
            const validation = ZodSupportedSpokenLanguageCodes.safeParse(value);
            if (!validation.success) {
                throw httpErrors.internalServerError(
                    `Invalid spoken language in database: ${value}`,
                );
            }
            return validation.data;
        });

        // Validate display language from DB using zod
        const displayLanguageValidation =
            ZodSupportedDisplayLanguageCodes.safeParse(displayLanguage);
        if (!displayLanguageValidation.success) {
            throw httpErrors.internalServerError(
                `Invalid display language in database: ${displayLanguage}`,
            );
        }

        return {
            spokenLanguages: validSpokenLanguageList,
            displayLanguage: displayLanguageValidation.data,
        };
    });
}

interface UpdateLanguagePreferencesOptions {
    db: PostgresDatabase;
    userId: string;
    preferences: UpdateLanguagePreferencesRequest;
}

/**
 * Get user's display language from database, or fall back to a provided default
 * @param db - Database instance
 * @param userId - User ID to fetch display language for
 * @param defaultLanguage - Fallback language if user has no preference (default: "en")
 * @returns Display language code
 */
export async function getUserDisplayLanguage(
    db: PostgresDatabase,
    userId: string,
    defaultLanguage = "en",
): Promise<string> {
    const displayLanguageResult = await db
        .select({
            languageCode: userDisplayLanguageTable.languageCode,
        })
        .from(userDisplayLanguageTable)
        .where(
            and(
                eq(userDisplayLanguageTable.userId, userId),
                eq(userDisplayLanguageTable.isDeleted, false),
            ),
        )
        .limit(1);

    if (displayLanguageResult.length > 0) {
        return displayLanguageResult[0].languageCode;
    }

    return defaultLanguage;
}

export async function updateLanguagePreferences({
    db,
    userId,
    preferences,
}: UpdateLanguagePreferencesOptions): Promise<void> {
    // Start a transaction to ensure atomicity
    await db.transaction(async (tx) => {
        // Update spoken languages if provided
        if (preferences.spokenLanguages !== undefined) {
            // Validate all language codes using zod
            for (const langCode of preferences.spokenLanguages) {
                const validation =
                    ZodSupportedSpokenLanguageCodes.safeParse(langCode);
                if (!validation.success) {
                    throw httpErrors.internalServerError(
                        `Invalid spoken language code: ${langCode}`,
                    );
                }

                // Validate length constraint to match database varchar(35)
                if (langCode.length > 35) {
                    throw httpErrors.internalServerError(
                        `Language code too long: ${langCode} (max 35 characters)`,
                    );
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

            // For each new spoken language, check if a soft-deleted record exists
            for (const languageCode of preferences.spokenLanguages) {
                // Check if a soft-deleted record exists for this language
                const existingDeletedRecord = await tx
                    .select({ id: userSpokenLanguagesTable.id })
                    .from(userSpokenLanguagesTable)
                    .where(
                        and(
                            eq(userSpokenLanguagesTable.userId, userId),
                            eq(
                                userSpokenLanguagesTable.languageCode,
                                languageCode,
                            ),
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
        }

        // Update display language if provided
        if (preferences.displayLanguage !== undefined) {
            // Validate display language code using zod
            const validation = ZodSupportedDisplayLanguageCodes.safeParse(
                preferences.displayLanguage,
            );
            if (!validation.success) {
                throw httpErrors.internalServerError(
                    `Invalid display language code: ${preferences.displayLanguage}`,
                );
            }

            // Validate length constraint to match database varchar(35)
            if (preferences.displayLanguage.length > 35) {
                throw httpErrors.internalServerError(
                    `Language code too long: ${preferences.displayLanguage} (max 35 characters)`,
                );
            }

            // Soft delete existing active display language
            await tx
                .update(userDisplayLanguageTable)
                .set({
                    isDeleted: true,
                    deletedAt: new Date(),
                })
                .where(
                    and(
                        eq(userDisplayLanguageTable.userId, userId),
                        eq(userDisplayLanguageTable.isDeleted, false),
                    ),
                );

            // Check if a soft-deleted record exists for this display language
            const existingDeletedDisplayRecord = await tx
                .select({ id: userDisplayLanguageTable.id })
                .from(userDisplayLanguageTable)
                .where(
                    and(
                        eq(userDisplayLanguageTable.userId, userId),
                        eq(
                            userDisplayLanguageTable.languageCode,
                            preferences.displayLanguage,
                        ),
                        eq(userDisplayLanguageTable.isDeleted, true),
                    ),
                )
                .limit(1);

            if (existingDeletedDisplayRecord.length > 0) {
                // Reactivate the soft-deleted record
                await tx
                    .update(userDisplayLanguageTable)
                    .set({
                        isDeleted: false,
                        deletedAt: null,
                        createdAt: new Date(),
                    })
                    .where(
                        eq(
                            userDisplayLanguageTable.id,
                            existingDeletedDisplayRecord[0].id,
                        ),
                    );
            } else {
                // Insert new record
                await tx.insert(userDisplayLanguageTable).values({
                    userId,
                    languageCode: preferences.displayLanguage,
                    createdAt: new Date(),
                });
            }
        }
    });
}
