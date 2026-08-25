import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ConversationUpdatesWorkspaceTranslations {
  introTitle: string;
  introDescription: string;
  tryAgain: string;
  verifyEmailBanner: string;
  verifyEmail: string;
  retry: string;
  compose: string;
  history: string;
  loadMore: string;
  sendDialogTitle: string;
  sendUpdate: string;
  cancel: string;
  audienceSummary: string;
  sendWarning: string;
  verifyDialogTitle: string;
  continueVerification: string;
  notNow: string;
  verifyDialogDescription: string;
  workspaceUnavailable: string;
  audienceEstimateUnavailable: string;
  historyUnavailable: string;
  moreHistoryUnavailable: string;
  queueingTest: string;
  testQueued: string;
  testQueueUnavailable: string;
  queuedTestNotFound: string;
  testStatusUnavailable: string;
  testAccepted: string;
  testDeliveryRetryable: string;
  testDeliveryAuthorization: string;
  testDeliveryPermanent: string;
  testDeliveryUnknown: string;
  updateSendUnavailable: string;
  contextNotFound: string;
  scopeUnavailable: string;
  conversationsUnavailable: string;
  sendingDisabled: string;
  contentInvalid: string;
  missingContactEmail: string;
  verifyBeforeTest: string;
  noEligibleParticipants: string;
  testRateLimited: string;
  successfulTestNotFound: string;
  testNotAccepted: string;
  testUsed: string;
  deliveryAlreadyActive: string;
  ownerCopyUnavailable: string;
}

export const conversationUpdatesWorkspaceTranslations: Record<
  SupportedDisplayLanguageCodes,
  ConversationUpdatesWorkspaceTranslations
