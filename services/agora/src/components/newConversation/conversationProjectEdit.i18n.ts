import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationProjectEditTranslations {
  projectUnavailableError: string;
  projectPermissionError: string;
  projectChangedError: string;
  detachLanguagesError: string;
  primaryLanguageOnly: string;
  chooseCustomLanguagesDescription: string;
  emailUpdatesUnavailableError: string;
  activeDeliveryError: string;
}

export const conversationProjectEditTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationProjectEditTranslations
> = {
  en: {
    primaryLanguageOnly: "Use the primary language only",
    chooseCustomLanguagesDescription:
      "The inherited settings exceed the custom language limit. Choose up to two additional languages, or use the primary language only.",
    emailUpdatesUnavailableError:
      "Email Updates cannot be enabled here. Turn them off or choose another project.",
    activeDeliveryError:
      "An Email Update is being delivered. Try saving again after delivery finishes.",
    projectUnavailableError:
      "This project is no longer available. Choose another project.",
    projectPermissionError:
      "You need permission to create and edit conversations in the destination project.",
    projectChangedError:
      "Another facilitator moved this conversation. Reopen the editor to load its current project.",
    detachLanguagesError:
      "Before choosing No project, switch to custom languages and choose up to two additional languages.",
  },
  de: {
    primaryLanguageOnly: "Nur Hauptsprache verwenden",
    chooseCustomLanguagesDescription:
      "Die vererbten Einstellungen überschreiten das Limit für benutzerdefinierte Sprachen. Wählen Sie bis zu zwei zusätzliche Sprachen oder verwenden Sie nur die Hauptsprache.",
    emailUpdatesUnavailableError:
      "E-Mail-Benachrichtigungen können hier nicht aktiviert werden. Deaktivieren Sie diese oder wählen Sie ein anderes Projekt.",
    activeDeliveryError:
      "Eine E-Mail-Benachrichtigung wird zugestellt. Versuchen Sie es bitte erneut, nachdem die Zustellung abgeschlossen ist.",
    projectUnavailableError:
      "Dieses Projekt ist nicht mehr verfügbar. Wählen Sie ein anderes Projekt.",
    projectPermissionError:
      "Sie benötigen die Berechtigung, Diskussionen im Zielprojekt zu erstellen und zu bearbeiten.",
    projectChangedError:
      "Ein anderer Moderator hat diese Diskussion verschoben. Öffnen Sie den Editor neu, um das aktuelle Projekt zu laden.",
    detachLanguagesError:
      "Bevor Sie 'Kein Projekt' auswählen, wechseln Sie zu benutzerdefinierten Sprachen und wählen Sie bis zu zwei zusätzliche Sprachen.",
  },
  hi: {
    primaryLanguageOnly: "केवल मुख्य भाषा का उपयोग करें",
    chooseCustomLanguagesDescription:
      "विरासत में मिली सेटिंग्स कस्टम भाषा सीमा से अधिक हैं। दो अतिरिक्त भाषाओं तक चुनें, या केवल मुख्य भाषा का उपयोग करें।",
    emailUpdatesUnavailableError:
      "ईमेल अपडेट यहाँ सक्षम नहीं किए जा सकते। उन्हें बंद करें या कोई अन्य परियोजना चुनें।",
    activeDeliveryError:
      "एक ईमेल अपडेट डिलीवर किया जा रहा है। डिलीवरी पूरी होने के बाद फिर से सहेजने का प्रयास करें।",
    projectUnavailableError:
      "यह परियोजना अब उपलब्ध नहीं है। कोई अन्य परियोजना चुनें।",
    projectPermissionError:
      "आपके पास गंतव्य परियोजना में चर्चाएँ बनाने और संपादित करने की अनुमति नहीं है।",
    projectChangedError:
      "किसी अन्य संचालक ने इस चर्चा को स्थानांतरित किया है। वर्तमान परियोजना लोड करने के लिए संपादक खोलें।",
    detachLanguagesError:
      "कोई परियोजना चुनने से पहले, कस्टम भाषाओं पर स्विच करें और दो अतिरिक्त भाषाओं तक चुनें।",
  },
  fr: {
    primaryLanguageOnly: "Utiliser uniquement la langue principale",
    chooseCustomLanguagesDescription:
      "Les paramètres hérités dépassent la limite des langues personnalisées. Choisissez au maximum deux langues supplémentaires, ou utilisez uniquement la langue principale.",
    emailUpdatesUnavailableError:
      "Les mises à jour par e-mail ne peuvent pas être activées ici. Désactivez-les ou choisissez un autre projet.",
    activeDeliveryError:
      "Une mise à jour par e-mail est en cours d’envoi. Réessayez d’enregistrer une fois l’envoi terminé.",
    projectUnavailableError:
      "Ce projet n’est plus disponible. Choisissez un autre projet.",
    projectPermissionError:
      "Vous devez pouvoir créer et modifier des conversations dans le projet de destination.",
    projectChangedError:
      "Un autre facilitateur a déplacé cette conversation. Rouvrez l’éditeur pour charger son projet actuel.",
    detachLanguagesError:
      "Avant de choisir Aucun projet, personnalisez les langues et choisissez au maximum deux langues supplémentaires.",
  },
  es: {
    primaryLanguageOnly: "Usar solo el idioma principal",
    chooseCustomLanguagesDescription:
      "La configuración heredada supera el límite de idiomas personalizados. Elija hasta dos idiomas adicionales o use solo el idioma principal.",
    emailUpdatesUnavailableError:
      "No se pueden activar actualizaciones por correo aquí. Desactívelas o elija otro proyecto.",
    activeDeliveryError:
      "Se está enviando una actualización por correo. Intente guardar de nuevo cuando termine el envío.",
    projectUnavailableError:
      "Este proyecto ya no está disponible. Elija otro proyecto.",
    projectPermissionError:
      "Necesita permiso para crear y editar conversaciones en el proyecto de destino.",
    projectChangedError:
      "Otro facilitador movió esta conversación. Vuelva a abrir el editor para cargar su proyecto actual.",
    detachLanguagesError:
      "Antes de elegir Sin proyecto, personalice los idiomas y elija hasta dos idiomas adicionales.",
  },
  "zh-Hans": {
    primaryLanguageOnly: "仅使用主要语言",
    chooseCustomLanguagesDescription:
      "继承的设置超过了自定义语言数量限制。请选择最多两种附加语言，或仅使用主要语言。",
    emailUpdatesUnavailableError:
      "无法在此启用电子邮件更新。请关闭更新或选择其他项目。",
    activeDeliveryError: "正在发送电子邮件更新。请在发送完成后再次保存。",
    projectUnavailableError: "此项目已不可用。请选择其他项目。",
    projectPermissionError: "您需要在目标项目中创建和编辑对话的权限。",
    projectChangedError:
      "其他主持人已移动此对话。请重新打开编辑器以加载当前项目。",
    detachLanguagesError:
      "选择无项目前，请切换到自定义语言，并选择最多两种附加语言。",
  },
  "zh-Hant": {
    primaryLanguageOnly: "僅使用主要語言",
    chooseCustomLanguagesDescription:
      "繼承的設定超過自訂語言數量限制。請選擇最多兩種附加語言，或僅使用主要語言。",
    emailUpdatesUnavailableError:
      "無法在此啟用電子郵件更新。請關閉更新或選擇其他專案。",
    activeDeliveryError: "正在傳送電子郵件更新。請在傳送完成後再次儲存。",
    projectUnavailableError: "此專案已無法使用。請選擇其他專案。",
    projectPermissionError: "您需要在目標專案中建立和編輯對話的權限。",
    projectChangedError:
      "其他主持人已移動此對話。請重新開啟編輯器以載入目前專案。",
    detachLanguagesError:
      "選擇無專案前，請切換至自訂語言，並選擇最多兩種附加語言。",
  },
  ja: {
    primaryLanguageOnly: "主要言語のみ使用する",
    chooseCustomLanguagesDescription:
      "継承した設定はカスタム言語数の上限を超えています。追加言語を最大2つ選択するか、主要言語のみ使用してください。",
    emailUpdatesUnavailableError:
      "ここではメール更新を有効にできません。無効にするか、別のプロジェクトを選択してください。",
    activeDeliveryError:
      "メール更新を送信中です。送信完了後にもう一度保存してください。",
    projectUnavailableError:
      "このプロジェクトは利用できません。別のプロジェクトを選択してください。",
    projectPermissionError:
      "移動先のプロジェクトで会話を作成・編集する権限が必要です。",
    projectChangedError:
      "別の進行役がこの会話を移動しました。編集画面を開き直して現在のプロジェクトを読み込んでください。",
    detachLanguagesError:
      "プロジェクトなしを選ぶ前に言語をカスタマイズし、追加言語を最大2つ選択してください。",
  },
  ar: {
    primaryLanguageOnly: "استخدام اللغة الأساسية فقط",
    chooseCustomLanguagesDescription:
      "تتجاوز الإعدادات الموروثة حد اللغات المخصصة. اختر لغتين إضافيتين كحد أقصى أو استخدم اللغة الأساسية فقط.",
    emailUpdatesUnavailableError:
      "لا يمكن تفعيل تحديثات البريد الإلكتروني هنا. عطّلها أو اختر مشروعًا آخر.",
    activeDeliveryError:
      "يجري إرسال تحديث بالبريد الإلكتروني. حاول الحفظ مرة أخرى بعد اكتمال الإرسال.",
    projectUnavailableError: "لم يعد هذا المشروع متاحًا. اختر مشروعًا آخر.",
    projectPermissionError:
      "تحتاج إلى إذن لإنشاء المحادثات وتعديلها في المشروع الوجهة.",
    projectChangedError:
      "نقل ميسّر آخر هذه المحادثة. أعد فتح المحرر لتحميل مشروعها الحالي.",
    detachLanguagesError:
      "قبل اختيار بدون مشروع، خصّص اللغات واختر لغتين إضافيتين كحد أقصى.",
  },
  fa: {
    primaryLanguageOnly: "فقط از زبان اصلی استفاده شود",
    chooseCustomLanguagesDescription:
      "تنظیمات به‌ارث‌رسیده از محدودیت زبان‌های سفارشی بیشتر است. حداکثر دو زبان اضافی انتخاب کنید یا فقط از زبان اصلی استفاده کنید.",
    emailUpdatesUnavailableError:
      "فعال‌کردن به‌روزرسانی ایمیلی در اینجا ممکن نیست. آن را خاموش کنید یا پروژه دیگری انتخاب کنید.",
    activeDeliveryError:
      "یک به‌روزرسانی ایمیلی در حال ارسال است. پس از پایان ارسال دوباره ذخیره کنید.",
    projectUnavailableError:
      "این پروژه دیگر در دسترس نیست. پروژه دیگری انتخاب کنید.",
    projectPermissionError:
      "برای ایجاد و ویرایش گفتگو در پروژه مقصد به مجوز نیاز دارید.",
    projectChangedError:
      "تسهیل‌گر دیگری این گفتگو را جابه‌جا کرده است. ویرایشگر را دوباره باز کنید تا پروژه فعلی بارگیری شود.",
    detachLanguagesError:
      "پیش از انتخاب بدون پروژه، زبان‌ها را سفارشی کنید و حداکثر دو زبان اضافی انتخاب کنید.",
  },
  he: {
    primaryLanguageOnly: "שימוש בשפה הראשית בלבד",
    chooseCustomLanguagesDescription:
      "ההגדרות שעברו בירושה חורגות ממגבלת השפות המותאמות. בחרו עד שתי שפות נוספות או השתמשו בשפה הראשית בלבד.",
    emailUpdatesUnavailableError:
      "לא ניתן להפעיל עדכונים בדוא״ל כאן. כבו אותם או בחרו פרויקט אחר.",
    activeDeliveryError:
      "עדכון בדוא״ל נשלח כעת. נסו לשמור שוב לאחר השלמת השליחה.",
    projectUnavailableError: "הפרויקט הזה אינו זמין עוד. בחרו פרויקט אחר.",
    projectPermissionError: "נדרשת הרשאה ליצור ולערוך שיחות בפרויקט היעד.",
    projectChangedError:
      "מנחה אחר העביר את השיחה. פתחו מחדש את העורך כדי לטעון את הפרויקט הנוכחי.",
    detachLanguagesError:
      "לפני בחירה ללא פרויקט, התאימו את השפות ובחרו עד שתי שפות נוספות.",
  },
  ky: {
    primaryLanguageOnly: "Негизги тилди гана колдонуу",
    chooseCustomLanguagesDescription:
      "Мурасталган жөндөөлөр жеке тилдердин чегинен ашат. Экиден ашпаган кошумча тилди тандаңыз же негизги тилди гана колдонуңуз.",
    emailUpdatesUnavailableError:
      "Бул жерде электрондук кат жаңыртууларын күйгүзүү мүмкүн эмес. Аларды өчүрүңүз же башка долбоорду тандаңыз.",
    activeDeliveryError:
      "Электрондук кат жаңыртуусу жөнөтүлүп жатат. Жөнөтүү бүткөндөн кийин кайра сактап көрүңүз.",
    projectUnavailableError:
      "Бул долбоор мындан ары жеткиликтүү эмес. Башка долбоорду тандаңыз.",
    projectPermissionError:
      "Көздөгөн долбоордо талкууларды түзүүгө жана түзөтүүгө уруксат керек.",
    projectChangedError:
      "Башка алып баруучу бул талкууну көчүрдү. Учурдагы долбоорду жүктөө үчүн түзөткүчтү кайра ачыңыз.",
    detachLanguagesError:
      "Долбоор жок дегенди тандоодон мурун тилдерди ыңгайлаштырып, экиден ашпаган кошумча тилди тандаңыз.",
  },
  ru: {
    primaryLanguageOnly: "Использовать только основной язык",
    chooseCustomLanguagesDescription:
      "Унаследованные настройки превышают лимит пользовательских языков. Выберите не более двух дополнительных языков или используйте только основной язык.",
    emailUpdatesUnavailableError:
      "Здесь нельзя включить обновления по электронной почте. Отключите их или выберите другой проект.",
    activeDeliveryError:
      "Обновление по электронной почте отправляется. Попробуйте сохранить снова после завершения отправки.",
    projectUnavailableError:
      "Этот проект больше недоступен. Выберите другой проект.",
    projectPermissionError:
      "Вам нужны права на создание и редактирование обсуждений в целевом проекте.",
    projectChangedError:
      "Другой ведущий переместил это обсуждение. Откройте редактор заново, чтобы загрузить текущий проект.",
    detachLanguagesError:
      "Прежде чем выбрать Без проекта, настройте языки и выберите не более двух дополнительных языков.",
  },
};
