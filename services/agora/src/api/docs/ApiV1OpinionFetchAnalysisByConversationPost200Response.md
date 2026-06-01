# ApiV1OpinionFetchAnalysisByConversationPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**polisContentId** | **number** |  | [optional] [default to undefined]
**conversationViewSnapshotId** | **number** |  | [optional] [default to undefined]
**analysisSnapshotId** | **number** |  | [optional] [default to undefined]
**conversationViewSnapshot** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseConversationViewSnapshot**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseConversationViewSnapshot.md) |  | [optional] [default to undefined]
**descriptionReadiness** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseDescriptionReadiness**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseDescriptionReadiness.md) |  | [default to undefined]
**emptyReason** | **string** |  | [optional] [default to undefined]
**analysisViewState** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseAnalysisViewState**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseAnalysisViewState.md) |  | [optional] [default to undefined]
**consensusAgree** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**consensusDisagree** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**controversial** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**clusters** | [**{ [key: string]: ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfClustersValue; }**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfClustersValue.md) |  | [default to undefined]
**hasVotedOnAllAvailableOpinions** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1OpinionFetchAnalysisByConversationPost200Response } from './api';

const instance: ApiV1OpinionFetchAnalysisByConversationPost200Response = {
    polisContentId,
    conversationViewSnapshotId,
    analysisSnapshotId,
    conversationViewSnapshot,
    descriptionReadiness,
    emptyReason,
    analysisViewState,
    consensusAgree,
    consensusDisagree,
    controversial,
    clusters,
    hasVotedOnAllAvailableOpinions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
