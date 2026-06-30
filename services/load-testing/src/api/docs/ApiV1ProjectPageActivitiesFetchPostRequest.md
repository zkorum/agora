# ApiV1ProjectPageActivitiesFetchPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**projectSlug** | **string** |  | [default to undefined]
**displayLanguageCode** | **string** |  | [default to undefined]
**activityLimit** | **number** |  | [optional] [default to 12]
**activityCursor** | [**ApiV1ProjectPageFetchPostRequestActivityCursor**](ApiV1ProjectPageFetchPostRequestActivityCursor.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ProjectPageActivitiesFetchPostRequest } from './api';

const instance: ApiV1ProjectPageActivitiesFetchPostRequest = {
    projectSlug,
    displayLanguageCode,
    activityLimit,
    activityCursor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
