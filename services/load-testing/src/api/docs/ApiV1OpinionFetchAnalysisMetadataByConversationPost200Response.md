# ApiV1OpinionFetchAnalysisMetadataByConversationPost200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**conversationViewSnapshotId** | **number** |  | [optional] [default to undefined]
**analysisSnapshotId** | **number** |  | [optional] [default to undefined]
**conversationViewSnapshot** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseConversationViewSnapshot**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseConversationViewSnapshot.md) |  | [optional] [default to undefined]
**descriptionReadiness** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseDescriptionReadiness**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseDescriptionReadiness.md) |  | [default to undefined]
**emptyReason** | **string** |  | [optional] [default to undefined]
**analysisViewState** | [**ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseAnalysisViewState**](ApiV1OpinionFetchAnalysisMetadataByConversationPost200ResponseAnalysisViewState.md) |  | [default to undefined]
**displayableGroupCounts** | **Array&lt;number&gt;** |  | [default to undefined]
**hasVotedOnAllAvailableOpinions** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiV1OpinionFetchAnalysisMetadataByConversationPost200Response } from './api';

const instance: ApiV1OpinionFetchAnalysisMetadataByConversationPost200Response = {
    conversationViewSnapshotId,
    analysisSnapshotId,
    conversationViewSnapshot,
    descriptionReadiness,
    emptyReason,
    analysisViewState,
    displayableGroupCounts,
    hasVotedOnAllAvailableOpinions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
