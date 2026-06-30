# ApiV1ProjectPageFetchPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**projectSlug** | **string** |  | [default to undefined]
**selectedLanguageCode** | **string** |  | [optional] [default to undefined]
**activityLimit** | **number** |  | [optional] [default to 12]
**activityCursor** | [**ApiV1ProjectPageFetchPostRequestActivityCursor**](ApiV1ProjectPageFetchPostRequestActivityCursor.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ProjectPageFetchPostRequest } from './api';

const instance: ApiV1ProjectPageFetchPostRequest = {
    projectSlug,
    selectedLanguageCode,
    activityLimit,
    activityCursor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
