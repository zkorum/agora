import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EditConversationTranslations {
  saveButton: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  pageTitle: string;
  notFoundError: string;
  notAuthorError: string;
  loadingError: string;
  pollChangeWarningTitle: string;
  pollChangeWarningMessage: string;
  pollChangeWarningConfirm: string;
  pollChangeWarningCancel: string;
  updateSuccess: string;
  updateError: string;
  conversationLockedError: string;
  removePollWarningTitle: string;
  removePollWarningMessage: string;
  removePollWarningConfirm: string;
}

export const editConversationTranslations: Record<
  SupportedDisplayLanguageCodes,
  EditConversationTranslations
> = {
  en: {
    saveButton: "Save Changes",
    titlePlaceholder: "What do you want to ask?",
    bodyPlaceholder:
      "Body text. Provide context or relevant resources. Make sure it's aligned with the main question!",
    pageTitle: "Edit Conversation",
    notFoundError: "Conversation not found",
    notAuthorError: "You are not authorized to edit this conversation",
    loadingError: "Failed to load conversation data",
    pollChangeWarningTitle: "Warning: Poll Modification",
    pollChangeWarningMessage:
      "Modifying the poll options will clear all existing votes. This action cannot be undone. Do you want to continue?",
    pollChangeWarningConfirm: "Yes, Clear Votes",
    pollChangeWarningCancel: "Cancel",
    updateSuccess: "Conversation updated successfully",
    updateError: "Failed to update conversation",
    conversationLockedError: "This conversation is locked and cannot be edited",
    removePollWarningTitle: "Warning: Remove Poll",
    removePollWarningMessage:
      "Removing the poll will delete all existing votes. This action cannot be undone. Do you want to continue?",
    removePollWarningConfirm: "Yes, Remove Poll",
  },
  ar: {
    saveButton: "حفظ التغييرات",
    titlePlaceholder: "ماذا تريد أن تسأل؟",
    bodyPlaceholder:
      "نص المحتوى. قدم سياقاً أو موارد ذات صلة. تأكد من أنه متماشٍ مع السؤال الرئيسي!",
    pageTitle: "تحرير المحادثة",
    notFoundError: "المحادثة غير موجودة",
    notAuthorError: "ليس لديك صلاحية لتحرير هذه المحادثة",
    loadingError: "فشل تحميل بيانات المحادثة",
    pollChangeWarningTitle: "تحذير: تعديل الاستطلاع",
    pollChangeWarningMessage:
      "سيؤدي تعديل خيارات الاستطلاع إلى مسح جميع الأصوات الحالية. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟",
    pollChangeWarningConfirm: "نعم، امسح الأصوات",
    pollChangeWarningCancel: "إلغاء",
    updateSuccess: "تم تحديث المحادثة بنجاح",
    updateError: "فشل تحديث المحادثة",
    conversationLockedError: "هذه المحادثة مقفلة ولا يمكن تحريرها",
    removePollWarningTitle: "تحذير: إزالة الاستطلاع",
    removePollWarningMessage:
      "ستؤدي إزالة الاستطلاع إلى حذف جميع الأصوات الحالية. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟",
    removePollWarningConfirm: "نعم، احذف الاستطلاع",
  },
  es: {
    saveButton: "Guardar Cambios",
    titlePlaceholder: "¿Qué quiere preguntar?",
    bodyPlaceholder: "Agregue contexto o enlaces útiles",
    pageTitle: "Editar Conversación",
    notFoundError: "Conversación no encontrada",
    notAuthorError: "No está autorizado para editar esta conversación",
    loadingError: "Error al cargar los datos de la conversación",
    pollChangeWarningTitle: "Advertencia: Modificación de Encuesta",
    pollChangeWarningMessage:
      "Modificar las opciones de la encuesta borrará todos los votos existentes. Esta acción no se puede deshacer. ¿Desea continuar?",
    pollChangeWarningConfirm: "Sí, Borrar Votos",
    pollChangeWarningCancel: "Cancelar",
    updateSuccess: "Conversación actualizada exitosamente",
    updateError: "Error al actualizar la conversación",
    conversationLockedError:
      "Esta conversación está bloqueada y no se puede editar",
    removePollWarningTitle: "Advertencia: Eliminar Encuesta",
    removePollWarningMessage:
      "Eliminar la encuesta borrará todos los votos existentes. Esta acción no se puede deshacer. ¿Desea continuar?",
    removePollWarningConfirm: "Sí, Eliminar Encuesta",
  },
  fa: {
    saveButton: "ذخیره تغییرات",
    titlePlaceholder: "چه چیزی می‌خواهید بپرسید؟",
    bodyPlaceholder: "متن بدنه. زمینه یا منابع مرتبط ارائه دهید. مطمئن شوید با سؤال اصلی هم‌راستاست!",
    pageTitle: "ویرایش گفتگو",
    notFoundError: "گفتگو یافت نشد",
    notAuthorError: "شما مجاز به ویرایش این گفتگو نیستید",
    loadingError: "بارگذاری داده‌های گفتگو ناموفق بود",
    pollChangeWarningTitle: "هشدار: تغییر نظرسنجی",
    pollChangeWarningMessage:
      "تغییر گزینه‌های نظرسنجی تمام آراء موجود را پاک می‌کند. این عمل قابل بازگشت نیست. آیا می‌خواهید ادامه دهید؟",
    pollChangeWarningConfirm: "بله، آراء را پاک کن",
    pollChangeWarningCancel: "لغو",
    updateSuccess: "گفتگو با موفقیت به‌روزرسانی شد",
    updateError: "به‌روزرسانی گفتگو ناموفق بود",
    conversationLockedError: "این گفتگو قفل شده و قابل ویرایش نیست",
    removePollWarningTitle: "هشدار: حذف نظرسنجی",
    removePollWarningMessage:
      "حذف نظرسنجی تمام آراء موجود را حذف می‌کند. این عمل قابل بازگشت نیست. آیا می‌خواهید ادامه دهید؟",
    removePollWarningConfirm: "بله، نظرسنجی را حذف کن",
  },
  he: {
    saveButton: "שמור שינויים",
    titlePlaceholder: "מה ברצונך לשאול?",
    bodyPlaceholder: "טקסט גוף. ספקו הקשר או משאבים רלוונטיים. וודאו שהוא מתאים לשאלה המרכזית!",
    pageTitle: "עריכת שיחה",
    notFoundError: "השיחה לא נמצאה",
    notAuthorError: "אינך מורשה לערוך שיחה זו",
    loadingError: "טעינת נתוני השיחה נכשלה",
    pollChangeWarningTitle: "אזהרה: שינוי סקר",
    pollChangeWarningMessage:
      "שינוי אפשרויות הסקר ימחק את כל ההצבעות הקיימות. לא ניתן לבטל פעולה זו. האם ברצונך להמשיך?",
    pollChangeWarningConfirm: "כן, מחק הצבעות",
    pollChangeWarningCancel: "ביטול",
    updateSuccess: "השיחה עודכנה בהצלחה",
    updateError: "עדכון השיחה נכשל",
    conversationLockedError: "שיחה זו נעולה ולא ניתן לערוך אותה",
    removePollWarningTitle: "אזהרה: הסרת סקר",
    removePollWarningMessage:
      "הסרת הסקר תמחק את כל ההצבעות הקיימות. לא ניתן לבטל פעולה זו. האם ברצונך להמשיך?",
    removePollWarningConfirm: "כן, הסר סקר",
  },
  fr: {
    saveButton: "Enregistrer les Modifications",
    titlePlaceholder: "Que voulez-vous demander ?",
    bodyPlaceholder: "Ajoutez du contexte ou des liens utiles",
    pageTitle: "Modifier la Conversation",
    notFoundError: "Conversation introuvable",
    notAuthorError: "Vous n'êtes pas autorisé à modifier cette conversation",
    loadingError: "Échec du chargement des données de la conversation",
    pollChangeWarningTitle: "Attention : Modification du Sondage",
    pollChangeWarningMessage:
      "La modification des options du sondage effacera tous les votes existants. Cette action est irréversible. Voulez-vous continuer ?",
    pollChangeWarningConfirm: "Oui, Effacer les Votes",
    pollChangeWarningCancel: "Annuler",
    updateSuccess: "Conversation mise à jour avec succès",
    updateError: "Échec de la mise à jour de la conversation",
    conversationLockedError:
      "Cette conversation est verrouillée et ne peut pas être modifiée",
    removePollWarningTitle: "Attention : Supprimer le Sondage",
    removePollWarningMessage:
      "La suppression du sondage effacera tous les votes existants. Cette action est irréversible. Voulez-vous continuer ?",
    removePollWarningConfirm: "Oui, Supprimer le Sondage",
  },
  "zh-Hans": {
    saveButton: "保存更改",
    titlePlaceholder: "您想问什么？",
    bodyPlaceholder: "正文内容。提供背景或相关资源。确保与主要问题保持一致！",
    pageTitle: "编辑对话",
    notFoundError: "未找到对话",
    notAuthorError: "您无权编辑此对话",
    loadingError: "加载对话数据失败",
    pollChangeWarningTitle: "警告：修改投票",
    pollChangeWarningMessage:
      "修改投票选项将清除所有现有投票。此操作无法撤消。您要继续吗？",
    pollChangeWarningConfirm: "是的，清除投票",
    pollChangeWarningCancel: "取消",
    updateSuccess: "对话更新成功",
    updateError: "更新对话失败",
    conversationLockedError: "此对话已锁定，无法编辑",
    removePollWarningTitle: "警告：删除投票",
    removePollWarningMessage:
      "删除投票将清除所有现有投票。此操作无法撤消。您要继续吗？",
    removePollWarningConfirm: "是的，删除投票",
  },
  "zh-Hant": {
    saveButton: "儲存變更",
    titlePlaceholder: "您想問什麼？",
    bodyPlaceholder: "正文內容。提供背景或相關資源。確保與主要問題保持一致！",
    pageTitle: "編輯對話",
    notFoundError: "未找到對話",
    notAuthorError: "您無權編輯此對話",
    loadingError: "載入對話資料失敗",
    pollChangeWarningTitle: "警告：修改投票",
    pollChangeWarningMessage:
      "修改投票選項將清除所有現有投票。此操作無法復原。您要繼續嗎？",
    pollChangeWarningConfirm: "是的，清除投票",
    pollChangeWarningCancel: "取消",
    updateSuccess: "對話更新成功",
    updateError: "更新對話失敗",
    conversationLockedError: "此對話已鎖定，無法編輯",
    removePollWarningTitle: "警告：刪除投票",
    removePollWarningMessage:
      "刪除投票將清除所有現有投票。此操作無法復原。您要繼續嗎？",
    removePollWarningConfirm: "是的，刪除投票",
  },
  ja: {
    saveButton: "変更を保存",
    titlePlaceholder: "何を聞きたいですか？",
    bodyPlaceholder:
      "本文テキスト。背景や関連リソースを提供してください。メインの質問と一致していることを確認してください！",
    pageTitle: "会話を編集",
    notFoundError: "会話が見つかりません",
    notAuthorError: "この会話を編集する権限がありません",
    loadingError: "会話データの読み込みに失敗しました",
    pollChangeWarningTitle: "警告：投票の変更",
    pollChangeWarningMessage:
      "投票オプションを変更すると、すべての既存の投票がクリアされます。この操作は元に戻せません。続行しますか？",
    pollChangeWarningConfirm: "はい、投票をクリア",
    pollChangeWarningCancel: "キャンセル",
    updateSuccess: "会話が正常に更新されました",
    updateError: "会話の更新に失敗しました",
    conversationLockedError: "この会話はロックされており、編集できません",
    removePollWarningTitle: "警告：投票の削除",
    removePollWarningMessage:
      "投票を削除すると、すべての既存の投票が削除されます。この操作は元に戻せません。続行しますか？",
    removePollWarningConfirm: "はい、投票を削除",
  },
  ky: {
    saveButton: "Өзгөртүүлөрдү сактоо",
    titlePlaceholder: "Эмнени сурагыңыз келет?",
    bodyPlaceholder:
      "Негизги текст. Контекст же тиешелүү ресурстарды бериңиз. Негизги суроого шайкеш экенин текшериңиз!",
    pageTitle: "Талкууну түзөтүү",
    notFoundError: "Талкуу табылган жок",
    notAuthorError: "Бул талкууну түзөтүүгө укугуңуз жок",
    loadingError: "Талкуу маалыматтарын жүктөө ишке ашкан жок",
    pollChangeWarningTitle: "Эскертүү: Сурамжылоону өзгөртүү",
    pollChangeWarningMessage:
      "Сурамжылоо варианттарын өзгөртүү бардык учурдагы добуштарды тазалайт. Бул аракетти кайтаруу мүмкүн эмес. Улантасызбы?",
    pollChangeWarningConfirm: "Ооба, добуштарды тазалоо",
    pollChangeWarningCancel: "Жокко чыгаруу",
    updateSuccess: "Талкуу ийгиликтүү жаңыланды",
    updateError: "Талкууну жаңылоо ишке ашкан жок",
    conversationLockedError: "Бул талкуу кулпуланган жана түзөтүлбөйт",
    removePollWarningTitle: "Эскертүү: Сурамжылоону жок кылуу",
    removePollWarningMessage:
      "Сурамжылоону жок кылуу бардык учурдагы добуштарды жок кылат. Бул аракетти кайтаруу мүмкүн эмес. Улантасызбы?",
    removePollWarningConfirm: "Ооба, сурамжылоону жок кылуу",
  },
  ru: {
    saveButton: "Сохранить изменения",
    titlePlaceholder: "Что вы хотите спросить?",
    bodyPlaceholder:
      "Основной текст. Предоставьте контекст или полезные ресурсы. Убедитесь, что он соответствует главному вопросу!",
    pageTitle: "Редактировать обсуждение",
    notFoundError: "Обсуждение не найдено",
    notAuthorError: "У вас нет прав для редактирования этого обсуждения",
    loadingError: "Не удалось загрузить данные обсуждения",
    pollChangeWarningTitle: "Предупреждение: изменение опроса",
    pollChangeWarningMessage:
      "Изменение вариантов опроса очистит все существующие голоса. Это действие нельзя отменить. Продолжить?",
    pollChangeWarningConfirm: "Да, очистить голоса",
    pollChangeWarningCancel: "Отмена",
    updateSuccess: "Обсуждение успешно обновлено",
    updateError: "Не удалось обновить обсуждение",
    conversationLockedError:
      "Это обсуждение заблокировано и не может быть отредактировано",
    removePollWarningTitle: "Предупреждение: удаление опроса",
    removePollWarningMessage:
      "Удаление опроса приведёт к удалению всех существующих голосов. Это действие нельзя отменить. Продолжить?",
    removePollWarningConfirm: "Да, удалить опрос",
  },
};
