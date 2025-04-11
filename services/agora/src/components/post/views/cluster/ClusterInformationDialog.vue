<template>
  <div>
    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="title">Consensus Groups</div>

        <div>
          Consensus groups are created based on how people agree and disagree
          with opinions.
        </div>

        <div>
          We use machine learning to identify different schools of thought. This
          is the very same algorithm powering pol.is, the open-source wikisurvey
          tool developed by Computational Democracy.
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

const showDialog = defineModel<boolean>({ required: true });
</script>

<style lang="scss" scoped>
.title {
  font-size: 1.1rem;
  font-weight: 500;
  padding-bottom: 1rem;
}
</style>
