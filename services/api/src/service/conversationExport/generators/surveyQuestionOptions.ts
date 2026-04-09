import { buildCsvBuffer } from "./csv.js";
import type {
    CsvGenerator,
    CsvGeneratorResult,
    GeneratorParams,
} from "./base.js";
import { surveyQuestionOptionHeaders } from "./surveyHeaders.js";
import {
    buildSurveyQuestionOptionRows,
    loadSurveyExportContext,
} from "./surveyShared.js";

export const surveyQuestionOptionsGenerator: CsvGenerator = {
    fileType: "survey_question_options",
    minimumAccessLevel: "public",
    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const context = await loadSurveyExportContext(params);
        const rows = buildSurveyQuestionOptionRows({ context });
        const csvBuffer = await buildCsvBuffer({
            headers: surveyQuestionOptionHeaders,
            rows,
        });

        return {
            csvBuffer,
            recordCount: rows.length,
        };
    },
};
