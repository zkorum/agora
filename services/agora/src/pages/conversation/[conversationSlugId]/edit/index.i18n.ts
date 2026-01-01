import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EditConversationTranslations {
  saveButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  updateSuccess: string;
  updateError: string;
  notFoundError: string;
  notAuthorError: string;
  conversationLockedError: string;
  loadingError: string;
  pollChangeWarningMessage: string;
  removePollWarningMessage: string;
  pollChangeWarningConfirm: string;
  pollChangeWarningCancel: string;
}

export const editConversationTranslations: Record<
  SupportedDisplayLanguageCodes,
  EditConversationTranslations
> = {
  en: {
    saveButton: "Save",
    titlePlaceholder: "Conversation title",
    bodyPlaceholder: "What's on your mind?",
    updateSuccess: "Conversation updated successfully",
    updateError: "Failed to update conversation",
    notFoundError: "Conversation not found",
    notAuthorError: "You are not the author of this conversation",
    conversationLockedError: "This conversation is locked and cannot be edited",
    loadingError: "Failed to load conversation",
    pollChangeWarningMessage:
      "Changing poll options will reset all existing votes. Are you sure you want to continue?",
    removePollWarningMessage:
      "Removing the poll will delete all existing votes. Are you sure you want to continue?",
    pollChangeWarningConfirm: "Yes, Continue",
    pollChangeWarningCancel: "Cancel",
  },
  fr: {
    saveButton: "Enregistrer",
    titlePlaceholder: "Titre de la conversation",
    bodyPlaceholder: "Qu'avez-vous en tête ?",
    updateSuccess: "Conversation mise à jour avec succès",
    updateError: "Échec de la mise à jour de la conversation",
    notFoundError: "Conversation introuvable",
    notAuthorError: "Vous n'êtes pas l'auteur de cette conversation",
    conversationLockedError:
      "Cette conversation est verrouillée et ne peut pas être modifiée",
    loadingError: "Échec du chargement de la conversation",
    pollChangeWarningMessage:
      "Modifier les options du sondage réinitialisera tous les votes existants. Êtes-vous sûr de vouloir continuer ?",
    removePollWarningMessage:
      "Supprimer le sondage supprimera tous les votes existants. Êtes-vous sûr de vouloir continuer ?",
    pollChangeWarningConfirm: "Oui, Continuer",
    pollChangeWarningCancel: "Annuler",
  },
  es: {
    saveButton: "Guardar",
    titlePlaceholder: "Título de la conversación",
    bodyPlaceholder: "¿Qué tienes en mente?",
    updateSuccess: "Conversación actualizada exitosamente",
    updateError: "Error al actualizar la conversación",
    notFoundError: "Conversación no encontrada",
    notAuthorError: "No eres el autor de esta conversación",
    conversationLockedError:
      "Esta conversación está bloqueada y no se puede editar",
    loadingError: "Error al cargar la conversación",
    pollChangeWarningMessage:
      "Cambiar las opciones de la encuesta restablecerá todos los votos existentes. ¿Estás seguro de que quieres continuar?",
    removePollWarningMessage:
      "Eliminar la encuesta borrará todos los votos existentes. ¿Estás seguro de que quieres continuar?",
    pollChangeWarningConfirm: "Sí, Continuar",
    pollChangeWarningCancel: "Cancelar",
  },
  "zh-Hans": {
    saveButton: "保存",
    titlePlaceholder: "对话标题",
    bodyPlaceholder: "你在想什么？",
    updateSuccess: "对话更新成功",
    updateError: "更新对话失败",
    notFoundError: "未找到对话",
    notAuthorError: "你不是此对话的作者",
    conversationLockedError: "此对话已锁定，无法编辑",
    loadingError: "加载对话失败",
    pollChangeWarningMessage:
      "更改投票选项将重置所有现有投票。您确定要继续吗？",
    removePollWarningMessage: "删除投票将删除所有现有投票。您确定要继续吗？",
    pollChangeWarningConfirm: "是的，继续",
    pollChangeWarningCancel: "取消",
  },
  "zh-Hant": {
    saveButton: "儲存",
    titlePlaceholder: "對話標題",
    bodyPlaceholder: "你在想什麼？",
    updateSuccess: "對話更新成功",
    updateError: "更新對話失敗",
    notFoundError: "未找到對話",
    notAuthorError: "你不是此對話的作者",
    conversationLockedError: "此對話已鎖定，無法編輯",
    loadingError: "載入對話失敗",
    pollChangeWarningMessage:
      "更改投票選項將重置所有現有投票。您確定要繼續嗎？",
    removePollWarningMessage: "刪除投票將刪除所有現有投票。您確定要繼續嗎？",
    pollChangeWarningConfirm: "是的，繼續",
    pollChangeWarningCancel: "取消",
  },
  ja: {
    saveButton: "保存",
    titlePlaceholder: "会話のタイトル",
    bodyPlaceholder: "何を考えていますか？",
    updateSuccess: "会話が正常に更新されました",
    updateError: "会話の更新に失敗しました",
    notFoundError: "会話が見つかりません",
    notAuthorError: "あなたはこの会話の作成者ではありません",
    conversationLockedError: "この会話はロックされており、編集できません",
    loadingError: "会話の読み込みに失敗しました",
    pollChangeWarningMessage:
      "投票オプションを変更すると、既存の投票がすべてリセットされます。続行してもよろしいですか？",
    removePollWarningMessage:
      "投票を削除すると、既存の投票がすべて削除されます。続行してもよろしいですか？",
    pollChangeWarningConfirm: "はい、続行します",
    pollChangeWarningCancel: "キャンセル",
  },
  ar: {
    saveButton: "حفظ",
    titlePlaceholder: "عنوان المحادثة",
    bodyPlaceholder: "ما الذي يدور في ذهنك؟",
    updateSuccess: "تم تحديث المحادثة بنجاح",
    updateError: "فشل تحديث المحادثة",
    notFoundError: "لم يتم العثور على المحادثة",
    notAuthorError: "أنت لست مؤلف هذه المحادثة",
    conversationLockedError: "هذه المحادثة مقفلة ولا يمكن تعديلها",
    loadingError: "فشل تحميل المحادثة",
    pollChangeWarningMessage:
      "سيؤدي تغيير خيارات الاستطلاع إلى إعادة تعيين جميع الأصوات الموجودة. هل أنت متأكد أنك تريد المتابعة؟",
    removePollWarningMessage:
      "ستؤدي إزالة الاستطلاع إلى حذف جميع الأصوات الموجودة. هل أنت متأكد أنك تريد المتابعة؟",
    pollChangeWarningConfirm: "نعم، تابع",
    pollChangeWarningCancel: "إلغاء",
  },
};
