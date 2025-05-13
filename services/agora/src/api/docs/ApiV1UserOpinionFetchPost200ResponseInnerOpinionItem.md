# ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**opinionSlugId** | **string** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]
**opinion** | **string** |  | [default to undefined]
**numParticipants** | **number** |  | [default to undefined]
**numAgrees** | **number** |  | [default to undefined]
**numDisagrees** | **number** |  | [default to undefined]
**username** | **string** |  | [default to undefined]
**clustersStats** | [**Array&lt;ApiV1UserOpinionFetchPost200ResponseInnerOpinionItemClustersStatsInner&gt;**](ApiV1UserOpinionFetchPost200ResponseInnerOpinionItemClustersStatsInner.md) |  | [default to undefined]
**moderation** | [**ApiV1ModerationOpinionGetPost200Response**](ApiV1ModerationOpinionGetPost200Response.md) |  | [default to undefined]

## Example

```typescript
import { ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem } from './api';

const instance: ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem = {
    opinionSlugId,
    createdAt,
    updatedAt,
    opinion,
    numParticipants,
    numAgrees,
    numDisagrees,
    username,
    clustersStats,
    moderation,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
