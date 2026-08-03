<template>
  <q-list bordered separator class="session-list">
    <q-item v-for="session in displaySessions" :key="session.didWrite">
      <q-item-section>
        <q-item-label>
          {{ session.kind === "current" ? currentLabel : otherLabel }}
        </q-item-label>
        <q-item-label caption>
          {{ startedLabel }} {{ formatDateTime(session.startedAt) }}
        </q-item-label>
        <q-item-label caption>
          {{ expiresLabel }} {{ formatDateTime(session.expiresAt) }}
        </q-item-label>
      </q-item-section>
      <q-item-section v-if="session.kind === 'other'" side>
        <q-btn
          flat
          color="negative"
          :label="revokeLabel"
          :loading="busyDidWrite === session.didWrite"
          :disable="busyDidWrite !== undefined"
          @click="emit('revoke', session.didWrite)"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useLocalizedDateTimeFormatter } from "src/composables/ui/useLocalizedDateTime";
import type { AuthSession } from "src/shared/types/dto-auth";
import { computed } from "vue";

const props = defineProps<{
  currentSession: AuthSession;
  otherSessions: AuthSession[];
  busyDidWrite: string | undefined;
  currentLabel: string;
  otherLabel: string;
  startedLabel: string;
  expiresLabel: string;
  revokeLabel: string;
}>();

const emit = defineEmits<{
  revoke: [didWrite: string];
}>();

type DisplaySession = AuthSession & { kind: "current" | "other" };

const formatDateTime = useLocalizedDateTimeFormatter();
const displaySessions = computed<DisplaySession[]>(() => [
  { ...props.currentSession, kind: "current" },
  ...props.otherSessions.map(
    (session): DisplaySession => ({
      ...session,
      kind: "other",
    })
  ),
]);
</script>

<style scoped lang="scss">
.session-list {
  border-radius: 0.75rem;
  background: white;
}
</style>
