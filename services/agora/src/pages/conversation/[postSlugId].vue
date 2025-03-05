<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
      </DefaultMenuBar>
    </template>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <PostDetails
        v-if="dataLoaded"
        :key="postData.metadata.opinionCount"
        :extended-post-data="postData"
        :compact-mode="false"
        :skeleton-mode="false"
      />
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useBackendPostApi } from "src/utils/api/post";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const { fetchPostBySlugId } = useBackendPostApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { emptyPost } = usePostStore();
const postData = ref<ExtendedConversation>(emptyPost);

const dataLoaded = ref(false);

const route = useRoute();

onMounted(async () => {
  const isSuccessful = await loadData();
  if (isSuccessful) {
    dataLoaded.value = true;
  }
});

async function loadData() {
  if (route.name == "/conversation/[postSlugId]") {
    const response = await fetchPostBySlugId(
      route.params.postSlugId,
      isAuthenticated.value
    );
    if (response != null) {
      postData.value = response;
      return true;
    } else {
      postData.value = emptyPost;
      return false;
    }
  } else {
    postData.value = emptyPost;
    return false;
  }
}

async function pullDownTriggered(done: () => void) {
  setTimeout(async () => {
    await loadData();
    done();
  }, 500);
}
</script>

<style scoped lang="scss"></style>
