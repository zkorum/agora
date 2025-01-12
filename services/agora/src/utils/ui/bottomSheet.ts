import { useQuasar } from "quasar";
import { type Ref } from "vue";
import { useBackendPostApi } from "../api/post";
import { useUserStore } from "src/stores/user";
import { usePostStore } from "src/stores/post";
import { useNotify } from "./notify";
import { useRoute, useRouter } from "vue-router";
import { useBackendCommentApi } from "../api/comment";
import { storeToRefs } from "pinia";
import { useDialog } from "./dialog";
import { useAuthenticationStore } from "src/stores/authentication";

export const useBottomSheet = () => {
  const quasar = useQuasar();

  const { showLoginConfirmationDialog } = useDialog();

  const { showNotifyMessage } = useNotify();

  const router = useRouter();
  const route = useRoute();

  const { deletePostBySlugId } = useBackendPostApi();
  const { deleteCommentBySlugId } = useBackendCommentApi();

  const { profileData } = storeToRefs(useUserStore());
  const { loadUserProfile } = useUserStore();
  const { loadPostData } = usePostStore();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());

  interface QuasarAction {
    label: string;
    icon: string;
    id: string;
  }

  async function showCommentOptionSelector(
    commentSlugId: string,
    posterUserName: string,
    deleteCommentCallback: (deleted: boolean) => void,
    reportCommentCallback: () => void,
    openUserReportsCallback: () => void,
    muteUserCallback: () => void
  ) {
    const actionList: QuasarAction[] = [];

    actionList.push({
      label: "Report",
      icon: "mdi-flag",
      id: "report",
    });

    if (profileData.value.userName != posterUserName && isAuthenticated.value) {
      actionList.push({
        label: "Mute User",
        icon: "mdi-account-off",
        id: "muteUser",
      });
    }

    if (profileData.value.userName == posterUserName) {
      actionList.push({
        label: "Delete",
        icon: "mdi-delete",
        id: "delete",
      });
    }

    if (profileData.value.isModerator) {
      actionList.push({
        label: "Moderate",
        icon: "mdi-sword",
        id: "moderate",
      });

      actionList.push({
        label: "User Reports",
        icon: "mdi-account-alert",
        id: "userReports",
      });
    }

    quasar
      .bottomSheet({
        message: "Select an action for this comment",
        grid: false,
        actions: actionList,
      })
      .onOk(async (action: QuasarAction) => {
        console.log("Selected action: " + action.id);
        if (action.id == "report") {
          if (isAuthenticated.value) {
            reportCommentCallback();
          } else {
            showLoginConfirmationDialog();
          }
        } else if (action.id == "delete") {
          const response = await deleteCommentBySlugId(commentSlugId);
          if (response) {
            showNotifyMessage("Opinion deleted");
            deleteCommentCallback(true);
          } else {
            deleteCommentCallback(false);
          }
        } else if (action.id == "moderate") {
          await router.push({
            name: "/moderate/comment/[commentSlugId]/",
            params: { commentSlugId: commentSlugId },
          });
        } else if (action.id == "userReports") {
          openUserReportsCallback();
        } else if (action.id == "muteUser") {
          muteUserCallback();
        }
      })
      .onCancel(() => {
        console.log("Dismissed");
      })
      .onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      });
  }

  function showPostOptionSelector(
    postSlugId: string,
    posterUserName: string,
    reportPostCallback: () => void,
    openUserReportsCallback: () => void,
    muteUserCallback: () => void
  ) {
    const actionList: QuasarAction[] = [];

    actionList.push({
      label: "Report",
      icon: "mdi-flag",
      id: "report",
    });

    if (profileData.value.userName != posterUserName && isAuthenticated.value) {
      actionList.push({
        label: "Mute User",
        icon: "mdi-account-off",
        id: "muteUser",
      });
    }

    if (profileData.value.userName == posterUserName) {
      actionList.push({
        label: "Delete",
        icon: "mdi-delete",
        id: "delete",
      });
    }

    if (profileData.value.isModerator) {
      actionList.push({
        label: "Moderate",
        icon: "mdi-sword",
        id: "moderate",
      });

      actionList.push({
        label: "User Reports",
        icon: "mdi-account-alert",
        id: "userReports",
      });

      actionList.push({
        label: "Moderation History",
        icon: "mdi-book-open",
        id: "moderationHistory",
      });
    }

    quasar
      .bottomSheet({
        message: "Select an action for this post",
        grid: false,
        actions: actionList,
      })
      .onOk(async (action: QuasarAction) => {
        if (action.id == "report") {
          if (isAuthenticated.value) {
            reportPostCallback();
          } else {
            showLoginConfirmationDialog();
          }
        } else if (action.id == "delete") {
          const response = await deletePostBySlugId(postSlugId);
          if (response) {
            showNotifyMessage("Conversation deleted");
            await loadPostData(false);
            await loadUserProfile();
            if (route.name == "/post/[postSlugId]") {
              await router.push({ name: "/" });
            }
          }
        } else if (action.id == "moderate") {
          await router.push({
            name: "/moderate/post/[postSlugId]/",
            params: { postSlugId: postSlugId },
          });
        } else if (action.id == "userReports") {
          openUserReportsCallback();
        } else if (action.id == "muteUser") {
          muteUserCallback();
        } else if (action.id == "moderationHistory") {
          await router.push({
            name: "/post/[postSlugId]",
            params: { postSlugId: postSlugId },
            query: { filter: "moderated" },
          });
        }
      })
      .onCancel(() => {
        console.log("Dismissed");
      })
      .onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      });
  }

  function showCommentRankingReportSelector(reportReasonId: Ref<string>) {
    const actionList: QuasarAction[] = [];

    const icon = "mdi-circle-small";

    actionList.push(
      {
        label: "Spam",
        icon: icon,
        id: "spam",
      },
      {
        label: "Irrelevant",
        icon: icon,
        id: "irrelevant",
      },
      {
        label: "Harassment",
        icon: icon,
        id: "harassment",
      },
      {
        label: "Hate",
        icon: icon,
        id: "hate",
      },
      {
        label: "Sharing personal information",
        icon: icon,
        id: "personal-information",
      },
      {
        label: "Threatening violence",
        icon: icon,
        id: "violence",
      },
      {
        label: "Sexualization",
        icon: icon,
        id: "sexualization",
      }
    );

    quasar
      .bottomSheet({
        message:
          "Why do you think this comment is not appropriate for ranking?",
        grid: false,
        actions: actionList,
      })
      .onOk((action: QuasarAction) => {
        console.log("Selected action: " + action.id);
        reportReasonId.value = action.id;
      })
      .onCancel(() => {
        console.log("Dismissed");
      })
      .onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      });
  }

  return {
    showPostOptionSelector,
    showCommentRankingReportSelector,
    showCommentOptionSelector,
  };
};
