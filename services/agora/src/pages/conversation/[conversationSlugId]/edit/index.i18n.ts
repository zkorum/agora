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
  invalidAccessSettingsError: string;
  loadingErrorMessage: string;
  createSurveyButton: string;
  editSurveyButton: string;
  premiumEditRestrictedBanner: string;
  premiumAccessExpiredError: string;
  premiumAccessRequiredError: string;
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
    notAuthorError: "You are not the facilitator of this conversation",
    conversationLockedError: "This conversation is locked and cannot be edited",
    invalidAccessSettingsError:
      "Invalid access settings. Login cannot be required for private conversations.",
    loadingErrorMessage: "An error occurred while loading the conversation",
    createSurveyButton: "Create survey",
    editSurveyButton: "Edit survey",
    premiumEditRestrictedBanner:
      "Premium access has expired. You can still update normal settings, but premium content changes are disabled.",
    premiumAccessExpiredError: "Premium access has expired for this change.",
    premiumAccessRequiredError:
      "This setting is not available with your current plan.",
  },
  de: {
    saveButton: "Speichern",
    titlePlaceholder: "Titel der Diskussion",
    bodyPlaceholder: "Was beschäftigt Sie?",
    updateSuccess: "Diskussion erfolgreich aktualisiert",
    updateError: "Aktualisierung der Diskussion fehlgeschlagen",
    notFoundError: "Diskussion nicht gefunden",
    notAuthorError: "Sie sind nicht die Moderationsleitung dieser Diskussion",
    conversationLockedError:
      "Diese Diskussion ist gesperrt und kann nicht bearbeitet werden",
    invalidAccessSettingsError:
      "Ungültige Zugriffseinstellungen. Für private Diskussionen darf keine Anmeldung erforderlich sein.",
    loadingErrorMessage:
      "Beim Laden der Diskussion ist ein Fehler aufgetreten.",
    createSurveyButton: "Umfrage erstellen",
    editSurveyButton: "Umfrage bearbeiten",
    premiumEditRestrictedBanner:
      "Der Premium-Zugang ist abgelaufen. Sie können normale Einstellungen weiterhin aktualisieren, aber Änderungen an Premium-Inhalten sind deaktiviert.",
    premiumAccessExpiredError:
      "Der Premium-Zugang ist für diese Änderung abgelaufen.",
    premiumAccessRequiredError:
      "Diese Einstellung ist mit Ihrem aktuellen Plan nicht verfügbar.",
  },
  hi: {
    saveButton: "सहेजें",
    titlePlaceholder: "चर्चा का शीर्षक",
    bodyPlaceholder: "आपके मन में क्या है?",
    updateSuccess: "चर्चा सफलतापूर्वक अद्यतन की गई",
    updateError: "चर्चा अद्यतन करने में विफल",
    notFoundError: "चर्चा नहीं मिली",
    notAuthorError: "आप इस चर्चा के संचालक नहीं हैं",
    conversationLockedError: "यह चर्चा लॉक है और इसे संपादित नहीं किया जा सकता",
    invalidAccessSettingsError:
      "अवैध पहुँच सेटिंग्स। निजी चर्चाओं के लिए लॉगिन आवश्यक नहीं हो सकता।",
    loadingErrorMessage: "चर्चा लोड करते समय एक त्रुटि हुई।",
    createSurveyButton: "सर्वेक्षण बनाएँ",
    editSurveyButton: "सर्वेक्षण संपादित करें",
    premiumEditRestrictedBanner:
      "प्रीमियम पहुँच समाप्त हो गई है। आप अभी भी सामान्य सेटिंग्स अपडेट कर सकते हैं, लेकिन प्रीमियम सामग्री परिवर्तन अक्षम हैं।",
    premiumAccessExpiredError:
      "इस परिवर्तन के लिए प्रीमियम पहुँच समाप्त हो गई है।",
    premiumAccessRequiredError:
      "यह सेटिंग आपकी वर्तमान योजना के साथ उपलब्ध नहीं है।",
  },
  fr: {
    saveButton: "Enregistrer",
    titlePlaceholder: "Titre de la conversation",
    bodyPlaceholder: "Qu'avez-vous en tête ?",
    updateSuccess: "Conversation mise à jour avec succès",
    updateError: "Échec de la mise à jour de la conversation",
    notFoundError: "Conversation introuvable",
    notAuthorError: "Vous n'êtes pas le facilitateur de cette conversation",
    conversationLockedError:
      "Cette conversation est verrouillée et ne peut pas être modifiée",
    invalidAccessSettingsError:
      "Paramètres d'accès invalides. La connexion ne peut pas être requise pour les conversations privées.",
    loadingErrorMessage:
      "Une erreur s'est produite lors du chargement de la conversation",
    createSurveyButton: "Créer un questionnaire",
    editSurveyButton: "Modifier le questionnaire",
    premiumEditRestrictedBanner:
      "L'accès premium a expiré. Vous pouvez toujours modifier les paramètres standards, mais les changements de contenu premium sont désactivés.",
    premiumAccessExpiredError: "L'accès premium a expiré pour ce changement.",
    premiumAccessRequiredError:
      "Ce paramètre n'est pas disponible avec votre offre actuelle.",
  },
  es: {
    saveButton: "Guardar",
    titlePlaceholder: "Título de la conversación",
    bodyPlaceholder: "¿Qué tiene en mente?",
    updateSuccess: "Conversación actualizada exitosamente",
    updateError: "Error al actualizar la conversación",
    notFoundError: "Conversación no encontrada",
    notAuthorError: "No es el facilitador de esta conversación",
    conversationLockedError:
      "Esta conversación está bloqueada y no se puede editar",
    invalidAccessSettingsError:
      "Configuración de acceso inválida. No se puede requerir inicio de sesión para conversaciones privadas.",
    loadingErrorMessage: "Ocurrió un error al cargar la conversación",
    createSurveyButton: "Crear encuesta",
    editSurveyButton: "Editar encuesta",
    premiumEditRestrictedBanner:
      "El acceso premium expiró. Todavía puede actualizar la configuración normal, pero los cambios de contenido premium están deshabilitados.",
    premiumAccessExpiredError: "El acceso premium expiró para este cambio.",
    premiumAccessRequiredError:
      "Esta configuración no está disponible con su plan actual.",
  },
  fa: {
    saveButton: "ذخیره",
    titlePlaceholder: "عنوان گفتگو",
    bodyPlaceholder: "به چه چیزی فکر می‌کنید؟",
    updateSuccess: "گفتگو با موفقیت به‌روزرسانی شد",
    updateError: "به‌روزرسانی گفتگو ناموفق بود",
    notFoundError: "گفتگو یافت نشد",
    notAuthorError: "شما تسهیل‌گر این گفتگو نیستید",
    conversationLockedError: "این گفتگو قفل شده و قابل ویرایش نیست",
    invalidAccessSettingsError:
      "تنظیمات دسترسی نامعتبر است. ورود به سیستم برای گفتگوهای خصوصی الزامی نیست.",
    loadingErrorMessage: "هنگام بارگذاری گفتگو خطایی رخ داد",
    createSurveyButton: "ایجاد نظرسنجی",
    editSurveyButton: "ویرایش نظرسنجی",
    premiumEditRestrictedBanner:
      "دسترسی ویژه منقضی شده است. هنوز می‌توانید تنظیمات عادی را تغییر دهید، اما تغییرات محتوای ویژه غیرفعال است.",
    premiumAccessExpiredError: "دسترسی ویژه برای این تغییر منقضی شده است.",
    premiumAccessRequiredError: "این تنظیم در طرح فعلی شما در دسترس نیست.",
  },
  he: {
    saveButton: "שמור",
    titlePlaceholder: "כותרת השיחה",
    bodyPlaceholder: "מה עובר לך בראש?",
    updateSuccess: "השיחה עודכנה בהצלחה",
    updateError: "עדכון השיחה נכשל",
    notFoundError: "השיחה לא נמצאה",
    notAuthorError: "אינך המנחה של שיחה זו",
    conversationLockedError: "שיחה זו נעולה ולא ניתן לערוך אותה",
    invalidAccessSettingsError:
      "הגדרות גישה לא תקינות. לא ניתן לדרוש התחברות עבור שיחות פרטיות.",
    loadingErrorMessage: "אירעה שגיאה בעת טעינת השיחה",
    createSurveyButton: "יצירת סקר",
    editSurveyButton: "עריכת סקר",
    premiumEditRestrictedBanner:
      "גישת הפרימיום פגה. עדיין ניתן לעדכן הגדרות רגילות, אך שינויי תוכן פרימיום מושבתים.",
    premiumAccessExpiredError: "גישת הפרימיום פגה עבור שינוי זה.",
    premiumAccessRequiredError: "הגדרה זו אינה זמינה בתוכנית הנוכחית שלך.",
  },
  "zh-Hans": {
    saveButton: "保存",
    titlePlaceholder: "对话标题",
    bodyPlaceholder: "你在想什么？",
    updateSuccess: "对话更新成功",
    updateError: "更新对话失败",
    notFoundError: "未找到对话",
    notAuthorError: "你不是此对话的主持人",
    conversationLockedError: "此对话已锁定，无法编辑",
    invalidAccessSettingsError: "访问设置无效。私人对话不能要求登录。",
    loadingErrorMessage: "加载对话时发生错误",
    createSurveyButton: "创建问卷",
    editSurveyButton: "编辑问卷",
    premiumEditRestrictedBanner:
      "高级访问权限已到期。您仍可更新常规设置，但高级内容更改已禁用。",
    premiumAccessExpiredError: "此更改的高级访问权限已到期。",
    premiumAccessRequiredError: "此设置不适用于您当前的计划。",
  },
  "zh-Hant": {
    saveButton: "儲存",
    titlePlaceholder: "對話標題",
    bodyPlaceholder: "你在想什麼？",
    updateSuccess: "對話更新成功",
    updateError: "更新對話失敗",
    notFoundError: "未找到對話",
    notAuthorError: "你不是此對話的主持人",
    conversationLockedError: "此對話已鎖定，無法編輯",
    invalidAccessSettingsError: "存取設定無效。私人對話不能要求登入。",
    loadingErrorMessage: "載入對話時發生錯誤",
    createSurveyButton: "建立問卷",
    editSurveyButton: "編輯問卷",
    premiumEditRestrictedBanner:
      "進階存取權已到期。你仍可更新一般設定，但進階內容變更已停用。",
    premiumAccessExpiredError: "此變更的進階存取權已到期。",
    premiumAccessRequiredError: "此設定不適用於你目前的方案。",
  },
  ja: {
    saveButton: "保存",
    titlePlaceholder: "会話のタイトル",
    bodyPlaceholder: "何を考えていますか？",
    updateSuccess: "会話が正常に更新されました",
    updateError: "会話の更新に失敗しました",
    notFoundError: "会話が見つかりません",
    notAuthorError: "あなたはこの会話のファシリテーターではありません",
    conversationLockedError: "この会話はロックされており、編集できません",
    invalidAccessSettingsError:
      "アクセス設定が無効です。プライベートな会話ではログインを要求できません。",
    loadingErrorMessage: "会話の読み込み中にエラーが発生しました",
    createSurveyButton: "アンケートを作成",
    editSurveyButton: "アンケートを編集",
    premiumEditRestrictedBanner:
      "プレミアムアクセスの期限が切れました。通常設定は引き続き更新できますが、プレミアムコンテンツの変更は無効です。",
    premiumAccessExpiredError:
      "この変更のプレミアムアクセスの期限が切れました。",
    premiumAccessRequiredError: "この設定は現在のプランでは利用できません。",
  },
  ar: {
    saveButton: "حفظ",
    titlePlaceholder: "عنوان المحادثة",
    bodyPlaceholder: "ما الذي يدور في ذهنك؟",
    updateSuccess: "تم تحديث المحادثة بنجاح",
    updateError: "فشل تحديث المحادثة",
    notFoundError: "لم يتم العثور على المحادثة",
    notAuthorError: "أنت لست ميسر هذه المحادثة",
    conversationLockedError: "هذه المحادثة مقفلة ولا يمكن تعديلها",
    invalidAccessSettingsError:
      "إعدادات الوصول غير صالحة. لا يمكن طلب تسجيل الدخول للمحادثات الخاصة.",
    loadingErrorMessage: "حدث خطأ أثناء تحميل المحادثة",
    createSurveyButton: "إنشاء استبيان",
    editSurveyButton: "تعديل الاستبيان",
    premiumEditRestrictedBanner:
      "انتهت صلاحية الوصول المميز. لا يزال بإمكانك تحديث الإعدادات العادية، لكن تغييرات المحتوى المميز معطلة.",
    premiumAccessExpiredError: "انتهت صلاحية الوصول المميز لهذا التغيير.",
    premiumAccessRequiredError: "هذا الإعداد غير متاح في خطتك الحالية.",
  },
  ky: {
    saveButton: "Сактоо",
    titlePlaceholder: "Талкуунун аталышы",
    bodyPlaceholder: "Эмне жөнүндө ойлонуп жатасыз?",
    updateSuccess: "Талкуу ийгиликтүү жаңыланды",
    updateError: "Талкууну жаңылоо ишке ашкан жок",
    notFoundError: "Талкуу табылган жок",
    notAuthorError: "Сиз бул талкуунун фасилитатору эмессиз",
    conversationLockedError: "Бул талкуу кулпуланган жана түзөтүлбөйт",
    invalidAccessSettingsError:
      "Жеткиликтүүлүк жөндөөлөрү жараксыз. Жеке талкуулар үчүн кирүүнү талап кылуу мүмкүн эмес.",
    loadingErrorMessage: "Талкууну жүктөөдө ката кетти",
    createSurveyButton: "Сурамжылоо түзүү",
    editSurveyButton: "Сурамжылоону түзөтүү",
    premiumEditRestrictedBanner:
      "Премиум мүмкүнчүлүктөрдүн мөөнөтү бүттү. Кадимки жөндөөлөрдү дагы эле жаңырта аласыз, бирок премиум мазмунду өзгөртүү өчүрүлгөн.",
    premiumAccessExpiredError:
      "Бул өзгөртүү үчүн премиум мүмкүнчүлүктүн мөөнөтү бүттү.",
    premiumAccessRequiredError:
      "Бул жөндөө учурдагы планыңызда жеткиликтүү эмес.",
  },
  ru: {
    saveButton: "Сохранить",
    titlePlaceholder: "Заголовок обсуждения",
    bodyPlaceholder: "О чём вы думаете?",
    updateSuccess: "Обсуждение успешно обновлено",
    updateError: "Не удалось обновить обсуждение",
    notFoundError: "Обсуждение не найдено",
    notAuthorError: "Вы не являетесь фасилитатором этого обсуждения",
    conversationLockedError:
      "Это обсуждение заблокировано и не может быть отредактировано",
    invalidAccessSettingsError:
      "Недопустимые настройки доступа. Для приватных обсуждений нельзя требовать авторизацию.",
    loadingErrorMessage: "Произошла ошибка при загрузке обсуждения",
    createSurveyButton: "Создать опрос",
    editSurveyButton: "Редактировать опрос",
    premiumEditRestrictedBanner:
      "Премиум-доступ истёк. Вы всё ещё можете менять обычные настройки, но изменения премиум-контента отключены.",
    premiumAccessExpiredError: "Премиум-доступ для этого изменения истёк.",
    premiumAccessRequiredError:
      "Эта настройка недоступна на вашем текущем плане.",
  },
};
