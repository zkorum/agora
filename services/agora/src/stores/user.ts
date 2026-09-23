import { defineStore } from "pinia";
import type {
  EventSlug,
  ExtendedConversation,
  ExtendedOpinion,
  OrganizationProperties,
} from "src/shared/types/zod";
import { useBackendUserApi } from "src/utils/api/user";
import { computed, reactive, ref } from "vue";

import { useAuthenticationStore } from "./authentication";

export const useUserStore = defineStore("user", () => {
  const { fetchUserProfile, fetchUserPosts, fetchUserComments } =
    useBackendUserApi();
  const authStore = useAuthenticationStore();

  interface UserProfile {
    activePostCount: number;
    createdAt: Date;
    userName: string;
    userPostList: ExtendedConversation[];
    userCommentList: ExtendedOpinion[];
    isSiteModerator: boolean;
    isSiteOrgAdmin: boolean;
    dataLoaded: boolean;
    postsLoadFailed: boolean;
    commentsLoadFailed: boolean;
    organizationList: OrganizationProperties[];
    verifiedEventTickets: EventSlug[];
  }

  function createEmptyProfile(): UserProfile {
    return {
      activePostCount: 0,
      createdAt: new Date(),
      userName: "",
      userPostList: [],
      userCommentList: [],
      isSiteModerator: false,
      isSiteOrgAdmin: false,
      dataLoaded: false,
      postsLoadFailed: false,
      commentsLoadFailed: false,
      organizationList: [],
      verifiedEventTickets: [],
    };
  }

  const profileData = ref(createEmptyProfile());
  let profileGeneration = 0;

  function clearProfileData() {
    profileGeneration += 1;
    profileData.value = createEmptyProfile();
  }

  function captureProfileRequest(): () => boolean {
    const requestUserId = authStore.userId;
    const requestGeneration = profileGeneration;
    // Account clearing can precede the auth-store update during logout.
    return () =>
      authStore.userId === requestUserId &&
      profileGeneration === requestGeneration;
  }

  async function loadUserProfileMetadata(): Promise<void> {
    const isCurrentRequest = captureProfileRequest();
    const userProfile = await fetchUserProfile();
    if (!isCurrentRequest() || userProfile === undefined) {
      return;
    }

    profileData.value = {
      ...profileData.value,
      activePostCount: userProfile.activePostCount,
      createdAt: userProfile.createdAt,
      userName: userProfile.username,
      isSiteModerator: userProfile.isSiteModerator,
      isSiteOrgAdmin: userProfile.isSiteOrgAdmin,
      dataLoaded: true,
      organizationList: userProfile.organizationList,
      verifiedEventTickets: userProfile.verifiedEventTickets,
    };
  }

  async function loadUserActivity(): Promise<void> {
    const isCurrentRequest = captureProfileRequest();
    const [userPosts, userComments] = await Promise.all([
      fetchUserPosts(undefined),
      fetchUserComments(undefined),
    ]);
    if (!isCurrentRequest()) return;

    profileData.value = {
      ...profileData.value,
      userPostList: userPosts ?? [],
      userCommentList: userComments ?? [],
      postsLoadFailed: userPosts === null,
      commentsLoadFailed: userComments === null,
    };
  }

  async function loadUserProfile(): Promise<void> {
    await Promise.all([loadUserProfileMetadata(), loadUserActivity()]);
  }

  async function retryUserPosts() {
    const isCurrentRequest = captureProfileRequest();
    const userPosts = await fetchUserPosts(undefined);
    if (!isCurrentRequest()) {
      return;
    }
    if (userPosts) {
      profileData.value.userPostList = userPosts;
      profileData.value.postsLoadFailed = false;
    }
  }

  async function retryUserComments() {
    const isCurrentRequest = captureProfileRequest();
    const userComments = await fetchUserComments(undefined);
    if (!isCurrentRequest()) {
      return;
    }
    if (userComments) {
      profileData.value.userCommentList = userComments;
      profileData.value.commentsLoadFailed = false;
    }
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

    const isCurrentRequest = captureProfileRequest();
    const userPosts = await fetchUserPosts(lastPostSlugId);
    if (!isCurrentRequest()) {
      return { reachedEndOfFeed: true };
    }
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

    const isCurrentRequest = captureProfileRequest();
    const userComments = await fetchUserComments(lastCommentSlugId);
    if (!isCurrentRequest()) {
      return { reachedEndOfFeed: true };
    }
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

  // Track transient verification states (verifying, error) in reactive state
  // These are per-session UI states that don't need persistence
  type TransientStateInfo =
    | { state: "verifying" }
    | { state: "error"; errorMessage: string };

  // Use a reactive Map for transient states
  const ticketVerificationStates = reactive(
    new Map<EventSlug, TransientStateInfo>()
  );

  function setTicketVerifying(eventSlug: EventSlug): void {
    ticketVerificationStates.set(eventSlug, { state: "verifying" });
  }

  function setTicketError(eventSlug: EventSlug, errorMessage: string): void {
    ticketVerificationStates.set(eventSlug, { state: "error", errorMessage });
  }

  function clearTicketState(eventSlug: EventSlug): void {
    ticketVerificationStates.delete(eventSlug);
  }

  // Get the current verification state for an event
  // Returns: 'verified' | 'verifying' | 'error' | 'not_verified'
  function getTicketVerificationState(
    eventSlug: EventSlug
  ):
    | { state: "verified" }
    | { state: "verifying" }
    | { state: "error"; errorMessage: string }
    | { state: "not_verified" } {
    // Check if ticket is verified (from backend)
    if (isTicketVerified(eventSlug)) {
      return { state: "verified" };
    }

    // Check for transient states (verifying or error)
    const transientState = ticketVerificationStates.get(eventSlug);
    if (transientState) {
      return transientState;
    }

    return { state: "not_verified" };
  }

  return {
    loadUserProfile,
    loadUserProfileMetadata,
    retryUserPosts,
    retryUserComments,
    loadMoreUserPosts,
    loadMoreUserComments,
    clearProfileData,
    profileData,
    verifiedEventTickets,
    isTicketVerified,
    addVerifiedTicket,
    ticketVerificationStates,
    setTicketVerifying,
    setTicketError,
    clearTicketState,
    getTicketVerificationState,
  };
});
