<template>
  <div class="zupass-verification">
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ t('title') }}</div>
        <p class="text-body2 text-grey-7">{{ t('description') }}</p>
      </q-card-section>

      <q-card-section>
        <q-btn
          class="full-width"
          :loading="isVerifying"
          :disable="isVerifying"
          color="primary"
          :label="t('verifyButton')"
          @click="handleVerify"
        />

        <div v-if="error" class="q-mt-md">
          <q-banner class="bg-negative text-white" rounded>
            <template #avatar>
              <q-icon name="error" color="white" />
            </template>
            {{ getErrorMessage(error) }}
          </q-banner>
        </div>

        <div v-if="verificationSuccess" class="q-mt-md">
          <q-banner class="bg-positive text-white" rounded>
            <template #avatar>
              <q-icon name="check_circle" color="white" />
            </template>
            {{ t('successMessage') }}
          </q-banner>
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-caption text-grey-6">
          {{ t('note') }}
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useComponentI18n } from 'src/composables/ui/useComponentI18n';
import { useZupassVerification } from 'src/composables/zupass/useZupassVerification';
import type { EventSlug } from 'src/shared/types/zod';
import { useBackendAuthApi } from 'src/utils/api/auth';
import { useBackendZupassApi } from 'src/utils/api/zupass';
import { getPlatform } from 'src/utils/common';
import { useNotify } from 'src/utils/ui/notify';
import { ref } from 'vue';

import {
  type ZupassTicketVerificationTranslations,
  zupassTicketVerificationTranslations,
} from './ZupassTicketVerification.i18n';

interface Props {
  eventSlug: EventSlug;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  verified: [];
}>();

const { t } = useComponentI18n<ZupassTicketVerificationTranslations>(
  zupassTicketVerificationTranslations
);

const { isVerifying, requestTicketProof } = useZupassVerification();
const { verifyEventTicket } = useBackendZupassApi();
const { updateAuthState, getDeviceLoginStatus } = useBackendAuthApi();
const { showNotifyMessage } = useNotify();

// Get platform at setup level (can't call useQuasar in async functions)
const $q = useQuasar();
const platform = getPlatform($q.platform);

const error = ref<string | null>(null);
const verificationSuccess = ref(false);

async function handleVerify() {
  error.value = null;
  verificationSuccess.value = false;

  try {
    // Request proof from Zupass (opens popup)
    const proofResult = await requestTicketProof({
      eventSlug: props.eventSlug,
      platform,
    });

    if (!proofResult.success) {
      const errorCode = proofResult.error || 'unknown';
      const message = getErrorMessage(errorCode);
      error.value = errorCode;
      showNotifyMessage(message);
      return;
    }

    // Send GPC proof to backend for verification
    const verifyResult = await verifyEventTicket({
      proof: proofResult.proof!,
      eventSlug: props.eventSlug,
    });

    if (verifyResult.success) {
      verificationSuccess.value = true;

      // Fetch full device login status from backend (includes verified tickets)
      const deviceStatus = await getDeviceLoginStatus();

      // Update auth state with full device status including verified tickets
      // MUST await to ensure store is updated before watch triggers conversation reload
      await updateAuthState({
        partialLoginStatus: deviceStatus,
        forceRefresh: true,
      });

      // Show appropriate message based on account state
      if (verifyResult.accountMerged) {
        showNotifyMessage(t("accountMerged"));
      } else {
        showNotifyMessage(t("successMessage"));
      }

      // Emit success event
      emit("verified");
    } else {
      const errorCode = verifyResult.reason || "unknown";
      const message = getErrorMessage(errorCode);
      error.value = errorCode;
      showNotifyMessage(message);
    }
  } catch (err) {
    const errorCode = err instanceof Error ? err.message : 'unknown';
    const message = errorCode;
    error.value = errorCode;
    showNotifyMessage(message);
  }
}

function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    deserialization_error: t('errorDeserialization'),
    invalid_proof: t('errorInvalidProof'),
    invalid_signer: t('errorInvalidSigner'),
    wrong_event: t('errorWrongEvent'),
    ticket_already_used: t('errorTicketAlreadyUsed'),
    unknown: t('errorUnknown'),
  };
  return errorMessages[errorCode] || errorMessages.unknown;
}

</script>

<style scoped lang="scss">
.zupass-verification {
  max-width: 600px;
  margin: 0 auto;
}
</style>
