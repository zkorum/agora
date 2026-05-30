# ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOf


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationViewSnapshotId** | **number** |  | [default to undefined]
**analysisSnapshotId** | **number** |  | [default to undefined]
**candidateId** | **number** |  | [default to undefined]
**descriptionReadiness** | [**ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfDescriptionReadiness**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfDescriptionReadiness.md) |  | [default to undefined]
**consensusAgree** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**consensusDisagree** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**controversial** | [**Array&lt;ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner&gt;**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfConsensusAgreeInner.md) |  | [default to undefined]
**clusters** | [**{ [key: string]: ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfClustersValue; }**](ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOfClustersValue.md) |  | [default to undefined]
**success** | **boolean** |  | [default to undefined]

## Example

```typescript
import { ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOf } from './api';

const instance: ApiV1OpinionFetchAnalysisContentByCandidatePost200ResponseOneOf = {
    conversationViewSnapshotId,
    analysisSnapshotId,
    candidateId,
    descriptionReadiness,
    consensusAgree,
    consensusDisagree,
    controversial,
    clusters,
    success,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