> = {
  en: {
    introTitle: "Keep participants connected to the work they joined",
    introDescription:
      "Share a focused update about selected conversations, test the exact email, and review accepted sends in one place.",
    tryAgain: "Try again",
    verifyEmailBanner:
      "Verify your email address before composing or testing an Email Update. History remains available.",
    verifyEmail: "Verify email",
    retry: "Retry",
    compose: "Compose",
    history: "History",
    loadMore: "Load more",
    sendDialogTitle: "Send this update?",
    sendUpdate: "Send update",
    cancel: "Cancel",
    audienceSummary: "Currently {count} eligible recipients",
    sendWarning:
      "Required owner copies are sent first. Participant delivery cannot be canceled after the update is accepted.",
    verifyDialogTitle: "Verify your email?",
    continueVerification: "Continue to verification",
    notNow: "Not now",
    verifyDialogDescription:
      "A verified email is required to compose updates and receive the exact test email before sending. You will return here after verification.",
    workspaceUnavailable: "Email Updates are unavailable right now.",
    audienceEstimateUnavailable:
      "The eligible recipient count could not be loaded.",
    historyUnavailable: "Email Update history is unavailable right now.",
    moreHistoryUnavailable: "More Email Update history could not be loaded.",
    queueingTest: "Queueing your test email...",
    testQueued: "Test queued. Waiting for the email provider to accept it...",
    testQueueUnavailable: "The test email could not be queued.",
    queuedTestNotFound: "The queued test email could not be found.",
    testStatusUnavailable:
      "Waiting for the email provider. Test status is temporarily unavailable...",
    testAccepted: "Test accepted for this exact email version.",
    testDeliveryRetryable:
      "Test delivery failed because the email provider temporarily rejected it.",
    testDeliveryAuthorization:
      "The test email was not sent because its destination or sending authorization was no longer available.",
    testDeliveryPermanent:
      "Test delivery failed because the email provider permanently rejected it.",
    testDeliveryUnknown: "Test delivery failed for an unknown reason.",
    updateSendUnavailable: "The update could not be sent.",
    contextNotFound: "This Email Updates context could not be found.",
    scopeUnavailable:
      "The selected Email Updates scope is no longer available.",
    conversationsUnavailable:
      "One or more selected conversations are no longer available in this scope.",
    sendingDisabled: "Email Updates are currently disabled for this selection.",
    contentInvalid:
      "The subject or message is invalid. Review the content and try again.",
    missingContactEmail:
      "Add a participant contact email before sending a test.",
    verifyBeforeTest: "Verify an email address before sending a test email.",
    noEligibleParticipants:
      "No participants are currently eligible to receive this email.",
    testRateLimited:
      "Too many test emails were requested. Try again after {retryAt}.",
    successfulTestNotFound:
      "The successful test could not be found. Send another test before retrying.",
    testNotAccepted:
      "The email provider has not accepted the test. Send another test before retrying.",
    testUsed:
      "This test has already authorized an update. Send another test before retrying.",
    deliveryAlreadyActive:
      "Another Email Update delivery is already active for this project.",
    ownerCopyUnavailable:
      "Required conversation owner copies cannot currently be delivered.",
  },
  es: {
    introTitle:
      "Mantén conectados a los participantes con el trabajo al que se unieron",
    introDescription:
      "Comparte una novedad concreta sobre las conversaciones seleccionadas, prueba el correo exacto y revisa los envíos aceptados en un solo lugar.",
    tryAgain: "Intentar de nuevo",
    verifyEmailBanner:
      "Verifica tu dirección de correo electrónico antes de redactar o probar una novedad. El historial seguirá disponible.",
    verifyEmail: "Verificar correo",
    retry: "Reintentar",
    compose: "Redactar",
    history: "Historial",
    loadMore: "Cargar más",
    sendDialogTitle: "¿Enviar esta novedad?",
    sendUpdate: "Enviar la novedad",
    cancel: "Cancelar",
    audienceSummary: "Actualmente hay {count} destinatarios aptos",
    sendWarning:
      "Primero se envían las copias obligatorias a los responsables. La entrega a los participantes no se puede cancelar una vez aceptada la novedad.",
    verifyDialogTitle: "¿Verificar tu correo?",
    continueVerification: "Continuar con la verificación",
    notNow: "Ahora no",
    verifyDialogDescription:
      "Necesitas una dirección de correo electrónico verificada para redactar novedades y recibir el correo de prueba exacto antes del envío. Volverás aquí después de verificarla.",
    workspaceUnavailable:
      "Las novedades por correo no están disponibles ahora.",
    audienceEstimateUnavailable:
      "No se pudo cargar el número de destinatarios aptos.",
    historyUnavailable:
      "El historial de novedades por correo no está disponible ahora.",
    moreHistoryUnavailable:
      "No se pudo cargar más historial de novedades por correo.",
    queueingTest: "Poniendo en cola tu correo de prueba...",
    testQueued:
      "Prueba en cola. Esperando a que el proveedor de correo la acepte...",
    testQueueUnavailable: "No se pudo poner en cola el correo de prueba.",
    queuedTestNotFound: "No se encontró el correo de prueba en cola.",
    testStatusUnavailable:
      "Esperando al proveedor de correo. El estado de la prueba no está disponible temporalmente...",
    testAccepted: "Prueba aceptada para esta versión exacta del correo.",
    testDeliveryRetryable:
      "La entrega de prueba falló porque el proveedor de correo la rechazó temporalmente.",
    testDeliveryAuthorization:
      "El correo de prueba no se envió porque su dirección de destino o la autorización de envío dejaron de estar disponibles.",
    testDeliveryPermanent:
      "La entrega de prueba falló porque el proveedor de correo la rechazó definitivamente.",
    testDeliveryUnknown:
      "La entrega de prueba falló por un motivo desconocido.",
    updateSendUnavailable: "No se pudo enviar la novedad.",
    contextNotFound: "No se encontró este contexto de novedades por correo.",
    scopeUnavailable:
      "El ámbito seleccionado ya no está disponible para las novedades por correo.",
    conversationsUnavailable:
      "Una o más conversaciones seleccionadas ya no están disponibles en este ámbito.",
    sendingDisabled:
      "Las novedades por correo están desactivadas para esta selección.",
    contentInvalid:
      "El asunto o el mensaje no son válidos. Revisa el contenido e inténtalo de nuevo.",
    missingContactEmail:
      "Añade una dirección de correo electrónico de contacto para participantes antes de enviar una prueba.",
    verifyBeforeTest:
      "Verifica una dirección de correo electrónico antes de enviar un correo de prueba.",
    noEligibleParticipants:
      "Actualmente no hay participantes aptos para recibir este correo.",
    testRateLimited:
      "Se solicitaron demasiados correos de prueba. Inténtalo de nuevo después de {retryAt}.",
    successfulTestNotFound:
      "No se encontró la prueba correcta. Envía otra prueba antes de reintentarlo.",
    testNotAccepted:
      "El proveedor de correo no ha aceptado la prueba. Envía otra antes de reintentarlo.",
    testUsed:
      "Esta prueba ya autorizó una novedad. Envía otra antes de reintentarlo.",
    deliveryAlreadyActive:
      "Ya hay otra entrega de novedades por correo activa para este proyecto.",
    ownerCopyUnavailable:
      "Las copias obligatorias para los responsables de las conversaciones no se pueden entregar ahora.",
  },
  fr: {
    introTitle: "Gardez les participants liés au travail qu’ils ont rejoint",
    introDescription:
      "Partagez une nouvelle ciblée sur les conversations sélectionnées, testez l’e-mail exact et consultez les envois acceptés au même endroit.",
    tryAgain: "Réessayer",
    verifyEmailBanner:
      "Vérifiez votre adresse e-mail avant de rédiger ou tester une nouvelle. L’historique reste disponible.",
    verifyEmail: "Vérifier l’e-mail",
    retry: "Réessayer",
    compose: "Rédiger",
    history: "Historique",
    loadMore: "Charger plus",
    sendDialogTitle: "Envoyer cette nouvelle ?",
    sendUpdate: "Envoyer la nouvelle",
    cancel: "Annuler",
    audienceSummary: "Actuellement {count} destinataires éligibles",
    sendWarning:
      "Les copies obligatoires aux responsables sont envoyées en premier. L’envoi aux participants ne peut plus être annulé après l’acceptation de la nouvelle.",
    verifyDialogTitle: "Vérifier votre e-mail ?",
    continueVerification: "Continuer vers la vérification",
    notNow: "Pas maintenant",
    verifyDialogDescription:
      "Une adresse e-mail vérifiée est nécessaire pour rédiger des nouvelles et recevoir l’e-mail de test exact avant l’envoi. Vous reviendrez ici après la vérification.",
    workspaceUnavailable:
      "Les nouvelles par e-mail sont indisponibles pour le moment.",
    audienceEstimateUnavailable:
      "Impossible de charger le nombre de destinataires éligibles.",
    historyUnavailable:
      "L’historique des nouvelles par e-mail est indisponible pour le moment.",
    moreHistoryUnavailable:
      "Impossible de charger davantage d’historique des nouvelles par e-mail.",
    queueingTest: "Mise en file de votre e-mail de test...",
    testQueued:
      "Test mis en file. En attente de l’acceptation du fournisseur d’e-mail...",
    testQueueUnavailable: "Impossible de mettre l’e-mail de test en file.",
    queuedTestNotFound: "L’e-mail de test en file est introuvable.",
    testStatusUnavailable:
      "En attente du fournisseur d’e-mail. Le statut du test est temporairement indisponible...",
    testAccepted: "Test accepté pour cette version exacte de l’e-mail.",
    testDeliveryRetryable:
      "L’envoi du test a échoué car le fournisseur d’e-mail l’a temporairement refusé.",
    testDeliveryAuthorization:
      "L’e-mail de test n’a pas été envoyé, car son adresse de destination ou l’autorisation d’envoi n’étaient plus disponibles.",
    testDeliveryPermanent:
      "L’envoi du test a échoué car le fournisseur d’e-mail l’a définitivement refusé.",
    testDeliveryUnknown: "L’envoi du test a échoué pour une raison inconnue.",
    updateSendUnavailable: "Impossible d’envoyer la nouvelle.",
    contextNotFound: "Ce contexte de nouvelles par e-mail est introuvable.",
    scopeUnavailable:
      "Le périmètre sélectionné n’est plus disponible pour les nouvelles par e-mail.",
    conversationsUnavailable:
      "Une ou plusieurs conversations sélectionnées ne sont plus disponibles dans ce périmètre.",
    sendingDisabled:
      "Les nouvelles par e-mail sont désactivées pour cette sélection.",
    contentInvalid:
      "L’objet ou le message n’est pas valide. Vérifiez le contenu et réessayez.",
    missingContactEmail:
      "Ajoutez une adresse e-mail de contact des participants avant d’envoyer un test.",
    verifyBeforeTest:
      "Vérifiez une adresse e-mail avant d’envoyer un e-mail de test.",
    noEligibleParticipants:
      "Aucun participant n’est actuellement éligible pour recevoir cet e-mail.",
    testRateLimited:
      "Trop d’e-mails de test ont été demandés. Réessayez après {retryAt}.",
    successfulTestNotFound:
      "Le test réussi est introuvable. Envoyez un autre test avant de réessayer.",
    testNotAccepted:
      "Le fournisseur d’e-mail n’a pas accepté le test. Envoyez-en un autre avant de réessayer.",
    testUsed:
      "Ce test a déjà autorisé une nouvelle. Envoyez-en un autre avant de réessayer.",
    deliveryAlreadyActive:
      "Un autre envoi de nouvelle par e-mail est déjà actif pour ce projet.",
    ownerCopyUnavailable:
      "Les copies obligatoires aux responsables des conversations ne peuvent pas être envoyées actuellement.",
  },
  "zh-Hans": {
    introTitle: "让参与者与他们加入的工作保持联系",
    introDescription:
      "针对所选对话分享重点更新，测试实际邮件，并在一处查看已接受的发送记录。",
    tryAgain: "重试",
    verifyEmailBanner:
      "请先验证电子邮件地址，再撰写或测试电子邮件更新。历史记录仍可查看。",
    verifyEmail: "验证电子邮件",
    retry: "重试",
    compose: "撰写",
    history: "历史记录",
    loadMore: "加载更多",
    sendDialogTitle: "发送此更新？",
    sendUpdate: "发送更新",
    cancel: "取消",
    audienceSummary: "目前有 {count} 位符合条件的收件人",
    sendWarning:
      "系统会先发送必需的负责人副本。更新被接受后，无法取消向参与者发送。",
    verifyDialogTitle: "验证您的电子邮件？",
    continueVerification: "继续验证",
    notNow: "暂不",
    verifyDialogDescription:
      "撰写更新并在发送前收到实际测试邮件需要已验证的电子邮件。验证后您将返回此处。",
    workspaceUnavailable: "电子邮件更新目前不可用。",
    audienceEstimateUnavailable: "无法加载符合条件的收件人数。",
    historyUnavailable: "电子邮件更新历史记录目前不可用。",
    moreHistoryUnavailable: "无法加载更多电子邮件更新历史记录。",
    queueingTest: "正在将测试邮件加入队列...",
    testQueued: "测试已加入队列，正在等待邮件服务商接受...",
    testQueueUnavailable: "无法将测试邮件加入队列。",
    queuedTestNotFound: "找不到队列中的测试邮件。",
    testStatusUnavailable: "正在等待邮件服务商，测试状态暂时不可用...",
    testAccepted: "此邮件版本的测试已被接受。",
    testDeliveryRetryable: "测试发送失败，因为邮件服务商暂时拒绝了邮件。",
    testDeliveryAuthorization:
      "测试邮件未发送，因为其目标地址或发送授权已不可用。",
    testDeliveryPermanent: "测试发送失败，因为邮件服务商永久拒绝了邮件。",
    testDeliveryUnknown: "测试发送因未知原因失败。",
    updateSendUnavailable: "无法发送更新。",
    contextNotFound: "找不到此电子邮件更新上下文。",
    scopeUnavailable: "所选电子邮件更新范围已不可用。",
    conversationsUnavailable: "一个或多个所选对话在此范围内已不可用。",
    sendingDisabled: "此选择目前已禁用电子邮件更新。",
    contentInvalid: "主题或消息无效。请检查内容后重试。",
    missingContactEmail: "发送测试前，请添加参与者联系电子邮件。",
    verifyBeforeTest: "发送测试邮件前，请先验证电子邮件地址。",
    noEligibleParticipants: "目前没有参与者符合接收此邮件的条件。",
    testRateLimited: "请求的测试邮件过多。请在 {retryAt} 后重试。",
    successfulTestNotFound: "找不到成功的测试。请先发送另一封测试邮件再重试。",
    testNotAccepted: "邮件服务商尚未接受测试。请先发送另一封测试邮件再重试。",
    testUsed: "此测试已用于授权一次更新。请先发送另一封测试邮件再重试。",
    deliveryAlreadyActive: "此项目已有另一项电子邮件更新发送正在进行。",
    ownerCopyUnavailable: "目前无法发送必需的对话负责人副本。",
  },
  "zh-Hant": {
    introTitle: "讓參與者與他們加入的工作保持聯繫",
    introDescription:
      "針對所選對話分享重點更新，測試實際郵件，並在一處查看已接受的傳送記錄。",
    tryAgain: "再試一次",
    verifyEmailBanner:
      "請先驗證電子郵件地址，再撰寫或測試電子郵件更新。歷史記錄仍可查看。",
    verifyEmail: "驗證電子郵件",
    retry: "重試",
    compose: "撰寫",
    history: "歷史記錄",
    loadMore: "載入更多",
    sendDialogTitle: "傳送此更新？",
    sendUpdate: "傳送更新",
    cancel: "取消",
    audienceSummary: "目前有 {count} 位符合條件的收件者",
    sendWarning:
      "系統會先傳送必要的負責人副本。更新獲接受後，無法取消向參與者傳送。",
    verifyDialogTitle: "驗證您的電子郵件？",
    continueVerification: "繼續驗證",
    notNow: "暫時不要",
    verifyDialogDescription:
      "撰寫更新並在傳送前收到實際測試郵件需要已驗證的電子郵件。驗證後您將返回此處。",
    workspaceUnavailable: "電子郵件更新目前無法使用。",
    audienceEstimateUnavailable: "無法載入符合條件的收件者人數。",
    historyUnavailable: "電子郵件更新歷史記錄目前無法使用。",
    moreHistoryUnavailable: "無法載入更多電子郵件更新歷史記錄。",
    queueingTest: "正在將測試郵件加入佇列...",
    testQueued: "測試已加入佇列，正在等待郵件服務商接受...",
    testQueueUnavailable: "無法將測試郵件加入佇列。",
    queuedTestNotFound: "找不到佇列中的測試郵件。",
    testStatusUnavailable: "正在等待郵件服務商，測試狀態暫時無法使用...",
    testAccepted: "此郵件版本的測試已獲接受。",
    testDeliveryRetryable: "測試傳送失敗，因為郵件服務商暫時拒絕了郵件。",
    testDeliveryAuthorization:
      "測試郵件未傳送，因為其收件地址或傳送授權已無法使用。",
    testDeliveryPermanent: "測試傳送失敗，因為郵件服務商永久拒絕了郵件。",
    testDeliveryUnknown: "測試傳送因未知原因失敗。",
    updateSendUnavailable: "無法傳送更新。",
    contextNotFound: "找不到此電子郵件更新內容範圍。",
    scopeUnavailable: "所選電子郵件更新範圍已無法使用。",
    conversationsUnavailable: "一個或多個所選對話在此範圍內已無法使用。",
    sendingDisabled: "此選擇目前已停用電子郵件更新。",
    contentInvalid: "主旨或訊息無效。請檢查內容後再試一次。",
    missingContactEmail: "傳送測試前，請新增參與者聯絡電子郵件。",
    verifyBeforeTest: "傳送測試郵件前，請先驗證電子郵件地址。",
    noEligibleParticipants: "目前沒有參與者符合接收此郵件的條件。",
    testRateLimited: "要求的測試郵件過多。請在 {retryAt} 後再試一次。",
    successfulTestNotFound:
      "找不到成功的測試。請先傳送另一封測試郵件再試一次。",
    testNotAccepted: "郵件服務商尚未接受測試。請先傳送另一封測試郵件再試一次。",
    testUsed: "此測試已用於授權一次更新。請先傳送另一封測試郵件再試一次。",
    deliveryAlreadyActive: "此專案已有另一項電子郵件更新傳送正在進行。",
    ownerCopyUnavailable: "目前無法傳送必要的對話負責人副本。",
  },
  ja: {
    introTitle: "参加した取り組みと参加者のつながりを保つ",
    introDescription:
      "選択した会話について要点を絞った更新を共有し、実際のメールをテストして、承認済みの送信を一か所で確認できます。",
    tryAgain: "もう一度試す",
    verifyEmailBanner:
      "メール更新を作成またはテストする前に、メールアドレスを確認してください。履歴は引き続き利用できます。",
    verifyEmail: "メールを確認",
    retry: "再試行",
    compose: "作成",
    history: "履歴",
    loadMore: "さらに読み込む",
    sendDialogTitle: "この更新を送信しますか？",
    sendUpdate: "更新を送信",
    cancel: "キャンセル",
    audienceSummary: "現在の対象受信者は {count} 人です",
    sendWarning:
      "必要なオーナー宛てコピーが先に送信されます。更新が承認された後は参加者への配信をキャンセルできません。",
    verifyDialogTitle: "メールを確認しますか？",
    continueVerification: "確認へ進む",
    notNow: "後で",
    verifyDialogDescription:
      "更新の作成と、送信前に実際のテストメールを受け取るには、確認済みメールが必要です。確認後、この画面に戻ります。",
    workspaceUnavailable: "メール更新は現在利用できません。",
    audienceEstimateUnavailable: "対象受信者数を読み込めませんでした。",
    historyUnavailable: "メール更新の履歴は現在利用できません。",
    moreHistoryUnavailable: "メール更新の履歴をさらに読み込めませんでした。",
    queueingTest: "テストメールをキューに追加しています...",
    testQueued:
      "テストをキューに追加しました。メールプロバイダーの承認を待っています...",
    testQueueUnavailable: "テストメールをキューに追加できませんでした。",
    queuedTestNotFound: "キューに追加したテストメールが見つかりません。",
    testStatusUnavailable:
      "メールプロバイダーを待っています。テスト状況は一時的に利用できません...",
    testAccepted: "このメールと完全に同じ内容のテストが承認されました。",
    testDeliveryRetryable:
      "メールプロバイダーが一時的に拒否したため、テスト配信に失敗しました。",
    testDeliveryAuthorization:
      "宛先または送信承認が利用できなくなったため、テストメールは送信されませんでした。",
    testDeliveryPermanent:
      "メールプロバイダーが恒久的に拒否したため、テスト配信に失敗しました。",
    testDeliveryUnknown: "不明な理由でテスト配信に失敗しました。",
    updateSendUnavailable: "更新を送信できませんでした。",
    contextNotFound: "このメール更新の対象が見つかりません。",
    scopeUnavailable: "選択したメール更新の範囲は利用できなくなりました。",
    conversationsUnavailable:
      "選択した会話の一部が、この範囲では利用できなくなりました。",
    sendingDisabled: "この選択ではメール更新が現在無効です。",
    contentInvalid:
      "件名または本文が無効です。内容を確認して再試行してください。",
    missingContactEmail:
      "テストを送信する前に参加者の連絡先メールを追加してください。",
    verifyBeforeTest:
      "テストメールを送信する前にメールアドレスを確認してください。",
    noEligibleParticipants: "現在、このメールを受信できる参加者はいません。",
    testRateLimited:
      "テストメールの要求が多すぎます。{retryAt} より後に再試行してください。",
    successfulTestNotFound:
      "成功したテストが見つかりません。別のテストを送信してから再試行してください。",
    testNotAccepted:
      "メールプロバイダーがテストを承認していません。別のテストを送信してから再試行してください。",
    testUsed:
      "このテストはすでに更新の承認に使用されています。別のテストを送信してから再試行してください。",
    deliveryAlreadyActive:
      "このプロジェクトでは別のメール更新の配信がすでに進行中です。",
    ownerCopyUnavailable: "必要な会話オーナー宛てコピーを現在配信できません。",
  },
  ar: {
    introTitle: "أبقِ المشاركين على صلة بالعمل الذي انضموا إليه",
    introDescription:
      "شارك تحديثًا مركزًا حول المحادثات المحددة، واختبر رسالة البريد نفسها، وراجع عمليات الإرسال المقبولة في مكان واحد.",
    tryAgain: "حاول مجددًا",
    verifyEmailBanner:
      "تحقق من عنوان بريدك الإلكتروني قبل كتابة تحديث أو اختباره. سيظل السجل متاحًا.",
    verifyEmail: "التحقق من البريد الإلكتروني",
    retry: "إعادة المحاولة",
    compose: "كتابة",
    history: "السجل",
    loadMore: "تحميل المزيد",
    sendDialogTitle: "إرسال هذا التحديث؟",
    sendUpdate: "إرسال التحديث",
    cancel: "إلغاء",
    audienceSummary: "يوجد حاليًا {count} من المستلمين المؤهلين",
    sendWarning:
      "تُرسل النسخ المطلوبة إلى المالكين أولًا. لا يمكن إلغاء الإرسال إلى المشاركين بعد قبول التحديث.",
    verifyDialogTitle: "التحقق من بريدك الإلكتروني؟",
    continueVerification: "المتابعة إلى التحقق",
    notNow: "ليس الآن",
    verifyDialogDescription:
      "يلزم بريد إلكتروني موثّق لكتابة التحديثات وتلقي رسالة الاختبار نفسها قبل الإرسال. ستعود إلى هنا بعد التحقق.",
    workspaceUnavailable: "تحديثات البريد الإلكتروني غير متاحة الآن.",
    audienceEstimateUnavailable: "تعذر تحميل عدد المستلمين المؤهلين.",
    historyUnavailable: "سجل تحديثات البريد الإلكتروني غير متاح الآن.",
    moreHistoryUnavailable:
      "تعذر تحميل المزيد من سجل تحديثات البريد الإلكتروني.",
    queueingTest: "جارٍ وضع رسالة الاختبار في قائمة الانتظار...",
    testQueued:
      "تم وضع الاختبار في قائمة الانتظار. في انتظار قبول مزود البريد الإلكتروني...",
    testQueueUnavailable: "تعذر وضع رسالة الاختبار في قائمة الانتظار.",
    queuedTestNotFound: "تعذر العثور على رسالة الاختبار في قائمة الانتظار.",
    testStatusUnavailable:
      "في انتظار مزود البريد الإلكتروني. حالة الاختبار غير متاحة مؤقتًا...",
    testAccepted: "تم قبول الاختبار لهذه النسخة المطابقة من الرسالة.",
    testDeliveryRetryable:
      "فشل تسليم الاختبار لأن مزود البريد الإلكتروني رفضه مؤقتًا.",
    testDeliveryAuthorization:
      "لم تُرسل رسالة الاختبار لأن عنوان الوجهة أو إذن الإرسال لم يعد متاحًا.",
    testDeliveryPermanent:
      "فشل تسليم الاختبار لأن مزود البريد الإلكتروني رفضه نهائيًا.",
    testDeliveryUnknown: "فشل تسليم الاختبار لسبب غير معروف.",
    updateSendUnavailable: "تعذر إرسال التحديث.",
    contextNotFound: "تعذر العثور على سياق تحديثات البريد الإلكتروني هذا.",
    scopeUnavailable: "لم يعد نطاق تحديثات البريد الإلكتروني المحدد متاحًا.",
    conversationsUnavailable:
      "لم تعد محادثة واحدة أو أكثر من المحادثات المحددة متاحة في هذا النطاق.",
    sendingDisabled: "تحديثات البريد الإلكتروني متوقفة حاليًا لهذا التحديد.",
    contentInvalid: "الموضوع أو الرسالة غير صالح. راجع المحتوى وحاول مجددًا.",
    missingContactEmail:
      "أضف بريدًا إلكترونيًا للتواصل مع المشاركين قبل إرسال اختبار.",
    verifyBeforeTest: "تحقق من عنوان بريد إلكتروني قبل إرسال رسالة اختبار.",
    noEligibleParticipants: "لا يوجد حاليًا مشاركون مؤهلون لتلقي هذه الرسالة.",
    testRateLimited:
      "طُلب عدد كبير جدًا من رسائل الاختبار. حاول مجددًا بعد {retryAt}.",
    successfulTestNotFound:
      "تعذر العثور على الاختبار الناجح. أرسل اختبارًا آخر قبل إعادة المحاولة.",
    testNotAccepted:
      "لم يقبل مزود البريد الإلكتروني الاختبار. أرسل اختبارًا آخر قبل إعادة المحاولة.",
    testUsed:
      "سبق أن سمح هذا الاختبار بإرسال تحديث. أرسل اختبارًا آخر قبل إعادة المحاولة.",
    deliveryAlreadyActive:
      "هناك عملية إرسال أخرى لتحديث بريد إلكتروني نشطة بالفعل لهذا المشروع.",
    ownerCopyUnavailable:
      "يتعذر حاليًا تسليم النسخ المطلوبة إلى مالكي المحادثات.",
  },
  fa: {
    introTitle:
      "شرکت‌کنندگان را با کاری که به آن پیوسته‌اند در ارتباط نگه دارید",
    introDescription:
      "یک به‌روزرسانی متمرکز درباره گفتگوهای انتخاب‌شده به اشتراک بگذارید، ایمیل دقیق را آزمایش کنید و ارسال‌های پذیرفته‌شده را در یک جا ببینید.",
    tryAgain: "تلاش دوباره",
    verifyEmailBanner:
      "پیش از نوشتن یا آزمایش به‌روزرسانی ایمیلی، نشانی ایمیل خود را تأیید کنید. تاریخچه همچنان در دسترس است.",
    verifyEmail: "تأیید ایمیل",
    retry: "تلاش دوباره",
    compose: "نوشتن",
    history: "تاریخچه",
    loadMore: "بارگیری بیشتر",
    sendDialogTitle: "این به‌روزرسانی ارسال شود؟",
    sendUpdate: "ارسال به‌روزرسانی",
    cancel: "لغو",
    audienceSummary: "در حال حاضر {count} گیرنده واجد شرایط هستند",
    sendWarning:
      "ابتدا نسخه‌های الزامی برای مالکان ارسال می‌شوند. پس از پذیرفته شدن به‌روزرسانی، ارسال به شرکت‌کنندگان قابل لغو نیست.",
    verifyDialogTitle: "ایمیل خود را تأیید می‌کنید؟",
    continueVerification: "ادامه برای تأیید",
    notNow: "الان نه",
    verifyDialogDescription:
      "برای نوشتن به‌روزرسانی و دریافت ایمیل آزمایشی دقیق پیش از ارسال، ایمیل تأییدشده لازم است. پس از تأیید به اینجا بازمی‌گردید.",
    workspaceUnavailable: "به‌روزرسانی‌های ایمیلی اکنون در دسترس نیستند.",
    audienceEstimateUnavailable: "تعداد گیرندگان واجد شرایط بارگیری نشد.",
    historyUnavailable: "تاریخچه به‌روزرسانی ایمیلی اکنون در دسترس نیست.",
    moreHistoryUnavailable: "تاریخچه بیشتری از به‌روزرسانی ایمیلی بارگیری نشد.",
    queueingTest: "در حال افزودن ایمیل آزمایشی به صف...",
    testQueued: "آزمایش در صف قرار گرفت. در انتظار پذیرش ارائه‌دهنده ایمیل...",
    testQueueUnavailable: "ایمیل آزمایشی در صف قرار نگرفت.",
    queuedTestNotFound: "ایمیل آزمایشی صف‌شده پیدا نشد.",
    testStatusUnavailable:
      "در انتظار ارائه‌دهنده ایمیل. وضعیت آزمایش موقتاً در دسترس نیست...",
    testAccepted: "آزمایش برای همین نسخه دقیق ایمیل پذیرفته شد.",
    testDeliveryRetryable:
      "ارسال آزمایشی ناموفق بود، زیرا ارائه‌دهنده ایمیل موقتاً آن را رد کرد.",
    testDeliveryAuthorization:
      "ایمیل آزمایشی ارسال نشد، زیرا نشانی مقصد یا مجوز ارسال دیگر در دسترس نبود.",
    testDeliveryPermanent:
      "ارسال آزمایشی ناموفق بود، زیرا ارائه‌دهنده ایمیل آن را برای همیشه رد کرد.",
    testDeliveryUnknown: "ارسال آزمایشی به دلیلی نامعلوم ناموفق بود.",
    updateSendUnavailable: "به‌روزرسانی ارسال نشد.",
    contextNotFound: "این زمینه به‌روزرسانی ایمیلی پیدا نشد.",
    scopeUnavailable: "دامنه انتخاب‌شده به‌روزرسانی ایمیلی دیگر در دسترس نیست.",
    conversationsUnavailable:
      "یک یا چند گفتگوی انتخاب‌شده دیگر در این دامنه در دسترس نیستند.",
    sendingDisabled: "به‌روزرسانی ایمیلی برای این انتخاب اکنون غیرفعال است.",
    contentInvalid:
      "موضوع یا پیام نامعتبر است. محتوا را بررسی و دوباره تلاش کنید.",
    missingContactEmail:
      "پیش از ارسال آزمایش، ایمیل تماس شرکت‌کنندگان را اضافه کنید.",
    verifyBeforeTest:
      "پیش از ارسال ایمیل آزمایشی، یک نشانی ایمیل را تأیید کنید.",
    noEligibleParticipants:
      "در حال حاضر هیچ شرکت‌کننده‌ای واجد شرایط دریافت این ایمیل نیست.",
    testRateLimited:
      "ایمیل‌های آزمایشی بیش از حد درخواست شدند. پس از {retryAt} دوباره تلاش کنید.",
    successfulTestNotFound:
      "آزمایش موفق پیدا نشد. پیش از تلاش دوباره، آزمایش دیگری ارسال کنید.",
    testNotAccepted:
      "ارائه‌دهنده ایمیل آزمایش را نپذیرفته است. پیش از تلاش دوباره، آزمایش دیگری ارسال کنید.",
    testUsed:
      "این آزمایش قبلاً یک به‌روزرسانی را مجاز کرده است. پیش از تلاش دوباره، آزمایش دیگری ارسال کنید.",
    deliveryAlreadyActive:
      "ارسال به‌روزرسانی ایمیلی دیگری از قبل برای این پروژه فعال است.",
    ownerCopyUnavailable:
      "نسخه‌های الزامی مالکان گفتگو اکنون قابل تحویل نیستند.",
  },
  he: {
    introTitle: "שמרו את המשתתפים מחוברים לעבודה שאליה הצטרפו",
    introDescription:
      "שתפו עדכון ממוקד על השיחות שנבחרו, בדקו את הודעת הדוא״ל המדויקת ועיינו בשליחות שאושרו במקום אחד.",
    tryAgain: "ניסיון נוסף",
    verifyEmailBanner:
      "יש לאמת את כתובת הדוא״ל לפני כתיבה או בדיקה של עדכון בדוא״ל. ההיסטוריה תישאר זמינה.",
    verifyEmail: "אימות דוא״ל",
    retry: "ניסיון חוזר",
    compose: "כתיבה",
    history: "היסטוריה",
    loadMore: "טעינת עוד",
    sendDialogTitle: "לשלוח את העדכון הזה?",
    sendUpdate: "שליחת העדכון",
    cancel: "ביטול",
    audienceSummary: "כרגע יש {count} נמענים זכאים",
    sendWarning:
      "העותקים הנדרשים לבעלים נשלחים תחילה. אי אפשר לבטל את השליחה למשתתפים לאחר אישור העדכון.",
    verifyDialogTitle: "לאמת את כתובת הדוא״ל?",
    continueVerification: "המשך לאימות",
    notNow: "לא עכשיו",
    verifyDialogDescription:
      "נדרשת כתובת דוא״ל מאומתת כדי לכתוב עדכונים ולקבל את הודעת הבדיקה המדויקת לפני השליחה. לאחר האימות תחזרו לכאן.",
    workspaceUnavailable: "עדכונים בדוא״ל אינם זמינים כרגע.",
    audienceEstimateUnavailable: "לא ניתן לטעון את מספר הנמענים הזכאים.",
    historyUnavailable: "היסטוריית העדכונים בדוא״ל אינה זמינה כרגע.",
    moreHistoryUnavailable: "לא ניתן לטעון היסטוריה נוספת של עדכונים בדוא״ל.",
    queueingTest: "הודעת הבדיקה מתווספת לתור...",
    testQueued: "הבדיקה נוספה לתור. ממתינים לאישור ספק הדוא״ל...",
    testQueueUnavailable: "לא ניתן להוסיף את הודעת הבדיקה לתור.",
    queuedTestNotFound: "הודעת הבדיקה שבתור לא נמצאה.",
    testStatusUnavailable: "ממתינים לספק הדוא״ל. מצב הבדיקה אינו זמין זמנית...",
    testAccepted: "הבדיקה אושרה עבור הגרסה המדויקת הזאת של ההודעה.",
    testDeliveryRetryable: "שליחת הבדיקה נכשלה כי ספק הדוא״ל דחה אותה זמנית.",
    testDeliveryAuthorization:
      "הודעת הבדיקה לא נשלחה כי כתובת היעד או הרשאת השליחה כבר לא היו זמינות.",
    testDeliveryPermanent: "שליחת הבדיקה נכשלה כי ספק הדוא״ל דחה אותה לצמיתות.",
    testDeliveryUnknown: "שליחת הבדיקה נכשלה מסיבה לא ידועה.",
    updateSendUnavailable: "לא ניתן לשלוח את העדכון.",
    contextNotFound: "ההקשר הזה של עדכונים בדוא״ל לא נמצא.",
    scopeUnavailable: "התחום שנבחר לעדכונים בדוא״ל אינו זמין עוד.",
    conversationsUnavailable:
      "אחת או יותר מהשיחות שנבחרו אינן זמינות עוד בתחום הזה.",
    sendingDisabled: "עדכונים בדוא״ל מושבתים כרגע עבור הבחירה הזאת.",
    contentInvalid: "הנושא או ההודעה אינם תקינים. בדקו את התוכן ונסו שוב.",
    missingContactEmail:
      "הוסיפו כתובת דוא״ל ליצירת קשר עם המשתתפים לפני שליחת בדיקה.",
    verifyBeforeTest: "יש לאמת כתובת דוא״ל לפני שליחת הודעת בדיקה.",
    noEligibleParticipants:
      "אין כרגע משתתפים שזכאים לקבל את הודעת הדוא״ל הזאת.",
    testRateLimited: "התבקשו יותר מדי הודעות בדיקה. נסו שוב אחרי {retryAt}.",
    successfulTestNotFound:
      "הבדיקה שהצליחה לא נמצאה. שלחו בדיקה נוספת לפני שתנסו שוב.",
    testNotAccepted:
      "ספק הדוא״ל לא אישר את הבדיקה. שלחו בדיקה נוספת לפני שתנסו שוב.",
    testUsed: "הבדיקה הזאת כבר אישרה עדכון. שלחו בדיקה נוספת לפני שתנסו שוב.",
    deliveryAlreadyActive: "שליחה אחרת של עדכון בדוא״ל כבר פעילה בפרויקט הזה.",
    ownerCopyUnavailable: "כרגע אי אפשר לשלוח את העותקים הנדרשים לבעלי השיחות.",
  },
  ky: {
    introTitle: "Катышуучуларды өздөрү кошулган иш менен байланышта кармаңыз",
    introDescription:
      "Тандалган маектер боюнча так жаңыртуу бөлүшүп, дал ошол катты сынап, кабыл алынган жөнөтүүлөрдү бир жерден көрүңүз.",
    tryAgain: "Кайра аракет кылуу",
    verifyEmailBanner:
      "Электрондук почта жаңыртуусун жазуудан же сыноодон мурун дарегиңизди ырастаңыз. Тарых жеткиликтүү бойдон калат.",
    verifyEmail: "Электрондук почтаны ырастоо",
    retry: "Кайра аракет кылуу",
    compose: "Жазуу",
    history: "Тарых",
    loadMore: "Дагы жүктөө",
    sendDialogTitle: "Бул жаңыртуу жөнөтүлсүнбү?",
    sendUpdate: "Жаңыртууну жөнөтүү",
    cancel: "Жокко чыгаруу",
    audienceSummary: "Учурда {count} жарамдуу алуучу бар",
    sendWarning:
      "Ээлерге милдеттүү көчүрмөлөр биринчи жөнөтүлөт. Жаңыртуу кабыл алынгандан кийин катышуучуларга жеткирүүнү токтотууга болбойт.",
    verifyDialogTitle: "Электрондук почтаңызды ырастайсызбы?",
    continueVerification: "Ырастоого өтүү",
    notNow: "Азыр эмес",
    verifyDialogDescription:
      "Жаңыртууларды жазуу жана жөнөтүүдөн мурун дал ошол сыноо катын алуу үчүн ырасталган электрондук почта керек. Ырастоодон кийин бул жерге кайтасыз.",
    workspaceUnavailable: "Электрондук почта жаңыртуулары азыр жеткиликсиз.",
    audienceEstimateUnavailable: "Жарамдуу алуучулардын саны жүктөлгөн жок.",
    historyUnavailable:
      "Электрондук почта жаңыртууларынын тарыхы азыр жеткиликсиз.",
    moreHistoryUnavailable:
      "Кошумча электрондук почта жаңыртуу тарыхы жүктөлгөн жок.",
    queueingTest: "Сыноо катыңыз кезекке кошулууда...",
    testQueued:
      "Сыноо кезекке кошулду. Почта провайдеринин кабыл алуусун күтүүдө...",
    testQueueUnavailable: "Сыноо каты кезекке кошулган жок.",
    queuedTestNotFound: "Кезектеги сыноо каты табылган жок.",
    testStatusUnavailable:
      "Почта провайдерин күтүүдө. Сыноонун абалы убактылуу жеткиликсиз...",
    testAccepted: "Дал ушул каттын нускасы үчүн сыноо кабыл алынды.",
    testDeliveryRetryable:
      "Почта провайдери аны убактылуу четке каккандыктан сыноо жеткирилген жок.",
    testDeliveryAuthorization:
      "Сыноо каты жөнөтүлгөн жок, анткени анын көздөгөн дареги же жөнөтүү уруксаты жеткиликсиз болуп калды.",
    testDeliveryPermanent:
      "Почта провайдери аны биротоло четке каккандыктан сыноо жеткирилген жок.",
    testDeliveryUnknown: "Сыноо белгисиз себептен жеткирилген жок.",
    updateSendUnavailable: "Жаңыртуу жөнөтүлгөн жок.",
    contextNotFound: "Бул электрондук почта жаңыртуу контексти табылган жок.",
    scopeUnavailable:
      "Тандалган электрондук почта жаңыртуу чөйрөсү эми жеткиликсиз.",
    conversationsUnavailable:
      "Тандалган маектердин бири же бир нечеси бул чөйрөдө эми жеткиликсиз.",
    sendingDisabled:
      "Бул тандоо үчүн электрондук почта жаңыртуулары азыр өчүрүлгөн.",
    contentInvalid:
      "Тема же билдирүү жараксыз. Мазмунду текшерип, кайра аракет кылыңыз.",
    missingContactEmail:
      "Сыноону жөнөтүүдөн мурун катышуучулардын байланыш почтасын кошуңуз.",
    verifyBeforeTest:
      "Сыноо катын жөнөтүүдөн мурун электрондук почта дарегин ырастаңыз.",
    noEligibleParticipants:
      "Учурда бул катты алууга жарамдуу катышуучулар жок.",
    testRateLimited:
      "Өтө көп сыноо каты суралды. {retryAt} кийин кайра аракет кылыңыз.",
    successfulTestNotFound:
      "Ийгиликтүү сыноо табылган жок. Кайра аракет кылуудан мурун башка сыноо жөнөтүңүз.",
    testNotAccepted:
      "Почта провайдери сыноону кабыл алган жок. Кайра аракет кылуудан мурун башка сыноо жөнөтүңүз.",
    testUsed:
      "Бул сыноо жаңыртууга уруксат берүү үчүн колдонулган. Кайра аракет кылуудан мурун башка сыноо жөнөтүңүз.",
    deliveryAlreadyActive:
      "Бул долбоор үчүн башка электрондук почта жаңыртуусун жеткирүү активдүү.",
    ownerCopyUnavailable:
      "Маек ээлерине милдеттүү көчүрмөлөрдү азыр жеткирүү мүмкүн эмес.",
  },
  ru: {
    introTitle:
      "Сохраняйте связь участников с работой, к которой они присоединились",
    introDescription:
      "Делитесь содержательными обновлениями выбранных обсуждений, проверяйте точный текст письма и просматривайте принятые отправки в одном месте.",
    tryAgain: "Попробовать снова",
    verifyEmailBanner:
      "Подтвердите адрес электронной почты, прежде чем составлять или проверять почтовое обновление. История останется доступной.",
    verifyEmail: "Подтвердить почту",
    retry: "Повторить",
    compose: "Составить",
    history: "История",
    loadMore: "Загрузить ещё",
    sendDialogTitle: "Отправить это обновление?",
    sendUpdate: "Отправить обновление",
    cancel: "Отмена",
    audienceSummary: "Сейчас подходящих получателей: {count}",
    sendWarning:
      "Обязательные копии владельцам отправляются первыми. После принятия обновления доставку участникам нельзя отменить.",
    verifyDialogTitle: "Подтвердить вашу почту?",
    continueVerification: "Перейти к подтверждению",
    notNow: "Не сейчас",
    verifyDialogDescription:
      "Подтверждённая почта нужна, чтобы составлять обновления и получать точное тестовое письмо перед отправкой. После подтверждения вы вернётесь сюда.",
    workspaceUnavailable: "Почтовые обновления сейчас недоступны.",
    audienceEstimateUnavailable:
      "Не удалось загрузить число подходящих получателей.",
    historyUnavailable: "История почтовых обновлений сейчас недоступна.",
    moreHistoryUnavailable:
      "Не удалось загрузить продолжение истории почтовых обновлений.",
    queueingTest: "Тестовое письмо добавляется в очередь...",
    testQueued:
      "Тест добавлен в очередь. Ожидаем принятия почтовым провайдером...",
    testQueueUnavailable: "Не удалось добавить тестовое письмо в очередь.",
    queuedTestNotFound: "Тестовое письмо в очереди не найдено.",
    testStatusUnavailable:
      "Ожидаем почтового провайдера. Статус теста временно недоступен...",
    testAccepted: "Тест принят для этой точной версии письма.",
    testDeliveryRetryable:
      "Тестовая доставка не удалась: почтовый провайдер временно отклонил письмо.",
    testDeliveryAuthorization:
      "Тестовое письмо не было отправлено, потому что адрес назначения или разрешение на отправку стали недоступны.",
    testDeliveryPermanent:
      "Тестовая доставка не удалась: почтовый провайдер окончательно отклонил письмо.",
    testDeliveryUnknown: "Тестовая доставка не удалась по неизвестной причине.",
    updateSendUnavailable: "Не удалось отправить обновление.",
    contextNotFound: "Не удалось найти этот контекст почтовых обновлений.",
    scopeUnavailable:
      "Выбранная область почтовых обновлений больше недоступна.",
    conversationsUnavailable:
      "Одно или несколько выбранных обсуждений больше недоступны в этой области.",
    sendingDisabled: "Почтовые обновления сейчас отключены для этого выбора.",
    contentInvalid:
      "Тема или сообщение недействительны. Проверьте содержимое и повторите попытку.",
    missingContactEmail:
      "Добавьте контактную почту участников перед отправкой теста.",
    verifyBeforeTest:
      "Подтвердите адрес электронной почты перед отправкой тестового письма.",
    noEligibleParticipants:
      "Сейчас нет участников, которым можно отправить это письмо.",
    testRateLimited:
      "Запрошено слишком много тестовых писем. Повторите попытку после {retryAt}.",
    successfulTestNotFound:
      "Успешный тест не найден. Перед повторной попыткой отправьте ещё один тест.",
    testNotAccepted:
      "Почтовый провайдер не принял тест. Перед повторной попыткой отправьте ещё один тест.",
    testUsed:
      "Этот тест уже разрешил одно обновление. Перед повторной попыткой отправьте ещё один тест.",
    deliveryAlreadyActive:
      "Для этого проекта уже идёт доставка другого почтового обновления.",
    ownerCopyUnavailable:
      "Сейчас невозможно доставить обязательные копии владельцам обсуждений.",
  },
};
