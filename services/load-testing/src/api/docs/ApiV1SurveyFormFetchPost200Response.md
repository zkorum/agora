# ApiV1SurveyFormFetchPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**currentRevision** | **number** |  | [default to undefined]
**questions** | [**Array&lt;ApiV1SurveyFormFetchPost200ResponseOneOfQuestionsInner&gt;**](ApiV1SurveyFormFetchPost200ResponseOneOfQuestionsInner.md) |  | [default to undefined]
**surveyGate** | [**ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerInteractionSurveyGate**](ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerInteractionSurveyGate.md) |  | [default to undefined]
**reason** | **string** |  | [default to undefined]

## Example

```typescript
import { ApiV1SurveyFormFetchPost200Response } from './api';

const instance: ApiV1SurveyFormFetchPost200Response = {
    success,
    currentRevision,
    questions,
    surveyGate,
    reason,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
