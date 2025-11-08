import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendUserApi } from "src/utils/api/user";
import type {
  ExtendedOpinion,
  ExtendedConversation,
  OrganizationProperties,
  EventSlug,
} from "src/shared/types/zod";
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useUserStore = defineStore("user", () => {
  const { fetchUserProfile, fetchUserPosts, fetchUserComments } =
    useBackendUserApi();
  const { validateSelectedOrganization } = useNewPostDraftsStore();

  interface UserProfile {
    activePostCount: number;
    createdAt: Date;
    userName: string;
    userPostList: ExtendedConversation[];
    userCommentList: ExtendedOpinion[];
    isModerator: boolean;
    dataLoaded: boolean;
    organizationList: OrganizationProperties[];
    verifiedEventTickets: EventSlug[];
  }

  const emptyProfile: UserProfile = {
    activePostCount: 0,
    createdAt: new Date(),
    userName: "",
    userPostList: [],
    userCommentList: [],
    isModerator: false,
    dataLoaded: false,
    organizationList: [],
    verifiedEventTickets: [],
  };

  const profileData = ref(emptyProfile);

  function clearProfileData() {
    profileData.value = emptyProfile;
  }

  async function loadUserProfile() {
    const [userProfile, userPosts, userComments] = await Promise.all([
      fetchUserProfile(),
      fetchUserPosts(undefined),
      fetchUserComments(undefined),
    ]);

    if (userProfile) {
      profileData.value = {
        activePostCount: userProfile.activePostCount,
        createdAt: new Date(userProfile.createdAt),
        userName: String(userProfile.username),
        userPostList: userPosts ?? [],
        userCommentList: userComments ?? [],
        isModerator: userProfile.isModerator,
        dataLoaded: true,
        organizationList: userProfile.organizationList,
        verifiedEventTickets: userProfile.verifiedEventTickets,
      };
    }

    validateSelectedOrganization(profileData.value.organizationList);
  }

  async function loadMoreUserPosts() {
    let lastPostSlugId: undefined | string = undefined;
    if (profileData.value.userPostList.length > 0) {
      const lastPostItem = profileData.value.userPostList.at(-1);
      if (lastPostItem) {
        lastPostSlugId = lastPostItem.metadata.conversationSlugId;
      } else {
        console.log(
          "Error failed to fetch the last post item from the existing list"
        );
      }
    }

    const userPosts = await fetchUserPosts(lastPostSlugId);
    if (userPosts) {
      profileData.value.userPostList.push(...userPosts);
      return { reachedEndOfFeed: userPosts.length == 0 };
    } else {
      return { reachedEndOfFeed: true };
    }
  }

  async function loadMoreUserComments() {
    let lastCommentSlugId: undefined | string = undefined;
    if (profileData.value.userCommentList.length > 0) {
      const lastCommentItem = profileData.value.userCommentList.at(-1);
      if (lastCommentItem) {
        lastCommentSlugId = lastCommentItem.opinionItem.opinionSlugId;
      } else {
        console.log("Failed to fetch the last comment item from the list");
      }
    }

    const userComments = await fetchUserComments(lastCommentSlugId);
    if (userComments) {
      profileData.value.userCommentList.push(...userComments);
      return { reachedEndOfFeed: userComments.length == 0 };
    } else {
      return { reachedEndOfFeed: true };
    }
  }

  // Computed property to get verified tickets as a Set for efficient lookups
  const verifiedEventTickets = computed(() => {
    return new Set(profileData.value.verifiedEventTickets);
  });

  // Check if a specific event ticket is verified
  function isTicketVerified(eventSlug: EventSlug): boolean {
    return verifiedEventTickets.value.has(eventSlug);
  }

  // Add a verified event ticket (used after successful verification)
  function addVerifiedTicket(eventSlug?: EventSlug): void {
    if (eventSlug === undefined) {
      console.warn("Attempt to add an undefined ticket to the store");
      return;
    }
    if (!profileData.value.verifiedEventTickets.includes(eventSlug)) {
      profileData.value.verifiedEventTickets.push(eventSlug);
    }
  }

  return {
    loadUserProfile,
    loadMoreUserPosts,
    loadMoreUserComments,
    clearProfileData,
    profileData,
    verifiedEventTickets,
    isTicketVerified,
    addVerifiedTicket,
  };
});
