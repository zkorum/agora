<template>
  <button
    v-if="!hideTrigger"
    type="button"
    class="zk-drawer-select"
    :class="{ 'zk-drawer-select--disabled': disable }"
    :disabled="disable"
    @click="showDialog = true"
  >
    <span class="zk-drawer-select__text">
      <span class="zk-drawer-select__label">{{ label }}</span>
      <span class="zk-drawer-select__value">
        {{ selectedSummary }}
      </span>
    </span>
    <q-icon :name="chevronForward" size="1.4rem" class="zk-drawer-select__icon" />
  </button>

  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="dialogTitle ?? label"
      :subtitle="dialogSubtitle"
    >
      <template v-if="showBackButton" #leadingAction>
        <ZKBottomDialogBackButton @click="goBack" />
      </template>

      <div
        v-if="resolvedSearchable"
        class="zk-drawer-select__search"
        @keydown.enter.prevent="selectFirstFilteredOption"
      >
        <q-input
          :model-value="searchQuery"
          outlined
          dense
          clearable
          autofocus
          :placeholder="searchPlaceholder"
          @update:model-value="updateSearchQuery"
        >
          <template #prepend>
            <q-icon name="mdi-magnify" />
          </template>
        </q-input>
      </div>

      <q-list class="zk-drawer-select__options" separator>
        <q-item
          v-for="option in filteredOptions"
          :key="option.value"
          clickable
          :active="isSelected(option.value)"
          active-class="zk-drawer-select__option--active"
          :disable="isOptionDisabled(option)"
          class="zk-drawer-select__option"
          @click="selectOption(option)"
        >
          <q-item-section>
            <q-item-label>{{ option.label }}</q-item-label>
            <q-item-label v-if="option.caption" caption>
              {{ option.caption }}
            </q-item-label>
          </q-item-section>
          <q-item-section v-if="isSelected(option.value)" side>
            <q-icon name="mdi-check" color="primary" />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="filteredOptions.length === 0" class="zk-drawer-select__empty">
        <q-icon name="mdi-magnify" size="1.75rem" />
        <div>{{ noResultsLabel }}</div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts" generic="TValue extends string">
import { useQuasar } from "quasar";
import ZKBottomDialogBackButton from "src/components/ui-library/ZKBottomDialogBackButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { computed, ref, watch } from "vue";

interface ZKSearchableBottomSheetSelectOption<TValue extends string> {
  label: string;
  value: TValue;
  caption?: string;
  searchText?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    options: readonly ZKSearchableBottomSheetSelectOption<TValue>[];
    label: string;
    placeholder?: string;
    dialogTitle?: string;
    dialogSubtitle?: string;
    searchPlaceholder?: string;
    noResultsLabel?: string;
    searchMode?: "auto" | "always" | "never";
    searchThreshold?: number;
    multiple?: boolean;
    maxValues?: number;
    closeOnSelect?: boolean;
    selectedCountLabel?: ({ count }: { count: number }) => string;
    hideTrigger?: boolean;
    showBackButton?: boolean;
    disable?: boolean;
  }>(),
  {
    placeholder: undefined,
    dialogTitle: undefined,
    dialogSubtitle: undefined,
    searchPlaceholder: "Search",
    noResultsLabel: "No matching options",
    searchMode: "auto",
    searchThreshold: 8,
    multiple: false,
    maxValues: undefined,
    closeOnSelect: undefined,
    selectedCountLabel: undefined,
    hideTrigger: false,
    showBackButton: false,
    disable: false,
  }
);

const emit = defineEmits<{
  selected: [value: TValue];
  back: [];
}>();

const modelValue = defineModel<TValue | readonly TValue[]>("modelValue", {
  required: true,
});
const showDialog = defineModel<boolean>("showDialog", { default: false });

const $q = useQuasar();
const searchQuery = ref("");

const chevronForward = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);

const selectedValues = computed<readonly TValue[]>(() => {
  return Array.isArray(modelValue.value) ? modelValue.value : [modelValue.value];
});

