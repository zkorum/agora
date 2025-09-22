import { ref, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import type {
  VotingAction,
  VotingOption,
  OpinionItem,
} from "src/shared/types/zod";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useOpinionAgreements } from "src/composables/ui/useOpinionAgreements";

export interface UseOpinionVotingParams {
  postSlugId: string;
  visibleOpinions: Ref<OpinionItem[]>;
}

export interface UseOpinionVotingReturn {
  opinionVoteMap: Ref<Map<string, VotingOption>>;
  changeVote: (vote: VotingAction, opinionSlugId: string) => number;
  fetchUserVotingData: () => Promise<void>;
  addOpinionAgreement: (
    opinionSlugId: string,
    votingOption: VotingOption
  ) => void;
  removeOpinionAgreement: (
    opinionSlugId: string,
    votingOption: VotingOption
  ) => void;
}

export function useOpinionVoting({
  postSlugId,
  visibleOpinions,
}: UseOpinionVotingParams): UseOpinionVotingReturn {
  const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

  // Internal vote map management
  const opinionVoteMap = ref<Map<string, VotingOption>>(new Map());

  // Opinion agreements functionality
  const { addOpinionAgreement, removeOpinionAgreement } =
    useOpinionAgreements(visibleOpinions);

  async function fetchUserVotingData(): Promise<void> {
    if (isGuestOrLoggedIn.value) {
      const response = await fetchUserVotesForPostSlugIds([postSlugId]);
      if (response) {
        const newMap = new Map();
        response.forEach((userVote) => {
          newMap.set(userVote.opinionSlugId, userVote.votingAction);
        });
        opinionVoteMap.value = newMap;
      } else {
        opinionVoteMap.value = new Map();
      }
    }
  }

  function changeVote(vote: VotingAction, opinionSlugId: string): number {
    const previousMapSize = opinionVoteMap.value.size;

    // Handle vote changes internally using the agreement composable
    switch (vote) {
      case "agree":
        addOpinionAgreement(opinionSlugId, "agree");
        opinionVoteMap.value.set(opinionSlugId, "agree");
        break;
      case "disagree":
        addOpinionAgreement(opinionSlugId, "disagree");
        opinionVoteMap.value.set(opinionSlugId, "disagree");
        break;
      case "pass":
        addOpinionAgreement(opinionSlugId, "pass");
        opinionVoteMap.value.set(opinionSlugId, "pass");
        break;
      case "cancel": {
        // Find the original vote from the vote map to remove it
        const originalVote = opinionVoteMap.value.get(opinionSlugId);
        if (originalVote !== undefined) {
          removeOpinionAgreement(opinionSlugId, originalVote);
        }
        opinionVoteMap.value.delete(opinionSlugId);
        break;
      }
    }

    // Calculate and return participant count delta
    const currentMapSize = opinionVoteMap.value.size;
    return currentMapSize - previousMapSize;
  }

  return {
    opinionVoteMap,
    changeVote,
    fetchUserVotingData,
    addOpinionAgreement,
    removeOpinionAgreement,
  };
}
