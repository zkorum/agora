import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateHistoryListTranslations {
  deliveryHistory: string;
  sentUpdates: string;
  emptyHeading: string;
  emptyDescription: string;
  audienceSingular: string;
  audiencePlural: string;
  conversationSingular: string;
  conversationPlural: string;
  ownerCopySingular: string;
  ownerCopyPlural: string;
  viewEmailContent: string;
  subjectLabel: string;
  statusPreparing: string;
  statusSending: string;
  statusQueued: string;
  statusStopping: string;
  statusCompleted: string;
  statusCompletedWithFailures: string;
  statusFailed: string;
  statusStopped: string;
  outcomeCompletedWithFailures: string;
  stopGlobalKillSwitch: string;
  stopLegalOrAbuseBlock: string;
  failureOwnerCopyNotAccepted: string;
  failureAudienceMaterialization: string;
  failureNoEligibleParticipants: string;
  failureProviderConfiguration: string;
  failureAllParticipantAttempts: string;
}

export const conversationUpdateHistoryListTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateHistoryListTranslations
> = {
  en: {
    deliveryHistory: "Delivery history",
    sentUpdates: "Sent updates",
    emptyHeading: "No Email Updates sent yet",
    emptyDescription:
      "Accepted updates will appear here with their delivery status.",
    audienceSingular: "{count} eligible recipient at send review",
    audiencePlural: "{count} eligible recipients at send review",
    conversationSingular: "{count} conversation",
    conversationPlural: "{count} conversations",
    ownerCopySingular: "{count} owner copy",
    ownerCopyPlural: "{count} owner copies",
    viewEmailContent: "View email content",
    subjectLabel: "Subject",
    statusPreparing: "Preparing",
    statusSending: "Sending",
    statusQueued: "Queued",
    statusStopping: "Stopping",
    statusCompleted: "Completed",
    statusCompletedWithFailures: "Completed with failures",
    statusFailed: "Failed",
    statusStopped: "Stopped",
    outcomeCompletedWithFailures:
      "Participant delivery finished, but one or more recipient attempts failed or had an unknown provider outcome.",
    stopGlobalKillSwitch:
      "Automatically stopped before remaining delivery because Agora activated the emergency global sending stop.",
    stopLegalOrAbuseBlock:
      "Automatically stopped before remaining delivery because Agora applied an emergency legal or abuse-safety block.",
    failureOwnerCopyNotAccepted:
      "Participant delivery did not begin because at least one required conversation owner copy was not accepted by the email provider.",
    failureAudienceMaterialization:
      "The eligible participant audience could not be prepared safely, so no participant delivery began.",
    failureNoEligibleParticipants:
      "No participants remained eligible at the accepted audience cutoff, so no participant delivery began.",
    failureProviderConfiguration:
      "Participant delivery could not begin because the email provider configuration was invalid.",
    failureAllParticipantAttempts:
      "No participant attempt was provider-accepted; every participant attempt failed or ended with an unknown outcome.",
  },
  ar: {
    deliveryHistory: "سجل التسليم",
    sentUpdates: "التحديثات المرسلة",
    emptyHeading: "لم تُرسل أي تحديثات بريد إلكتروني بعد",
    emptyDescription: "ستظهر التحديثات المقبولة هنا مع حالة تسليمها.",
    audienceSingular: "{count} مستلم مؤهل عند مراجعة الإرسال",
    audiencePlural: "{count} مستلمين مؤهلين عند مراجعة الإرسال",
    conversationSingular: "{count} محادثة",
    conversationPlural: "{count} محادثات",
    ownerCopySingular: "{count} نسخة للمالك",
    ownerCopyPlural: "{count} نسخ للمالكين",
    viewEmailContent: "عرض محتوى البريد الإلكتروني",
    subjectLabel: "الموضوع",
    statusPreparing: "قيد التحضير",
    statusSending: "قيد الإرسال",
    statusQueued: "في قائمة الانتظار",
    statusStopping: "جارٍ الإيقاف",
    statusCompleted: "مكتمل",
    statusCompletedWithFailures: "مكتمل مع حالات فشل",
    statusFailed: "فشل",
    statusStopped: "متوقف",
    outcomeCompletedWithFailures:
      "اكتمل التسليم إلى المشاركين، لكن محاولة واحدة أو أكثر للمستلمين فشلت أو كانت نتيجتها لدى المزوّد غير معروفة.",
    stopGlobalKillSwitch:
      "توقف تلقائيًا قبل إكمال التسليم لأن Agora فعّلت الإيقاف العالمي الطارئ للإرسال.",
    stopLegalOrAbuseBlock:
      "توقف تلقائيًا قبل إكمال التسليم لأن Agora طبّقت حظرًا طارئًا لأسباب قانونية أو متعلقة بسلامة إساءة الاستخدام.",
    failureOwnerCopyNotAccepted:
      "لم يبدأ التسليم إلى المشاركين لأن مزوّد البريد لم يقبل نسخة مطلوبة واحدة على الأقل لأحد مالكي المحادثة.",
    failureAudienceMaterialization:
      "تعذّر إعداد جمهور المشاركين المؤهلين بأمان، لذلك لم يبدأ التسليم إليهم.",
    failureNoEligibleParticipants:
      "لم يبقَ أي مشارك مؤهل عند الحد الزمني المقبول للجمهور، لذلك لم يبدأ التسليم إلى المشاركين.",
    failureProviderConfiguration:
      "تعذّر بدء التسليم إلى المشاركين لأن إعداد مزوّد البريد الإلكتروني غير صالح.",
    failureAllParticipantAttempts:
      "لم يقبل المزوّد أي محاولة لمشارك؛ فشلت كل المحاولات أو انتهت بنتيجة غير معروفة.",
  },
  es: {
    deliveryHistory: "Historial de entrega",
    sentUpdates: "Novedades enviadas",
    emptyHeading: "Aún no se han enviado novedades por correo",
    emptyDescription:
      "Las novedades aceptadas aparecerán aquí con su estado de entrega.",
    audienceSingular: "{count} destinatario elegible al revisar el envío",
    audiencePlural: "{count} destinatarios elegibles al revisar el envío",
    conversationSingular: "{count} conversación",
    conversationPlural: "{count} conversaciones",
    ownerCopySingular: "{count} copia para responsable",
    ownerCopyPlural: "{count} copias para responsables",
    viewEmailContent: "Ver contenido del correo",
    subjectLabel: "Asunto",
    statusPreparing: "Preparando",
    statusSending: "Enviando",
    statusQueued: "En cola",
    statusStopping: "Deteniendo",
    statusCompleted: "Completado",
    statusCompletedWithFailures: "Completado con fallos",
    statusFailed: "Fallido",
    statusStopped: "Detenido",
    outcomeCompletedWithFailures:
      "La entrega a participantes terminó, pero uno o más intentos fallaron o tuvieron un resultado desconocido del proveedor.",
    stopGlobalKillSwitch:
      "Se detuvo automáticamente antes de completar la entrega porque Agora activó la parada global de emergencia de envíos.",
    stopLegalOrAbuseBlock:
      "Se detuvo automáticamente antes de completar la entrega porque Agora aplicó un bloqueo legal o de seguridad ante abusos de emergencia.",
    failureOwnerCopyNotAccepted:
      "La entrega a participantes no comenzó porque el proveedor no aceptó al menos una copia obligatoria para responsables de la conversación.",
    failureAudienceMaterialization:
      "No se pudo preparar de forma segura la audiencia elegible, por lo que no comenzó la entrega a participantes.",
    failureNoEligibleParticipants:
      "No quedaban participantes elegibles en el corte aceptado de audiencia, por lo que no comenzó la entrega.",
    failureProviderConfiguration:
      "La entrega a participantes no pudo comenzar porque la configuración del proveedor de correo no era válida.",
    failureAllParticipantAttempts:
      "El proveedor no aceptó ningún intento; todos fallaron o terminaron con un resultado desconocido.",
  },
  fa: {
    deliveryHistory: "تاریخچه ارسال",
    sentUpdates: "به‌روزرسانی‌های ارسال‌شده",
    emptyHeading: "هنوز به‌روزرسانی ایمیلی ارسال نشده است",
    emptyDescription:
      "به‌روزرسانی‌های پذیرفته‌شده همراه با وضعیت ارسال اینجا نمایش داده می‌شوند.",
    audienceSingular: "{count} دریافت‌کننده واجد شرایط هنگام بررسی ارسال",
    audiencePlural: "{count} دریافت‌کننده واجد شرایط هنگام بررسی ارسال",
    conversationSingular: "{count} گفت‌وگو",
    conversationPlural: "{count} گفت‌وگو",
    ownerCopySingular: "{count} نسخه مالک",
    ownerCopyPlural: "{count} نسخه مالک",
    viewEmailContent: "مشاهده محتوای ایمیل",
    subjectLabel: "موضوع",
    statusPreparing: "در حال آماده‌سازی",
    statusSending: "در حال ارسال",
    statusQueued: "در صف",
    statusStopping: "در حال توقف",
    statusCompleted: "تکمیل‌شده",
    statusCompletedWithFailures: "تکمیل‌شده با خطا",
    statusFailed: "ناموفق",
    statusStopped: "متوقف‌شده",
    outcomeCompletedWithFailures:
      "ارسال به شرکت‌کنندگان پایان یافت، اما یک یا چند تلاش ناموفق بود یا نتیجه نامعلومی از ارائه‌دهنده داشت.",
    stopGlobalKillSwitch:
      "پیش از ادامه ارسال به‌طور خودکار متوقف شد، زیرا Agora توقف اضطراری سراسری ارسال را فعال کرد.",
    stopLegalOrAbuseBlock:
      "پیش از ادامه ارسال به‌طور خودکار متوقف شد، زیرا Agora مسدودسازی اضطراری حقوقی یا ایمنی سوءاستفاده را اعمال کرد.",
    failureOwnerCopyNotAccepted:
      "ارسال به شرکت‌کنندگان آغاز نشد، زیرا ارائه‌دهنده ایمیل دست‌کم یک نسخه الزامی مالک گفت‌وگو را نپذیرفت.",
    failureAudienceMaterialization:
      "آماده‌سازی ایمن مخاطبان واجد شرایط ممکن نبود؛ بنابراین ارسال به شرکت‌کنندگان آغاز نشد.",
    failureNoEligibleParticipants:
      "در زمان برش پذیرفته‌شده مخاطبان، هیچ شرکت‌کننده واجد شرایطی باقی نمانده بود؛ بنابراین ارسال آغاز نشد.",
    failureProviderConfiguration:
      "ارسال به شرکت‌کنندگان آغاز نشد، زیرا پیکربندی ارائه‌دهنده ایمیل نامعتبر بود.",
    failureAllParticipantAttempts:
      "ارائه‌دهنده هیچ تلاشی را نپذیرفت؛ همه تلاش‌ها ناموفق بودند یا با نتیجه نامعلوم پایان یافتند.",
  },
  fr: {
    deliveryHistory: "Historique d’envoi",
    sentUpdates: "Nouvelles envoyées",
    emptyHeading: "Aucune nouvelle n’a encore été envoyée par e-mail",
    emptyDescription:
      "Les nouvelles acceptées apparaîtront ici avec leur statut d’envoi.",
    audienceSingular: "{count} destinataire éligible lors de la vérification",
    audiencePlural: "{count} destinataires éligibles lors de la vérification",
    conversationSingular: "{count} conversation",
    conversationPlural: "{count} conversations",
    ownerCopySingular: "{count} copie pour gestionnaire",
    ownerCopyPlural: "{count} copies pour gestionnaires",
    viewEmailContent: "Voir le contenu de l’e-mail",
    subjectLabel: "Objet",
    statusPreparing: "Préparation",
    statusSending: "Envoi en cours",
    statusQueued: "En attente",
    statusStopping: "Arrêt en cours",
    statusCompleted: "Terminé",
    statusCompletedWithFailures: "Terminé avec des échecs",
    statusFailed: "Échec",
    statusStopped: "Arrêté",
    outcomeCompletedWithFailures:
      "L’envoi aux participants est terminé, mais une ou plusieurs tentatives ont échoué ou ont eu un résultat inconnu chez le fournisseur.",
    stopGlobalKillSwitch:
      "Arrêt automatique avant la fin de l’envoi, car Agora a activé l’arrêt global d’urgence des envois.",
    stopLegalOrAbuseBlock:
      "Arrêt automatique avant la fin de l’envoi, car Agora a appliqué un blocage juridique ou de sécurité contre les abus en urgence.",
    failureOwnerCopyNotAccepted:
      "L’envoi aux participants n’a pas commencé, car le fournisseur n’a pas accepté au moins une copie obligatoire destinée à un gestionnaire de conversation.",
    failureAudienceMaterialization:
      "L’audience de participants éligibles n’a pas pu être préparée de façon sûre ; aucun envoi n’a donc commencé.",
    failureNoEligibleParticipants:
      "Aucun participant n’était encore éligible au moment de la coupure d’audience acceptée ; aucun envoi n’a donc commencé.",
    failureProviderConfiguration:
      "L’envoi aux participants n’a pas pu commencer, car la configuration du fournisseur d’e-mail était invalide.",
    failureAllParticipantAttempts:
      "Aucune tentative n’a été acceptée par le fournisseur ; elles ont toutes échoué ou abouti à un résultat inconnu.",
  },
  "zh-Hans": {
    deliveryHistory: "发送历史",
    sentUpdates: "已发送动态",
    emptyHeading: "尚未发送邮件动态",
    emptyDescription: "已接受的动态及其发送状态会显示在这里。",
    audienceSingular: "发送审核时有 {count} 名合格收件人",
    audiencePlural: "发送审核时有 {count} 名合格收件人",
    conversationSingular: "{count} 个对话",
    conversationPlural: "{count} 个对话",
    ownerCopySingular: "{count} 份管理员副本",
    ownerCopyPlural: "{count} 份管理员副本",
    viewEmailContent: "查看邮件内容",
    subjectLabel: "主题",
    statusPreparing: "准备中",
    statusSending: "发送中",
    statusQueued: "已排队",
    statusStopping: "正在停止",
    statusCompleted: "已完成",
    statusCompletedWithFailures: "已完成，但有失败",
    statusFailed: "失败",
    statusStopped: "已停止",
    outcomeCompletedWithFailures:
      "参与者发送已完成，但一个或多个收件尝试失败，或邮件服务商返回了未知结果。",
    stopGlobalKillSwitch:
      "Agora 启用了全局紧急发送停止，因此系统在完成剩余发送前自动停止。",
    stopLegalOrAbuseBlock:
      "Agora 应用了紧急法律或防滥用安全封锁，因此系统在完成剩余发送前自动停止。",
    failureOwnerCopyNotAccepted:
      "邮件服务商未接受至少一份必需的对话管理员副本，因此未开始向参与者发送。",
    failureAudienceMaterialization:
      "无法安全准备合格参与者受众，因此未开始向参与者发送。",
    failureNoEligibleParticipants:
      "在已接受的受众截止时间没有剩余合格参与者，因此未开始向参与者发送。",
    failureProviderConfiguration:
      "邮件服务商配置无效，因此无法开始向参与者发送。",
    failureAllParticipantAttempts:
      "邮件服务商没有接受任何参与者发送尝试；所有尝试均失败或以未知结果结束。",
  },
  "zh-Hant": {
    deliveryHistory: "傳送記錄",
    sentUpdates: "已傳送動態",
    emptyHeading: "尚未傳送郵件動態",
    emptyDescription: "已接受的動態及其傳送狀態會顯示在這裡。",
    audienceSingular: "傳送檢查時有 {count} 名合資格收件人",
    audiencePlural: "傳送檢查時有 {count} 名合資格收件人",
    conversationSingular: "{count} 個對話",
    conversationPlural: "{count} 個對話",
    ownerCopySingular: "{count} 份管理員副本",
    ownerCopyPlural: "{count} 份管理員副本",
    viewEmailContent: "查看郵件內容",
    subjectLabel: "主旨",
    statusPreparing: "準備中",
    statusSending: "傳送中",
    statusQueued: "已排入佇列",
    statusStopping: "正在停止",
    statusCompleted: "已完成",
    statusCompletedWithFailures: "已完成，但有失敗",
    statusFailed: "失敗",
    statusStopped: "已停止",
    outcomeCompletedWithFailures:
      "參與者傳送已完成，但一個或多個收件嘗試失敗，或郵件服務商傳回了未知結果。",
    stopGlobalKillSwitch:
      "Agora 啟用了全域緊急傳送停止，因此系統在完成剩餘傳送前自動停止。",
    stopLegalOrAbuseBlock:
      "Agora 套用了緊急法律或防濫用安全封鎖，因此系統在完成剩餘傳送前自動停止。",
    failureOwnerCopyNotAccepted:
      "郵件服務商未接受至少一份必要的對話管理員副本，因此未開始向參與者傳送。",
    failureAudienceMaterialization:
      "無法安全準備合資格參與者受眾，因此未開始向參與者傳送。",
    failureNoEligibleParticipants:
      "在已接受的受眾截止時間沒有剩餘合資格參與者，因此未開始向參與者傳送。",
    failureProviderConfiguration:
      "郵件服務商設定無效，因此無法開始向參與者傳送。",
    failureAllParticipantAttempts:
      "郵件服務商沒有接受任何參與者傳送嘗試；所有嘗試均失敗或以未知結果結束。",
  },
  he: {
    deliveryHistory: "היסטוריית מסירה",
    sentUpdates: "עדכונים שנשלחו",
    emptyHeading: "עדיין לא נשלחו עדכוני דוא״ל",
    emptyDescription: "עדכונים שהתקבלו יופיעו כאן עם מצב המסירה שלהם.",
    audienceSingular: "נמען זכאי אחד ({count}) בעת בדיקת השליחה",
    audiencePlural: "{count} נמענים זכאים בעת בדיקת השליחה",
    conversationSingular: "שיחה אחת ({count})",
    conversationPlural: "{count} שיחות",
    ownerCopySingular: "עותק בעלים אחד ({count})",
    ownerCopyPlural: "{count} עותקי בעלים",
    viewEmailContent: "הצגת תוכן הדוא״ל",
    subjectLabel: "נושא",
    statusPreparing: "בהכנה",
    statusSending: "בשליחה",
    statusQueued: "בתור",
    statusStopping: "בעצירה",
    statusCompleted: "הושלם",
    statusCompletedWithFailures: "הושלם עם כשלים",
    statusFailed: "נכשל",
    statusStopped: "נעצר",
    outcomeCompletedWithFailures:
      "המסירה למשתתפים הסתיימה, אך ניסיון אחד או יותר נכשל או קיבל תוצאה לא ידועה מהספק.",
    stopGlobalKillSwitch:
      "נעצר אוטומטית לפני השלמת המסירה משום ש-Agora הפעילה עצירת שליחה גלובלית לשעת חירום.",
    stopLegalOrAbuseBlock:
      "נעצר אוטומטית לפני השלמת המסירה משום ש-Agora החילה חסימת חירום משפטית או להגנה מפני שימוש לרעה.",
    failureOwnerCopyNotAccepted:
      "המסירה למשתתפים לא התחילה משום שספק הדוא״ל לא קיבל לפחות עותק חובה אחד לבעלי השיחה.",
    failureAudienceMaterialization:
      "לא היה אפשר להכין בבטחה את קהל המשתתפים הזכאים, ולכן המסירה לא התחילה.",
    failureNoEligibleParticipants:
      "לא נותרו משתתפים זכאים בנקודת החיתוך שאושרה, ולכן המסירה לא התחילה.",
    failureProviderConfiguration:
      "המסירה למשתתפים לא התחילה משום שתצורת ספק הדוא״ל לא הייתה תקינה.",
    failureAllParticipantAttempts:
      "הספק לא קיבל אף ניסיון למשתתף; כל הניסיונות נכשלו או הסתיימו בתוצאה לא ידועה.",
  },
  ja: {
    deliveryHistory: "配信履歴",
    sentUpdates: "送信済みの更新",
    emptyHeading: "メール更新はまだ送信されていません",
    emptyDescription: "承認された更新と配信状況がここに表示されます。",
    audienceSingular: "送信確認時の対象受信者：{count}人",
    audiencePlural: "送信確認時の対象受信者：{count}人",
    conversationSingular: "会話{count}件",
    conversationPlural: "会話{count}件",
    ownerCopySingular: "管理者向けコピー{count}通",
    ownerCopyPlural: "管理者向けコピー{count}通",
    viewEmailContent: "メール内容を表示",
    subjectLabel: "件名",
    statusPreparing: "準備中",
    statusSending: "送信中",
    statusQueued: "待機中",
    statusStopping: "停止中",
    statusCompleted: "完了",
    statusCompletedWithFailures: "一部失敗して完了",
    statusFailed: "失敗",
    statusStopped: "停止済み",
    outcomeCompletedWithFailures:
      "参加者への配信は完了しましたが、1件以上の試行が失敗したか、プロバイダーの結果が不明でした。",
    stopGlobalKillSwitch:
      "Agoraが緊急の全体送信停止を有効にしたため、残りの配信前に自動停止しました。",
    stopLegalOrAbuseBlock:
      "Agoraが法的理由または不正利用防止の緊急ブロックを適用したため、残りの配信前に自動停止しました。",
    failureOwnerCopyNotAccepted:
      "必要な会話管理者向けコピーが1通以上プロバイダーに受理されなかったため、参加者への配信は開始されませんでした。",
    failureAudienceMaterialization:
      "対象参加者を安全に準備できなかったため、参加者への配信は開始されませんでした。",
    failureNoEligibleParticipants:
      "承認された対象者の締切時点で対象参加者が残っていなかったため、配信は開始されませんでした。",
    failureProviderConfiguration:
      "メールプロバイダーの設定が無効だったため、参加者への配信を開始できませんでした。",
    failureAllParticipantAttempts:
      "プロバイダーに受理された試行はなく、すべて失敗したか結果不明で終了しました。",
  },
  ky: {
    deliveryHistory: "Жеткирүү тарыхы",
    sentUpdates: "Жөнөтүлгөн жаңыртуулар",
    emptyHeading: "Электрондук жаңыртуулар али жөнөтүлө элек",
    emptyDescription:
      "Кабыл алынган жаңыртуулар жеткирүү абалы менен бул жерде көрүнөт.",
    audienceSingular: "Жөнөтүүнү кароодо {count} жарамдуу алуучу",
    audiencePlural: "Жөнөтүүнү кароодо {count} жарамдуу алуучу",
    conversationSingular: "{count} талкуу",
    conversationPlural: "{count} талкуу",
    ownerCopySingular: "{count} ээнин көчүрмөсү",
    ownerCopyPlural: "{count} ээнин көчүрмөсү",
    viewEmailContent: "Каттын мазмунун көрүү",
    subjectLabel: "Тема",
    statusPreparing: "Даярдалууда",
    statusSending: "Жөнөтүлүүдө",
    statusQueued: "Кезекте",
    statusStopping: "Токтотулууда",
    statusCompleted: "Аяктады",
    statusCompletedWithFailures: "Каталар менен аяктады",
    statusFailed: "Ишке ашкан жок",
    statusStopped: "Токтотулду",
    outcomeCompletedWithFailures:
      "Катышуучуларга жеткирүү аяктады, бирок бир же бир нече аракет ишке ашкан жок же провайдердин жыйынтыгы белгисиз болду.",
    stopGlobalKillSwitch:
      "Agora жалпы жөнөтүүнү шашылыш токтотууну иштеткендиктен, калган жеткирүүгө чейин автоматтык түрдө токтотулду.",
    stopLegalOrAbuseBlock:
      "Agora укуктук же кыянаттык коопсуздугу боюнча шашылыш бөгөт койгондуктан, калган жеткирүүгө чейин автоматтык түрдө токтотулду.",
    failureOwnerCopyNotAccepted:
      "Кат провайдери талкуу ээсинин кеминде бир милдеттүү көчүрмөсүн кабыл албагандыктан, катышуучуларга жеткирүү башталган жок.",
    failureAudienceMaterialization:
      "Жарамдуу катышуучуларды коопсуз даярдоо мүмкүн болгон жок, ошондуктан жеткирүү башталган жок.",
    failureNoEligibleParticipants:
      "Кабыл алынган аудитория чекитинде жарамдуу катышуучу калбагандыктан, жеткирүү башталган жок.",
    failureProviderConfiguration:
      "Кат провайдеринин жөндөөсү жараксыз болгондуктан, катышуучуларга жеткирүү башталган жок.",
    failureAllParticipantAttempts:
      "Провайдер бир да аракетти кабыл алган жок; бардык аракеттер ишке ашкан жок же белгисиз жыйынтык менен аяктады.",
  },
  ru: {
    deliveryHistory: "История доставки",
    sentUpdates: "Отправленные обновления",
    emptyHeading: "Почтовые обновления ещё не отправлялись",
    emptyDescription:
      "Принятые обновления и статус их доставки появятся здесь.",
    audienceSingular: "{count} подходящий получатель при проверке отправки",
    audiencePlural: "{count} подходящих получателя при проверке отправки",
    conversationSingular: "{count} обсуждение",
    conversationPlural: "{count} обсуждения",
    ownerCopySingular: "{count} копия для владельца",
    ownerCopyPlural: "{count} копии для владельцев",
    viewEmailContent: "Показать содержимое письма",
    subjectLabel: "Тема",
    statusPreparing: "Подготовка",
    statusSending: "Отправка",
    statusQueued: "В очереди",
    statusStopping: "Остановка",
    statusCompleted: "Завершено",
    statusCompletedWithFailures: "Завершено с ошибками",
    statusFailed: "Ошибка",
    statusStopped: "Остановлено",
    outcomeCompletedWithFailures:
      "Доставка участникам завершена, но одна или несколько попыток не удались либо получили неизвестный результат провайдера.",
    stopGlobalKillSwitch:
      "Автоматически остановлено до завершения доставки, потому что Agora включила экстренную глобальную остановку отправки.",
    stopLegalOrAbuseBlock:
      "Автоматически остановлено до завершения доставки, потому что Agora применила экстренную блокировку по юридическим причинам или для защиты от злоупотреблений.",
    failureOwnerCopyNotAccepted:
      "Доставка участникам не началась, потому что провайдер не принял хотя бы одну обязательную копию для владельца обсуждения.",
    failureAudienceMaterialization:
      "Не удалось безопасно подготовить аудиторию подходящих участников, поэтому доставка не началась.",
    failureNoEligibleParticipants:
      "На принятом срезе аудитории не осталось подходящих участников, поэтому доставка не началась.",
    failureProviderConfiguration:
      "Доставка участникам не началась из-за неверной настройки почтового провайдера.",
    failureAllParticipantAttempts:
      "Провайдер не принял ни одной попытки; все попытки завершились ошибкой или неизвестным результатом.",
  },
};
