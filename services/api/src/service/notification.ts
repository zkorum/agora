import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

interface GetUserNotificationsProps {
    db: PostgresJsDatabase;
    userId: string;
}

export function getUserNotifications({
    db,
    userId,
}: GetUserNotificationsProps) {
    console.log(db);
    console.log(userId);
}
