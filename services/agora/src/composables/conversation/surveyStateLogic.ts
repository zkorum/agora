import type { SurveyStatusCheckResponse } from "src/shared/types/dto";
import type { SurveyFormData } from "src/utils/api/survey/useSurveyQueries";

export function shouldFetchSurveyForm({
  surveyStatus,
}: {
  surveyStatus: SurveyStatusCheckResponse | undefined;
}): boolean {
  return surveyStatus?.surveyGate.hasSurvey === true;
}

export function resolveSurveyForm({
  surveyStatus,
  surveyForm,
}: {
  surveyStatus: SurveyStatusCheckResponse | undefined;
  surveyForm: SurveyFormData | undefined;
}): SurveyFormData | undefined {
  if (!shouldFetchSurveyForm({ surveyStatus })) {
    return undefined;
  }

  return surveyForm;
}
