# ApiV1ConversationCreatePostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**conversationBodyPlainText** | **string** |  | [default to undefined]
**postAsOrganization** | **string** |  | [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**participationMode** | **string** |  | [default to undefined]
**conversationType** | **string** |  | [default to undefined]
**languageSetting** | [**ApiV1ConversationCreatePostRequestLanguageSetting**](ApiV1ConversationCreatePostRequestLanguageSetting.md) |  | [default to undefined]
**multilingualSetting** | [**ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerMetadataMultilingualSetting**](ApiV1ConversationFetchRecentPost200ResponseConversationDataListInnerMetadataMultilingualSetting.md) |  | [default to undefined]
**seedOpinionList** | **Array&lt;string&gt;** |  | [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**aiLabelingEnabled** | **boolean** |  | [optional] [default to true]
**preferredOpinionGroupCount** | **number** |  | [optional] [default to undefined]
**externalSourceConfig** | [**ApiV1ConversationCreatePostRequestExternalSourceConfig**](ApiV1ConversationCreatePostRequestExternalSourceConfig.md) |  | [optional] [default to undefined]
**surveyConfig** | [**ApiV1ConversationCreatePostRequestSurveyConfig**](ApiV1ConversationCreatePostRequestSurveyConfig.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationCreatePostRequest } from './api';

const instance: ApiV1ConversationCreatePostRequest = {
    conversationTitle,
    conversationBody,
    conversationBodyPlainText,
    postAsOrganization,
    isIndexed,
    participationMode,
    conversationType,
    languageSetting,
    multilingualSetting,
    seedOpinionList,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
    externalSourceConfig,
    surveyConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
