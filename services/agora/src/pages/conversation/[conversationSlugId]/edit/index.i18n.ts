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
  notFoundErrorTitle: string;
  notFoundErrorMessage: string;
  notAuthorErrorTitle: string;
  notAuthorErrorMessage: string;
  conversationLockedErrorTitle: string;
  conversationLockedErrorMessage: string;
  invalidAccessSettingsError: string;
  pollAlreadyExistsError: string;
  noPollToRemoveError: string;
  noPollToKeepError: string;
  noPollToReplaceError: string;
  loadingErrorTitle: string;
  loadingErrorMessage: string;
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
    notFoundErrorTitle: "Conversation not found",
    notFoundErrorMessage: "Failed to load conversation",
    notAuthorErrorTitle: "You are not the author of this conversation",
    notAuthorErrorMessage:
      "Only the original author can edit this conversation",
    conversationLockedErrorTitle:
      "This conversation is locked and cannot be edited",
    conversationLockedErrorMessage:
      "Please contact a moderator if you need this conversation to be unlocked",
    invalidAccessSettingsError:
      "Invalid access settings. Login cannot be required for private conversations.",
    pollAlreadyExistsError:
      "Cannot create poll: this conversation already has a poll",
    noPollToRemoveError:
      "Cannot remove poll: this conversation does not have a poll",
    noPollToKeepError:
      "Cannot keep poll: this conversation does not have a poll",
    noPollToReplaceError:
      "Cannot replace poll: this conversation does not have a poll",
    loadingErrorTitle: "Failed to load conversation",
    loadingErrorMessage: "An error occurred while loading the conversation",
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
    notFoundErrorTitle: "Conversation introuvable",
    notFoundErrorMessage: "Échec du chargement de la conversation",
    notAuthorErrorTitle: "Vous n'êtes pas l'auteur de cette conversation",
    notAuthorErrorMessage:
      "Seul l'auteur original peut modifier cette conversation",
    conversationLockedErrorTitle:
      "Cette conversation est verrouillée et ne peut pas être modifiée",
    conversationLockedErrorMessage:
      "Veuillez contacter un modérateur si vous avez besoin de déverrouiller cette conversation",
    invalidAccessSettingsError:
      "Paramètres d'accès invalides. La connexion ne peut pas être requise pour les conversations privées.",
    pollAlreadyExistsError:
      "Impossible de créer un sondage : cette conversation a déjà un sondage",
    noPollToRemoveError:
      "Impossible de supprimer le sondage : cette conversation n'a pas de sondage",
    noPollToKeepError:
      "Impossible de conserver le sondage : cette conversation n'a pas de sondage",
    noPollToReplaceError:
      "Impossible de remplacer le sondage : cette conversation n'a pas de sondage",
    loadingErrorTitle: "Échec du chargement de la conversation",
    loadingErrorMessage:
      "Une erreur s'est produite lors du chargement de la conversation",
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
    notFoundErrorTitle: "Conversación no encontrada",
    notFoundErrorMessage: "Error al cargar la conversación",
    notAuthorErrorTitle: "No eres el autor de esta conversación",
    notAuthorErrorMessage:
      "Solo el autor original puede editar esta conversación",
    conversationLockedErrorTitle:
      "Esta conversación está bloqueada y no se puede editar",
    conversationLockedErrorMessage:
      "Por favor contacta a un moderador si necesitas desbloquear esta conversación",
    invalidAccessSettingsError:
      "Configuración de acceso inválida. No se puede requerir inicio de sesión para conversaciones privadas.",
    pollAlreadyExistsError:
      "No se puede crear encuesta: esta conversación ya tiene una encuesta",
    noPollToRemoveError:
      "No se puede eliminar encuesta: esta conversación no tiene una encuesta",
    noPollToKeepError:
      "No se puede mantener encuesta: esta conversación no tiene una encuesta",
    noPollToReplaceError:
      "No se puede reemplazar encuesta: esta conversación no tiene una encuesta",
    loadingErrorTitle: "Error al cargar la conversación",
    loadingErrorMessage: "Ocurrió un error al cargar la conversación",
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
    notFoundErrorTitle: "未找到对话",
    notFoundErrorMessage: "加载对话失败",
    notAuthorErrorTitle: "你不是此对话的作者",
    notAuthorErrorMessage: "只有原作者可以编辑此对话",
    conversationLockedErrorTitle: "此对话已锁定，无法编辑",
    conversationLockedErrorMessage: "如需解锁此对话，请联系管理员",
    invalidAccessSettingsError: "访问设置无效。私人对话不能要求登录。",
    pollAlreadyExistsError: "无法创建投票：此对话已有投票",
    noPollToRemoveError: "无法删除投票：此对话没有投票",
    noPollToKeepError: "无法保留投票：此对话没有投票",
    noPollToReplaceError: "无法替换投票：此对话没有投票",
    loadingErrorTitle: "加载对话失败",
    loadingErrorMessage: "加载对话时发生错误",
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
    notFoundErrorTitle: "未找到對話",
    notFoundErrorMessage: "載入對話失敗",
    notAuthorErrorTitle: "你不是此對話的作者",
    notAuthorErrorMessage: "只有原作者可以編輯此對話",
    conversationLockedErrorTitle: "此對話已鎖定，無法編輯",
    conversationLockedErrorMessage: "如需解鎖此對話，請聯絡管理員",
    invalidAccessSettingsError: "存取設定無效。私人對話不能要求登入。",
    pollAlreadyExistsError: "無法建立投票：此對話已有投票",
    noPollToRemoveError: "無法刪除投票：此對話沒有投票",
    noPollToKeepError: "無法保留投票：此對話沒有投票",
    noPollToReplaceError: "無法替換投票：此對話沒有投票",
    loadingErrorTitle: "載入對話失敗",
    loadingErrorMessage: "載入對話時發生錯誤",
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
    notFoundErrorTitle: "会話が見つかりません",
    notFoundErrorMessage: "会話の読み込みに失敗しました",
    notAuthorErrorTitle: "あなたはこの会話の作成者ではありません",
    notAuthorErrorMessage: "元の作成者のみがこの会話を編集できます",
    conversationLockedErrorTitle: "この会話はロックされており、編集できません",
    conversationLockedErrorMessage:
      "この会話のロックを解除する必要がある場合は、モデレーターにお問い合わせください",
    invalidAccessSettingsError:
      "アクセス設定が無効です。プライベートな会話ではログインを要求できません。",
    pollAlreadyExistsError:
      "投票を作成できません：この会話には既に投票があります",
    noPollToRemoveError: "投票を削除できません：この会話には投票がありません",
    noPollToKeepError: "投票を保持できません：この会話には投票がありません",
    noPollToReplaceError:
      "投票を置き換えできません：この会話には投票がありません",
    loadingErrorTitle: "会話の読み込みに失敗しました",
    loadingErrorMessage: "会話の読み込み中にエラーが発生しました",
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
    notFoundErrorTitle: "لم يتم العثور على المحادثة",
    notFoundErrorMessage: "فشل تحميل المحادثة",
    notAuthorErrorTitle: "أنت لست مؤلف هذه المحادثة",
    notAuthorErrorMessage: "يمكن للمؤلف الأصلي فقط تعديل هذه المحادثة",
    conversationLockedErrorTitle: "هذه المحادثة مقفلة ولا يمكن تعديلها",
    conversationLockedErrorMessage:
      "يرجى الاتصال بمشرف إذا كنت بحاجة إلى إلغاء قفل هذه المحادثة",
    invalidAccessSettingsError:
      "إعدادات الوصول غير صالحة. لا يمكن طلب تسجيل الدخول للمحادثات الخاصة.",
    pollAlreadyExistsError:
      "لا يمكن إنشاء استطلاع: تحتوي هذه المحادثة بالفعل على استطلاع",
    noPollToRemoveError:
      "لا يمكن إزالة الاستطلاع: لا تحتوي هذه المحادثة على استطلاع",
    noPollToKeepError:
      "لا يمكن الاحتفاظ بالاستطلاع: لا تحتوي هذه المحادثة على استطلاع",
    noPollToReplaceError:
      "لا يمكن استبدال الاستطلاع: لا تحتوي هذه المحادثة على استطلاع",
    loadingErrorTitle: "فشل تحميل المحادثة",
    loadingErrorMessage: "حدث خطأ أثناء تحميل المحادثة",
    pollChangeWarningMessage:
      "سيؤدي تغيير خيارات الاستطلاع إلى إعادة تعيين جميع الأصوات الموجودة. هل أنت متأكد أنك تريد المتابعة؟",
    removePollWarningMessage:
      "ستؤدي إزالة الاستطلاع إلى حذف جميع الأصوات الموجودة. هل أنت متأكد أنك تريد المتابعة؟",
    pollChangeWarningConfirm: "نعم، تابع",
    pollChangeWarningCancel: "إلغاء",
  },
};
