<template>
  <q-input
    v-model="userName"
    :label="t('usernameLabel')"
    :maxlength="MAX_LENGTH_USERNAME"
    :error="!isValidUsername"
    :error-message="userNameInvalidMessage"
    no-error-icon
    @update:model-value="nameContainsValidCharacters"
  >
    <template #append>
      <div class="inputButtons">
        <q-icon v-if="isValidUsername" name="mdi-check" text-color="red" />
        <ZKButton
          button-type="icon"
          icon="mdi-dice-6"
          color="black"
          flat
          :disable="isSubmitButtonLoading"
          @click="refreshName()"
        />
      </div>
    </template>

    <template #error>
      {{ validationMessage }}
    </template>
  </q-input>

  <ZKButton
    v-if="showSubmitButton"
    button-type="largeButton"
    :disable="!isValidUsername"
    :label="t('updateButton')"
    color="primary"
    @click="submitButtonClicked()"
  />
</template>

<script setup lang="ts">
import { MAX_LENGTH_USERNAME } from "src/shared/shared";
import { zodUsername } from "src/shared/types/zod";
import { useBackendAccountApi } from "src/utils/api/account";
import { ref, onMounted, watch } from "vue";
import { ZodError } from "zod";
import ZKButton from "../ui-library/ZKButton.vue";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";
import { useNotify } from "src/utils/ui/notify";
import { useCommonApi } from "src/utils/api/common";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  usernameChangeTranslations,
  type UsernameChangeTranslations,
} from "./UsernameChange.i18n";

defineProps<{
  showSubmitButton: boolean;
}>();

const emit = defineEmits(["isValidUsername", "userName"]);

const { profileData } = storeToRefs(useUserStore());
const { loadUserProfile } = useUserStore();

const userNameInvalidMessage = ref("");
const isValidUsername = ref(true);

const { isUsernameInUse, generateUnusedRandomUsername, submitUsernameChange } =
  useBackendAccountApi();

const { handleAxiosErrorStatusCodes } = useCommonApi();

const { showNotifyMessage } = useNotify();

const validationMessage = ref("");

const userName = ref("");

const isSubmitButtonLoading = ref(false);

const { t } = useComponentI18n<UsernameChangeTranslations>(
  usernameChangeTranslations
);

onMounted(async () => {
  await loadUserProfile();
  userName.value = profileData.value.userName;
});

watch(userName, () => {
  emit("userName", userName.value);
});

watch(isValidUsername, () => {
  emit("isValidUsername", isValidUsername.value);
});

async function submitButtonClicked() {
  isSubmitButtonLoading.value = true;
  const response = await submitUsernameChange(
    userName.value,
    profileData.value.userName
  );
  if (response.status == "success") {
    if (response.data) {
      showNotifyMessage(t("usernameChanged"));
    } else {
      showNotifyMessage(t("usernameAlreadyInUse"));
    }
  } else {
    handleAxiosErrorStatusCodes({
      axiosErrorCode: response.code,
      defaultMessage: t("submitError"),
    });
  }
  isSubmitButtonLoading.value = false;
}

async function nameContainsValidCharacters(): Promise<boolean> {
  try {
    zodUsername.parse(userName.value);

    const isInUse = await isUsernameInUse(userName.value);
    if (isInUse) {
      if (userName.value == profileData.value.userName) {
        isValidUsername.value = true;
        userNameInvalidMessage.value = "";
        return true;
      } else {
        isValidUsername.value = false;
        userNameInvalidMessage.value = t("usernameCurrentlyInUse");
        return false;
      }
    } else {
      isValidUsername.value = true;
      userNameInvalidMessage.value = "";
      return true;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      userNameInvalidMessage.value = error.format()._errors[0];
    }
    isValidUsername.value = false;
    return false;
  }
}

async function refreshName() {
  const response = await generateUnusedRandomUsername();
  if (response) {
    userName.value = response;
    isValidUsername.value = true;
  }
}
</script>

<style scoped lang="scss">
.inputButtons {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
