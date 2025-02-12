<template>
  <div>
    <div class="currentLabel">
      <ZKButton @click="showDialog = true">
        <div class="buttonText">
          {{ currentFilterAlgorithm }}
          <q-icon name="mdi-chevron-down" size="1.3rem" class="iconPadding" />
        </div>
      </ZKButton>
    </div>

    <q-dialog v-model="showDialog" position="bottom">
      <div class="dialogContainer">
        <div class="titleStyle">Filter Responses by:</div>

        <div class="optionFlexStyle">
          <ZKButton
            v-for="optionItem in currentOptionList"
            :key="optionItem.name"
            :label="optionItem.name"
            :color="
              currentFilterAlgorithm == optionItem.name
                ? 'primary'
                : 'secondary'
            "
            :text-color="
              currentFilterAlgorithm == optionItem.name ? 'white' : 'primary'
            "
            @click="selectedAlgorithm(optionItem.value)"
          />
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useUserStore } from "src/stores/user";
import { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps<{
  filterValue: string;
}>();

const emit = defineEmits<{
  (e: "changedAlgorithm", value: CommentFilterOptions): void;
}>();

const { profileData } = storeToRefs(useUserStore());

const showDialog = ref(false);

interface OptionItem {
  name: string;
  value: CommentFilterOptions;
}

const baseOptions: OptionItem[] = [
  { name: "Discover", value: "discover" },
  { name: "New", value: "new" },
  { name: "Moderation History", value: "moderated" },
];
const extendedOptions: OptionItem[] = baseOptions.concat([
  { name: "Hidden", value: "hidden" },
]);

const currentOptionList = ref<OptionItem[]>(baseOptions);

onMounted(() => {
  initializeOptionList();
});

watch(profileData, async () => {
  initializeOptionList();
});

const currentFilterAlgorithm = computed(() => {
  for (const optionItem of currentOptionList.value) {
    if (optionItem.value == props.filterValue) {
      return optionItem.name;
    }
  }

  return "UNKNOWN";
});

function initializeOptionList() {
  if (profileData.value.isModerator) {
    currentOptionList.value = extendedOptions;
  } else {
    currentOptionList.value = baseOptions;
  }
}

function selectedAlgorithm(filterValue: CommentFilterOptions) {
  showDialog.value = false;
  emit("changedAlgorithm", filterValue);
}
</script>

<style lang="scss" scoped>
.currentLabel {
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
  font-weight: 600;
}

.iconPadding {
  padding-bottom: 0rem;
  padding-left: 0.2rem;
}

.dialogContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border-radius: 25px 25px 0 0;
}

.optionFlexStyle {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.titleStyle {
  font-weight: 500;
}

.buttonText {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
