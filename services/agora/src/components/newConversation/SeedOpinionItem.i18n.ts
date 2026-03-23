import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface SeedOpinionItemTranslations {
  inputTextPlaceholder: string;
  deleteOpinion: string;
  confirmDeleteMessage: string;
  confirmDeleteConfirm: string;
  confirmDeleteCancel: string;
}

export const seedOpinionItemTranslations: Record<
  SupportedDisplayLanguageCodes,
  SeedOpinionItemTranslations
> = {
  en: {
    inputTextPlaceholder: "Input text",
    deleteOpinion: "Delete Statement",
    confirmDeleteMessage: "Are you sure you want to delete this statement?",
    confirmDeleteConfirm: "Delete",
    confirmDeleteCancel: "Cancel",
  },
  ar: {
    inputTextPlaceholder: "أدخل النص",
    deleteOpinion: "حذف المقترح",
    confirmDeleteMessage: "هل أنت متأكد أنك تريد حذف هذا المقترح؟",
    confirmDeleteConfirm: "حذف",
    confirmDeleteCancel: "إلغاء",
  },
  es: {
    inputTextPlaceholder: "Ingrese texto",
    deleteOpinion: "Eliminar Proposición",
    confirmDeleteMessage:
      "¿Estás seguro de que quieres eliminar esta proposición?",
    confirmDeleteConfirm: "Eliminar",
    confirmDeleteCancel: "Cancelar",
  },
  fa: {
    inputTextPlaceholder: "متن را وارد کنید",
    deleteOpinion: "حذف گزاره",
    confirmDeleteMessage: "آیا مطمئن هستید که می‌خواهید این گزاره را حذف کنید؟",
    confirmDeleteConfirm: "حذف",
    confirmDeleteCancel: "لغو",
  },
  fr: {
    inputTextPlaceholder: "Saisir le texte",
    deleteOpinion: "Supprimer la Proposition",
    confirmDeleteMessage:
      "Êtes-vous sûr de vouloir supprimer cette proposition ?",
    confirmDeleteConfirm: "Supprimer",
    confirmDeleteCancel: "Annuler",
  },
  "zh-Hans": {
    inputTextPlaceholder: "输入文本",
    deleteOpinion: "删除观点",
    confirmDeleteMessage: "确定要删除此观点吗？",
    confirmDeleteConfirm: "删除",
    confirmDeleteCancel: "取消",
  },
  "zh-Hant": {
    inputTextPlaceholder: "輸入文本",
    deleteOpinion: "刪除觀點",
    confirmDeleteMessage: "確定要刪除此觀點嗎？",
    confirmDeleteConfirm: "刪除",
    confirmDeleteCancel: "取消",
  },
  he: {
    inputTextPlaceholder: "הזינו טקסט",
    deleteOpinion: "מחיקת הצהרה",
    confirmDeleteMessage: "האם ברצונך למחוק הצהרה זו?",
    confirmDeleteConfirm: "מחק",
    confirmDeleteCancel: "ביטול",
  },
  ja: {
    inputTextPlaceholder: "テキストを入力",
    deleteOpinion: "主張を削除",
    confirmDeleteMessage: "この主張を削除してもよろしいですか？",
    confirmDeleteConfirm: "削除",
    confirmDeleteCancel: "キャンセル",
  },
  ky: {
    inputTextPlaceholder: "Текст киргизиңиз",
    deleteOpinion: "Пикирди жок кылуу",
    confirmDeleteMessage: "Бул пикирди жок кылууну каалайсызбы?",
    confirmDeleteConfirm: "Жок кылуу",
    confirmDeleteCancel: "Жокко чыгаруу",
  },
  ru: {
    inputTextPlaceholder: "Введите текст",
    deleteOpinion: "Удалить высказывание",
    confirmDeleteMessage: "Вы уверены, что хотите удалить это высказывание?",
    confirmDeleteConfirm: "Удалить",
    confirmDeleteCancel: "Отмена",
  },
};
