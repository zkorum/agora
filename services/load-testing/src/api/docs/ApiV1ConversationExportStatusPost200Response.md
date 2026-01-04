# ApiV1ConversationExportStatusPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]
**exportSlugId** | **string** |  | [default to undefined]
**conversationSlugId** | **string** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**expiresAt** | **string** |  | [default to undefined]
**files** | [**Array&lt;ApiV1ConversationExportStatusPost200ResponseOneOf1FilesInner&gt;**](ApiV1ConversationExportStatusPost200ResponseOneOf1FilesInner.md) |  | [default to undefined]
**failureReason** | **string** |  | [optional] [default to undefined]
**cancellationReason** | **string** |  | [default to undefined]
**deletedAt** | **string** |  | [default to undefined]

## Example

```typescript
import { ApiV1ConversationExportStatusPost200Response } from './api';

const instance: ApiV1ConversationExportStatusPost200Response = {
    status,
    exportSlugId,
    conversationSlugId,
    createdAt,
    expiresAt,
    files,
    failureReason,
    cancellationReason,
    deletedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
