<template>
  <DialogStepLayout
    title="Select Topics to Get Started"
    description="Follow topics to personalize your feed. You can always change these later."
  >
    <!-- Topics Grid -->
    <div class="topics-container">
      <PrimeChip
        v-for="topic in fullTopicList"
        :key="topic.code"
        :label="topic.name"
        :class="{ 'topic-selected': isTopicSelected(topic.code) }"
        class="topic-chip"
        @click="handleTopicToggle(topic.code)"
      >
        <template #icon>
          <ZKIcon
            v-if="isTopicSelected(topic.code)"
            name="mdi-check-circle"
            size="1rem"
            color="currentColor"
          />
          <ZKIcon
            v-else
            name="mdi-plus-circle-outline"
            size="1rem"
            color="currentColor"
          />
        </template>
      </PrimeChip>
    </div>

    <template #footer>
      <div class="footer-buttons">
        <PrimeButton
          label="Back"
          severity="secondary"
          outlined
          @click="emit('back')"
        />
        <PrimeButton
          label="Save & Continue"
          :disabled="selectedTopicsCount === 0"
          @click="emit('close')"
        />
      </div>
    </template>
  </DialogStepLayout>
</template>

<script setup lang="ts">
import DialogStepLayout from "src/components/onboarding/layouts/DialogStepLayout.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { storeToRefs } from "pinia";
import { useTopicStore } from "src/stores/topic";
import { onMounted, computed } from "vue";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "back"): void;
}>();

const { loadTopicsData, followTopic, unfollowTopic } = useTopicStore();
const { fullTopicList, followedTopicCodeSet } = storeToRefs(useTopicStore());

const selectedTopicsCount = computed(
  (): number => followedTopicCodeSet.value.size
);

const isTopicSelected = (topicCode: string): boolean => {
  return followedTopicCodeSet.value.has(topicCode);
};

onMounted(async (): Promise<void> => {
  await loadTopicsData();
});

const handleTopicToggle = async (topicCode: string): Promise<void> => {
  if (isTopicSelected(topicCode)) {
    await unfollowTopic({ topicCode });
  } else {
    await followTopic({ topicCode });
  }
};
</script>

<style scoped lang="scss">
.topics-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  max-height: 320px;
  overflow-y: auto;
}

.topic-chip {
  cursor: pointer;
  border: 1px solid var(--p-surface-300);

  &.topic-selected {
    background: #e7e7ff;
    border-color: transparent;
    color: #6b4eff;
  }
}

.footer-buttons {
  display: flex;
  gap: 0.75rem;
  width: 100%;

  > * {
    flex: 1;
  }
}

// Mobile optimizations
@media (max-height: 600px) {
  .topics-container {
    max-height: 240px;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .topics-container {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

@media (max-width: 320px) {
  .topics-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
