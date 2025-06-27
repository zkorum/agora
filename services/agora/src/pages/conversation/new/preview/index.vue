<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <BackButton />

      <ZKButton
        button-type="largeButton"
        color="primary"
        label="Next"
        size="0.8rem"
      />
    </TopMenuWrapper>
  </NewConversationLayout>
</template>

<script setup lang="ts">
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
</script>

<style scoped lang="scss"></style>
