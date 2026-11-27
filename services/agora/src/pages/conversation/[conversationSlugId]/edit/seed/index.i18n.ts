import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface Texts {
  existingTitle: string;
  newTitle: string;
  draftDescription: string;
  editedStatus: string;
  deletedStatus: string;
  editStatement: string;
  deleteStatement: string;
  undoDelete: string;
  undoEdit: string;
  doneEditing: string;
  statementChanged: string;
  editingUnavailable: string;
  changeLimit: string;
  emptyExisting: string;
  sourceManaged: string;
}

export const editSeedOpinionsTranslations: Record<
  SupportedDisplayLanguageCodes,
  Texts
> = {
  en: {
    existingTitle: "Existing seed statements",
    newTitle: "Add new statements",
    draftDescription:
      "Changes only take effect when you save. You can undo edits and deletions before saving.",
    editedStatus: "Edited — unsaved",
    deletedStatus: "Deleted — unsaved",
    editStatement: "Edit",
    deleteStatement: "Delete statement",
    undoDelete: "Undo deletion",
    undoEdit: "Undo edit",
    doneEditing: "Done",
    statementChanged:
      "This statement changed or was deleted. Your draft is still here. Reload the conversation before saving.",
    editingUnavailable: "This statement cannot be edited here.",
    changeLimit:
      "You can change up to {limit} existing statements per save. Undo some changes to continue.",
    emptyExisting: "No seed statements yet.",
    sourceManaged:
      "These statements are synced from GitHub. Manage them on GitHub.",
  },
  de: {
    existingTitle: "Bestehende Startaussagen",
    newTitle: "Neue Aussagen hinzufügen",
    draftDescription:
      "Änderungen werden erst wirksam, wenn Sie speichern. Sie können Bearbeitungen und Löschungen vor dem Speichern rückgängig machen.",
    editedStatus: "Bearbeitet — nicht gespeichert",
    deletedStatus: "Gelöscht — nicht gespeichert",
    editStatement: "Bearbeiten",
    deleteStatement: "Aussage löschen",
    undoDelete: "Löschung rückgängig machen",
    undoEdit: "Bearbeitung rückgängig machen",
    doneEditing: "Fertig",
    statementChanged:
      "Diese Aussage wurde geändert oder gelöscht. Ihr Entwurf ist noch vorhanden. Laden Sie die Diskussion neu, bevor Sie speichern.",
    editingUnavailable: "Diese Aussage kann hier nicht bearbeitet werden.",
    changeLimit:
      "Sie können pro Speicherung bis zu {limit} bestehende Aussagen ändern. Machen Sie einige Änderungen rückgängig, um fortzufahren.",
    emptyExisting: "Noch keine Startaussagen vorhanden.",
    sourceManaged:
      "Diese Aussagen werden von GitHub synchronisiert. Verwalten Sie diese auf GitHub.",
  },
  hi: {
    existingTitle: "मौजूदा शुरुआती कथन",
    newTitle: "नए कथन जोड़ें",
    draftDescription:
      "परिवर्तन केवल सहेजने पर प्रभावी होते हैं। सहेजने से पहले आप संपादन और विलोपन को पूर्ववत कर सकते हैं।",
    editedStatus: "संपादित — सहेजा नहीं गया",
    deletedStatus: "हटाया गया — सहेजा नहीं गया",
    editStatement: "संपादित करें",
    deleteStatement: "कथन हटाएँ",
    undoDelete: "हटाना पूर्ववत करें",
    undoEdit: "संपादन पूर्ववत करें",
    doneEditing: "हो गया",
    statementChanged:
      "यह कथन बदल गया है या हटा दिया गया है। आपका मसौदा अभी भी यहाँ है। सहेजने से पहले चर्चा को पुनः लोड करें।",
    editingUnavailable: "इस कथन को यहाँ संपादित नहीं किया जा सकता।",
    changeLimit:
      "आप प्रति सहेजने पर {limit} तक मौजूदा कथनों को बदल सकते हैं। जारी रखने के लिए कुछ परिवर्तन पूर्ववत करें।",
    emptyExisting: "अभी कोई शुरुआती कथन नहीं है।",
    sourceManaged:
      "ये कथन GitHub से सिंक किए गए हैं। इन्हें GitHub पर प्रबंधित करें।",
  },
  fr: {
    existingTitle: "Propositions initiales existantes",
    newTitle: "Ajouter de nouvelles propositions",
    draftDescription:
      "Les modifications ne prennent effet qu’à l’enregistrement. Vous pouvez annuler les modifications et les suppressions avant d’enregistrer.",
    editedStatus: "Modifiée — non enregistrée",
    deletedStatus: "Supprimée — non enregistrée",
    editStatement: "Modifier",
    deleteStatement: "Supprimer la proposition",
    undoDelete: "Annuler la suppression",
    undoEdit: "Annuler la modification",
    doneEditing: "Terminé",
    statementChanged:
      "Cette proposition a été modifiée ou supprimée. Votre brouillon est conservé. Rechargez la conversation avant d’enregistrer.",
    editingUnavailable: "Cette proposition ne peut pas être modifiée ici.",
    changeLimit:
      "Vous pouvez modifier jusqu’à {limit} propositions existantes par enregistrement. Annulez certaines modifications pour continuer.",
    emptyExisting: "Aucune proposition initiale pour le moment.",
    sourceManaged:
      "Ces propositions sont synchronisées depuis GitHub. Gérez-les sur GitHub.",
  },
  es: {
    existingTitle: "Proposiciones iniciales existentes",
    newTitle: "Añadir nuevas proposiciones",
    draftDescription:
      "Los cambios solo se aplican al guardar. Puedes deshacer las modificaciones y eliminaciones antes de guardar.",
    editedStatus: "Modificada — sin guardar",
    deletedStatus: "Eliminada — sin guardar",
    editStatement: "Editar",
    deleteStatement: "Eliminar proposición",
    undoDelete: "Deshacer eliminación",
    undoEdit: "Deshacer edición",
    doneEditing: "Listo",
    statementChanged:
      "Esta proposición ha cambiado o se ha eliminado. Tu borrador sigue aquí. Recarga la conversación antes de guardar.",
    editingUnavailable: "Esta proposición no se puede editar aquí.",
    changeLimit:
      "Puedes cambiar hasta {limit} proposiciones existentes por guardado. Deshaz algunos cambios para continuar.",
    emptyExisting: "Todavía no hay proposiciones iniciales.",
    sourceManaged:
      "Estas proposiciones se sincronizan desde GitHub. Gestiónelas en GitHub.",
  },
  ar: {
    existingTitle: "المقترحات الأولية الحالية",
    newTitle: "إضافة مقترحات جديدة",
    draftDescription:
      "لا تسري التغييرات إلا عند الحفظ. يمكنك التراجع عن التعديلات والحذف قبل الحفظ.",
    editedStatus: "معدّل — غير محفوظ",
    deletedStatus: "محذوف — غير محفوظ",
    editStatement: "تعديل",
    deleteStatement: "حذف المقترح",
    undoDelete: "التراجع عن الحذف",
    undoEdit: "التراجع عن التعديل",
    doneEditing: "تم",
    statementChanged:
      "تغيّر هذا المقترح أو حُذف. لا تزال مسودتك هنا. أعد تحميل المحادثة قبل الحفظ.",
    editingUnavailable: "لا يمكن تعديل هذا المقترح هنا.",
    changeLimit:
      "يمكنك تغيير ما يصل إلى {limit} مقترحًا موجودًا في كل عملية حفظ. تراجع عن بعض التغييرات للمتابعة.",
    emptyExisting: "لا توجد مقترحات أولية بعد.",
    sourceManaged: "تتم مزامنة هذه المقترحات من GitHub. أدرها على GitHub.",
  },
  fa: {
    existingTitle: "گزاره‌های اولیه موجود",
    newTitle: "افزودن گزاره‌های جدید",
    draftDescription:
      "تغییرات فقط هنگام ذخیره اعمال می‌شوند. پیش از ذخیره می‌توانید ویرایش‌ها و حذف‌ها را لغو کنید.",
    editedStatus: "ویرایش‌شده — ذخیره‌نشده",
    deletedStatus: "حذف‌شده — ذخیره‌نشده",
    editStatement: "ویرایش",
    deleteStatement: "حذف گزاره",
    undoDelete: "لغو حذف",
    undoEdit: "لغو ویرایش",
    doneEditing: "تمام",
    statementChanged:
      "این گزاره تغییر کرده یا حذف شده است. پیش‌نویس شما همچنان اینجاست. پیش از ذخیره گفتگو را دوباره بارگیری کنید.",
    editingUnavailable: "این گزاره در اینجا قابل ویرایش نیست.",
    changeLimit:
      "در هر بار ذخیره می‌توانید حداکثر {limit} گزاره موجود را تغییر دهید. برای ادامه برخی تغییرات را لغو کنید.",
    emptyExisting: "هنوز گزاره اولیه‌ای وجود ندارد.",
    sourceManaged:
      "این گزاره‌ها از GitHub همگام‌سازی می‌شوند. آن‌ها را در GitHub مدیریت کنید.",
  },
  he: {
    existingTitle: "הצהרות ראשוניות קיימות",
    newTitle: "הוספת הצהרות חדשות",
    draftDescription:
      "השינויים יחולו רק בעת השמירה. ניתן לבטל עריכות ומחיקות לפני השמירה.",
    editedStatus: "נערכה — לא נשמרה",
    deletedStatus: "נמחקה — לא נשמרה",
    editStatement: "עריכה",
    deleteStatement: "מחיקת הצהרה",
    undoDelete: "ביטול מחיקה",
    undoEdit: "ביטול עריכה",
    doneEditing: "סיום",
    statementChanged:
      "הצהרה זו השתנתה או נמחקה. הטיוטה שלך עדיין כאן. יש לטעון מחדש את השיחה לפני השמירה.",
    editingUnavailable: "לא ניתן לערוך הצהרה זו כאן.",
    changeLimit:
      "ניתן לשנות עד {limit} הצהרות קיימות בכל שמירה. יש לבטל חלק מהשינויים כדי להמשיך.",
    emptyExisting: "עדיין אין הצהרות ראשוניות.",
    sourceManaged: "הצהרות אלה מסונכרנות מ־GitHub. יש לנהל אותן ב־GitHub.",
  },
  "zh-Hans": {
    existingTitle: "现有初始陈述",
    newTitle: "添加新陈述",
    draftDescription: "更改仅在保存后生效。保存前可以撤销编辑和删除。",
    editedStatus: "已编辑 — 未保存",
    deletedStatus: "已删除 — 未保存",
    editStatement: "编辑",
    deleteStatement: "删除陈述",
    undoDelete: "撤销删除",
    undoEdit: "撤销编辑",
    doneEditing: "完成",
    statementChanged:
      "此陈述已更改或删除。你的草稿仍保留在这里。请重新加载对话后再保存。",
    editingUnavailable: "此陈述无法在此编辑。",
    changeLimit:
      "每次保存最多可以更改 {limit} 条现有陈述。请撤销部分更改后继续。",
    emptyExisting: "暂无初始陈述。",
    sourceManaged: "这些陈述从 GitHub 同步。请在 GitHub 上管理。",
  },
  "zh-Hant": {
    existingTitle: "現有初始陳述",
    newTitle: "新增陳述",
    draftDescription: "變更僅在儲存後生效。儲存前可以復原編輯和刪除。",
    editedStatus: "已編輯 — 未儲存",
    deletedStatus: "已刪除 — 未儲存",
    editStatement: "編輯",
    deleteStatement: "刪除陳述",
    undoDelete: "復原刪除",
    undoEdit: "復原編輯",
    doneEditing: "完成",
    statementChanged:
      "此陳述已變更或刪除。你的草稿仍保留在這裡。請重新載入對話後再儲存。",
    editingUnavailable: "此陳述無法在此編輯。",
    changeLimit:
      "每次儲存最多可以變更 {limit} 條現有陳述。請復原部分變更後繼續。",
    emptyExisting: "尚無初始陳述。",
    sourceManaged: "這些陳述從 GitHub 同步。請在 GitHub 上管理。",
  },
  ja: {
    existingTitle: "既存の初期意見",
    newTitle: "新しい意見を追加",
    draftDescription:
      "変更は保存時にのみ反映されます。保存前に編集や削除を取り消せます。",
    editedStatus: "編集済み — 未保存",
    deletedStatus: "削除済み — 未保存",
    editStatement: "編集",
    deleteStatement: "意見を削除",
    undoDelete: "削除を取り消す",
    undoEdit: "編集を取り消す",
    doneEditing: "完了",
    statementChanged:
      "この意見は変更または削除されました。下書きはここに残っています。保存前に会話を再読み込みしてください。",
    editingUnavailable: "この意見はここでは編集できません。",
    changeLimit:
      "一度の保存で変更できる既存の意見は{limit}件までです。一部の変更を取り消して続けてください。",
    emptyExisting: "初期意見はまだありません。",
    sourceManaged:
      "これらの意見は GitHub から同期されます。GitHub で管理してください。",
  },
  ky: {
    existingTitle: "Учурдагы баштапкы пикирлер",
    newTitle: "Жаңы пикирлерди кошуу",
    draftDescription:
      "Өзгөртүүлөр сактаганда гана күчүнө кирет. Сактоодон мурун түзөтүүлөрдү жана өчүрүүлөрдү жокко чыгара аласыз.",
    editedStatus: "Түзөтүлдү — сактала элек",
    deletedStatus: "Өчүрүлдү — сактала элек",
    editStatement: "Түзөтүү",
    deleteStatement: "Пикирди өчүрүү",
    undoDelete: "Өчүрүүнү жокко чыгаруу",
    undoEdit: "Түзөтүүнү жокко чыгаруу",
    doneEditing: "Бүттү",
    statementChanged:
      "Бул пикир өзгөртүлгөн же өчүрүлгөн. Сиздин долбооруңуз бул жерде сакталууда. Сактоодон мурун маекти кайра жүктөңүз.",
    editingUnavailable: "Бул пикирди бул жерден түзөтүүгө болбойт.",
    changeLimit:
      "Бир сактоодо {limit} учурдагы пикирге чейин өзгөртө аласыз. Улантуу үчүн айрым өзгөртүүлөрдү жокко чыгарыңыз.",
    emptyExisting: "Баштапкы пикирлер азырынча жок.",
    sourceManaged:
      "Бул пикирлер GitHub менен шайкештештирилет. Аларды GitHub аркылуу башкарыңыз.",
  },
  ru: {
    existingTitle: "Существующие начальные высказывания",
    newTitle: "Добавить новые высказывания",
    draftDescription:
      "Изменения вступят в силу только после сохранения. До сохранения можно отменить правки и удаления.",
    editedStatus: "Изменено — не сохранено",
    deletedStatus: "Удалено — не сохранено",
    editStatement: "Изменить",
    deleteStatement: "Удалить высказывание",
    undoDelete: "Отменить удаление",
    undoEdit: "Отменить правку",
    doneEditing: "Готово",
    statementChanged:
      "Это высказывание изменено или удалено. Ваш черновик сохранён здесь. Перед сохранением перезагрузите обсуждение.",
    editingUnavailable: "Это высказывание нельзя изменить здесь.",
    changeLimit:
      "За одно сохранение можно изменить до {limit} существующих высказываний. Отмените часть изменений, чтобы продолжить.",
    emptyExisting: "Начальных высказываний пока нет.",
    sourceManaged:
      "Эти высказывания синхронизируются с GitHub. Управляйте ими на GitHub.",
  },
};
