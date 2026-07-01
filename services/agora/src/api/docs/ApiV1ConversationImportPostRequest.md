# ApiV1ConversationImportPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**polisUrl** | **string** |  | [default to undefined]
**projectSlug** | **string** |  | [optional] [default to undefined]
**languageSettingsSource** | **string** |  | [optional] [default to LanguageSettingsSourceEnum_ConversationOverride]
**postAsOrganization** | **string** |  | [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**participationMode** | **string** |  | [default to undefined]
**multilingualSetting** | [**ApiV1ConversationImportPostRequestMultilingualSetting**](ApiV1ConversationImportPostRequestMultilingualSetting.md) |  | [optional] [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**aiLabelingEnabled** | **boolean** |  | [optional] [default to true]
**preferredOpinionGroupCount** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationImportPostRequest } from './api';

const instance: ApiV1ConversationImportPostRequest = {
    polisUrl,
    projectSlug,
    languageSettingsSource,
    postAsOrganization,
    isIndexed,
    participationMode,
    multilingualSetting,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
