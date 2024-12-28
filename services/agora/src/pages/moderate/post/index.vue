<template>
  <div class="container">
    <Select
      v-model="moderationAction"
      :options="actions"
      option-label="name"
      option-value="code"
      placeholder="Moderation Action"
    />

    <Select
      v-model="moderationReason"
      :options="reasons"
      option-label="name"
      option-value="code"
      placeholder="Moderation Reason"
    />

    <InputText
      v-model="moderationExplanation"
      placeholder="Moderation Explanation"
    />

    <ZKButton label="Submit" color="primary" @click="clickedSubmit()" />
  </div>
</template>

<script setup lang="ts">
import { useBackendModerateApi } from "src/utils/api/moderation";
import { useRoute, useRouter } from "vue-router";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import { ref } from "vue";
import type { ModerationAction, ModerationReason } from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";

const { moderatePost } = useBackendModerateApi();

const route = useRoute();
const router = useRouter();

const moderationAction = ref<ModerationAction>("lock");
const actions = ref([
  { name: "Lock", code: "lock" },
  { name: "Hide", code: "hide" },
  { name: "Nothing", code: "nothing" },
]);

const moderationReason = ref<ModerationReason>("off-topic");
const reasons = ref([
  { name: "Off Topic", code: "off-topic" },
  { name: "Spam", code: "spam" },
  { name: "Misleading", code: "misleading" },
  { name: "Privacy", code: "privacy" },
  { name: "Sexual", code: "sexual" },
  { name: "Toxic", code: "toxic" },
  { name: "Illegal", code: "illegal" },
  { name: "Nothing", code: "nothing" },
]);

const moderationExplanation = ref("");

async function clickedSubmit() {
  const postSlugId = route.params.postSlugId;
  console.log(postSlugId);
  if (typeof postSlugId == "string") {
    console.log(moderationReason.value);
    console.log(moderationAction.value);
    const isSuccessful = await moderatePost(
      postSlugId,
      moderationAction.value,
      moderationReason.value,
      moderationExplanation.value
    );

    if (isSuccessful) {
      router.go(-1);
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}
</style>
