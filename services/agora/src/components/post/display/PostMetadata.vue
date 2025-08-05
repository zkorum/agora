<template>
  <div>
    <div class="container">
      <div>
        <UserIdentityCard
          :author-verified="authorVerified"
          :created-at="createdAt"
          :user-identity="
            props.organizationName == ''
              ? posterUserName
              : props.organizationName
          "
          :show-verified-text="false"
          :organization-image-url="props.organizationUrl"
        />
      </div>

      <div>
        <ZKButton
          button-type="icon"
          flat
          text-color="color-text-weak"
          icon="mdi-dots-vertical"
          size="0.656rem"
          @click.stop.prevent="clickedMoreIcon()"
        />
      </div>
    </div>
  </div>

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :opinion-slug-id="props.postSlugId"
      report-type="conversation"
      @close="showReportDialog = false"
    />
  </q-dialog>

  <PreLoginIntentionDialog
    v-model="showLoginDialog"
    :ok-callback="() => onLoginConfirmationOk()"
    :active-intention="'reportUserContent'"
  />
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import { ref } from "vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import { useRoute, useRouter } from "vue-router";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useHomeFeedStore } from "src/stores/homeFeed";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import { useConversationLoginIntentions } from "src/composables/useConversationLoginIntentions";

const emit = defineEmits(["openModerationHistory"]);

const props = defineProps<{
  authorVerified: boolean;
  posterUserName: string;
  createdAt: Date;
  postSlugId: string;
  organizationUrl: string;
  organizationName: string;
}>();

const router = useRouter();
const route = useRoute();

const { showPostOptionSelector } = useBottomSheet();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { muteUser } = useBackendUserMuteApi();
const { loadPostData } = useHomeFeedStore();

const showReportDialog = ref(false);

const showLoginDialog = ref(false);

const { setReportIntention } = useConversationLoginIntentions();

const webShare = useWebShare();
const { getEmbedUrl } = useConversationUrl();

function onLoginConfirmationOk() {
  setReportIntention("");
}

function reportContentCallback() {
  if (isLoggedIn.value) {
    showReportDialog.value = true;
  } else {
    showLoginDialog.value = true;
  }
}

async function openUserReportsCallback() {
  await router.push({
    name: "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
    params: {
      reportType: "conversation",
      conversationSlugId: props.postSlugId,
    },
  });
}

async function muteUserCallback() {
  const isSuccessful = await muteUser(props.posterUserName, "mute");
  if (isSuccessful) {
    await loadPostData();
  }
}

async function moderatePostCallback() {
  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/",
    params: { conversationSlugId: props.postSlugId },
  });
}

async function moderationHistoryCallback() {
  if (
    route.name == "/conversation/[postSlugId]" ||
    route.name == "/conversation/[postSlugId].embed"
  ) {
    emit("openModerationHistory");
  } else {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: props.postSlugId },
      query: { filter: "moderated" },
    });
  }
}

async function copyEmbedLinkCallback() {
  const embedUrl = getEmbedUrl(props.postSlugId);
  await webShare.share("Embed: Agora Conversation", embedUrl);
}

function clickedMoreIcon() {
  showPostOptionSelector(
    props.postSlugId,
    props.posterUserName,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderatePostCallback,
    moderationHistoryCallback,
    copyEmbedLinkCallback
  );
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
  color: $color-text-weak;
}

.iconSizeLarge {
  width: 4rem;
}

.reportDialog {
  background-color: white;
}

.identityFlex {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
