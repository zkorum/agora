<template>
  <div>
    <ZKButton button-type="standardButton" @click="showDialog = true">
      <div class="buttonGrid gradientFont">
        <div class="buttonItem">{{ currentFilterAlgorithm }}</div>

        <div class="buttonItem">
          <q-icon
            name="mdi-chevron-down"
            size="1.3rem"
            class="iconStyle gradientFont"
          />
        </div>
      </div>
    </ZKButton>

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="titleStyle">Filter Responses by:</div>

        <div class="optionFlexStyle">
          <ZKButton
            v-for="optionItem in currentOptionList"
            :key="optionItem.name"
            button-type="largeButton"
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
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
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
.gradientFont {
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}

.iconStyle {
  padding-bottom: 0rem;
  padding-left: 0.2rem;
}

.optionFlexStyle {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.titleStyle {
  font-weight: 500;
}

.buttonGrid {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: 1fr;
  gap: 0px 0px;
  grid-template-areas: ". .";
}

.buttonItem {
  font-weight: 500;
  display: flex;
  align-items: center;
  line-height: normal;
}
</style>
