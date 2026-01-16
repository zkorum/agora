# ApiV1ConversationUpdatePostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationSlugId** | **string** |  | [default to undefined]
**conversationTitle** | **string** |  | [default to undefined]
**conversationBody** | **string** |  | [optional] [default to undefined]
**pollAction** | [**ApiV1ConversationUpdatePostRequestPollAction**](ApiV1ConversationUpdatePostRequestPollAction.md) |  | [default to undefined]
**isIndexed** | **boolean** |  | [default to undefined]
**isLoginRequired** | **boolean** |  | [default to undefined]
**requiresEventTicket** | **string** |  | [optional] [default to undefined]
**indexConversationAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ConversationUpdatePostRequest } from './api';

const instance: ApiV1ConversationUpdatePostRequest = {
    conversationSlugId,
    conversationTitle,
    conversationBody,
    pollAction,
    isIndexed,
    isLoginRequired,
    requiresEventTicket,
    indexConversationAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
