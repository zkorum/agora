import { defineStore, storeToRefs } from "pinia";
import { ZodTopicObject } from "src/shared/types/zod";
import { useCommonApi } from "src/utils/api/common";
import { useBackendTopicApi } from "src/utils/api/topic";
import { ref } from "vue";
import { useAuthenticationStore } from "./authentication";

export const useTopicStore = defineStore("topic", () => {
  const {
    getAllTopics,
    getUserFollowedTopics,
    userFollowTopicCode,
    userUnfollowTopicCode,
  } = useBackendTopicApi();
  const { handleAxiosErrorStatusCodes } = useCommonApi();
  const { isLoggedIn } = storeToRefs(useAuthenticationStore());

  const fullTopicList = ref<ZodTopicObject[]>([]);
  const followedTopicCodeSet = ref(new Set<string>());

  function clearTopicsData() {
    fullTopicList.value = [];
    followedTopicCodeSet.value.clear;
  }

  interface FollowTopicProps {
    topicCode: string;
  }

  async function followTopic({ topicCode }: FollowTopicProps) {
    await userFollowTopicCode({
      topicCode: topicCode,
    });
  }

  interface UnfollowTopicProps {
    topicCode: string;
  }

  async function unfollowTopic({ topicCode }: UnfollowTopicProps) {
    await userUnfollowTopicCode({
      topicCode: topicCode,
    });
  }

  async function loadTopicsData() {
    await loadTopicList();
    if (isLoggedIn) {
      await loadUserFollowedTopics();
    }
  }

  async function loadUserFollowedTopics() {
    const response = await getUserFollowedTopics();

    if (response.status == "success") {
      followedTopicCodeSet.value = new Set(response.data.followedTopicCodeList);
    } else {
      handleAxiosErrorStatusCodes({
        axiosErrorCode: response.code,
        defaultMessage: "Error while trying to load user followed topic list",
      });
    }
  }

  async function loadTopicList() {
    const response = await getAllTopics();

    if (response.status == "success") {
      fullTopicList.value = response.data.topicList;
    } else {
      handleAxiosErrorStatusCodes({
        axiosErrorCode: response.code,
        defaultMessage: "Error while trying to load topic list",
      });
    }
  }

  return {
    fullTopicList,
    followedTopicCodeSet,
    loadTopicsData,
    followTopic,
    unfollowTopic,
    clearTopicsData,
  };
});
