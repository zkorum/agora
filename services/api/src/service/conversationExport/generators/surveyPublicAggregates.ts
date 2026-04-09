import { buildCsvBuffer } from "./csv.js";
import type {
    CsvGenerator,
    CsvGeneratorResult,
    GeneratorParams,
} from "./base.js";
import {
    buildSurveyAggregateCsvRows,
    loadSurveyExportContext,
} from "./surveyShared.js";
import { surveyAggregateHeaders } from "./surveyHeaders.js";

export const surveyPublicAggregatesGenerator: CsvGenerator = {
    fileType: "survey_public_aggregates",
    minimumAccessLevel: "public",
    async generate(params: GeneratorParams): Promise<CsvGeneratorResult> {
        const context = await loadSurveyExportContext(params);
        const rows = buildSurveyAggregateCsvRows({
            context,
            includeSuppression: true,
        }).map((row) => ({
            scope: row.scope,
            "cluster-id": row.clusterId,
            "cluster-label": row.clusterLabel,
            "question-id": row.questionId,
            "option-id": row.optionId,
            count: row.count ?? "",
            percentage: row.percentage ?? "",
            "is-suppressed": row.isSuppressed,
            "suppression-reason": row.suppressionReason ?? "",
        }));
        const csvBuffer = await buildCsvBuffer({
            headers: surveyAggregateHeaders,
            rows,
        });

        return {
            csvBuffer,
            recordCount: rows.length,
        };
    },
};
