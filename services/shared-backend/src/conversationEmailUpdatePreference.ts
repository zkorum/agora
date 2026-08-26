import { eq, isNull, lte, sql, type SQL } from "drizzle-orm";
import {
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserGlobalSettingTable,
    conversationEmailUpdateUserProjectPreferenceTable,
} from "./schema.js";
import type { ConversationEmailUpdatePreferenceScope } from "./conversationEmailUpdatePreferencePolicy.js";

export {
    resolveConversationEmailPreference,
    resolveConversationEmailPreferenceChoice,
} from "./conversationEmailUpdatePreferencePolicy.js";
export type { ConversationEmailUpdatePreferenceScope } from "./conversationEmailUpdatePreferencePolicy.js";

type SqlConditions = [SQL, ...SQL[]];

function sqlAnd(conditions: SqlConditions): SQL {
    return sql`(${sql.join(conditions, sql` AND `)})`;
}

function sqlOr(conditions: SqlConditions): SQL {
    return sql`(${sql.join(conditions, sql` OR `)})`;
}

export function buildConversationEmailGlobalPreferenceCondition({
    choiceAtOrBefore,
}: {
    choiceAtOrBefore?: Date;
}): SQL {
    const currentlyEnabled = isNull(
        conversationEmailUpdateUserGlobalSettingTable.pausedAt,
    );
    if (choiceAtOrBefore === undefined) return currentlyEnabled;

    return sqlAnd([
        currentlyEnabled,
        sqlOr([
            isNull(conversationEmailUpdateUserGlobalSettingTable.userId),
            lte(
                conversationEmailUpdateUserGlobalSettingTable.updatedAt,
                choiceAtOrBefore,
            ),
        ]),
    ]);
}

export function buildConversationEmailPreferenceCondition({
    preferenceScope,
    choiceAtOrBefore,
}: {
    preferenceScope: ConversationEmailUpdatePreferenceScope;
    choiceAtOrBefore?: Date;
}): SQL {
    const conversationPreferenceEnabled = eq(
        conversationEmailUpdateUserConversationPreferenceTable.enabled,
        true,
    );
    const conversationEnabled =
        choiceAtOrBefore === undefined
            ? conversationPreferenceEnabled
            : sqlAnd([
                  conversationPreferenceEnabled,
                  lte(
                      conversationEmailUpdateUserConversationPreferenceTable.choiceAt,
                      choiceAtOrBefore,
                  ),
              ]);
    if (preferenceScope === "conversation") return conversationEnabled;

    return sqlOr([
        conversationEnabled,
        choiceAtOrBefore === undefined
            ? sqlAnd([
                  isNull(
                      conversationEmailUpdateUserConversationPreferenceTable.userId,
                  ),
                  eq(
                      conversationEmailUpdateUserProjectPreferenceTable.enabled,
                      true,
                  ),
              ])
            : sqlAnd([
                  isNull(
                      conversationEmailUpdateUserConversationPreferenceTable.userId,
                  ),
                  eq(
                      conversationEmailUpdateUserProjectPreferenceTable.enabled,
                      true,
                  ),
                  lte(
                      conversationEmailUpdateUserProjectPreferenceTable.choiceAt,
                      choiceAtOrBefore,
                  ),
              ]),
    ]);
}
