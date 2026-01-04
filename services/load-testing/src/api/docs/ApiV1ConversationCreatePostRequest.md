# ApiV1ConversationCreatePostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**postAsOrganization** | **string** |  | [optional] [default to undefined]
**indexConversationAt** | **string** |  | [optional] [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**isLoginRequired** | **boolean** |  | [default to undefined]
**pollingOptionList** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**seedOpinionList** | **Array&lt;string&gt;** |  | [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationCreatePostRequest } from './api';

const instance: ApiV1ConversationCreatePostRequest = {
    conversationTitle,
    conversationBody,
    postAsOrganization,
    indexConversationAt,
    isIndexed,
    isLoginRequired,
    pollingOptionList,
    seedOpinionList,
    requiresEventTicket,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
