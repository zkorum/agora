import { useQuasar } from "quasar";
import { type Ref } from "vue";
import { useDialog } from "./dialog";
import { useBackendPostApi } from "../api/post";
import { useUserStore } from "src/stores/user";
import { usePostStore } from "src/stores/post";
import { useNotify } from "./notify";
import { useRoute, useRouter } from "vue-router";
import { useBackendCommentApi } from "../api/comment";

export const useBottomSheet = () => {
  const quasar = useQuasar();

  const dialog = useDialog();
  const { showNotifyMessage } = useNotify();

  const router = useRouter();
  const route = useRoute();

  const { deletePostBySlugId } = useBackendPostApi();
  const { deleteCommentBySlugId } = useBackendCommentApi();

  const { profileData, loadUserProfile } = useUserStore();
  const { loadPostData } = usePostStore();

  interface QuasarAction {
    label: string;
    icon: string;
    id: string;
  }

  function showCommentOptionSelector(
    commentSlugId: string,
    posterUserName: string,
    deleteCommentCallback: (deleted: boolean) => void
  ) {
    const actionList: QuasarAction[] = [];

    actionList.push({
      label: "Report",
      icon: "mdi-flag",
      id: "report",
    });

    if (profileData.userName == posterUserName) {
      actionList.push({
        label: "Delete",
        icon: "mdi-delete",
        id: "delete",
      });
    }

    if (profileData.isModerator) {
      actionList.push({
        label: "Moderate",
        icon: "mdi-sword",
        id: "moderate",
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
          showStandardReportSelector("comment");
        } else if (action.id == "delete") {
          const response = await deleteCommentBySlugId(commentSlugId);
          if (response) {
            showNotifyMessage("Opinion deleted");
            deleteCommentCallback(true);
          } else {
            deleteCommentCallback(false);
          }
        } else if (action.id == "moderate") {
          router.push({
            name: "moderate-comment-page",
            params: { commentSlugId: commentSlugId },
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

  function showPostOptionSelector(postSlugId: string, posterUserName: string) {
    const actionList: QuasarAction[] = [];

    actionList.push({
      label: "Report",
      icon: "mdi-flag",
      id: "report",
    });

    if (profileData.userName == posterUserName) {
      actionList.push({
        label: "Delete",
        icon: "mdi-delete",
        id: "delete",
      });
    }

    if (profileData.isModerator) {
      actionList.push({
        label: "Moderate",
        icon: "mdi-sword",
        id: "moderate",
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
          showStandardReportSelector("post");
        } else if (action.id == "delete") {
          const response = await deletePostBySlugId(postSlugId);
          if (response) {
            showNotifyMessage("Conservation deleted");
            await loadPostData(false);
            await loadUserProfile();
            if (route.name == "single-post") {
              await router.push({ name: "default-home-feed" });
            }
          }
        } else if (action.id == "moderate") {
          await router.push({
            name: "moderate-post-page",
            params: { postSlugId: postSlugId },
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

  function showStandardReportSelector(itemName: "post" | "comment") {
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
        message: `Why do you think this ${itemName} is not appropriate?`,
        grid: false,
        actions: actionList,
      })
      .onOk((action: QuasarAction) => {
        console.log("Selected action: " + action.id);
        dialog.showReportDialog(itemName);
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
