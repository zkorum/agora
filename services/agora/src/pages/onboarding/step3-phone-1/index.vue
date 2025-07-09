<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="">
        <StepperLayout
          :submit-call-back="validateNumber"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="
            selectedCountryCode.code.length > 0 && inputNumber.length > 0
          "
          :show-next-button="true"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              title="Verify with phone number"
              :description="description"
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <div class="container">
              <div>You will receive a 6-digit one-time code by SMS</div>

              <Select
                v-model="selectedCountryCode"
                filter
                :options="countries"
                option-label="name"
                placeholder="Country Code"
                :pt="{
                  overlay: {
                    style: 'z-index: 2000',
                  },
                }"
              >
                <template #value="slotProps">
                  <div
                    v-if="slotProps.value.code != ''"
                    class="flex items-center"
                  >
                    <img
                      :alt="slotProps.value.label"
                      :src="getFlagLink(slotProps.value.country)"
                      class="flagImg"
                    />
                    <div>+ {{ slotProps.value.code }}</div>
                  </div>
                  <span v-else>
                    {{ slotProps.placeholder }}
                  </span>
                </template>
                <template #option="slotProps">
                  <div class="innerOption">
                    <img
                      :src="getFlagLink(slotProps.option.country)"
                      class="flagImg"
                      loading="lazy"
                    />
                    <div>{{ slotProps.option.name }}</div>
                  </div>
                </template>
              </Select>

              <InputText
                v-model="inputNumber"
                type="tel"
                placeholder="Phone number"
                required
              />

              <ZKButton
                button-type="largeButton"
                label="I'd prefer to login with complete privacy"
                text-color="primary"
                @click="goToPassportVerification()"
              />

              <div v-if="devAuthorizedNumbers.length > 0">
                <div class="developmentSection">
                  <div>Development Numbers:</div>

                  <div
                    v-for="authorizedNumber in devAuthorizedNumbers"
                    :key="authorizedNumber.fullNumber"
                  >
                    <ZKButton
                      button-type="largeButton"
                      color="blue"
                      :label="authorizedNumber.fullNumber"
                      @click="injectDevelopmentNumber(authorizedNumber)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import InputText from "primevue/inputtext";
import { ref } from "vue";
import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js/mobile";
import Select from "primevue/select";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useNotify } from "src/utils/ui/notify";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import { zodSupportedCountryCallingCode } from "src/shared/types/zod";
import { isPhoneNumberTypeSupported } from "src/shared/shared";

const inputNumber = ref("");

const router = useRouter();

const selectedCountryCode = ref<SelectItem>({
  name: "",
  country: "",
  code: "",
});
interface SelectItem {
  name: string;
  country: string;
  code: string;
}
const countries = ref<SelectItem[]>([]);

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const { showNotifyMessage } = useNotify();

const countryList = getCountries();
for (let i = 0; i < countryList.length; i++) {
  const country = countryList[i];
  const countryCode = getCountryCallingCode(country);
  const isNotSupported =
    !zodSupportedCountryCallingCode.safeParse(countryCode).success;
  if (isNotSupported) {
    continue;
  }
  const countryItem: SelectItem = {
    name: country + " +" + getCountryCallingCode(country),
    country: country,
    code: countryCode,
  };
  countries.value.push(countryItem);
} // TODO: some phone numbers may not be associated with any country: https://gitlab.com/catamphetamine/libphonenumber-js/-/tree/master?ref_type=heads#non-geographic - probably add those manually in the future

const description = "";

interface PhoneNumber {
  fullNumber: string;
  countryCallingCode: string;
}

const devAuthorizedNumbers: PhoneNumber[] = [];
checkDevAuthorizedNumbers();

async function goToPassportVerification() {
  await router.replace({ name: "/onboarding/step3-passport/" });
}

function getFlagLink(country: string) {
  return (
    process.env.VITE_PUBLIC_DIR +
    "/images/communities/flags/" +
    country +
    ".svg"
  );
}

async function injectDevelopmentNumber(phoneItem: PhoneNumber) {
  inputNumber.value = phoneItem.fullNumber;
  await validateNumber();
}

function checkDevAuthorizedNumbers() {
  if (process.env.VITE_DEV_AUTHORIZED_PHONES) {
    const phoneList = process.env.VITE_DEV_AUTHORIZED_PHONES.split(",");
    phoneList.forEach((number) => {
      const parsedNumber = parsePhoneNumberFromString(number);
      if (parsedNumber) {
        console.log(parsedNumber.number);
        devAuthorizedNumbers.push({
          fullNumber: parsedNumber.number,
          countryCallingCode: parsedNumber.countryCallingCode,
        });
      } else {
        console.log(
          "Failed to parse development number from string: " + number
        );
      }
    });
  }
}

async function validateNumber() {
  try {
    const phoneNumber = parsePhoneNumberFromString(inputNumber.value, {
      defaultCallingCode: selectedCountryCode.value.code,
    });
    if (!phoneNumber?.isValid()) {
      showNotifyMessage(
        "Sorry, this phone number is invalid. Please check and try again."
      );
      return;
    }
    const callingCode = zodSupportedCountryCallingCode.safeParse(
      phoneNumber.countryCallingCode
    );
    if (!callingCode.success) {
      showNotifyMessage("Sorry, this country code is not supported.");
      return;
    }
    const isPhoneTypeNotSupported = !isPhoneNumberTypeSupported(
      phoneNumber.getType()
    );
    if (isPhoneTypeNotSupported) {
      showNotifyMessage(
        "Sorry, this phone number is not supported for security reasons. Please try another."
      );
      return;
    }

    // success
    verificationPhoneNumber.value = {
      defaultCallingCode: callingCode.data,
      phoneNumber: phoneNumber.number,
    };
    await router.push({ name: "/onboarding/step3-phone-2/" });
  } catch (e) {
    // TODO: make sure this never happen one the first place
    console.error("Failed to parse phone number", e);
    showNotifyMessage(
      "Sorry, this phone number is invalid. Please check and try again."
    );
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.flagImg {
  width: 3rem;
  padding-right: 1rem;
}

.innerOption {
  display: flex;
  gap: 0rem;
}

.developmentSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 15px;
}
</style>
