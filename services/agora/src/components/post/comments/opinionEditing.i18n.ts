import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface OpinionEditingTranslations {
  save: string;
  cancel: string;
  discard: string;
  discardDescription: string;
  keepEditing: string;
  hasVotes: string;
  unavailable: string;
  changed: string;
  failed: string;
}

export const opinionEditingTranslations: Record<
  SupportedDisplayLanguageCodes,
  OpinionEditingTranslations
> = {
  en: {
    save: "Save changes",
    cancel: "Cancel",
    discard: "Discard changes?",
    discardDescription: "Your changes to this statement will not be saved.",
    keepEditing: "Keep editing",
    hasVotes:
      "This statement has valid votes and cannot be edited while they remain.",
    unavailable: "This statement cannot be edited right now.",
    changed:
      "This statement has changed. Your changes have not been saved; reopen the editor to use the latest version.",
    failed: "Could not save your changes. Your text is still here.",
  },
  fr: {
    save: "Enregistrer",
    cancel: "Annuler",
    discard: "Abandonner les modifications ?",
    discardDescription:
      "Les modifications de cette proposition ne seront pas enregistrées.",
    keepEditing: "Continuer à modifier",
    hasVotes:
      "Cette proposition a des votes valides et ne peut pas être modifiée tant qu’ils sont présents.",
    unavailable: "Cette proposition ne peut pas être modifiée pour le moment.",
    changed:
      "Cette proposition a changé. Vos modifications n’ont pas été enregistrées ; rouvrez l’éditeur pour utiliser la dernière version.",
    failed:
      "Impossible d’enregistrer vos modifications. Votre texte est conservé.",
  },
  ar: {
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    discard: "تجاهل التغييرات؟",
    discardDescription: "لن يتم حفظ تغييراتك على هذا المقترح.",
    keepEditing: "متابعة التعديل",
    hasVotes: "لهذا المقترح أصوات صالحة ولا يمكن تعديله ما دامت موجودة.",
    unavailable: "لا يمكن تعديل هذا المقترح الآن.",
    changed:
      "تغيّر هذا المقترح. لم يتم حفظ تغييراتك؛ أعد فتح المحرر لاستخدام أحدث نسخة.",
    failed: "تعذر حفظ التغييرات. لا يزال نصك محفوظًا هنا.",
  },
  es: {
    save: "Guardar cambios",
    cancel: "Cancelar",
    discard: "¿Descartar cambios?",
    discardDescription: "Los cambios de esta proposición no se guardarán.",
    keepEditing: "Seguir editando",
    hasVotes:
      "Esta proposición tiene votos válidos y no se puede editar mientras se mantengan.",
    unavailable: "Esta proposición no se puede editar en este momento.",
    changed:
      "Esta proposición ha cambiado. Tus cambios no se han guardado; vuelve a abrir el editor para usar la última versión.",
    failed: "No se pudieron guardar los cambios. Tu texto sigue aquí.",
  },
  fa: {
    save: "ذخیره تغییرات",
    cancel: "لغو",
    discard: "حذف تغییرات؟",
    discardDescription: "تغییرات شما در این گزاره ذخیره نخواهد شد.",
    keepEditing: "ادامه ویرایش",
    hasVotes:
      "این گزاره رأی‌های معتبر دارد و تا زمانی که باقی باشند قابل ویرایش نیست.",
    unavailable: "این گزاره در حال حاضر قابل ویرایش نیست.",
    changed:
      "این گزاره تغییر کرده است. تغییرات شما ذخیره نشد؛ برای استفاده از آخرین نسخه ویرایشگر را دوباره باز کنید.",
    failed: "ذخیره تغییرات ممکن نشد. متن شما همچنان اینجاست.",
  },
  "zh-Hans": {
    save: "保存修改",
    cancel: "取消",
    discard: "放弃修改？",
    discardDescription: "对此陈述的修改将不会保存。",
    keepEditing: "继续编辑",
    hasVotes: "此陈述仍有有效投票，只要这些有效投票仍然存在就无法编辑。",
    unavailable: "此陈述目前无法编辑。",
    changed: "此陈述已更改。你的修改尚未保存；请重新打开编辑器以使用最新版本。",
    failed: "无法保存修改。你的文本仍保留在这里。",
  },
  "zh-Hant": {
    save: "儲存修改",
    cancel: "取消",
    discard: "放棄修改？",
    discardDescription: "對此陳述的修改將不會儲存。",
    keepEditing: "繼續編輯",
    hasVotes: "此陳述仍有有效投票，只要這些有效投票仍然存在就無法編輯。",
    unavailable: "此陳述目前無法編輯。",
    changed: "此陳述已變更。你的修改尚未儲存；請重新開啟編輯器以使用最新版本。",
    failed: "無法儲存修改。你的文字仍保留在這裡。",
  },
  he: {
    save: "שמירת שינויים",
    cancel: "ביטול",
    discard: "למחוק את השינויים?",
    discardDescription: "השינויים בהצהרה זו לא יישמרו.",
    keepEditing: "המשך עריכה",
    hasVotes: "להצהרה זו יש הצבעות תקפות ולא ניתן לערוך אותה כל עוד הן קיימות.",
    unavailable: "לא ניתן לערוך הצהרה זו כרגע.",
    changed:
      "הצהרה זו השתנתה. השינויים שלך לא נשמרו; יש לפתוח מחדש את העורך כדי להשתמש בגרסה העדכנית.",
    failed: "לא ניתן לשמור את השינויים. הטקסט שלך עדיין כאן.",
  },
  ja: {
    save: "変更を保存",
    cancel: "キャンセル",
    discard: "変更を破棄しますか？",
    discardDescription: "この意見への変更は保存されません。",
    keepEditing: "編集を続ける",
    hasVotes: "有効な投票が残っている間は、この意見を編集できません。",
    unavailable: "この意見は現在編集できません。",
    changed:
      "この意見は変更されました。変更は保存されていません。最新の内容を編集するには、エディターを開き直してください。",
    failed: "変更を保存できませんでした。入力内容はここに残っています。",
  },
  ky: {
    save: "Өзгөртүүлөрдү сактоо",
    cancel: "Жокко чыгаруу",
    discard: "Өзгөртүүлөр жокко чыгарылсынбы?",
    discardDescription: "Бул пикирге киргизген өзгөртүүлөрүңүз сакталбайт.",
    keepEditing: "Түзөтүүнү улантуу",
    hasVotes:
      "Бул пикирде жарактуу добуштар бар жана алар бар кезде аны түзөтүүгө болбойт.",
    unavailable: "Бул пикирди азыр түзөтүүгө болбойт.",
    changed:
      "Бул пикир өзгөрдү. Өзгөртүүлөрүңүз сакталган жок; акыркы нуска үчүн редакторду кайра ачыңыз.",
    failed:
      "Өзгөртүүлөрдү сактоо мүмкүн болгон жок. Текстиңиз бул жерде сакталууда.",
  },
  ru: {
    save: "Сохранить изменения",
    cancel: "Отмена",
    discard: "Отменить изменения?",
    discardDescription: "Изменения этого утверждения не будут сохранены.",
    keepEditing: "Продолжить редактирование",
    hasVotes:
      "У этого утверждения есть действительные голоса, и пока они остаются, его нельзя редактировать.",
    unavailable: "Это утверждение сейчас нельзя редактировать.",
    changed:
      "Это утверждение изменилось. Ваши изменения не сохранены; откройте редактор заново для работы с последней версией.",
    failed: "Не удалось сохранить изменения. Ваш текст остался здесь.",
  },
};
