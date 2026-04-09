export interface ExportParticipantMap {
    getOrCreateExportParticipantId(params: { userId: string }): number;
}

export function createExportParticipantMap(): ExportParticipantMap {
    const exportParticipantIdsByUserId = new Map<string, number>();
    let nextExportParticipantId = 0;

    return {
        getOrCreateExportParticipantId({ userId }): number {
            const existingExportParticipantId =
                exportParticipantIdsByUserId.get(userId);
            if (existingExportParticipantId !== undefined) {
                return existingExportParticipantId;
            }

            const exportParticipantId = nextExportParticipantId;
            nextExportParticipantId += 1;
            exportParticipantIdsByUserId.set(userId, exportParticipantId);
            return exportParticipantId;
        },
    };
}
