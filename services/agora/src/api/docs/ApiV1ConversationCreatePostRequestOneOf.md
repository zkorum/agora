# ApiV1ConversationCreatePostRequestOneOf


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**conversationBodyPlainText** | **string** |  | [default to undefined]
**projectSlug** | **string** |  | [optional] [default to undefined]
**languageSettingsSource** | **string** |  | [optional] [default to LanguageSettingsSourceEnum_ConversationOverride]
**postAsOrganization** | **string** |  | [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**participationMode** | **string** |  | [default to undefined]
**multilingualSetting** | [**ApiV1ConversationCreatePostRequestOneOfMultilingualSetting**](ApiV1ConversationCreatePostRequestOneOfMultilingualSetting.md) |  | [default to undefined]
**seedOpinionList** | **Array&lt;string&gt;** |  | [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**conversationType** | **string** |  | [default to undefined]
**aiLabelingEnabled** | **boolean** |  | [optional] [default to true]
**preferredOpinionGroupCount** | **number** |  | [optional] [default to undefined]
**surveyConfig** | [**ApiV1ConversationCreatePostRequestOneOfSurveyConfig**](ApiV1ConversationCreatePostRequestOneOfSurveyConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationCreatePostRequestOneOf } from './api';

const instance: ApiV1ConversationCreatePostRequestOneOf = {
    conversationTitle,
    conversationBody,
    conversationBodyPlainText,
    projectSlug,
    languageSettingsSource,
    postAsOrganization,
    isIndexed,
    participationMode,
    multilingualSetting,
    seedOpinionList,
    requiresEventTicket,
    conversationType,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
    surveyConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
