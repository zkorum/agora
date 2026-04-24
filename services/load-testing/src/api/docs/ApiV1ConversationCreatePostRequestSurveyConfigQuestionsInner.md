# ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner


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
**constraints** | [**ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOneOf1Constraints**](ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOneOf1Constraints.md) |  | [default to undefined]

## Example

```typescript
import { ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner } from './api';

const instance: ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner = {
    questionSlugId,
    questionText,
    isRequired,
    displayOrder,
    textChangeIsSemantic,
    choiceDisplay,
    _options,
    questionType,
    constraints,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
