# ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInner


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
**numPasses** | **number** |  | [default to undefined]
**username** | **string** |  | [default to undefined]
**moderation** | [**ApiV1ModerationOpinionGetPost200Response**](ApiV1ModerationOpinionGetPost200Response.md) |  | [default to undefined]
**isSeed** | **boolean** |  | [default to undefined]
**clustersStats** | [**Array&lt;ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInnerClustersStatsInner&gt;**](ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInnerClustersStatsInner.md) |  | [default to undefined]

## Example

```typescript
import { ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInner } from './api';

const instance: ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInner = {
    opinionSlugId,
    createdAt,
    updatedAt,
    opinion,
    numParticipants,
    numAgrees,
    numDisagrees,
    numPasses,
    username,
    moderation,
    isSeed,
    clustersStats,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
