import { defineStore } from "pinia";
import { ZodTopicObject } from "src/shared/types/zod";
import { useCommonApi } from "src/utils/api/common";
import { useBackendTopicApi } from "src/utils/api/topic";
import { ref } from "vue";

export const useTopicStore = defineStore("topic", () => {
  const { getAllTopics } = useBackendTopicApi();
  const { handleAxiosErrorStatusCodes } = useCommonApi();

  const fullTopicList = ref<ZodTopicObject[]>([]);

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

  return { fullTopicList, loadTopicList };
});
