import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateComposerFormTranslations {
  composeUpdate: string;
  heading: string;
  testEmailNotice: string;
  zeroAudienceWarning: string;
  subjectLabel: string;
  subjectHint: string;
  messageLabel: string;
  editorPlaceholder: string;
  policyWarning: string;
  contentConfirmation: string;
  ownerCopySingular: string;
  ownerCopyPlural: string;
  testPassed: string;
  testRequired: string;
  sendAnotherTest: string;
  sendTest: string;
  reviewAndSend: string;
  replyToConversation: string;
  replyToProject: string;
  optionalEmailAllWarning: string;
  optionalEmailSomeWarning: string;
}

export const conversationUpdateComposerFormTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdateComposerFormTranslations
> = {
  en: {
    composeUpdate: "Compose update",
    heading: "Write once, deliver with each participant's context",
    testEmailNotice:
      "This test goes only to the facilitator at {email}. Nobody else receives anything until you send the real update.",
    zeroAudienceWarning:
      "No participants are currently eligible to receive this email. Testing and sending will become available when at least one participant is eligible.",
    subjectLabel: "Subject",
    subjectHint: "Maximum {max} Unicode characters",
    messageLabel: "Message",
    editorPlaceholder:
      "Share a concise group update:\n• Share results\n• Explain what changed\n• Highlight new statements\n• Invite participants to return\n\nRemember: some participants may have responded to everything; others may not have.",
    policyWarning:
      "Keep this update strictly about the selected conversations. Advertising, fundraising, political campaigning, and unrelated promotion are not allowed.",
    contentConfirmation:
      "I confirm this update follows the Email Update content rules",
    ownerCopySingular:
      "The real update will reach eligible participants plus {count} authorized project manager. Anyone who is both an eligible participant and an authorized project manager receives one owner copy.",
    ownerCopyPlural:
      "The real update will reach eligible participants plus {count} authorized project managers. Anyone who is both an eligible participant and an authorized project manager receives one owner copy.",
    testPassed:
      "This exact email version passed its test. Changing the scope, Reply-To, subject, or message requires another successful test.",
    testRequired:
      "Send a successful test email for this exact version before reviewing the real send.",
    sendAnotherTest: "Send another test email",
    sendTest: "Send test email",
    reviewAndSend: "Review and send",
    replyToConversation: "Reply to (conversation email)",
    replyToProject: "Reply to (project email)",
    optionalEmailAllWarning:
      "Email is optional for participants in the selected conversations. The eligible recipient count includes only participants who verified an email and opted in to Email Updates.",
    optionalEmailSomeWarning:
      "Email is optional for participants in some selected conversations. The eligible recipient count includes only participants who verified an email and opted in to Email Updates.",
  },
  ar: {
    composeUpdate: "إنشاء تحديث",
    heading: "اكتب مرة واحدة، وأرسل وفق سياق كل مشارك",
    testEmailNotice:
      "يُرسل هذا الاختبار إلى المُيسّر فقط على {email}. لن يتلقى أي شخص آخر شيئًا حتى ترسل التحديث الفعلي.",
    zeroAudienceWarning:
      "لا يوجد حاليًا مشاركون مؤهلون لتلقي هذا البريد الإلكتروني. سيصبح الاختبار والإرسال متاحين عندما يكون هناك مشارك مؤهل واحد على الأقل.",
    subjectLabel: "الموضوع",
    subjectHint: "الحد الأقصى {max} من محارف Unicode",
    messageLabel: "الرسالة",
    editorPlaceholder:
      "شارك تحديثًا موجزًا للمجموعة:\n• شارك النتائج\n• اشرح ما تغيّر\n• سلّط الضوء على المقترحات الجديدة\n• ادعُ المشاركين إلى العودة\n\nتذكّر: قد يكون بعض المشاركين قد أجابوا عن كل شيء، بينما لم يفعل آخرون ذلك.",
    policyWarning:
      "اجعل هذا التحديث متعلقًا فقط بالمحادثات المحددة. لا يُسمح بالإعلانات أو جمع التبرعات أو الحملات السياسية أو الترويج غير ذي الصلة.",
    contentConfirmation:
      "أؤكد أن هذا التحديث يتبع قواعد محتوى تحديثات البريد الإلكتروني",
    ownerCopySingular:
      "سيصل التحديث الفعلي إلى المشاركين المؤهلين بالإضافة إلى {count} من مديري المشروع المخوّلين. ومن كان مشاركًا مؤهلًا ومدير مشروع مخوّلًا في الوقت نفسه سيتلقى نسخة مالك واحدة.",
    ownerCopyPlural:
      "سيصل التحديث الفعلي إلى المشاركين المؤهلين بالإضافة إلى {count} من مديري المشروع المخوّلين. ومن كان مشاركًا مؤهلًا ومدير مشروع مخوّلًا في الوقت نفسه سيتلقى نسخة مالك واحدة.",
    testPassed:
      "اجتازت نسخة البريد الإلكتروني هذه الاختبار. يتطلب تغيير النطاق أو عنوان الرد أو الموضوع أو الرسالة اختبارًا ناجحًا آخر.",
    testRequired:
      "أرسل بريدًا تجريبيًا ناجحًا لهذه النسخة نفسها قبل مراجعة الإرسال الفعلي.",
    sendAnotherTest: "إرسال بريد تجريبي آخر",
    sendTest: "إرسال بريد تجريبي",
    reviewAndSend: "المراجعة والإرسال",
    replyToConversation: "الرد إلى (بريد المحادثة)",
    replyToProject: "الرد إلى (بريد المشروع)",
    optionalEmailAllWarning:
      "البريد الإلكتروني اختياري للمشاركين في المحادثات المحددة. يشمل عدد المستلمين المؤهلين فقط المشاركين الذين أكدوا بريدهم الإلكتروني واشتركوا في تحديثات البريد الإلكتروني.",
    optionalEmailSomeWarning:
      "البريد الإلكتروني اختياري للمشاركين في بعض المحادثات المحددة. يشمل عدد المستلمين المؤهلين فقط المشاركين الذين أكدوا بريدهم الإلكتروني واشتركوا في تحديثات البريد الإلكتروني.",
  },
  es: {
    composeUpdate: "Redactar actualización",
    heading: "Escriba una vez y envíe con el contexto de cada participante",
    testEmailNotice:
      "Esta prueba se envía únicamente a la persona facilitadora en {email}. Nadie más recibirá nada hasta que envíe la actualización real.",
    zeroAudienceWarning:
      "Actualmente no hay participantes que puedan recibir este correo. Las opciones de prueba y envío estarán disponibles cuando haya al menos una persona participante elegible.",
    subjectLabel: "Asunto",
    subjectHint: "Máximo de {max} caracteres Unicode",
    messageLabel: "Mensaje",
    editorPlaceholder:
      "Comparta una actualización breve con el grupo:\n• Comparta resultados\n• Explique qué cambió\n• Destaque nuevas propuestas\n• Invite a volver a participar\n\nRecuerde: algunas personas pueden haber respondido a todo y otras no.",
    policyWarning:
      "Limite esta actualización estrictamente a las conversaciones seleccionadas. No se permiten la publicidad, la recaudación de fondos, las campañas políticas ni la promoción no relacionada.",
    contentConfirmation:
      "Confirmo que esta actualización cumple las reglas de contenido de las actualizaciones por correo",
    ownerCopySingular:
      "La actualización real llegará a las personas participantes elegibles y a {count} responsable de proyecto autorizado. Quien pertenezca a ambos grupos recibirá una sola copia como responsable.",
    ownerCopyPlural:
      "La actualización real llegará a las personas participantes elegibles y a {count} responsables de proyecto autorizados. Quien pertenezca a ambos grupos recibirá una sola copia como responsable.",
    testPassed:
      "Esta versión exacta del correo superó la prueba. Si cambia el alcance, la dirección de respuesta, el asunto o el mensaje, deberá realizar otra prueba correctamente.",
    testRequired:
      "Envíe correctamente un correo de prueba de esta versión exacta antes de revisar el envío real.",
    sendAnotherTest: "Enviar otro correo de prueba",
    sendTest: "Enviar correo de prueba",
    reviewAndSend: "Revisar y enviar",
    replyToConversation: "Responder a (correo de la conversación)",
    replyToProject: "Responder a (correo del proyecto)",
    optionalEmailAllWarning:
      "El correo electrónico es opcional para quienes participan en las conversaciones seleccionadas. El recuento de destinatarios elegibles solo incluye a quienes verificaron su correo y aceptaron recibir actualizaciones por correo.",
    optionalEmailSomeWarning:
      "El correo electrónico es opcional para quienes participan en algunas conversaciones seleccionadas. El recuento de destinatarios elegibles solo incluye a quienes verificaron su correo y aceptaron recibir actualizaciones por correo.",
  },
  fa: {
    composeUpdate: "نوشتن به‌روزرسانی",
    heading: "یک‌بار بنویسید و متناسب با زمینه هر شرکت‌کننده ارسال کنید",
    testEmailNotice:
      "این آزمایش فقط برای تسهیل‌گر به نشانی {email} فرستاده می‌شود. تا زمانی که به‌روزرسانی واقعی را ارسال نکنید، هیچ‌کس دیگری چیزی دریافت نمی‌کند.",
    zeroAudienceWarning:
      "در حال حاضر هیچ شرکت‌کننده‌ای واجد شرایط دریافت این ایمیل نیست. آزمایش و ارسال زمانی فعال می‌شود که دست‌کم یک شرکت‌کننده واجد شرایط باشد.",
    subjectLabel: "موضوع",
    subjectHint: "حداکثر {max} نویسه یونیکد",
    messageLabel: "پیام",
    editorPlaceholder:
      "یک به‌روزرسانی کوتاه برای گروه بنویسید:\n• نتایج را به اشتراک بگذارید\n• توضیح دهید چه چیزی تغییر کرده است\n• گزاره‌های جدید را برجسته کنید\n• از شرکت‌کنندگان دعوت کنید بازگردند\n\nبه یاد داشته باشید: ممکن است برخی به همه موارد پاسخ داده باشند و برخی دیگر نه.",
    policyWarning:
      "این به‌روزرسانی را فقط به گفت‌وگوهای انتخاب‌شده محدود کنید. تبلیغات، جمع‌آوری کمک مالی، کارزار سیاسی و ترویج نامرتبط مجاز نیست.",
    contentConfirmation:
      "تأیید می‌کنم که این به‌روزرسانی از قوانین محتوای به‌روزرسانی ایمیلی پیروی می‌کند",
    ownerCopySingular:
      "به‌روزرسانی واقعی به شرکت‌کنندگان واجد شرایط و {count} مدیر پروژه مجاز می‌رسد. فردی که هم شرکت‌کننده واجد شرایط و هم مدیر پروژه مجاز است، یک نسخه مالک دریافت می‌کند.",
    ownerCopyPlural:
      "به‌روزرسانی واقعی به شرکت‌کنندگان واجد شرایط و {count} مدیر پروژه مجاز می‌رسد. فردی که هم شرکت‌کننده واجد شرایط و هم مدیر پروژه مجاز است، یک نسخه مالک دریافت می‌کند.",
    testPassed:
      "همین نسخه ایمیل آزمایش را با موفقیت گذراند. تغییر دامنه، نشانی پاسخ، موضوع یا پیام نیازمند یک آزمایش موفق دیگر است.",
    testRequired:
      "پیش از بررسی ارسال واقعی، یک ایمیل آزمایشی موفق برای همین نسخه بفرستید.",
    sendAnotherTest: "ارسال یک ایمیل آزمایشی دیگر",
    sendTest: "ارسال ایمیل آزمایشی",
    reviewAndSend: "بررسی و ارسال",
    replyToConversation: "پاسخ به (ایمیل گفت‌وگو)",
    replyToProject: "پاسخ به (ایمیل پروژه)",
    optionalEmailAllWarning:
      "ایمیل برای شرکت‌کنندگان در گفت‌وگوهای انتخاب‌شده اختیاری است. شمار دریافت‌کنندگان واجد شرایط فقط شامل کسانی است که ایمیل خود را تأیید کرده و دریافت به‌روزرسانی‌های ایمیلی را پذیرفته‌اند.",
    optionalEmailSomeWarning:
      "ایمیل برای شرکت‌کنندگان در برخی گفت‌وگوهای انتخاب‌شده اختیاری است. شمار دریافت‌کنندگان واجد شرایط فقط شامل کسانی است که ایمیل خود را تأیید کرده و دریافت به‌روزرسانی‌های ایمیلی را پذیرفته‌اند.",
  },
  fr: {
    composeUpdate: "Rédiger une actualité",
    heading: "Écrivez une fois, envoyez avec le contexte de chaque participant",
    testEmailNotice:
      "Ce test est envoyé uniquement à la personne facilitatrice à l'adresse {email}. Personne d'autre ne recevra quoi que ce soit avant l'envoi de l'actualité réelle.",
    zeroAudienceWarning:
      "Aucun participant ne peut actuellement recevoir cet e-mail. Le test et l'envoi seront disponibles dès qu'au moins un participant sera éligible.",
    subjectLabel: "Objet",
    subjectHint: "{max} caractères Unicode au maximum",
    messageLabel: "Message",
    editorPlaceholder:
      "Partagez une actualité concise avec le groupe :\n• Partagez les résultats\n• Expliquez ce qui a changé\n• Mettez en avant les nouvelles propositions\n• Invitez les participants à revenir\n\nRappel : certains participants ont peut-être répondu à tout, d'autres non.",
    policyWarning:
      "Limitez strictement cette actualité aux conversations sélectionnées. La publicité, la collecte de fonds, les campagnes politiques et les promotions sans rapport sont interdites.",
    contentConfirmation:
      "Je confirme que cette actualité respecte les règles de contenu des actualités par e-mail",
    ownerCopySingular:
      "L'actualité réelle sera envoyée aux participants éligibles ainsi qu'à {count} gestionnaire de projet autorisé. Toute personne appartenant aux deux groupes recevra une seule copie en tant que gestionnaire.",
    ownerCopyPlural:
      "L'actualité réelle sera envoyée aux participants éligibles ainsi qu'à {count} gestionnaires de projet autorisés. Toute personne appartenant aux deux groupes recevra une seule copie en tant que gestionnaire.",
    testPassed:
      "Cette version exacte de l'e-mail a réussi le test. Toute modification de la portée, de l'adresse de réponse, de l'objet ou du message exige un nouveau test réussi.",
    testRequired:
      "Envoyez avec succès un e-mail de test pour cette version exacte avant de vérifier l'envoi réel.",
    sendAnotherTest: "Envoyer un autre e-mail de test",
    sendTest: "Envoyer un e-mail de test",
    reviewAndSend: "Vérifier et envoyer",
    replyToConversation: "Répondre à (e-mail de la conversation)",
    replyToProject: "Répondre à (e-mail du projet)",
    optionalEmailAllWarning:
      "L'e-mail est facultatif pour les participants aux conversations sélectionnées. Le nombre de destinataires éligibles comprend uniquement les participants qui ont vérifié leur adresse e-mail et accepté les actualités par e-mail.",
    optionalEmailSomeWarning:
      "L'e-mail est facultatif pour les participants à certaines conversations sélectionnées. Le nombre de destinataires éligibles comprend uniquement les participants qui ont vérifié leur adresse e-mail et accepté les actualités par e-mail.",
  },
  "zh-Hans": {
    composeUpdate: "撰写动态",
    heading: "一次撰写，结合每位参与者的情况发送",
    testEmailNotice:
      "此测试仅发送给 {email} 的协调员。在您发送正式动态之前，其他任何人都不会收到任何内容。",
    zeroAudienceWarning:
      "目前没有符合条件的参与者可以接收此邮件。至少有一名参与者符合条件后，测试和发送功能才会可用。",
    subjectLabel: "主题",
    subjectHint: "最多 {max} 个 Unicode 字符",
    messageLabel: "消息",
    editorPlaceholder:
      "向群组分享简短动态：\n• 分享结果\n• 说明发生了哪些变化\n• 强调新观点\n• 邀请参与者回来\n\n请注意：有些参与者可能已回应全部内容，另一些则尚未回应。",
    policyWarning:
      "此动态必须严格围绕所选对话。不得包含广告、募款、政治竞选或无关推广。",
    contentConfirmation: "我确认此动态符合邮件动态内容规则",
    ownerCopySingular:
      "正式动态将发送给符合条件的参与者，以及 {count} 名获授权的项目管理员。同时符合参与者和项目管理员条件的人只会收到一份管理员副本。",
    ownerCopyPlural:
      "正式动态将发送给符合条件的参与者，以及 {count} 名获授权的项目管理员。同时符合参与者和项目管理员条件的人只会收到一份管理员副本。",
    testPassed:
      "此邮件的当前版本已通过测试。更改范围、回复地址、主题或消息后，需要再次成功测试。",
    testRequired: "请先成功发送此版本的测试邮件，再检查正式发送。",
    sendAnotherTest: "再发送一封测试邮件",
    sendTest: "发送测试邮件",
    reviewAndSend: "检查并发送",
    replyToConversation: "回复至（对话邮箱）",
    replyToProject: "回复至（项目邮箱）",
    optionalEmailAllWarning:
      "所选对话的参与者可自行选择是否提供邮箱。符合条件的收件人数仅包括已验证邮箱并选择接收邮件动态的参与者。",
    optionalEmailSomeWarning:
      "部分所选对话的参与者可自行选择是否提供邮箱。符合条件的收件人数仅包括已验证邮箱并选择接收邮件动态的参与者。",
  },
  "zh-Hant": {
    composeUpdate: "撰寫動態",
    heading: "一次撰寫，結合每位參與者的情況傳送",
    testEmailNotice:
      "此測試僅傳送給 {email} 的協調員。在您傳送正式動態之前，其他任何人都不會收到任何內容。",
    zeroAudienceWarning:
      "目前沒有符合資格的參與者可以接收此郵件。至少有一名參與者符合資格後，測試和傳送功能才會開放。",
    subjectLabel: "主旨",
    subjectHint: "最多 {max} 個 Unicode 字元",
    messageLabel: "訊息",
    editorPlaceholder:
      "向群組分享簡短動態：\n• 分享結果\n• 說明發生了哪些變化\n• 強調新提議\n• 邀請參與者回來\n\n請注意：有些參與者可能已回應全部內容，另一些則尚未回應。",
    policyWarning:
      "此動態必須嚴格圍繞所選對話。不得包含廣告、募款、政治競選或無關推廣。",
    contentConfirmation: "我確認此動態符合郵件動態內容規則",
    ownerCopySingular:
      "正式動態將傳送給符合資格的參與者，以及 {count} 名獲授權的專案管理員。同時符合參與者和專案管理員資格的人只會收到一份管理員副本。",
    ownerCopyPlural:
      "正式動態將傳送給符合資格的參與者，以及 {count} 名獲授權的專案管理員。同時符合參與者和專案管理員資格的人只會收到一份管理員副本。",
    testPassed:
      "此郵件的目前版本已通過測試。變更範圍、回覆地址、主旨或訊息後，需要再次成功測試。",
    testRequired: "請先成功傳送此版本的測試郵件，再檢查正式傳送。",
    sendAnotherTest: "再傳送一封測試郵件",
    sendTest: "傳送測試郵件",
    reviewAndSend: "檢查並傳送",
    replyToConversation: "回覆至（對話信箱）",
    replyToProject: "回覆至（專案信箱）",
    optionalEmailAllWarning:
      "所選對話的參與者可自行選擇是否提供電子郵件。符合資格的收件人數僅包括已驗證電子郵件並選擇接收郵件動態的參與者。",
    optionalEmailSomeWarning:
      "部分所選對話的參與者可自行選擇是否提供電子郵件。符合資格的收件人數僅包括已驗證電子郵件並選擇接收郵件動態的參與者。",
  },
  he: {
    composeUpdate: "כתיבת עדכון",
    heading: "כותבים פעם אחת ושולחים בהקשר של כל משתתף",
    testEmailNotice:
      "בדיקה זו נשלחת רק למנחה בכתובת {email}. אף אדם אחר לא יקבל דבר עד לשליחת העדכון האמיתי.",
    zeroAudienceWarning:
      "אין כרגע משתתפים שזכאים לקבל את הודעת הדוא״ל הזו. הבדיקה והשליחה יהיו זמינות כשיהיה לפחות משתתף זכאי אחד.",
    subjectLabel: "נושא",
    subjectHint: "עד {max} תווי Unicode",
    messageLabel: "הודעה",
    editorPlaceholder:
      "שתפו עדכון קצר עם הקבוצה:\n• שתפו תוצאות\n• הסבירו מה השתנה\n• הדגישו הצהרות חדשות\n• הזמינו את המשתתפים לחזור\n\nחשוב לזכור: ייתכן שחלק מהמשתתפים הגיבו לכל דבר ואחרים עדיין לא.",
    policyWarning:
      "יש להגביל את העדכון אך ורק לשיחות שנבחרו. פרסום, גיוס כספים, תעמולה פוליטית וקידום שאינו קשור אסורים.",
    contentConfirmation: "אני מאשר/ת שהעדכון עומד בכללי התוכן של עדכוני הדוא״ל",
    ownerCopySingular:
      "העדכון האמיתי יגיע למשתתפים הזכאים וגם למנהל פרויקט מורשה אחד ({count}). מי שמשתייך לשתי הקבוצות יקבל עותק בעלים אחד בלבד.",
    ownerCopyPlural:
      "העדכון האמיתי יגיע למשתתפים הזכאים וגם ל-{count} מנהלי פרויקט מורשים. מי שמשתייך לשתי הקבוצות יקבל עותק בעלים אחד בלבד.",
    testPassed:
      "הגרסה המדויקת הזו של הודעת הדוא״ל עברה את הבדיקה. שינוי ההיקף, כתובת המענה, הנושא או ההודעה מחייב בדיקה מוצלחת נוספת.",
    testRequired:
      "יש לשלוח בהצלחה הודעת בדיקה לגרסה המדויקת הזו לפני בדיקת השליחה האמיתית.",
    sendAnotherTest: "שליחת הודעת בדיקה נוספת",
    sendTest: "שליחת הודעת בדיקה",
    reviewAndSend: "בדיקה ושליחה",
    replyToConversation: "מענה אל (דוא״ל השיחה)",
    replyToProject: "מענה אל (דוא״ל הפרויקט)",
    optionalEmailAllWarning:
      "מסירת דוא״ל היא אופציונלית למשתתפים בשיחות שנבחרו. מספר הנמענים הזכאים כולל רק משתתפים שאימתו כתובת דוא״ל ובחרו לקבל עדכוני דוא״ל.",
    optionalEmailSomeWarning:
      "מסירת דוא״ל היא אופציונלית למשתתפים בחלק מהשיחות שנבחרו. מספר הנמענים הזכאים כולל רק משתתפים שאימתו כתובת דוא״ל ובחרו לקבל עדכוני דוא״ל.",
  },
  ja: {
    composeUpdate: "更新を作成",
    heading: "一度の作成で、各参加者の状況に合わせて配信",
    testEmailNotice:
      "このテストはファシリテーターの {email} にのみ送信されます。実際の更新を送信するまで、ほかの誰にも何も届きません。",
    zeroAudienceWarning:
      "現在、このメールを受け取れる参加者はいません。対象となる参加者が1人以上になると、テストと送信が可能になります。",
    subjectLabel: "件名",
    subjectHint: "Unicode文字は最大{max}文字",
    messageLabel: "メッセージ",
    editorPlaceholder:
      "グループに簡潔な更新を共有：\n• 結果を共有する\n• 変更点を説明する\n• 新しい提案を紹介する\n• 参加者に再訪を促す\n\n注意：すべてに回答済みの参加者も、まだ回答していない参加者もいます。",
    policyWarning:
      "この更新は選択した会話の内容に厳密に限定してください。広告、資金調達、政治運動、無関係な宣伝は禁止されています。",
    contentConfirmation:
      "この更新がメール更新のコンテンツルールに従っていることを確認します",
    ownerCopySingular:
      "実際の更新は対象の参加者に加え、承認されたプロジェクト管理者{count}人に届きます。両方に該当する人には、管理者向けコピーが1通だけ届きます。",
    ownerCopyPlural:
      "実際の更新は対象の参加者に加え、承認されたプロジェクト管理者{count}人に届きます。両方に該当する人には、管理者向けコピーが1通だけ届きます。",
    testPassed:
      "このメールの現在のバージョンはテストに合格しました。範囲、返信先、件名、メッセージを変更すると、再度テストに合格する必要があります。",
    testRequired:
      "実際の送信を確認する前に、このバージョンのテストメールを正常に送信してください。",
    sendAnotherTest: "別のテストメールを送信",
    sendTest: "テストメールを送信",
    reviewAndSend: "確認して送信",
    replyToConversation: "返信先（会話のメール）",
    replyToProject: "返信先（プロジェクトのメール）",
    optionalEmailAllWarning:
      "選択した会話では、参加者のメール登録は任意です。対象受信者数には、メールを確認し、メール更新の受信に同意した参加者のみが含まれます。",
    optionalEmailSomeWarning:
      "選択した会話の一部では、参加者のメール登録は任意です。対象受信者数には、メールを確認し、メール更新の受信に同意した参加者のみが含まれます。",
  },
  ky: {
    composeUpdate: "Жаңыртуу жазуу",
    heading: "Бир жолу жазып, ар бир катышуучунун контекстине жараша жөнөтүңүз",
    testEmailNotice:
      "Бул сыноо {email} дарегиндеги фасилитаторго гана жөнөтүлөт. Чыныгы жаңыртууну жөнөткөнгө чейин башка эч ким эч нерсе албайт.",
    zeroAudienceWarning:
      "Учурда бул катты алууга жарамдуу катышуучулар жок. Кеминде бир жарамдуу катышуучу болгондо сыноо жана жөнөтүү жеткиликтүү болот.",
    subjectLabel: "Тема",
    subjectHint: "Эң көбү {max} Unicode белгиси",
    messageLabel: "Билдирүү",
    editorPlaceholder:
      "Топко кыска жаңыртуу бөлүшүңүз:\n• Жыйынтыктарды бөлүшүңүз\n• Эмне өзгөргөнүн түшүндүрүңүз\n• Жаңы сунуштарды белгилеңиз\n• Катышуучуларды кайтып келүүгө чакырыңыз\n\nЭске алыңыз: айрым катышуучулар баарына жооп берген болушу мүмкүн, башкалары жооп бере элек болушу мүмкүн.",
    policyWarning:
      "Бул жаңыртууну тандалган талкууларга гана тиешелүү кылыңыз. Жарнамага, каражат чогултууга, саясий үгүткө жана тиешеси жок илгерилетүүгө жол берилбейт.",
    contentConfirmation:
      "Бул жаңыртуу электрондук кат жаңыртууларынын мазмун эрежелерине ылайык экенин ырастайм",
    ownerCopySingular:
      "Чыныгы жаңыртуу жарамдуу катышуучуларга жана {count} ыйгарым укуктуу долбоор менеджерине жетет. Эки топко тең кирген адам ээсине арналган бир гана көчүрмө алат.",
    ownerCopyPlural:
      "Чыныгы жаңыртуу жарамдуу катышуучуларга жана {count} ыйгарым укуктуу долбоор менеджерине жетет. Эки топко тең кирген адам ээсине арналган бир гана көчүрмө алат.",
    testPassed:
      "Каттын дал ушул версиясы сыноодон өттү. Камтууну, жооп дарегин, теманы же билдирүүнү өзгөртүү дагы бир ийгиликтүү сыноону талап кылат.",
    testRequired:
      "Чыныгы жөнөтүүнү кароодон мурун ушул версия үчүн сыноо катын ийгиликтүү жөнөтүңүз.",
    sendAnotherTest: "Дагы бир сыноо катын жөнөтүү",
    sendTest: "Сыноо катын жөнөтүү",
    reviewAndSend: "Карап чыгып жөнөтүү",
    replyToConversation: "Жооп берүү (талкуунун каты)",
    replyToProject: "Жооп берүү (долбоордун каты)",
    optionalEmailAllWarning:
      "Тандалган талкууларда катышуучулар үчүн электрондук кат милдеттүү эмес. Жарамдуу алуучулардын санына кат дарегин ырастап, электрондук жаңыртууларды алууга макул болгондор гана кирет.",
    optionalEmailSomeWarning:
      "Айрым тандалган талкууларда катышуучулар үчүн электрондук кат милдеттүү эмес. Жарамдуу алуучулардын санына кат дарегин ырастап, электрондук жаңыртууларды алууга макул болгондор гана кирет.",
  },
  ru: {
    composeUpdate: "Создать обновление",
    heading: "Напишите один раз с учётом контекста каждого участника",
    testEmailNotice:
      "Это тестовое письмо отправляется только фасилитатору на адрес {email}. До отправки настоящего обновления больше никто ничего не получит.",
    zeroAudienceWarning:
      "Сейчас нет участников, которым можно отправить это письмо. Тестирование и отправка станут доступны, когда появится хотя бы один подходящий участник.",
    subjectLabel: "Тема",
    subjectHint: "Не более {max} символов Unicode",
    messageLabel: "Сообщение",
    editorPlaceholder:
      "Поделитесь кратким обновлением с группой:\n• Расскажите о результатах\n• Объясните, что изменилось\n• Выделите новые предложения\n• Пригласите участников вернуться\n\nПомните: некоторые участники могли ответить на всё, а другие — ещё нет.",
    policyWarning:
      "Обновление должно касаться только выбранных обсуждений. Реклама, сбор средств, политическая агитация и продвижение посторонних материалов запрещены.",
    contentConfirmation:
      "Я подтверждаю, что обновление соответствует правилам содержания почтовых обновлений",
    ownerCopySingular:
      "Настоящее обновление получат подходящие участники и {count} уполномоченный менеджер проекта. Тот, кто входит в обе группы, получит одну копию для владельца.",
    ownerCopyPlural:
      "Настоящее обновление получат подходящие участники и {count} уполномоченных менеджера проекта. Тот, кто входит в обе группы, получит одну копию для владельца.",
    testPassed:
      "Эта версия письма прошла тест. После изменения охвата, адреса для ответа, темы или сообщения потребуется новый успешный тест.",
    testRequired:
      "Успешно отправьте тестовое письмо именно этой версии, прежде чем проверять настоящую отправку.",
    sendAnotherTest: "Отправить ещё одно тестовое письмо",
    sendTest: "Отправить тестовое письмо",
    reviewAndSend: "Проверить и отправить",
    replyToConversation: "Ответить на (адрес обсуждения)",
    replyToProject: "Ответить на (адрес проекта)",
    optionalEmailAllWarning:
      "Участники выбранных обсуждений указывают электронную почту по желанию. В число подходящих получателей входят только участники, которые подтвердили адрес и согласились получать почтовые обновления.",
    optionalEmailSomeWarning:
      "В некоторых выбранных обсуждениях участники указывают электронную почту по желанию. В число подходящих получателей входят только участники, которые подтвердили адрес и согласились получать почтовые обновления.",
  },
};
