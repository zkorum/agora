import { defineStore } from "pinia";
import { ZodTopicObject } from "src/shared/types/zod";
import { useCommonApi } from "src/utils/api/common";
import { useBackendTopicApi } from "src/utils/api/topic";
import { ref } from "vue";

export const useTopicStore = defineStore("topic", () => {
  const { getAllTopics, getUserFollowedTopics } = useBackendTopicApi();
  const { handleAxiosErrorStatusCodes } = useCommonApi();

  const fullTopicList = ref<ZodTopicObject[]>([]);
  const followedTopicCodeList = ref<string[]>(["asdf"]);

  async function loadTopicsData() {
    await loadUserFollowedTopics();
    await loadTopicList();
  }

  async function loadUserFollowedTopics() {
    const response = await getUserFollowedTopics();

    if (response.status == "success") {
      followedTopicCodeList.value = response.data.followedTopicCodeList;
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

  return { fullTopicList, followedTopicCodeList, loadTopicsData };
});
