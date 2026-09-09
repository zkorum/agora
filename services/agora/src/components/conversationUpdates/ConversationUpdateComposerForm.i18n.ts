import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdateComposerFormTranslations {
  composeUpdate: string;
  testDialogTitle: string;
  testEmailNotice: string;
  cancel: string;
  zeroAudienceWarning: string;
  zeroAudienceOwnerCopyWarning: string;
  subjectLabel: string;
  subjectHint: string;
  messageLabel: string;
  editorPlaceholder: string;
  policyWarning: string;
  contentConfirmation: string;
  ownerCopySummary: string;
  checkingRecipients: string;
  sendAnotherTest: string;
  sendTest: string;
  sendingTest: string;
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
    testDialogTitle: "Send this test email?",
    testEmailNotice:
      "This test goes only to the facilitator at {email}. Nobody else receives anything until you send the real update.",
    cancel: "Cancel",
    zeroAudienceWarning:
      "No participants are currently eligible to receive this email. Testing and sending will become available when at least one participant is eligible.",
    zeroAudienceOwnerCopyWarning:
      "No participants are currently eligible. Authorized project managers listed for a separate owner copy: {count}. Testing and sending require at least one eligible participant.",
    subjectLabel: "Subject",
    subjectHint: "Maximum {max} Unicode characters",
    messageLabel: "Message",
    editorPlaceholder:
      "Possible updates:\n• Share results\n• Share recent changes\n• Highlight new statements\n• Invite participants to return and vote on newly added statements, improving the analysis as participation grows\n\nThis email goes to eligible participants who voted on at least one statement, published at least one statement, or took part in a ranking.\n\nLinks to the selected conversations are added automatically at the end of the email, using their project pages when applicable. You do not need to include them here, but you may.",
    policyWarning:
      "Keep this update strictly about the selected conversations. Advertising, fundraising, political campaigning, and unrelated promotion are not allowed.",
    contentConfirmation:
      "I confirm this update follows the rules written above.",
    ownerCopySummary:
      "Eligible participants: {participantCount}. Authorized project managers: {managerCount}. Anyone in both groups receives only one owner copy.",
    checkingRecipients: "Checking for eligible recipients...",
    sendAnotherTest: "Send another test email",
    sendTest: "Send test email",
    sendingTest: "Sending test email...",
    replyToConversation: "Reply to (conversation email)",
    replyToProject: "Reply to (project email)",
    optionalEmailAllWarning:
      "Email is optional for participants in the selected conversations. The eligible recipient count includes only participants who verified an email and opted in to Email Updates.",
    optionalEmailSomeWarning:
      "Email is optional for participants in some selected conversations. The eligible recipient count includes only participants who verified an email and opted in to Email Updates.",
  },
  ar: {
    composeUpdate: "إنشاء تحديث",
    testDialogTitle: "هل تريد إرسال هذا البريد التجريبي؟",
    testEmailNotice:
      "يُرسل هذا الاختبار إلى المُيسّر فقط على {email}. لن يتلقى أي شخص آخر شيئًا حتى ترسل التحديث الفعلي.",
    cancel: "إلغاء",
    zeroAudienceWarning:
      "لا يوجد حاليًا مشاركون مؤهلون لتلقي هذا البريد الإلكتروني. سيصبح الاختبار والإرسال متاحين عندما يكون هناك مشارك مؤهل واحد على الأقل.",
    zeroAudienceOwnerCopyWarning:
      "لا يوجد حاليًا مشاركون مؤهلون. مديرو المشروع المخوّلون المدرجون لتلقي نسخة مالك منفصلة: {count}. يتطلب الاختبار والإرسال مشاركًا مؤهلًا واحدًا على الأقل.",
    subjectLabel: "الموضوع",
    subjectHint: "الحد الأقصى {max} من محارف Unicode",
    messageLabel: "الرسالة",
    editorPlaceholder:
      "تحديثات محتملة:\n• شارك النتائج\n• شارك التغييرات الأخيرة\n• سلّط الضوء على المقترحات الجديدة\n• ادعُ المشاركين إلى العودة والتصويت على المقترحات المضافة حديثًا لتحسين التحليل مع زيادة المشاركة\n\nيُرسل هذا البريد إلى المشاركين المؤهلين الذين صوّتوا على مقترح واحد على الأقل، أو نشروا مقترحًا واحدًا على الأقل، أو شاركوا في ترتيب الخيارات.\n\nتُضاف روابط المحادثات المحددة تلقائيًا في نهاية البريد الإلكتروني، مع استخدام صفحات مشاريعها عند الاقتضاء. لا حاجة إلى إدراجها هنا، ولكن يمكنك ذلك.",
    policyWarning:
      "اجعل هذا التحديث متعلقًا فقط بالمحادثات المحددة. لا يُسمح بالإعلانات أو جمع التبرعات أو الحملات السياسية أو الترويج غير ذي الصلة.",
    contentConfirmation: "أؤكد أن هذا التحديث يلتزم بالقواعد المذكورة أعلاه.",
    ownerCopySummary:
      "المشاركون المؤهلون: {participantCount}. مديرو المشروع المخوّلون: {managerCount}. ومن ينتمي إلى المجموعتين سيتلقى نسخة واحدة فقط للمالك.",
    checkingRecipients: "جارٍ التحقق من وجود مستلمين مؤهلين...",
    sendAnotherTest: "إرسال بريد تجريبي آخر",
    sendTest: "إرسال بريد تجريبي",
    sendingTest: "جارٍ إرسال بريد تجريبي...",
    replyToConversation: "الرد إلى (بريد المحادثة)",
    replyToProject: "الرد إلى (بريد المشروع)",
    optionalEmailAllWarning:
      "البريد الإلكتروني اختياري للمشاركين في المحادثات المحددة. يشمل عدد المستلمين المؤهلين فقط المشاركين الذين أكدوا بريدهم الإلكتروني واشتركوا في تحديثات البريد الإلكتروني.",
    optionalEmailSomeWarning:
      "البريد الإلكتروني اختياري للمشاركين في بعض المحادثات المحددة. يشمل عدد المستلمين المؤهلين فقط المشاركين الذين أكدوا بريدهم الإلكتروني واشتركوا في تحديثات البريد الإلكتروني.",
  },
  es: {
    composeUpdate: "Redactar una novedad",
    testDialogTitle: "¿Enviar este correo de prueba?",
    testEmailNotice:
      "Esta prueba se envía únicamente a la persona facilitadora en {email}. Nadie más recibirá nada hasta que envíe la novedad real.",
    cancel: "Cancelar",
    zeroAudienceWarning:
      "Actualmente no hay participantes que puedan recibir este correo. Las opciones de prueba y envío estarán disponibles cuando haya al menos una persona participante elegible.",
    zeroAudienceOwnerCopyWarning:
      "Actualmente no hay participantes elegibles. Responsables de proyecto autorizados que recibirán una copia separada: {count}. Las pruebas y el envío requieren al menos una persona participante elegible.",
    subjectLabel: "Asunto",
    subjectHint: "Máximo de {max} caracteres Unicode",
    messageLabel: "Mensaje",
    editorPlaceholder:
      "Posibles novedades:\n• Comparta resultados\n• Comparta cambios recientes\n• Destaque nuevas propuestas\n• Invite a volver y votar las propuestas añadidas recientemente para mejorar el análisis a medida que aumenta la participación\n\nEste correo se enviará a las personas elegibles que hayan votado al menos una propuesta, publicado al menos una propuesta o participado en una clasificación.\n\nLos enlaces a las conversaciones seleccionadas se añaden automáticamente al final del correo, usando sus páginas de proyecto cuando corresponda. No necesita incluirlos aquí, aunque puede hacerlo.",
    policyWarning:
      "Limite esta novedad estrictamente a las conversaciones seleccionadas. No se permiten la publicidad, la recaudación de fondos, las campañas políticas ni la promoción no relacionada.",
    contentConfirmation:
      "Confirmo que esta novedad cumple las reglas indicadas anteriormente.",
    ownerCopySummary:
      "Participantes elegibles: {participantCount}. Responsables de proyecto autorizados: {managerCount}. Quien pertenezca a ambos grupos recibirá una sola copia para responsable.",
    checkingRecipients: "Comprobando si hay destinatarios elegibles...",
    sendAnotherTest: "Enviar otro correo de prueba",
    sendTest: "Enviar correo de prueba",
    sendingTest: "Enviando correo de prueba...",
    replyToConversation: "Responder a (correo de la conversación)",
    replyToProject: "Responder a (correo del proyecto)",
    optionalEmailAllWarning:
      "El correo es opcional para quienes participan en las conversaciones seleccionadas. El recuento de destinatarios elegibles solo incluye a quienes verificaron su dirección de correo electrónico y aceptaron las novedades por correo.",
    optionalEmailSomeWarning:
      "El correo es opcional para quienes participan en algunas conversaciones seleccionadas. El recuento de destinatarios elegibles solo incluye a quienes verificaron su dirección de correo electrónico y aceptaron las novedades por correo.",
  },
  fa: {
    composeUpdate: "نوشتن به‌روزرسانی",
    testDialogTitle: "این ایمیل آزمایشی ارسال شود؟",
    testEmailNotice:
      "این آزمایش فقط برای تسهیل‌گر به نشانی {email} فرستاده می‌شود. تا زمانی که به‌روزرسانی واقعی را ارسال نکنید، هیچ‌کس دیگری چیزی دریافت نمی‌کند.",
    cancel: "لغو",
    zeroAudienceWarning:
      "در حال حاضر هیچ شرکت‌کننده‌ای واجد شرایط دریافت این ایمیل نیست. آزمایش و ارسال زمانی فعال می‌شود که دست‌کم یک شرکت‌کننده واجد شرایط باشد.",
    zeroAudienceOwnerCopyWarning:
      "در حال حاضر هیچ شرکت‌کننده‌ای واجد شرایط نیست. مدیران پروژه مجاز که برای دریافت نسخه جداگانه مالک فهرست شده‌اند: {count}. آزمایش و ارسال به دست‌کم یک شرکت‌کننده واجد شرایط نیاز دارد.",
    subjectLabel: "موضوع",
    subjectHint: "حداکثر {max} نویسه یونیکد",
    messageLabel: "پیام",
    editorPlaceholder:
      "به‌روزرسانی‌های احتمالی:\n• نتایج را به اشتراک بگذارید\n• تغییرات اخیر را به اشتراک بگذارید\n• گزاره‌های جدید را برجسته کنید\n• از شرکت‌کنندگان دعوت کنید بازگردند و به گزاره‌های تازه‌افزوده رأی دهند تا با افزایش مشارکت، تحلیل بهتر شود\n\nاین ایمیل برای شرکت‌کنندگان واجد شرایطی ارسال می‌شود که به دست‌کم یک گزاره رأی داده‌اند، دست‌کم یک گزاره منتشر کرده‌اند یا در رتبه‌بندی شرکت کرده‌اند.\n\nپیوند گفت‌وگوهای انتخاب‌شده به‌طور خودکار در پایان ایمیل افزوده می‌شود و در صورت وجود، از صفحه پروژه آن‌ها استفاده می‌کند. لازم نیست آن‌ها را اینجا وارد کنید، اما می‌توانید.",
    policyWarning:
      "این به‌روزرسانی را فقط به گفت‌وگوهای انتخاب‌شده محدود کنید. تبلیغات، جمع‌آوری کمک مالی، کارزار سیاسی و ترویج نامرتبط مجاز نیست.",
    contentConfirmation:
      "تأیید می‌کنم که این به‌روزرسانی از قوانین نوشته‌شده در بالا پیروی می‌کند.",
    ownerCopySummary:
      "شرکت‌کنندگان واجد شرایط: {participantCount}. مدیران پروژه مجاز: {managerCount}. فردی که در هر دو گروه باشد فقط یک نسخه مالک دریافت می‌کند.",
    checkingRecipients: "در حال بررسی وجود دریافت‌کنندگان واجد شرایط...",
    sendAnotherTest: "ارسال یک ایمیل آزمایشی دیگر",
    sendTest: "ارسال ایمیل آزمایشی",
    sendingTest: "در حال ارسال ایمیل آزمایشی...",
    replyToConversation: "پاسخ به (ایمیل گفت‌وگو)",
    replyToProject: "پاسخ به (ایمیل پروژه)",
    optionalEmailAllWarning:
      "ایمیل برای شرکت‌کنندگان در گفت‌وگوهای انتخاب‌شده اختیاری است. شمار دریافت‌کنندگان واجد شرایط فقط شامل کسانی است که ایمیل خود را تأیید کرده و دریافت به‌روزرسانی‌های ایمیلی را پذیرفته‌اند.",
    optionalEmailSomeWarning:
      "ایمیل برای شرکت‌کنندگان در برخی گفت‌وگوهای انتخاب‌شده اختیاری است. شمار دریافت‌کنندگان واجد شرایط فقط شامل کسانی است که ایمیل خود را تأیید کرده و دریافت به‌روزرسانی‌های ایمیلی را پذیرفته‌اند.",
  },
  fr: {
    composeUpdate: "Rédiger une nouvelle",
    testDialogTitle: "Envoyer cet e-mail de test ?",
    testEmailNotice:
      "Ce test est envoyé uniquement à la personne facilitatrice à l'adresse {email}. Personne d'autre ne recevra quoi que ce soit avant l'envoi de la nouvelle réelle.",
    cancel: "Annuler",
    zeroAudienceWarning:
      "Aucun participant ne peut actuellement recevoir cet e-mail. Le test et l'envoi seront disponibles dès qu'au moins un participant sera éligible.",
    zeroAudienceOwnerCopyWarning:
      "Aucun participant n'est actuellement éligible. Gestionnaires de projet autorisés prévus pour une copie distincte : {count}. Le test et l'envoi nécessitent au moins un participant éligible.",
    subjectLabel: "Objet",
    subjectHint: "{max} caractères Unicode au maximum",
    messageLabel: "Message",
    editorPlaceholder:
      "Nouvelles possibles :\n• Partagez les résultats\n• Partagez les changements récents\n• Mettez en avant les nouvelles propositions\n• Invitez les participants à revenir voter sur les propositions récemment ajoutées afin d'améliorer l'analyse à mesure que la participation augmente\n\nCet e-mail sera envoyé aux participants éligibles qui ont répondu à au moins une proposition, publié au moins une proposition ou participé à un classement.\n\nLes liens vers les conversations sélectionnées sont ajoutés automatiquement à la fin de l'e-mail, via leur page de projet le cas échéant. Vous n'avez pas besoin de les inclure ici, mais vous pouvez le faire.",
    policyWarning:
      "Limitez strictement cette nouvelle aux conversations sélectionnées. La publicité, la collecte de fonds, les campagnes politiques et les promotions sans rapport sont interdites.",
    contentConfirmation:
      "Je confirme que cette nouvelle respecte les conditions ci-dessus.",
    ownerCopySummary:
      "Participants éligibles : {participantCount}. Gestionnaires de projet autorisés : {managerCount}. Toute personne appartenant aux deux groupes ne recevra qu’une seule copie pour gestionnaire.",
    checkingRecipients:
      "Vérification de la présence de destinataires éligibles...",
    sendAnotherTest: "Envoyer un autre e-mail de test",
    sendTest: "Envoyer un e-mail de test",
    sendingTest: "Envoi de l’e-mail de test...",
    replyToConversation: "Répondre à (e-mail de la conversation)",
    replyToProject: "Répondre à (e-mail du projet)",
    optionalEmailAllWarning:
      "L'e-mail est facultatif pour les participants aux conversations sélectionnées. Le nombre de destinataires éligibles comprend uniquement les participants qui ont vérifié leur adresse e-mail et accepté les nouvelles par e-mail.",
    optionalEmailSomeWarning:
      "L'e-mail est facultatif pour les participants à certaines conversations sélectionnées. Le nombre de destinataires éligibles comprend uniquement les participants qui ont vérifié leur adresse e-mail et accepté les nouvelles par e-mail.",
  },
  "zh-Hans": {
    composeUpdate: "撰写动态",
    testDialogTitle: "发送这封测试邮件？",
    testEmailNotice:
      "此测试仅发送给 {email} 的协调员。在您发送正式动态之前，其他任何人都不会收到任何内容。",
    cancel: "取消",
    zeroAudienceWarning:
      "目前没有符合条件的参与者可以接收此邮件。至少有一名参与者符合条件后，测试和发送功能才会可用。",
    zeroAudienceOwnerCopyWarning:
      "目前没有符合条件的参与者。将单独收到管理员副本的获授权项目管理员：{count}。测试和发送至少需要一名符合条件的参与者。",
    subjectLabel: "主题",
    subjectHint: "最多 {max} 个 Unicode 字符",
    messageLabel: "消息",
    editorPlaceholder:
      "可分享的动态：\n• 分享结果\n• 分享近期变化\n• 强调新观点\n• 邀请参与者回来为新增观点投票；参与度越高，分析就越完善\n\n此邮件会发送给符合条件的参与者：他们至少对一个观点投过票、发表过一个观点，或参与过排序。\n\n所选对话的链接会自动添加在邮件末尾；适用时将使用其项目页面。您无需在此添加，但仍可自行添加。",
    policyWarning:
      "此动态必须严格围绕所选对话。不得包含广告、募款、政治竞选或无关推广。",
    contentConfirmation: "我确认此动态符合上述规则。",
    ownerCopySummary:
      "符合条件的参与者：{participantCount}。获授权的项目管理员：{managerCount}。同时属于两组的人只会收到一份管理员副本。",
    checkingRecipients: "正在检查是否有符合条件的收件人……",
    sendAnotherTest: "再发送一封测试邮件",
    sendTest: "发送测试邮件",
    sendingTest: "正在发送测试邮件...",
    replyToConversation: "回复至（对话邮箱）",
    replyToProject: "回复至（项目邮箱）",
    optionalEmailAllWarning:
      "所选对话的参与者可自行选择是否提供邮箱。符合条件的收件人数仅包括已验证邮箱并选择接收邮件动态的参与者。",
    optionalEmailSomeWarning:
      "部分所选对话的参与者可自行选择是否提供邮箱。符合条件的收件人数仅包括已验证邮箱并选择接收邮件动态的参与者。",
  },
  "zh-Hant": {
    composeUpdate: "撰寫動態",
    testDialogTitle: "傳送這封測試郵件？",
    testEmailNotice:
      "此測試僅傳送給 {email} 的協調員。在您傳送正式動態之前，其他任何人都不會收到任何內容。",
    cancel: "取消",
    zeroAudienceWarning:
      "目前沒有符合資格的參與者可以接收此郵件。至少有一名參與者符合資格後，測試和傳送功能才會開放。",
    zeroAudienceOwnerCopyWarning:
      "目前沒有符合資格的參與者。將另行收到管理員副本的獲授權專案管理員：{count}。測試和傳送至少需要一名符合資格的參與者。",
    subjectLabel: "主旨",
    subjectHint: "最多 {max} 個 Unicode 字元",
    messageLabel: "訊息",
    editorPlaceholder:
      "可分享的動態：\n• 分享結果\n• 分享近期變化\n• 強調新提議\n• 邀請參與者回來為新增提議投票；參與度越高，分析就越完善\n\n此郵件會傳送給符合資格的參與者：他們至少對一個提議投過票、發表過一個提議，或參與過排序。\n\n所選對話的連結會自動新增在郵件末尾；適用時將使用其專案頁面。您無需在此新增，但仍可自行新增。",
    policyWarning:
      "此動態必須嚴格圍繞所選對話。不得包含廣告、募款、政治競選或無關推廣。",
    contentConfirmation: "我確認此動態符合上述規則。",
    ownerCopySummary:
      "符合資格的參與者：{participantCount}。獲授權的專案管理員：{managerCount}。同時屬於兩組的人只會收到一份管理員副本。",
    checkingRecipients: "正在檢查是否有符合資格的收件人……",
    sendAnotherTest: "再傳送一封測試郵件",
    sendTest: "傳送測試郵件",
    sendingTest: "正在傳送測試郵件...",
    replyToConversation: "回覆至（對話信箱）",
    replyToProject: "回覆至（專案信箱）",
    optionalEmailAllWarning:
      "所選對話的參與者可自行選擇是否提供電子郵件。符合資格的收件人數僅包括已驗證電子郵件並選擇接收郵件動態的參與者。",
    optionalEmailSomeWarning:
      "部分所選對話的參與者可自行選擇是否提供電子郵件。符合資格的收件人數僅包括已驗證電子郵件並選擇接收郵件動態的參與者。",
  },
  he: {
    composeUpdate: "כתיבת עדכון",
    testDialogTitle: "לשלוח את הודעת הבדיקה הזו?",
    testEmailNotice:
      "בדיקה זו נשלחת רק למנחה בכתובת {email}. אף אדם אחר לא יקבל דבר עד לשליחת העדכון האמיתי.",
    cancel: "ביטול",
    zeroAudienceWarning:
      "אין כרגע משתתפים שזכאים לקבל את הודעת הדוא״ל הזו. הבדיקה והשליחה יהיו זמינות כשיהיה לפחות משתתף זכאי אחד.",
    zeroAudienceOwnerCopyWarning:
      "אין כרגע משתתפים זכאים. מנהלי פרויקט מורשים הרשומים לקבלת עותק בעלים נפרד: {count}. בדיקה ושליחה מחייבות לפחות משתתף זכאי אחד.",
    subjectLabel: "נושא",
    subjectHint: "עד {max} תווי Unicode",
    messageLabel: "הודעה",
    editorPlaceholder:
      "עדכונים אפשריים:\n• שתפו תוצאות\n• שתפו שינויים אחרונים\n• הדגישו הצהרות חדשות\n• הזמינו את המשתתפים לחזור ולהצביע על הצהרות שנוספו לאחרונה, כדי לשפר את הניתוח ככל שההשתתפות גדלה\n\nהודעת דוא״ל זו תישלח למשתתפים הזכאים שהצביעו על הצהרה אחת לפחות, פרסמו הצהרה אחת לפחות או השתתפו בדירוג.\n\nקישורים לשיחות שנבחרו יתווספו אוטומטית בסוף הודעת הדוא״ל, דרך דפי הפרויקט שלהן כאשר רלוונטי. אין צורך לכלול אותם כאן, אך אפשר לעשות זאת.",
    policyWarning:
      "יש להגביל את העדכון אך ורק לשיחות שנבחרו. פרסום, גיוס כספים, תעמולה פוליטית וקידום שאינו קשור אסורים.",
    contentConfirmation: "אני מאשר/ת שהעדכון עומד בכללים המפורטים לעיל.",
    ownerCopySummary:
      "משתתפים זכאים: {participantCount}. מנהלי פרויקט מורשים: {managerCount}. מי שמשתייך לשתי הקבוצות יקבל עותק בעלים אחד בלבד.",
    checkingRecipients: "מתבצעת בדיקה אם יש נמענים זכאים...",
    sendAnotherTest: "שליחת הודעת בדיקה נוספת",
    sendTest: "שליחת הודעת בדיקה",
    sendingTest: "שולחים הודעת בדיקה...",
    replyToConversation: "מענה אל (דוא״ל השיחה)",
    replyToProject: "מענה אל (דוא״ל הפרויקט)",
    optionalEmailAllWarning:
      "מסירת דוא״ל היא אופציונלית למשתתפים בשיחות שנבחרו. מספר הנמענים הזכאים כולל רק משתתפים שאימתו כתובת דוא״ל ובחרו לקבל עדכוני דוא״ל.",
    optionalEmailSomeWarning:
      "מסירת דוא״ל היא אופציונלית למשתתפים בחלק מהשיחות שנבחרו. מספר הנמענים הזכאים כולל רק משתתפים שאימתו כתובת דוא״ל ובחרו לקבל עדכוני דוא״ל.",
  },
  ja: {
    composeUpdate: "更新を作成",
    testDialogTitle: "このテストメールを送信しますか？",
    testEmailNotice:
      "このテストはファシリテーターの {email} にのみ送信されます。実際の更新を送信するまで、ほかの誰にも何も届きません。",
    cancel: "キャンセル",
    zeroAudienceWarning:
      "現在、このメールを受け取れる参加者はいません。対象となる参加者が1人以上になると、テストと送信が可能になります。",
    zeroAudienceOwnerCopyWarning:
      "現在、対象となる参加者はいません。別途管理者向けコピーを受け取る承認済みプロジェクト管理者：{count}人。テストと送信には対象となる参加者が1人以上必要です。",
    subjectLabel: "件名",
    subjectHint: "Unicode文字は最大{max}文字",
    messageLabel: "メッセージ",
    editorPlaceholder:
      "更新内容の例：\n• 結果を共有する\n• 最近の変更を共有する\n• 新しい提案を紹介する\n• 参加者に再訪して新しく追加された提案へ投票するよう促し、参加の拡大とともに分析を改善する\n\nこのメールは、少なくとも1つの提案に投票した、少なくとも1つの提案を投稿した、またはランキングに参加した受信対象者に送信されます。\n\n選択した会話へのリンクはメール末尾に自動追加され、該当する場合はプロジェクト内のページが使用されます。ここに含める必要はありませんが、追加しても構いません。",
    policyWarning:
      "この更新は選択した会話の内容に厳密に限定してください。広告、資金調達、政治運動、無関係な宣伝は禁止されています。",
    contentConfirmation: "この更新が上記のルールに従っていることを確認します。",
    ownerCopySummary:
      "対象の参加者：{participantCount}人。権限を持つプロジェクト管理者：{managerCount}人。両方に該当する人には、管理者向けコピーが1通だけ届きます。",
    checkingRecipients: "対象となる受信者がいるか確認しています…",
    sendAnotherTest: "別のテストメールを送信",
    sendTest: "テストメールを送信",
    sendingTest: "テストメールを送信しています...",
    replyToConversation: "返信先（会話のメール）",
    replyToProject: "返信先（プロジェクトのメール）",
    optionalEmailAllWarning:
      "選択した会話では、参加者のメール登録は任意です。対象受信者数には、メールを確認し、メール更新の受信に同意した参加者のみが含まれます。",
    optionalEmailSomeWarning:
      "選択した会話の一部では、参加者のメール登録は任意です。対象受信者数には、メールを確認し、メール更新の受信に同意した参加者のみが含まれます。",
  },
  ky: {
    composeUpdate: "Жаңыртуу жазуу",
    testDialogTitle: "Бул сыноо каты жөнөтүлсүнбү?",
    testEmailNotice:
      "Бул сыноо {email} дарегиндеги фасилитаторго гана жөнөтүлөт. Чыныгы жаңыртууну жөнөткөнгө чейин башка эч ким эч нерсе албайт.",
    cancel: "Жокко чыгаруу",
    zeroAudienceWarning:
      "Учурда бул катты алууга жарамдуу катышуучулар жок. Кеминде бир жарамдуу катышуучу болгондо сыноо жана жөнөтүү жеткиликтүү болот.",
    zeroAudienceOwnerCopyWarning:
      "Учурда жарамдуу катышуучулар жок. Өзүнчө ээсинин көчүрмөсүн ала турган ыйгарым укуктуу долбоор менеджерлери: {count}. Сыноо жана жөнөтүү үчүн кеминде бир жарамдуу катышуучу керек.",
    subjectLabel: "Тема",
    subjectHint: "Эң көбү {max} Unicode белгиси",
    messageLabel: "Билдирүү",
    editorPlaceholder:
      "Мүмкүн болгон жаңыртуулар:\n• Жыйынтыктарды бөлүшүңүз\n• Акыркы өзгөрүүлөрдү бөлүшүңүз\n• Жаңы сунуштарды белгилеңиз\n• Катышуучуларды кайтып келип, жаңы кошулган сунуштарга добуш берүүгө чакырыңыз; катышуу өскөн сайын талдоо жакшырат\n\nБул кат кеминде бир сунушка добуш берген, кеминде бир сунуш жарыялаган же рейтинг түзүүгө катышкан жарамдуу катышуучуларга жөнөтүлөт.\n\nТандалган талкууларга шилтемелер каттын аягына автоматтык түрдө кошулуп, тиешелүү учурда алардын долбоордогу барактары колдонулат. Аларды бул жерге кошуунун кереги жок, бирок кошсоңуз болот.",
    policyWarning:
      "Бул жаңыртууну тандалган талкууларга гана тиешелүү кылыңыз. Жарнамага, каражат чогултууга, саясий үгүткө жана тиешеси жок илгерилетүүгө жол берилбейт.",
    contentConfirmation:
      "Бул жаңыртуу жогоруда жазылган эрежелерге ылайык экенин ырастайм.",
    ownerCopySummary:
      "Жарамдуу катышуучулар: {participantCount}. Ыйгарым укуктуу долбоор менеджерлери: {managerCount}. Эки топко тең кирген адам ээнин бир гана көчүрмөсүн алат.",
    checkingRecipients: "Жарамдуу алуучулардын бар-жогу текшерилүүдө...",
    sendAnotherTest: "Дагы бир сыноо катын жөнөтүү",
    sendTest: "Сыноо катын жөнөтүү",
    sendingTest: "Сыноо каты жөнөтүлүүдө...",
    replyToConversation: "Жооп берүү (талкуунун каты)",
    replyToProject: "Жооп берүү (долбоордун каты)",
    optionalEmailAllWarning:
      "Тандалган талкууларда катышуучулар үчүн электрондук кат милдеттүү эмес. Жарамдуу алуучулардын санына кат дарегин ырастап, электрондук жаңыртууларды алууга макул болгондор гана кирет.",
    optionalEmailSomeWarning:
      "Айрым тандалган талкууларда катышуучулар үчүн электрондук кат милдеттүү эмес. Жарамдуу алуучулардын санына кат дарегин ырастап, электрондук жаңыртууларды алууга макул болгондор гана кирет.",
  },
  ru: {
    composeUpdate: "Создать обновление",
    testDialogTitle: "Отправить это тестовое письмо?",
    testEmailNotice:
      "Это тестовое письмо отправляется только фасилитатору на адрес {email}. До отправки настоящего обновления больше никто ничего не получит.",
    cancel: "Отмена",
    zeroAudienceWarning:
      "Сейчас нет участников, которым можно отправить это письмо. Тестирование и отправка станут доступны, когда появится хотя бы один подходящий участник.",
    zeroAudienceOwnerCopyWarning:
      "Сейчас нет подходящих участников. Уполномоченные менеджеры проекта, которым предназначена отдельная копия владельца: {count}. Для тестирования и отправки нужен хотя бы один подходящий участник.",
    subjectLabel: "Тема",
    subjectHint: "Не более {max} символов Unicode",
    messageLabel: "Сообщение",
    editorPlaceholder:
      "Возможные обновления:\n• Расскажите о результатах\n• Расскажите о недавних изменениях\n• Выделите новые предложения\n• Пригласите участников вернуться и проголосовать по недавно добавленным предложениям: по мере роста участия анализ становится точнее\n\nЭто письмо получат подходящие участники, которые проголосовали хотя бы по одному предложению, опубликовали хотя бы одно предложение или приняли участие в ранжировании.\n\nСсылки на выбранные обсуждения автоматически добавляются в конце письма; при необходимости используются их страницы в проектах. Добавлять их здесь не нужно, но можно.",
    policyWarning:
      "Обновление должно касаться только выбранных обсуждений. Реклама, сбор средств, политическая агитация и продвижение посторонних материалов запрещены.",
    contentConfirmation:
      "Я подтверждаю, что обновление соответствует изложенным выше правилам.",
    ownerCopySummary:
      "Подходящих участников: {participantCount}. Уполномоченных менеджеров проекта: {managerCount}. Тот, кто входит в обе группы, получит только одну копию для владельца.",
    checkingRecipients: "Проверяем наличие подходящих получателей...",
    sendAnotherTest: "Отправить ещё одно тестовое письмо",
    sendTest: "Отправить тестовое письмо",
    sendingTest: "Тестовое письмо отправляется...",
    replyToConversation: "Ответить на (адрес обсуждения)",
    replyToProject: "Ответить на (адрес проекта)",
    optionalEmailAllWarning:
      "Участники выбранных обсуждений указывают электронную почту по желанию. В число подходящих получателей входят только участники, которые подтвердили адрес и согласились получать почтовые обновления.",
    optionalEmailSomeWarning:
      "В некоторых выбранных обсуждениях участники указывают электронную почту по желанию. В число подходящих получателей входят только участники, которые подтвердили адрес и согласились получать почтовые обновления.",
  },
};
