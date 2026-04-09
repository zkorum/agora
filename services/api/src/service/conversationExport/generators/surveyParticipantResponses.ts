import { buildCsvBuffer } from "./csv.js";
import type {
    CsvGenerator,
    CsvGeneratorResult,
    GeneratorParams,
} from "./base.js";
import { buildSurveyParticipantResponseRows, loadSurveyExportContext } from "./surveyShared.js";
import { surveyParticipantResponseHeaders } from "./surveyHeaders.js";

export const surveyParticipantResponsesGenerator: CsvGenerator = {
    fileType: "survey_participant_responses",
    minimumAccessLevel: "owner",
    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const context = await loadSurveyExportContext(params);
        const rows = buildSurveyParticipantResponseRows({
            context,
            participantMap: params.participantMap,
        });
        const csvBuffer = await buildCsvBuffer({
            headers: surveyParticipantResponseHeaders,
            rows,
        });

        return {
            csvBuffer,
            recordCount: rows.length,
        };
    },
};
