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
import { storeToRefs } from "pinia";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import type { PostAsSettings } from "src/composables/conversation/draft";
import { useUserStore } from "src/stores/user";
import { computed } from "vue";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { profileData } = storeToRefs(useUserStore());

const postAs = defineModel<PostAsSettings>("postAs", { required: true });

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

function setPostAs(isOrganization: boolean, name: string): void {
  if (isOrganization) {
    postAs.value = {
      postAsOrganization: true,
      organizationName: name,
    };
  } else {
    postAs.value = {
      postAsOrganization: false,
      organizationName: "",
    };
  }
  showDialog.value = false;
}

function isAccountSelected(isOrganization: boolean, name: string): boolean {
  if (!postAs.value) return false;

  if (isOrganization) {
    return (
      postAs.value.postAsOrganization && postAs.value.organizationName === name
    );
  } else {
    return !postAs.value.postAsOrganization;
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
  min-height: 56px;
  @include hover-effects(
    $hover-background-color,
    $selected-hover-background-color
  );

  &--selected {
    @extend .selected;
  }
}

.account-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.account-name {
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
}
</style>
