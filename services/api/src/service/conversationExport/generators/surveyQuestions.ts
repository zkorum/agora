import { buildCsvBuffer } from "./csv.js";
import type {
    CsvGenerator,
    CsvGeneratorResult,
    GeneratorParams,
} from "./base.js";
import { surveyQuestionHeaders } from "./surveyHeaders.js";
import { buildSurveyQuestionRows, loadSurveyExportContext } from "./surveyShared.js";

export const surveyQuestionsGenerator: CsvGenerator = {
    fileType: "survey_questions",
    minimumAccessLevel: "public",
    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const context = await loadSurveyExportContext(params);
        const rows = buildSurveyQuestionRows({ context });
        const csvBuffer = await buildCsvBuffer({
            headers: surveyQuestionHeaders,
            rows,
        });

        return {
            csvBuffer,
            recordCount: rows.length,
        };
    },
};
