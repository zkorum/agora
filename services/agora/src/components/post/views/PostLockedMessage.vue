<template>
  <div>
    <div
      v-if="moderationProperty.status == 'moderated'"
      class="container moderationFont"
    >
      <div class="coreMessage">
        <div class="title">
          <div>
            <q-icon name="mdi-lock" class="lockIcon" size="1rem" />
          </div>
          <div>
            Post locked as "{{ moderationReasonName }}". New opinions cannot be
            posted.
          </div>
        </div>

        <div>
          <span v-if="moderationProperty.explanation.length > 0">
            "{{ moderationProperty.explanation }}"
          </span>
        </div>
      </div>

      <div class="rightColumn">
        <ModerationTime
          :created-at="moderationProperty.createdAt"
          :updated-at="moderationProperty.updatedAt"
        />

        <ZKButton
          v-if="profileData.isModerator"
          button-type="largeButton"
          label="Edit"
          color="primary"
          @click.stop.prevent="openModerationPage()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConversationModerationProperties } from "src/shared/types/zod";
import { moderationReasonMapping } from "src/utils/component/moderations";
import { ref, watch } from "vue";
import ModerationTime from "./moderation/ModerationTime.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";
import { useUserStore } from "src/stores/user";

const props = defineProps<{
  moderationProperty: ConversationModerationProperties;
  postSlugId: string;
}>();

const moderationReasonName = ref("");

const router = useRouter();

const { profileData } = useUserStore();

loadModerationreason();

watch(
  () => props.moderationProperty,
  () => {
    loadModerationreason();
  }
);

function loadModerationreason() {
  for (let i = 0; i < moderationReasonMapping.length; i++) {
    if (
      props.moderationProperty.status == "moderated" &&
      moderationReasonMapping[i].value == props.moderationProperty.reason
    ) {
      moderationReasonName.value = moderationReasonMapping[i].label;
      break;
    }
  }
}

async function openModerationPage() {
  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/",
    params: { conversationSlugId: props.postSlugId },
  });
}
</script>

<style lang="css" scoped>
.container {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
}

.lockIcon {
  padding-bottom: 0.2rem;
  padding-right: 0.2rem;
}

.moderationFont {
  font-weight: 400;
  color: #6d6a74;
}

.coreMessage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rightColumn {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 1rem;
}
</style>
