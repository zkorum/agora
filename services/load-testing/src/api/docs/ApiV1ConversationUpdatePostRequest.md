# ApiV1ConversationUpdatePostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationSlugId** | **string** |  | [default to undefined]
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**conversationBodyPlainText** | **string** |  | [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**participationMode** | **string** |  | [default to undefined]
**multilingualSetting** | [**ApiV1ConversationCreatePostRequestMultilingualSetting**](ApiV1ConversationCreatePostRequestMultilingualSetting.md) |  | [default to undefined]
**languageSettingsSource** | **string** |  | [optional] [default to LanguageSettingsSourceEnum_ConversationOverride]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**aiLabelingEnabled** | **boolean** |  | [optional] [default to undefined]
**preferredOpinionGroupCount** | **number** |  | [optional] [default to undefined]
**surveyConfig** | [**ApiV1ConversationCreatePostRequestSurveyConfig**](ApiV1ConversationCreatePostRequestSurveyConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationUpdatePostRequest } from './api';

const instance: ApiV1ConversationUpdatePostRequest = {
    conversationSlugId,
    conversationTitle,
    conversationBody,
    conversationBodyPlainText,
    isIndexed,
    participationMode,
    multilingualSetting,
    languageSettingsSource,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
    surveyConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
