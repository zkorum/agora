import type {
  SurveyFormFetchResponse,
  SurveyStatusCheckResponse,
} from "src/shared/types/dto";

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
  surveyForm: SurveyFormFetchResponse | undefined;
}): SurveyFormFetchResponse | undefined {
  if (!shouldFetchSurveyForm({ surveyStatus })) {
    return undefined;
  }

  return surveyForm;
}
