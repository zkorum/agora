<template>
  <div class="session-lists">
    <q-list bordered class="session-list">
      <q-item>
        <q-item-section>
          <q-item-label>{{ currentLabel }}</q-item-label>
          <q-item-label caption>
            {{ startedLabel }} {{ formatDateTime(currentSession.startedAt) }}
          </q-item-label>
          <q-item-label caption>
            {{ expiresLabel }} {{ formatDateTime(currentSession.expiresAt) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <PrimeButton
            text
            severity="warn"
            class="session-warning-action"
            :label="logoutCurrentLabel"
            :loading="currentSessionBusy"
            :disabled="actionsDisabled"
            @click="emit('logoutCurrent')"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <q-list
      v-if="otherSessions.length > 0"
      bordered
      separator
      class="session-list"
    >
      <q-item v-for="session in otherSessions" :key="session.didWrite">
        <q-item-section>
          <q-item-label>{{ otherLabel }}</q-item-label>
          <q-item-label caption>
            {{ startedLabel }} {{ formatDateTime(session.startedAt) }}
          </q-item-label>
          <q-item-label caption>
            {{ expiresLabel }} {{ formatDateTime(session.expiresAt) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <PrimeButton
            text
            severity="warn"
            class="session-warning-action"
            :label="revokeLabel"
            :loading="busyDidWrite === session.didWrite"
            :disabled="actionsDisabled"
            @click="emit('revoke', session)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import type { AuthSession } from "src/shared/types/dto-auth";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

defineProps<{
  currentSession: AuthSession;
  otherSessions: AuthSession[];
  busyDidWrite: string | undefined;
  currentSessionBusy: boolean;
  actionsDisabled: boolean;
  currentLabel: string;
  otherLabel: string;
  startedLabel: string;
  expiresLabel: string;
  logoutCurrentLabel: string;
  revokeLabel: string;
}>();

const emit = defineEmits<{
  logoutCurrent: [];
  revoke: [session: AuthSession];
}>();

const formatDateTime = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.dateTimeWithTimeZone,
});
</script>

<style scoped lang="scss">
.session-lists {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-list {
  border-radius: 0.75rem;
  background: white;
}

.session-warning-action.p-button.p-button-warn {
  color: $warning;

  &:not(:disabled):hover {
    color: $warning;
    background: rgba($warning, 0.12);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba($warning, 0.3);
  }
}
</style>