const selectedSummary = computed(() => {
  const selectedOptions = props.options.filter((option) =>
    selectedValues.value.includes(option.value)
  );

  if (selectedOptions.length === 0) {
    return props.placeholder ?? props.label;
  }

  if (!props.multiple || selectedOptions.length <= 2) {
    return selectedOptions.map((option) => option.label).join(", ");
  }

  return (
    props.selectedCountLabel?.({ count: selectedOptions.length }) ??
    `${selectedOptions.length.toString()} selected`
  );
});

const resolvedSearchable = computed(() => {
  switch (props.searchMode) {
    case "always":
      return true;
    case "never":
      return false;
    case "auto":
      return props.options.length >= props.searchThreshold;
  }

  return false;
});

const filteredOptions = computed(() => {
  if (!resolvedSearchable.value) {
    return props.options;
  }

  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (query.length === 0) {
    return props.options;
  }

  return props.options.filter((option) => {
    const searchableText = [option.label, option.caption, option.searchText]
      .filter((value): value is string => value !== undefined)
      .join(" ")
      .toLocaleLowerCase();

    return searchableText.includes(query);
  });
});

function selectOption(
  option: ZKSearchableBottomSheetSelectOption<TValue>
): void {
  if (isOptionDisabled(option)) {
    return;
  }

  if (props.multiple) {
    modelValue.value = nextMultipleValue(option.value);
  } else {
    modelValue.value = option.value;
  }

  emit("selected", option.value);

  if (props.closeOnSelect ?? !props.multiple) {
    showDialog.value = false;
  }
}

function updateSearchQuery(value: string | number | null): void {
  searchQuery.value = String(value ?? "");
}

function selectFirstFilteredOption(): void {
  const firstEnabledOption = filteredOptions.value.find(
    (option) => !isOptionDisabled(option)
  );

  if (firstEnabledOption === undefined) {
    return;
  }

  selectOption(firstEnabledOption);
}

function goBack(): void {
  showDialog.value = false;
  emit("back");
}

function isSelected(value: TValue): boolean {
  return selectedValues.value.includes(value);
}

function isOptionDisabled(
  option: ZKSearchableBottomSheetSelectOption<TValue>
): boolean {
  if (option.disabled === true) {
    return true;
  }

  return (
    props.multiple &&
    props.maxValues !== undefined &&
    selectedValues.value.length >= props.maxValues &&
    !isSelected(option.value)
  );
}

function nextMultipleValue(value: TValue): readonly TValue[] {
  if (selectedValues.value.includes(value)) {
    return selectedValues.value.filter((selectedValue) => selectedValue !== value);
  }

  return [...selectedValues.value, value];
}

watch(showDialog, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = "";
  }
});
</script>

<style scoped lang="scss">
.zk-drawer-select {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba($primary, 0.38);
  border-radius: 16px;
  background: rgba($primary, 0.04);
  color: inherit;
  text-align: start;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;

  @media (hover: hover) {
    &:hover {
      border-color: rgba($primary, 0.7);
      background: rgba($primary, 0.08);
    }
  }

  &:focus-visible {
    outline: 2px solid rgba($primary, 0.55);
    outline-offset: 2px;
  }
}

.zk-drawer-select--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.zk-drawer-select__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.zk-drawer-select__label {
  color: $color-text-weak;
  font-size: 0.78rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.zk-drawer-select__value {
  overflow: hidden;
  color: $color-text-strong;
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zk-drawer-select__icon {
  flex-shrink: 0;
  color: $primary;
}

.zk-drawer-select__search {
  position: sticky;
  top: 0;
  z-index: 1;
  background: white;
}

.zk-drawer-select__options {
  max-height: min(26rem, 46dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}

.zk-drawer-select__option {
  min-height: 3.6rem;
  padding-block: 0.75rem;
}

.zk-drawer-select__option--active {
  background: rgba($primary, 0.08);
  color: $primary;
}

.zk-drawer-select__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: $color-text-weak;
  text-align: center;
}
</style>
