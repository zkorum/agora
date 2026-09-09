import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface ReviewTranslations {
  testUnknown: string;
  sendUnknown: string;
  retryTestRequest: string;
  retrySendRequest: string;
  checkDelivery: string;
  reconcileError: string;
  deliveryAccepted: string;
  deliveryNotFound: string;
  requestIdConflict: string;
  testStatusUnavailable: string;
  leaveSendUnknown: string;
  rateLimited: string;
  completeRequiredFields: string;
  fixInvalidFields: string;
  review: string;
  locked: string;
  backToEdit: string;
  cancelUpdate: string;
  leaveTitle: string;
  stay: string;
  leave: string;
  leaveWarning: string;
  leaveTestWarning: string;
  cancelWarning: string;
  prepareError: string;
  cancelError: string;
  reviewInvalid: string;
  previewError: string;
  reconstructed: string;
  sender: string;
  language: string;
  expires: string;
  unsubscribeProject: string;
  unsubscribeConversation: string;
}

export const conversationUpdateReviewTranslations: Record<
  SupportedDisplayLanguageCodes,
  ReviewTranslations
> = {
  en: {
    testUnknown:
      "The test request was not confirmed. It may already be queued. Retry the same request without creating another test.",
    sendUnknown:
      "Delivery was not confirmed. The update may already have been accepted. Retry the same send request to resolve its status; do not create another test or update.",
    retryTestRequest: "Retry same test request",
    retrySendRequest: "Retry same send request",
    checkDelivery: "Check accepted delivery",
    reconcileError:
      "The accepted delivery could not be loaded. Retry to view its history; do not send another update.",
    deliveryAccepted:
      "This update has already been accepted for delivery. Its history will show the delivery status.",
    deliveryNotFound:
      "The delivery record is not available yet. Retry loading its history.",
    requestIdConflict:
      "This request ID belongs to another operation. Request a new test for this review.",
    testStatusUnavailable:
      "The test status is temporarily unavailable. Keep checking the existing test instead of requesting another.",
    leaveSendUnknown:
      "This send may already have been accepted. Before leaving, we will check whether the review can be canceled or load the accepted delivery. Leaving cannot stop an accepted delivery.",
    rateLimited: "Too many requests. Try again after {date}.",
    completeRequiredFields:
      "Complete the required selection, subject, and message fields (*) before reviewing.",
    fixInvalidFields:
      "Fix the subject or message to meet the stated limits before reviewing.",
    review: "Review email",
    locked:
      "Review locks this version. Send a test from the review before confirming delivery.",
    backToEdit: "Back to editing",
    cancelUpdate: "Cancel update",
    leaveTitle: "Leave this review?",
    stay: "Stay in review",
    leave: "Leave review",
    leaveWarning:
      "Leaving cancels this review. Your message will remain in the composer.",
    leaveTestWarning:
      "A test has been requested. Leaving invalidates it. You must send a new test after reopening review, even if nothing changes.",
    cancelWarning:
      "Canceling the update also clears your subject, message, and selection.",
    prepareError:
      "Review preparation was not confirmed. Retry to prepare a new review.",
    cancelError:
      "Cancellation was not confirmed. Stay here and retry before leaving.",
    reviewInvalid:
      "This review is no longer active. Return to editing and prepare a new review, then send a new test.",
    previewError: "The email preview could not be loaded.",
    reconstructed: "Reconstructed preview, not an archived delivery",
    sender: "Sender",
    language: "Email language",
    expires: "Review expires: {date}",
    unsubscribeProject: "Unsubscribe scope: project",
    unsubscribeConversation: "Unsubscribe scope: conversation",
  },
  fr: {
    testUnknown:
      "La demande de test n’a pas été confirmée. Elle est peut-être déjà en attente. Réessayez la même demande sans créer un autre test.",
    sendUnknown:
      "L’envoi n’a pas été confirmé. La nouvelle a peut-être déjà été acceptée. Réessayez la même demande pour connaître son état, sans créer un autre test ni une autre nouvelle.",
    retryTestRequest: "Réessayer le même test",
    retrySendRequest: "Réessayer le même envoi",
    checkDelivery: "Vérifier l’envoi accepté",
    reconcileError:
      "Impossible de charger l’envoi accepté. Réessayez pour consulter son historique, sans envoyer une autre nouvelle.",
    deliveryAccepted:
      "Cette nouvelle a déjà été acceptée pour envoi. Son historique indiquera l’état de livraison.",
    deliveryNotFound:
      "L’envoi n’est pas encore disponible dans l’historique. Réessayez de le charger.",
    requestIdConflict:
      "Cet identifiant de demande appartient à une autre opération. Demandez un nouveau test pour cette vérification.",
    testStatusUnavailable:
      "L’état du test est temporairement indisponible. Continuez à vérifier le test existant plutôt que d’en demander un autre.",
    leaveSendUnknown:
      "Cet envoi a peut-être déjà été accepté. Avant de quitter, nous vérifierons si la vérification peut être annulée ou chargerons l’envoi accepté. Quitter ne peut pas arrêter un envoi accepté.",
    rateLimited: "Trop de demandes. Réessayez après {date}.",
    completeRequiredFields:
      "Complétez la sélection, l’objet et le message obligatoires (*) avant la vérification.",
    fixInvalidFields:
      "Corrigez l’objet ou le message pour respecter les limites indiquées avant la vérification.",
    review: "Vérifier l’email",
    locked:
      "La vérification verrouille cette version. Envoyez un test depuis cet écran avant de confirmer l’envoi.",
    backToEdit: "Revenir à la rédaction",
    cancelUpdate: "Annuler la nouvelle",
    leaveTitle: "Quitter cette vérification ?",
    stay: "Rester",
    leave: "Quitter la vérification",
    leaveWarning:
      "Quitter annule cette vérification. Votre message restera dans l’éditeur.",
    leaveTestWarning:
      "Un test a été demandé. Quitter l’invalide. Vous devrez envoyer un nouveau test après avoir rouvert la vérification, même sans modification.",
    cancelWarning:
      "Annuler la nouvelle efface aussi l’objet, le message et la sélection.",
    prepareError:
      "La préparation n’a pas été confirmée. Réessayez pour préparer une nouvelle vérification.",
    cancelError:
      "L’annulation n’a pas été confirmée. Restez ici et réessayez avant de quitter.",
    reviewInvalid:
      "Cette vérification n’est plus active. Revenez à la rédaction, préparez une nouvelle vérification et envoyez un nouveau test.",
    previewError: "Impossible de charger l’aperçu de l’email.",
    reconstructed: "Aperçu reconstitué, pas un envoi archivé",
    sender: "Expéditeur",
    language: "Langue de l’email",
    expires: "Expiration de la vérification : {date}",
    unsubscribeProject: "Désinscription : projet",
    unsubscribeConversation: "Désinscription : conversation",
  },
  es: {
    testUnknown:
      "La solicitud de prueba no se confirmó. Puede que ya esté en cola. Reintente la misma solicitud sin crear otra prueba.",
    sendUnknown:
      "El envío no se confirmó. Puede que la novedad ya se haya aceptado. Reintente la misma solicitud para conocer su estado; no cree otra prueba ni otra novedad.",
    retryTestRequest: "Reintentar la misma prueba",
    retrySendRequest: "Reintentar el mismo envío",
    checkDelivery: "Consultar el envío aceptado",
    reconcileError:
      "No se pudo cargar el envío aceptado. Reintente para ver su historial; no envíe otra novedad.",
    deliveryAccepted:
      "Esta novedad ya se ha aceptado para su envío. El historial mostrará el estado de entrega.",
    deliveryNotFound:
      "El registro de envío aún no está disponible. Reintente cargar su historial.",
    requestIdConflict:
      "Este identificador de solicitud pertenece a otra operación. Solicite una nueva prueba para esta revisión.",
    testStatusUnavailable:
      "El estado de la prueba no está disponible temporalmente. Siga consultando la prueba existente en lugar de solicitar otra.",
    leaveSendUnknown:
      "Puede que este envío ya se haya aceptado. Antes de salir, comprobaremos si se puede cancelar la revisión o cargaremos el envío aceptado. Salir no detiene un envío aceptado.",
    rateLimited:
      "Demasiadas solicitudes. Inténtelo de nuevo después de {date}.",
    completeRequiredFields:
      "Complete la selección, el asunto y el mensaje obligatorios (*) antes de revisar.",
    fixInvalidFields:
      "Corrija el asunto o el mensaje para cumplir los límites indicados antes de revisar.",
    review: "Revisar correo",
    locked:
      "La revisión bloquea esta versión. Envíe una prueba desde la revisión antes de confirmar el envío.",
    backToEdit: "Volver a editar",
    cancelUpdate: "Cancelar novedad",
    leaveTitle: "¿Salir de esta revisión?",
    stay: "Seguir revisando",
    leave: "Salir de la revisión",
    leaveWarning:
      "Salir cancela esta revisión. Su mensaje permanecerá en el editor.",
    leaveTestWarning:
      "Se ha solicitado una prueba. Salir la invalida. Deberá enviar una nueva prueba al reabrir la revisión, aunque nada cambie.",
    cancelWarning:
      "Cancelar la novedad también borra el asunto, el mensaje y la selección.",
    prepareError:
      "La preparación de la revisión no se confirmó. Reintente para preparar una nueva revisión.",
    cancelError:
      "La cancelación no se confirmó. Permanezca aquí y reintente antes de salir.",
    reviewInvalid:
      "Esta revisión ya no está activa. Vuelva a editar, prepare una nueva revisión y envíe una nueva prueba.",
    previewError: "No se pudo cargar la vista previa del correo.",
    reconstructed: "Vista previa reconstruida, no un envío archivado",
    sender: "Remitente",
    language: "Idioma del correo",
    expires: "La revisión caduca: {date}",
    unsubscribeProject: "Baja: proyecto",
    unsubscribeConversation: "Baja: conversación",
  },
  ar: {
    testUnknown:
      "لم يتم تأكيد طلب الاختبار. قد يكون في قائمة الانتظار بالفعل. أعد محاولة الطلب نفسه دون إنشاء اختبار آخر.",
    sendUnknown:
      "لم يتم تأكيد الإرسال. ربما تم قبول التحديث بالفعل. أعد محاولة طلب الإرسال نفسه لمعرفة حالته، ولا تنشئ اختبارًا أو تحديثًا آخر.",
    retryTestRequest: "إعادة محاولة طلب الاختبار نفسه",
    retrySendRequest: "إعادة محاولة طلب الإرسال نفسه",
    checkDelivery: "التحقق من الإرسال المقبول",
    reconcileError:
      "تعذر تحميل الإرسال المقبول. أعد المحاولة لعرض سجله، ولا ترسل تحديثًا آخر.",
    deliveryAccepted:
      "تم قبول هذا التحديث للإرسال بالفعل. سيعرض سجله حالة التسليم.",
    deliveryNotFound: "سجل الإرسال غير متاح بعد. أعد محاولة تحميله.",
    requestIdConflict:
      "معرّف الطلب هذا يخص عملية أخرى. اطلب اختبارًا جديدًا لهذه المراجعة.",
    testStatusUnavailable:
      "حالة الاختبار غير متاحة مؤقتًا. استمر في التحقق من الاختبار الحالي بدلًا من طلب اختبار آخر.",
    leaveSendUnknown:
      "ربما تم قبول هذا الإرسال بالفعل. قبل المغادرة، سنتحقق من إمكانية إلغاء المراجعة أو نحمّل الإرسال المقبول. المغادرة لا توقف إرسالًا مقبولًا.",
    rateLimited: "طلبات كثيرة جدًا. حاول مجددًا بعد {date}.",
    completeRequiredFields:
      "أكمل الاختيار والموضوع والرسالة المطلوبة (*) قبل المراجعة.",
    fixInvalidFields:
      "صحّح الموضوع أو الرسالة للالتزام بالحدود المحددة قبل المراجعة.",
    review: "مراجعة البريد",
    locked:
      "تُقفل المراجعة هذه النسخة. أرسل اختبارًا من المراجعة قبل تأكيد الإرسال.",
    backToEdit: "العودة للتحرير",
    cancelUpdate: "إلغاء التحديث",
    leaveTitle: "مغادرة هذه المراجعة؟",
    stay: "البقاء في المراجعة",
    leave: "مغادرة المراجعة",
    leaveWarning: "تُلغي المغادرة هذه المراجعة. ستبقى رسالتك في المحرر.",
    leaveTestWarning:
      "تم طلب اختبار. المغادرة تُبطله. يجب إرسال اختبار جديد بعد إعادة فتح المراجعة، حتى دون تغييرات.",
    cancelWarning: "إلغاء التحديث يمسح أيضًا الموضوع والرسالة والاختيار.",
    prepareError:
      "لم يتم تأكيد إعداد المراجعة. أعد المحاولة لإعداد مراجعة جديدة.",
    cancelError: "لم يتم تأكيد الإلغاء. ابق هنا وأعد المحاولة قبل المغادرة.",
    reviewInvalid:
      "لم تعد هذه المراجعة نشطة. عد للتحرير وأعد مراجعة جديدة ثم أرسل اختبارًا جديدًا.",
    previewError: "تعذر تحميل معاينة البريد.",
    reconstructed: "معاينة مُعاد إنشاؤها، وليست إرسالًا مؤرشفًا",
    sender: "المرسل",
    language: "لغة البريد",
    expires: "تنتهي المراجعة: {date}",
    unsubscribeProject: "نطاق إلغاء الاشتراك: المشروع",
    unsubscribeConversation: "نطاق إلغاء الاشتراك: المحادثة",
  },
  fa: {
    testUnknown:
      "درخواست آزمایش تأیید نشد. ممکن است از قبل در صف باشد. همان درخواست را بدون ایجاد آزمایش دیگر دوباره امتحان کنید.",
    sendUnknown:
      "ارسال تأیید نشد. ممکن است به‌روزرسانی قبلاً پذیرفته شده باشد. برای تعیین وضعیت، همان درخواست ارسال را دوباره امتحان کنید و آزمایش یا به‌روزرسانی دیگری نسازید.",
    retryTestRequest: "تلاش دوباره برای همان آزمایش",
    retrySendRequest: "تلاش دوباره برای همان ارسال",
    checkDelivery: "بررسی ارسال پذیرفته‌شده",
    reconcileError:
      "بارگیری ارسال پذیرفته‌شده ممکن نشد. برای دیدن تاریخچه دوباره تلاش کنید و به‌روزرسانی دیگری نفرستید.",
    deliveryAccepted:
      "این به‌روزرسانی قبلاً برای ارسال پذیرفته شده است. تاریخچه آن وضعیت تحویل را نشان می‌دهد.",
    deliveryNotFound:
      "رکورد ارسال هنوز در دسترس نیست. بارگیری تاریخچه را دوباره امتحان کنید.",
    requestIdConflict:
      "این شناسه درخواست به عملیات دیگری تعلق دارد. برای این بازبینی آزمایش تازه‌ای درخواست کنید.",
    testStatusUnavailable:
      "وضعیت آزمایش موقتاً در دسترس نیست. به‌جای درخواست آزمایش دیگر، بررسی آزمایش موجود را ادامه دهید.",
    leaveSendUnknown:
      "ممکن است این ارسال قبلاً پذیرفته شده باشد. پیش از خروج، امکان لغو بازبینی را بررسی می‌کنیم یا ارسال پذیرفته‌شده را بارگیری می‌کنیم. خروج نمی‌تواند ارسال پذیرفته‌شده را متوقف کند.",
    rateLimited: "درخواست‌ها بیش از حد است. پس از {date} دوباره تلاش کنید.",
    completeRequiredFields:
      "پیش از بازبینی، انتخاب، موضوع و پیام الزامی (*) را تکمیل کنید.",
    fixInvalidFields:
      "پیش از بازبینی، موضوع یا پیام را با محدودیت‌های اعلام‌شده هماهنگ کنید.",
    review: "بازبینی ایمیل",
    locked:
      "بازبینی این نسخه را قفل می‌کند. پیش از تأیید ارسال، از بازبینی یک آزمایش بفرستید.",
    backToEdit: "بازگشت به ویرایش",
    cancelUpdate: "لغو به‌روزرسانی",
    leaveTitle: "از بازبینی خارج می‌شوید؟",
    stay: "ماندن در بازبینی",
    leave: "خروج از بازبینی",
    leaveWarning:
      "خروج این بازبینی را لغو می‌کند. پیام شما در ویرایشگر می‌ماند.",
    leaveTestWarning:
      "یک آزمایش درخواست شده است. خروج آن را باطل می‌کند. پس از بازگشایی بازبینی، حتی بدون تغییر، باید آزمایش تازه‌ای بفرستید.",
    cancelWarning: "لغو به‌روزرسانی موضوع، پیام و انتخاب را نیز پاک می‌کند.",
    prepareError:
      "آماده‌سازی بازبینی تأیید نشد. برای آماده‌سازی بازبینی تازه دوباره تلاش کنید.",
    cancelError: "لغو تأیید نشد. اینجا بمانید و پیش از خروج دوباره تلاش کنید.",
    reviewInvalid:
      "این بازبینی دیگر فعال نیست. به ویرایش برگردید، بازبینی تازه‌ای آماده کنید و آزمایش تازه‌ای بفرستید.",
    previewError: "بارگیری پیش‌نمایش ایمیل ممکن نشد.",
    reconstructed: "پیش‌نمایش بازسازی‌شده، نه ارسال بایگانی‌شده",
    sender: "فرستنده",
    language: "زبان ایمیل",
    expires: "انقضای بازبینی: {date}",
    unsubscribeProject: "محدوده لغو اشتراک: پروژه",
    unsubscribeConversation: "محدوده لغو اشتراک: گفتگو",
  },
  he: {
    testUnknown:
      "בקשת הבדיקה לא אושרה. ייתכן שהיא כבר בתור. נסו שוב את אותה בקשה בלי ליצור בדיקה נוספת.",
    sendUnknown:
      "השליחה לא אושרה. ייתכן שהעדכון כבר התקבל. נסו שוב את אותה בקשת שליחה כדי לברר את מצבה; אל תיצרו בדיקה או עדכון נוספים.",
    retryTestRequest: "ניסיון חוזר לאותה בדיקה",
    retrySendRequest: "ניסיון חוזר לאותה שליחה",
    checkDelivery: "בדיקת השליחה שהתקבלה",
    reconcileError:
      "לא ניתן לטעון את השליחה שהתקבלה. נסו שוב לצפות בהיסטוריה שלה; אל תשלחו עדכון נוסף.",
    deliveryAccepted:
      "עדכון זה כבר התקבל לשליחה. ההיסטוריה שלו תציג את מצב המסירה.",
    deliveryNotFound:
      "רשומת השליחה עדיין אינה זמינה. נסו לטעון שוב את ההיסטוריה שלה.",
    requestIdConflict:
      "מזהה בקשה זה שייך לפעולה אחרת. בקשו בדיקה חדשה לסקירה זו.",
    testStatusUnavailable:
      "מצב הבדיקה אינו זמין זמנית. המשיכו לבדוק את הבדיקה הקיימת במקום לבקש אחרת.",
    leaveSendUnknown:
      "ייתכן ששליחה זו כבר התקבלה. לפני היציאה נבדוק אם ניתן לבטל את הסקירה או נטען את השליחה שהתקבלה. יציאה אינה יכולה לעצור שליחה שהתקבלה.",
    rateLimited: "יותר מדי בקשות. נסו שוב אחרי {date}.",
    completeRequiredFields:
      "יש להשלים את הבחירה, הנושא וההודעה הנדרשים (*) לפני הסקירה.",
    fixInvalidFields: "יש לתקן את הנושא או ההודעה בהתאם למגבלות לפני הסקירה.",
    review: "סקירת האימייל",
    locked: "הסקירה נועלת גרסה זו. יש לשלוח בדיקה מהסקירה לפני אישור השליחה.",
    backToEdit: "חזרה לעריכה",
    cancelUpdate: "ביטול העדכון",
    leaveTitle: "לצאת מהסקירה?",
    stay: "להישאר בסקירה",
    leave: "יציאה מהסקירה",
    leaveWarning: "היציאה מבטלת סקירה זו. ההודעה תישאר בעורך.",
    leaveTestWarning:
      "התבקשה בדיקה. היציאה מבטלת אותה. יש לשלוח בדיקה חדשה אחרי פתיחת הסקירה מחדש, גם ללא שינויים.",
    cancelWarning: "ביטול העדכון מוחק גם את הנושא, ההודעה והבחירה.",
    prepareError: "הכנת הסקירה לא אושרה. נסו שוב להכין סקירה חדשה.",
    cancelError: "הביטול לא אושר. הישארו כאן ונסו שוב לפני היציאה.",
    reviewInvalid:
      "הסקירה אינה פעילה עוד. חזרו לעריכה, הכינו סקירה חדשה ושלחו בדיקה חדשה.",
    previewError: "לא ניתן לטעון את תצוגת האימייל.",
    reconstructed: "תצוגה משוחזרת, לא שליחה מארכיון",
    sender: "שולח",
    language: "שפת האימייל",
    expires: "תוקף הסקירה: {date}",
    unsubscribeProject: "היקף ביטול המנוי: פרויקט",
    unsubscribeConversation: "היקף ביטול המנוי: שיחה",
  },
  ja: {
    testUnknown:
      "テストのリクエストを確認できませんでした。すでにキューに入っている可能性があります。別のテストを作成せず、同じリクエストを再試行してください。",
    sendUnknown:
      "送信を確認できませんでした。更新はすでに受け付けられている可能性があります。状態を確認するため同じ送信リクエストを再試行し、別のテストや更新は作成しないでください。",
    retryTestRequest: "同じテストを再試行",
    retrySendRequest: "同じ送信を再試行",
    checkDelivery: "受け付け済みの送信を確認",
    reconcileError:
      "受け付け済みの送信を読み込めませんでした。履歴の表示を再試行し、別の更新は送信しないでください。",
    deliveryAccepted:
      "この更新はすでに送信を受け付けています。履歴に配信状況が表示されます。",
    deliveryNotFound:
      "送信記録はまだ利用できません。履歴の読み込みを再試行してください。",
    requestIdConflict:
      "このリクエストIDは別の操作に使用されています。この確認用に新しいテストを要求してください。",
    testStatusUnavailable:
      "テストの状態を一時的に取得できません。別のテストを要求せず、既存のテストの確認を続けてください。",
    leaveSendUnknown:
      "この送信はすでに受け付けられている可能性があります。終了前に確認を取り消せるか調べるか、受け付け済みの送信を読み込みます。終了しても受け付け済みの送信は停止できません。",
    rateLimited: "リクエストが多すぎます。{date}以降に再試行してください。",
    completeRequiredFields:
      "確認の前に、必須の選択、件名、メッセージ（*）を入力してください。",
    fixInvalidFields:
      "確認の前に、件名またはメッセージを指定された制限に合わせて修正してください。",
    review: "メールを確認",
    locked:
      "確認するとこの版がロックされます。送信を確定する前に、確認画面からテストを送信してください。",
    backToEdit: "編集に戻る",
    cancelUpdate: "更新を取り消す",
    leaveTitle: "確認を終了しますか？",
    stay: "確認を続ける",
    leave: "確認を終了",
    leaveWarning:
      "終了するとこの確認は取り消されます。メッセージは編集画面に残ります。",
    leaveTestWarning:
      "テストが要求されています。終了すると無効になります。変更がなくても、確認を再開した後に新しいテストを送信する必要があります。",
    cancelWarning:
      "更新を取り消すと、件名、メッセージ、選択内容も消去されます。",
    prepareError:
      "確認の準備が完了したか確認できませんでした。新しい確認を準備するため再試行してください。",
    cancelError:
      "取り消しを確認できませんでした。この画面で再試行してから終了してください。",
    reviewInvalid:
      "この確認は無効です。編集に戻って新しい確認を準備し、テストを再送信してください。",
    previewError: "メールのプレビューを読み込めませんでした。",
    reconstructed: "再構成されたプレビュー（送信時の記録ではありません）",
    sender: "送信者",
    language: "メールの言語",
    expires: "確認の有効期限：{date}",
    unsubscribeProject: "配信停止の範囲：プロジェクト",
    unsubscribeConversation: "配信停止の範囲：会話",
  },
  ky: {
    testUnknown:
      "Сыноо сурамы ырасталган жок. Ал кезекте болушу мүмкүн. Башка сыноо түзбөстөн, ошол эле сурамды кайталаңыз.",
    sendUnknown:
      "Жөнөтүү ырасталган жок. Жаңыртуу кабыл алынган болушу мүмкүн. Абалын тактоо үчүн ошол эле жөнөтүү сурамын кайталаңыз; башка сыноо же жаңыртуу түзбөңүз.",
    retryTestRequest: "Ошол эле сыноону кайталоо",
    retrySendRequest: "Ошол эле жөнөтүүнү кайталоо",
    checkDelivery: "Кабыл алынган жөнөтүүнү текшерүү",
    reconcileError:
      "Кабыл алынган жөнөтүүнү жүктөө мүмкүн болгон жок. Тарыхын көрүү үчүн кайра аракет кылыңыз; башка жаңыртуу жөнөтпөңүз.",
    deliveryAccepted:
      "Бул жаңыртуу жөнөтүүгө кабыл алынган. Анын тарыхында жеткирүү абалы көрсөтүлөт.",
    deliveryNotFound:
      "Жөнөтүү жазуусу азырынча жеткиликтүү эмес. Тарыхын кайра жүктөп көрүңүз.",
    requestIdConflict:
      "Бул сурамдын идентификатору башка операцияга таандык. Бул карап чыгуу үчүн жаңы сыноо сураңыз.",
    testStatusUnavailable:
      "Сыноонун абалы убактылуу жеткиликсиз. Башкасын сурабастан, учурдагы сыноону текшерүүнү улантыңыз.",
    leaveSendUnknown:
      "Бул жөнөтүү кабыл алынган болушу мүмкүн. Чыгуудан мурун карап чыгууну жокко чыгарууга болорун текшеребиз же кабыл алынган жөнөтүүнү жүктөйбүз. Чыгуу кабыл алынган жөнөтүүнү токтото албайт.",
    rateLimited: "Суроо-талаптар өтө көп. {date} кийин кайра аракет кылыңыз.",
    completeRequiredFields:
      "Карап чыгуудан мурун милдеттүү тандоону, теманы жана билдирүүнү (*) толтуруңуз.",
    fixInvalidFields:
      "Карап чыгуудан мурун теманы же билдирүүнү көрсөтүлгөн чектөөлөргө ылайык оңдоңуз.",
    review: "Катты карап чыгуу",
    locked:
      "Карап чыгуу бул версияны бекитет. Жөнөтүүнү ырастоодон мурун ушул экрандан сыноо катын жөнөтүңүз.",
    backToEdit: "Түзөтүүгө кайтуу",
    cancelUpdate: "Жаңыртууну жокко чыгаруу",
    leaveTitle: "Карап чыгуудан чыгасызбы?",
    stay: "Бул жерде калуу",
    leave: "Карап чыгуудан чыгуу",
    leaveWarning:
      "Чыгуу бул карап чыгууну жокко чыгарат. Билдирүүңүз редактордо калат.",
    leaveTestWarning:
      "Сыноо суралды. Чыгуу аны жараксыз кылат. Карап чыгууну кайра ачкандан кийин, эч нерсе өзгөрбөсө да, жаңы сыноо жөнөтүшүңүз керек.",
    cancelWarning:
      "Жаңыртууну жокко чыгаруу теманы, билдирүүнү жана тандоону да тазалайт.",
    prepareError:
      "Карап чыгуунун даярдалганы ырасталган жок. Жаңы карап чыгууну даярдоо үчүн кайра аракет кылыңыз.",
    cancelError:
      "Жокко чыгаруу ырасталган жок. Бул жерде калып, чыгуудан мурун кайра аракет кылыңыз.",
    reviewInvalid:
      "Бул карап чыгуу мындан ары активдүү эмес. Түзөтүүгө кайтып, жаңы карап чыгууну даярдап, жаңы сыноо жөнөтүңүз.",
    previewError: "Каттын алдын ала көрүнүшүн жүктөө мүмкүн болгон жок.",
    reconstructed: "Калыбына келтирилген көрүнүш, архивделген жөнөтүү эмес",
    sender: "Жөнөтүүчү",
    language: "Каттын тили",
    expires: "Карап чыгуунун мөөнөтү: {date}",
    unsubscribeProject: "Жазылуудан чыгуу чөйрөсү: долбоор",
    unsubscribeConversation: "Жазылуудан чыгуу чөйрөсү: талкуу",
  },
  ru: {
    testUnknown:
      "Запрос теста не подтверждён. Возможно, он уже в очереди. Повторите тот же запрос, не создавая другой тест.",
    sendUnknown:
      "Отправка не подтверждена. Возможно, обновление уже принято. Повторите тот же запрос отправки, чтобы уточнить статус; не создавайте другой тест или обновление.",
    retryTestRequest: "Повторить тот же запрос теста",
    retrySendRequest: "Повторить тот же запрос отправки",
    checkDelivery: "Проверить принятую отправку",
    reconcileError:
      "Не удалось загрузить принятую отправку. Повторите загрузку истории; не отправляйте другое обновление.",
    deliveryAccepted:
      "Это обновление уже принято к отправке. В истории будет показан статус доставки.",
    deliveryNotFound:
      "Запись об отправке пока недоступна. Повторите загрузку истории.",
    requestIdConflict:
      "Этот идентификатор запроса относится к другой операции. Запросите новый тест для этой проверки.",
    testStatusUnavailable:
      "Статус теста временно недоступен. Продолжайте проверять существующий тест вместо запроса другого.",
    leaveSendUnknown:
      "Возможно, эта отправка уже принята. Перед выходом мы проверим возможность отмены проверки или загрузим принятую отправку. Выход не останавливает принятую отправку.",
    rateLimited: "Слишком много запросов. Повторите попытку после {date}.",
    completeRequiredFields:
      "Перед проверкой заполните обязательные поля выбора, темы и сообщения (*).",
    fixInvalidFields:
      "Перед проверкой исправьте тему или сообщение в соответствии с указанными ограничениями.",
    review: "Проверить письмо",
    locked:
      "Проверка фиксирует эту версию. Перед подтверждением отправки отправьте тест с экрана проверки.",
    backToEdit: "Вернуться к редактированию",
    cancelUpdate: "Отменить обновление",
    leaveTitle: "Выйти из проверки?",
    stay: "Остаться",
    leave: "Выйти из проверки",
    leaveWarning:
      "Выход отменит эту проверку. Сообщение останется в редакторе.",
    leaveTestWarning:
      "Тест уже запрошен. Выход сделает его недействительным. После повторного открытия проверки нужно отправить новый тест, даже без изменений.",
    cancelWarning:
      "Отмена обновления также удалит тему, сообщение и выбор бесед.",
    prepareError:
      "Подготовка проверки не подтверждена. Повторите запрос, чтобы подготовить новую проверку.",
    cancelError:
      "Отмена не подтверждена. Останьтесь здесь и повторите попытку перед выходом.",
    reviewInvalid:
      "Эта проверка больше не активна. Вернитесь к редактированию, подготовьте новую проверку и отправьте новый тест.",
    previewError: "Не удалось загрузить предпросмотр письма.",
    reconstructed: "Восстановленный предпросмотр, не архив отправки",
    sender: "Отправитель",
    language: "Язык письма",
    expires: "Проверка истекает: {date}",
    unsubscribeProject: "Область отписки: проект",
    unsubscribeConversation: "Область отписки: беседа",
  },
  "zh-Hans": {
    testUnknown:
      "测试请求尚未确认，可能已在队列中。请重试同一请求，不要创建另一个测试。",
    sendUnknown:
      "发送尚未确认，更新可能已被接受。请重试同一发送请求以确定状态，不要创建另一个测试或更新。",
    retryTestRequest: "重试同一测试请求",
    retrySendRequest: "重试同一发送请求",
    checkDelivery: "查看已接受的发送",
    reconcileError:
      "无法加载已接受的发送。请重试查看其历史记录，不要发送另一个更新。",
    deliveryAccepted: "此更新已被接受发送。历史记录将显示投递状态。",
    deliveryNotFound: "发送记录暂不可用。请重试加载其历史记录。",
    requestIdConflict: "此请求标识属于其他操作。请为此次检查请求新的测试。",
    testStatusUnavailable:
      "测试状态暂不可用。请继续查询现有测试，不要请求另一个测试。",
    leaveSendUnknown:
      "此发送可能已被接受。离开前，我们将确认能否取消此次检查，或加载已接受的发送。离开无法停止已接受的发送。",
    rateLimited: "请求过多。请在 {date} 后重试。",
    completeRequiredFields: "检查前，请完成必填的选择、主题和消息字段（*）。",
    fixInvalidFields: "检查前，请修改主题或消息以符合所述限制。",
    review: "检查邮件",
    locked: "检查会锁定此版本。确认发送前，请从检查页面发送测试邮件。",
    backToEdit: "返回编辑",
    cancelUpdate: "取消更新",
    leaveTitle: "离开此次检查？",
    stay: "继续检查",
    leave: "离开检查",
    leaveWarning: "离开将取消此次检查。消息将保留在编辑器中。",
    leaveTestWarning:
      "已请求发送测试邮件。离开会使其失效。重新打开检查后，即使没有修改，也必须发送新的测试邮件。",
    cancelWarning: "取消更新还会清除主题、消息和选择项。",
    prepareError: "检查准备尚未确认。请重试以准备新的检查。",
    cancelError: "取消尚未确认。请留在此处重试后再离开。",
    reviewInvalid:
      "此次检查已失效。请返回编辑，准备新的检查并重新发送测试邮件。",
    previewError: "无法加载邮件预览。",
    reconstructed: "重建的预览，并非已归档的发送记录",
    sender: "发件人",
    language: "邮件语言",
    expires: "检查到期时间：{date}",
    unsubscribeProject: "退订范围：项目",
    unsubscribeConversation: "退订范围：对话",
  },
  "zh-Hant": {
    testUnknown:
      "測試請求尚未確認，可能已在佇列中。請重試同一請求，不要建立另一個測試。",
    sendUnknown:
      "寄送尚未確認，更新可能已被接受。請重試同一寄送請求以確定狀態，不要建立另一個測試或更新。",
    retryTestRequest: "重試同一測試請求",
    retrySendRequest: "重試同一寄送請求",
    checkDelivery: "查看已接受的寄送",
    reconcileError:
      "無法載入已接受的寄送。請重試查看其歷史記錄，不要寄送另一個更新。",
    deliveryAccepted: "此更新已被接受寄送。歷史記錄將顯示投遞狀態。",
    deliveryNotFound: "寄送記錄暫不可用。請重試載入其歷史記錄。",
    requestIdConflict: "此請求識別碼屬於其他操作。請為此次檢查要求新的測試。",
    testStatusUnavailable:
      "測試狀態暫不可用。請繼續查詢現有測試，不要要求另一個測試。",
    leaveSendUnknown:
      "此寄送可能已被接受。離開前，我們將確認能否取消此次檢查，或載入已接受的寄送。離開無法停止已接受的寄送。",
    rateLimited: "請求過多。請在 {date} 後重試。",
    completeRequiredFields: "檢查前，請完成必填的選取、主旨和訊息欄位（*）。",
    fixInvalidFields: "檢查前，請修改主旨或訊息以符合所述限制。",
    review: "檢查郵件",
    locked: "檢查會鎖定此版本。確認寄送前，請從檢查頁面寄送測試郵件。",
    backToEdit: "返回編輯",
    cancelUpdate: "取消更新",
    leaveTitle: "離開此次檢查？",
    stay: "繼續檢查",
    leave: "離開檢查",
    leaveWarning: "離開將取消此次檢查。訊息將保留在編輯器中。",
    leaveTestWarning:
      "已要求寄送測試郵件。離開會使其失效。重新開啟檢查後，即使沒有修改，也必須寄送新的測試郵件。",
    cancelWarning: "取消更新也會清除主旨、訊息和選取項目。",
    prepareError: "檢查準備尚未確認。請重試以準備新的檢查。",
    cancelError: "取消尚未確認。請留在此處重試後再離開。",
    reviewInvalid:
      "此次檢查已失效。請返回編輯，準備新的檢查並重新寄送測試郵件。",
    previewError: "無法載入郵件預覽。",
    reconstructed: "重建的預覽，並非已封存的寄送紀錄",
    sender: "寄件者",
    language: "郵件語言",
    expires: "檢查到期時間：{date}",
    unsubscribeProject: "退訂範圍：專案",
    unsubscribeConversation: "退訂範圍：對話",
  },
};
