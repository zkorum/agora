import { useQuasar } from "quasar";
import { useNotify } from "./notify";

export const useDialog = () => {
  const quasar = useQuasar();
  const { showNotifyMessage } = useNotify();

  function showReportDialog(itemName: "post" | "comment") {
    quasar.dialog({
      title: "Thank you for the report",
      message: `Admins will investigate if the ${itemName} contains inappropriate content.`,
    });
  }

  function showContactUsSuccessfulDialog() {
    quasar.dialog({
      title: "Thank you for reaching out to us",
      message:
        "Our team will contact you through email after reviewing your message!",
    });
  }

  function showMessage(title: string | undefined, body: string) {
    quasar.dialog({
      title: title,
      message: body,
    });
  }

  function showDeleteAccountDialog(callbackSuccess: () => void) {
    quasar
      .dialog({
        title: "Are you sure?",
        message:
          "To delete your account. Please confirm by typing DELETE into the box.",
        prompt: {
          model: "",
          isValid: (val) => val == "DELETE",
          type: "text", // optional
          placeholder: "Type DELETE to confirm",
        },
        cancel: true,
        persistent: false,
      })
      .onOk(async (data) => {
        if (data == "DELETE") {
          callbackSuccess();
        } else {
          showNotifyMessage(
            "Account deletion request failed. Try again later."
          );
        }
      })
      .onCancel(() => {
        // console.log('>>>> Cancel')
      })
      .onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      });
  }

  return {
    showReportDialog,
    showContactUsSuccessfulDialog,
    showMessage,
    showDeleteAccountDialog,
  };
};
