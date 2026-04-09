# ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**questionSlugId** | **string** |  | [optional] [default to undefined]
**questionType** | **string** |  | [default to undefined]
**questionText** | **string** |  | [default to undefined]
**isRequired** | **boolean** |  | [default to undefined]
**displayOrder** | **number** |  | [default to undefined]
**constraints** | [**ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerConstraints**](ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerConstraints.md) |  | [default to undefined]
**_options** | [**Array&lt;ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOptionsInner&gt;**](ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInnerOptionsInner.md) |  | [optional] [default to undefined]
**textChangeIsSemantic** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner } from './api';

const instance: ApiV1ConversationCreatePostRequestSurveyConfigQuestionsInner = {
    questionSlugId,
    questionType,
    questionText,
    isRequired,
    displayOrder,
    constraints,
    _options,
    textChangeIsSemantic,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
