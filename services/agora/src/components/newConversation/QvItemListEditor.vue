<template>
  <div class="qv-items">
    <div class="list-actions">
      <h2>{{ t("items") }}</h2>
      <q-btn
        flat
        :label="preview ? t('edit') : t('preview')"
        @click="preview = !preview"
      />
    </div>
    <p
      v-if="showErrors && items.length === 0"
      role="alert"
      class="validation-error"
    >
      {{ t("needItem") }}
    </p>
    <section
      v-for="(item, index) in items"
      :key="item.localKey"
      class="item-card"
      :aria-label="`${t('items')} ${index + 1}`"
    >
      <div class="item-actions">
        <span>{{ index + 1 }}</span>
        <q-btn
          v-if="!disabled"
          flat
          round
          icon="mdi-arrow-up"
          :aria-label="t('up')"
          :disable="index === 0"
          @click="move({ index, direction: -1 })"
        />
        <q-btn
          v-if="!disabled"
          flat
          round
          icon="mdi-arrow-down"
          :aria-label="t('down')"
          :disable="index === items.length - 1"
          @click="move({ index, direction: 1 })"
        />
        <q-btn
          v-if="!disabled"
          flat
          round
          icon="mdi-delete-outline"
          :aria-label="t('remove')"
          :disable="!allowAdd && items.length === 1"
          @click="remove(item.localKey)"
        />
      </div>
      <template v-if="preview || disabled">
        <ZKHtmlContent
          :html-body="item.title"
          :compact-mode="false"
          :enable-links="false"
          content-role="title"
        />
        <ZKHtmlContent
          v-if="item.description"
          :html-body="item.description"
          :compact-mode="false"
          :enable-links="true"
        />
      </template>
      <template v-else>
        <label :id="`${item.localKey}-title-label`">{{ t("title") }}</label>
        <Editor
          :model-value="item.title"
          :aria-labelledby="`${item.localKey}-title-label`"
          :placeholder="t('title')"
          :show-toolbar="false"
          :single-line="true"
          :disabled="disabled"
          :max-length="MAX_LENGTH_OPINION"
          min-height="2.5rem"
          @update:model-value="
            (value: string) =>
              update({ key: item.localKey, field: 'title', value })
          "
        />
        <label :id="`${item.localKey}-description-label`">{{
          t("description")
        }}</label>
        <Editor
          :model-value="item.description"
          :aria-labelledby="`${item.localKey}-description-label`"
          :placeholder="t('description')"
          :show-toolbar="true"
          :single-line="false"
          :disabled="disabled"
          :max-length="MAX_LENGTH_BODY"
          min-height="4rem"
          @update:model-value="
            (value: string) =>
              update({ key: item.localKey, field: 'description', value })
          "
        />
        <p
          v-if="showErrors && !isValid(item)"
          role="alert"
          class="validation-error"
        >
          {{ t("invalid") }}
        </p>
      </template>
    </section>
    <q-btn
      v-if="allowAdd && !disabled"
      outline
      icon="mdi-plus"
      :label="t('add')"
      :disable="items.length >= MAX_SEED_OPINIONS_PER_SUBMISSION"
      @click="add"
    />
  </div>
</template>

<script setup lang="ts">
import { uid } from "quasar";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type { QvItemDraft } from "src/composables/conversation/draft/conversationDraft.types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { validateRichTextInput } from "src/shared/richText";
import { MAX_SEED_OPINIONS_PER_SUBMISSION } from "src/shared/seedOpinions";
import { MAX_LENGTH_BODY, MAX_LENGTH_OPINION } from "src/shared/shared";
import { defineAsyncComponent, ref } from "vue";

import { qvItemsTranslations } from "./QvItems.i18n";

const props = defineProps<{ disabled: boolean; allowAdd: boolean }>();
const items = defineModel<QvItemDraft[]>({ required: true });
const { t } = useComponentI18n(qvItemsTranslations);
const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);
const showErrors = ref(false);
const preview = ref(false);

function isValid(item: QvItemDraft): boolean {
  return (
    validateRichTextInput({ htmlString: item.title, mode: "opinion" })
      .success &&
    validateRichTextInput({
      htmlString: item.description,
      mode: "ranking_item",
    }).success
  );
}
function validate(): boolean {
  showErrors.value = true;
  preview.value = false;
  return (
    items.value.length > 0 &&
    items.value.length <= MAX_SEED_OPINIONS_PER_SUBMISSION &&
    items.value.every(isValid)
  );
}
function update({
  key,
  field,
  value,
}: {
  key: string;
  field: "title" | "description";
  value: string;
}): void {
  if (props.disabled) return;
  items.value = items.value.map((item) =>
    item.localKey === key ? { ...item, [field]: value } : item
  );
}
function add(): void {
  if (props.disabled || items.value.length >= MAX_SEED_OPINIONS_PER_SUBMISSION)
    return;
  items.value = [
    ...items.value,
    { localKey: uid(), title: "", description: "" },
  ];
}
function remove(key: string): void {
  if (props.disabled) return;
  items.value = items.value.filter((item) => item.localKey !== key);
}
function move({
  index,
  direction,
}: {
  index: number;
  direction: -1 | 1;
}): void {
  if (props.disabled) return;
  const reorderedItems = [...items.value];
  const item = reorderedItems.at(index);
  if (
    item === undefined ||
    index + direction < 0 ||
    index + direction >= reorderedItems.length
  )
    return;
  reorderedItems.splice(index, 1);
  reorderedItems.splice(index + direction, 0, item);
  items.value = reorderedItems;
}
defineExpose({ validate });
</script>

<style scoped lang="scss">
.qv-items {
  display: grid;
  gap: 1rem;
}
.list-actions,
.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.list-actions {
  justify-content: space-between;
}
.list-actions h2 {
  font-size: 1.1rem;
  margin: 0;
}
.item-actions > span {
  margin-inline-end: auto;
}
.item-card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 12px;
}
.validation-error {
  color: var(--q-negative);
  margin: 0;
}
</style>
