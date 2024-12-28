import { moderationTable, postTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import type { ModerationAction, ModerationReason } from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";

interface SubmitModerationReportProps {
    postSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: ModerationAction;
    moderationReason: ModerationReason;
    moderationExplanation: string;
    userId: string;
}

export async function moderateByPostSlugId({
    postSlugId,
    db,
    moderationReason,
    userId,
    moderationExplanation,
    moderationAction,
}: SubmitModerationReportProps) {
    const { getPostAndContentIdFromSlugId } = useCommonPost();
    const postDetails = await getPostAndContentIdFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    await db.transaction(async (tx) => {
        await tx.insert(moderationTable).values({
            postId: postDetails.id,
            moderatorId: userId,
            moderationAction: moderationAction,
            moderationReason: moderationReason,
            moderationExplanation: moderationExplanation,
        });

        await tx
            .update(postTable)
            .set({
                isLocked: true,
            })
            .where(eq(postTable.id, postDetails.id));
    });
}
