# ApiV1ConversationGetForEditPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**conversationSlugId** | **string** |  | [default to undefined]
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**participationMode** | **string** |  | [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**aiLabelingEnabled** | **boolean** |  | [default to undefined]
**preferredOpinionGroupCount** | **number** |  | [default to undefined]
**postAsOrganizationName** | **string** |  | [optional] [default to undefined]
**surveyConfig** | [**ApiV1ConversationGetForEditPost200ResponseOneOfSurveyConfig**](ApiV1ConversationGetForEditPost200ResponseOneOfSurveyConfig.md) |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]
**isLocked** | **boolean** |  | [default to undefined]
**editPermissions** | [**ApiV1ConversationGetForEditPost200ResponseOneOfEditPermissions**](ApiV1ConversationGetForEditPost200ResponseOneOfEditPermissions.md) |  | [default to undefined]
**reason** | **string** |  | [default to undefined]

## Example

```typescript
import { ApiV1ConversationGetForEditPost200Response } from './api';

const instance: ApiV1ConversationGetForEditPost200Response = {
    success,
    conversationSlugId,
    conversationTitle,
    conversationBody,
    isIndexed,
    participationMode,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
    postAsOrganizationName,
    surveyConfig,
    createdAt,
    updatedAt,
    isLocked,
    editPermissions,
    reason,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
