<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
      <!-- Account option selection should be keyboard accessible for users with motor disabilities -->
      <div
        class="account-option"
        :class="{
          'account-option--selected': isAccountSelected(
            false,
            profileData.userName
          ),
        }"
        @click="setPostAs(false, profileData.userName)"
      >
        <DynamicProfileImage
          :user-identity="profileData.userName"
          :size="32"
          class="account-avatar"
        />
        <span class="account-name">{{ profileData.userName }}</span>
      </div>

      <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
      <!-- Organization account option selection should be keyboard accessible for users with motor disabilities -->
      <div
        v-for="organization in profileData.organizationList"
        :key="organization.name"
        class="account-option"
        :class="{
          'account-option--selected': isAccountSelected(
            true,
            organization.name
          ),
        }"
        @click="setPostAs(true, organization.name)"
      >
        <DynamicProfileImage
          :user-identity="organization.name"
          :size="32"
          :organization-image-url="organization.imageUrl"
          class="account-avatar"
        />
        <span class="account-name">{{ organization.name }}</span>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { profileData } = storeToRefs(useUserStore());
const { setPostAsOrganization, disablePostAsOrganization } =
  useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

function setPostAs(isOrganization: boolean, name: string) {
  if (isOrganization) {
    setPostAsOrganization(name);
  } else {
    disablePostAsOrganization();
  }
  showDialog.value = false;
}

function isAccountSelected(isOrganization: boolean, name: string): boolean {
  if (isOrganization) {
    return (
      conversationDraft.value.postAs.postAsOrganization &&
      conversationDraft.value.postAs.organizationName === name
    );
  } else {
    return !conversationDraft.value.postAs.postAsOrganization;
  }
}
</script>

<style scoped lang="scss">
.account-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-height: 56px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &--selected {
    background-color: rgba(25, 118, 210, 0.12);

    &:hover {
      background-color: rgba(25, 118, 210, 0.16);
    }
  }
}

.account-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.account-name {
  font-size: 16px;
  font-weight: 500;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.4;
}
</style>
