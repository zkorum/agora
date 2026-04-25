# ApiV1SurveyFormFetchPost200ResponseQuestionsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**questionSlugId** | **string** |  | [optional] [default to undefined]
**questionText** | **string** |  | [default to undefined]
**isRequired** | **boolean** |  | [default to undefined]
**displayOrder** | **number** |  | [default to undefined]
**textChangeIsSemantic** | **boolean** |  | [optional] [default to undefined]
**choiceDisplay** | **string** |  | [default to undefined]
**_options** | [**Array&lt;ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOneOfOptionsInner&gt;**](ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOneOfOptionsInner.md) |  | [default to undefined]
**questionType** | **string** |  | [default to undefined]
**constraints** | [**ApiV1ConversationGetForEditPost200ResponseOneOfSurveyConfigQuestionsInnerOneOfConstraints**](ApiV1ConversationGetForEditPost200ResponseOneOfSurveyConfigQuestionsInnerOneOfConstraints.md) |  | [default to undefined]
**currentAnswer** | [**ApiV1SurveyFormFetchPost200ResponseQuestionsInnerOneOfCurrentAnswer**](ApiV1SurveyFormFetchPost200ResponseQuestionsInnerOneOfCurrentAnswer.md) |  | [optional] [default to undefined]
**isPassed** | **boolean** |  | [default to undefined]
**isMissingRequired** | **boolean** |  | [default to undefined]
**isStale** | **boolean** |  | [default to undefined]
**isCurrentAnswerValid** | **boolean** |  | [default to undefined]
**currentSemanticVersion** | **number** |  | [default to undefined]
**answeredQuestionSemanticVersion** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1SurveyFormFetchPost200ResponseQuestionsInner } from './api';

const instance: ApiV1SurveyFormFetchPost200ResponseQuestionsInner = {
    questionSlugId,
    questionText,
    isRequired,
    displayOrder,
    textChangeIsSemantic,
    choiceDisplay,
    _options,
    questionType,
    constraints,
    currentAnswer,
    isPassed,
    isMissingRequired,
    isStale,
    isCurrentAnswerValid,
    currentSemanticVersion,
    answeredQuestionSemanticVersion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
