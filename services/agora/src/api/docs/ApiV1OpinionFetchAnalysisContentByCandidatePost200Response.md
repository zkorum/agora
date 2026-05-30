# ApiV1OpinionFetchAnalysisContentByCandidatePost200Response


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
**reason** | **string** |  | [default to undefined]

## Example

```typescript
import { ApiV1OpinionFetchAnalysisContentByCandidatePost200Response } from './api';

const instance: ApiV1OpinionFetchAnalysisContentByCandidatePost200Response = {
    conversationViewSnapshotId,
    analysisSnapshotId,
    candidateId,
    descriptionReadiness,
    consensusAgree,
    consensusDisagree,
    controversial,
    clusters,
    success,
    reason,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
