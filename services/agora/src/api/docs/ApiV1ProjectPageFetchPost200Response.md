# ApiV1ProjectPageFetchPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**project** | [**ApiV1ProjectPageFetchPost200ResponseProject**](ApiV1ProjectPageFetchPost200ResponseProject.md) |  | [default to undefined]
**activities** | [**Array&lt;ApiV1ProjectPageFetchPost200ResponseActivitiesInner&gt;**](ApiV1ProjectPageFetchPost200ResponseActivitiesInner.md) |  | [default to undefined]
**languageOptions** | [**Array&lt;ApiV1ProjectPageFetchPost200ResponseLanguageOptionsInner&gt;**](ApiV1ProjectPageFetchPost200ResponseLanguageOptionsInner.md) |  | [default to undefined]
**selectedProjectDisplayLanguage** | **string** |  | [optional] [default to undefined]
**effectiveProjectDisplayLanguage** | **string** |  | [default to undefined]
**nextActivityCursor** | [**ApiV1ProjectPageFetchPost200ResponseNextActivityCursor**](ApiV1ProjectPageFetchPost200ResponseNextActivityCursor.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1ProjectPageFetchPost200Response } from './api';

const instance: ApiV1ProjectPageFetchPost200Response = {
    project,
    activities,
    languageOptions,
    selectedProjectDisplayLanguage,
    effectiveProjectDisplayLanguage,
    nextActivityCursor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
