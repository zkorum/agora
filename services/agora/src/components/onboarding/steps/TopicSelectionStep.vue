<template>
  <DialogStepLayout
    title="Select Topics to Get Started"
    description="Follow topics to personalize your feed. You can always change these later."
  >
    <!-- Selected Topics Summary -->
    <div v-if="selectedTopicsCount > 0" class="selected-summary">
      <span class="summary-text">
        {{ selectedTopicsCount }} topic{{
          selectedTopicsCount === 1 ? "" : "s"
        }}
        selected
      </span>
    </div>

    <!-- Topics Grid -->
    <div class="topics-container">
      <div
        v-for="topic in fullTopicList"
        :key="topic.code"
        class="topic-chip"
        :class="{ selected: followedTopicCodeSet.has(topic.code) }"
        @click="
          topicButtonClicked(
            topic.code,
            followedTopicCodeSet.has(topic.code) ? 'unfollow' : 'follow'
          )
        "
      >
        <span class="topic-name">{{ topic.name }}</span>
        <ZKIcon
          v-if="followedTopicCodeSet.has(topic.code)"
          color="#007AFF"
          name="mdi-check-circle"
          size="1rem"
        />
        <ZKIcon
          v-else
          color="#999"
          name="mdi-plus-circle-outline"
          size="1rem"
        />
      </div>
    </div>

    <template #footer>
      <div class="footer-buttons">
        <button class="custom-button secondary-button" @click="emit('back')">
          Back
        </button>
        <button class="custom-button primary-button" @click="emit('close')">
          Save & Close
        </button>
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

const selectedTopicsCount = computed(() => followedTopicCodeSet.value.size);

onMounted(async () => {
  await loadTopicsData();
});

async function topicButtonClicked(
  topicCode: string,
  action: "follow" | "unfollow"
) {
  if (action == "follow") {
    await followTopic({ topicCode: topicCode });
  } else {
    await unfollowTopic({ topicCode: topicCode });
  }
}
</script>

<style scoped lang="scss">
.selected-summary {
  text-align: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.summary-text {
  font-size: 14px;
  font-weight: 500;
  color: #007aff;
}

.topics-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.25rem;
  margin-right: -0.25rem;
}

.topic-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
  border: 2px solid #e9ecef;
  text-align: center;
  min-height: 80px;
  justify-content: center;

  &:hover {
    border-color: #007aff;
  }

  &.selected {
    background-color: #e8f4fd;
    border-color: #007aff;
    color: #007aff;

    .topic-name {
      font-weight: 600;
    }
  }
}

.topic-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.3;
  word-break: break-word;
}

.footer-buttons {
  display: flex;
  gap: 0.75rem;
  width: 100%;

  > * {
    flex: 1;
  }
}

.custom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  outline: none;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #007aff;
    outline-offset: 2px;
  }
}

.primary-button {
  background-color: #007aff;
  color: white;

  &:hover {
    background-color: #0056cc;
  }

  &:active {
    background-color: #004bb3;
  }
}

.secondary-button {
  background-color: #f8f9fa;
  color: #1a1a1a;
  border: 1px solid #e9ecef;

  &:hover {
    background-color: #e9ecef;
    border-color: #dee2e6;
  }

  &:active {
    background-color: #dee2e6;
  }
}

// Mobile optimizations
@media (max-height: 600px) {
  .topics-container {
    max-height: 200px;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .topic-chip {
    padding: 0.75rem 0.5rem;
    min-height: 70px;
  }
}

@media (max-width: 480px) {
  .topics-container {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .topic-chip {
    padding: 0.625rem 0.5rem;
    min-height: 65px;
  }

  .topic-name {
    font-size: 13px;
  }
}

// Handle very small screens
@media (max-width: 320px) {
  .topics-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
