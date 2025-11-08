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

  function showDeleteAccountDialog({
    title,
    message,
    placeholder,
    errorMessage,
    callbackSuccess,
  }: {
    title: string;
    message: string;
    placeholder: string;
    errorMessage: string;
    callbackSuccess: () => void;
  }) {
    quasar
      .dialog({
        title,
        message,
        prompt: {
          model: "",
          isValid: (val) => val == "DELETE",
          type: "text",
          placeholder,
        },
        cancel: true,
        persistent: false,
      })
      .onOk((data) => {
        if (data == "DELETE") {
          callbackSuccess();
        } else {
          showNotifyMessage(errorMessage);
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
