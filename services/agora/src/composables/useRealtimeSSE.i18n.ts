import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface RealtimeSSETranslations {
  conversationClosed: string;
  conversationOpened: string;
  conversationSettingsUpdated: string;
  conversationPublic: string;
  conversationPrivate: string;
  participationGuestAllowed: string;
  participationAccountRequired: string;
  participationEmailVerificationRequired: string;
  participationStrongVerificationRequired: string;
  eventTicketRequired: string;
  eventTicketNotRequired: string;
  llmTurnedOnByFacilitator: string;
  llmTurnedOffByFacilitator: string;
  facilitatorGroupCountPreferenceChanged: string;
}

export const realtimeSSETranslations: Record<
  SupportedDisplayLanguageCodes,
  RealtimeSSETranslations
> = {
  en: {
    conversationClosed: "This conversation was closed by the facilitator",
    conversationOpened: "This conversation was reopened by the facilitator",
    conversationSettingsUpdated: "Conversation settings updated",
    conversationPublic: "This conversation is now public",
    conversationPrivate: "This conversation is now private",
    participationGuestAllowed: "Anyone can now participate as a guest",
    participationAccountRequired: "Participation now requires an account",
    participationEmailVerificationRequired:
      "Participation now requires email verification",
    participationStrongVerificationRequired:
      "Participation now requires strong verification",
    eventTicketRequired: "An event ticket is now required",
    eventTicketNotRequired: "An event ticket is no longer required",
    llmTurnedOnByFacilitator: "LLM was turned on by the facilitator",
    llmTurnedOffByFacilitator: "LLM was turned off by the facilitator",
    facilitatorGroupCountPreferenceChanged:
      "Facilitator group count preference changed",
  },
  ar: {
    conversationClosed: "تم إغلاق هذه المحادثة",
    conversationOpened: "تمت إعادة فتح هذه المحادثة",
    conversationSettingsUpdated: "تم تحديث إعدادات المحادثة",
    conversationPublic: "أصبحت هذه المحادثة عامة الآن",
    conversationPrivate: "أصبحت هذه المحادثة خاصة الآن",
    participationGuestAllowed: "يمكن لأي شخص المشاركة الآن كضيف",
    participationAccountRequired: "تتطلب المشاركة الآن حسابًا",
    participationEmailVerificationRequired:
      "تتطلب المشاركة الآن التحقق من البريد الإلكتروني",
    participationStrongVerificationRequired: "تتطلب المشاركة الآن تحققًا قويًا",
    eventTicketRequired: "أصبحت تذكرة الحدث مطلوبة الآن",
    eventTicketNotRequired: "لم تعد تذكرة الحدث مطلوبة",
    llmTurnedOnByFacilitator: "تم تشغيل LLM بواسطة الميسر",
    llmTurnedOffByFacilitator: "تم إيقاف LLM بواسطة الميسر",
    facilitatorGroupCountPreferenceChanged:
      "تم تغيير تفضيل الميسر لعدد المجموعات",
  },
  es: {
    conversationClosed: "Esta conversación fue cerrada",
    conversationOpened: "Esta conversación fue reabierta",
    conversationSettingsUpdated: "Configuración de conversación actualizada",
    conversationPublic: "Esta conversación ahora es pública",
    conversationPrivate: "Esta conversación ahora es privada",
    participationGuestAllowed: "Ahora cualquiera puede participar como invitado",
    participationAccountRequired: "La participación ahora requiere una cuenta",
    participationEmailVerificationRequired:
      "La participación ahora requiere verificación por correo electrónico",
    participationStrongVerificationRequired:
      "La participación ahora requiere verificación fuerte",
    eventTicketRequired: "Ahora se requiere una entrada del evento",
    eventTicketNotRequired: "Ya no se requiere una entrada del evento",
    llmTurnedOnByFacilitator: "El facilitador activó el LLM",
    llmTurnedOffByFacilitator: "El facilitador desactivó el LLM",
    facilitatorGroupCountPreferenceChanged:
      "Preferencia del facilitador para el número de grupos cambiada",
  },
  fa: {
    conversationClosed: "این گفتگو بسته شد",
    conversationOpened: "این گفتگو دوباره باز شد",
    conversationSettingsUpdated: "تنظیمات گفتگو به‌روزرسانی شد",
    conversationPublic: "این گفتگو اکنون عمومی است",
    conversationPrivate: "این گفتگو اکنون خصوصی است",
    participationGuestAllowed: "اکنون همه می‌توانند به عنوان مهمان مشارکت کنند",
    participationAccountRequired: "مشارکت اکنون به حساب کاربری نیاز دارد",
    participationEmailVerificationRequired:
      "مشارکت اکنون به تأیید ایمیل نیاز دارد",
    participationStrongVerificationRequired:
      "مشارکت اکنون به تأیید قوی نیاز دارد",
    eventTicketRequired: "اکنون بلیط رویداد الزامی است",
    eventTicketNotRequired: "بلیط رویداد دیگر الزامی نیست",
    llmTurnedOnByFacilitator: "LLM توسط تسهیل‌گر فعال شد",
    llmTurnedOffByFacilitator: "LLM توسط تسهیل‌گر غیرفعال شد",
    facilitatorGroupCountPreferenceChanged:
      "ترجیح تسهیل‌گر برای تعداد گروه‌ها تغییر کرد",
  },
  fr: {
    conversationClosed: "Cette conversation a été fermée",
    conversationOpened: "Cette conversation a été rouverte",
    conversationSettingsUpdated: "Paramètres de conversation mis à jour",
    conversationPublic: "Cette conversation est maintenant publique",
    conversationPrivate: "Cette conversation est maintenant privée",
    participationGuestAllowed:
      "Tout le monde peut maintenant participer en tant qu'invité",
    participationAccountRequired: "La participation nécessite maintenant un compte",
    participationEmailVerificationRequired:
      "La participation nécessite maintenant une vérification par e-mail",
    participationStrongVerificationRequired:
      "La participation nécessite maintenant une vérification forte",
    eventTicketRequired: "Un billet d'événement est maintenant requis",
    eventTicketNotRequired: "Un billet d'événement n'est plus requis",
    llmTurnedOnByFacilitator: "Le LLM a été activé par le facilitateur",
    llmTurnedOffByFacilitator: "Le LLM a été désactivé par le facilitateur",
    facilitatorGroupCountPreferenceChanged:
      "Préférence du facilitateur pour le nombre de groupes modifiée",
  },
  "zh-Hans": {
    conversationClosed: "此对话已关闭",
    conversationOpened: "此对话已重新打开",
    conversationSettingsUpdated: "对话设置已更新",
    conversationPublic: "此对话现在是公开的",
    conversationPrivate: "此对话现在是私密的",
    participationGuestAllowed: "现在任何人都可以以访客身份参与",
    participationAccountRequired: "现在参与需要账户",
    participationEmailVerificationRequired: "现在参与需要电子邮件验证",
    participationStrongVerificationRequired: "现在参与需要强验证",
    eventTicketRequired: "现在需要活动门票",
    eventTicketNotRequired: "现在不再需要活动门票",
    llmTurnedOnByFacilitator: "主持人已开启 LLM",
    llmTurnedOffByFacilitator: "主持人已关闭 LLM",
    facilitatorGroupCountPreferenceChanged: "主持人的分组数量偏好已更改",
  },
  "zh-Hant": {
    conversationClosed: "此對話已關閉",
    conversationOpened: "此對話已重新打開",
    conversationSettingsUpdated: "對話設定已更新",
    conversationPublic: "此對話現在是公開的",
    conversationPrivate: "此對話現在是私密的",
    participationGuestAllowed: "現在任何人都可以以訪客身份參與",
    participationAccountRequired: "現在參與需要帳戶",
    participationEmailVerificationRequired: "現在參與需要電子郵件驗證",
    participationStrongVerificationRequired: "現在參與需要強驗證",
    eventTicketRequired: "現在需要活動門票",
    eventTicketNotRequired: "現在不再需要活動門票",
    llmTurnedOnByFacilitator: "主持人已開啟 LLM",
    llmTurnedOffByFacilitator: "主持人已關閉 LLM",
    facilitatorGroupCountPreferenceChanged: "主持人的分組數量偏好已變更",
  },
  he: {
    conversationClosed: "השיחה הזו נסגרה",
    conversationOpened: "השיחה הזו נפתחה מחדש",
    conversationSettingsUpdated: "הגדרות השיחה עודכנו",
    conversationPublic: "השיחה הזו ציבורית כעת",
    conversationPrivate: "השיחה הזו פרטית כעת",
    participationGuestAllowed: "כל אחד יכול כעת להשתתף כאורח",
    participationAccountRequired: "ההשתתפות דורשת כעת חשבון",
    participationEmailVerificationRequired: "ההשתתפות דורשת כעת אימות אימייל",
    participationStrongVerificationRequired: "ההשתתפות דורשת כעת אימות חזק",
    eventTicketRequired: "כעת נדרש כרטיס אירוע",
    eventTicketNotRequired: "כרטיס אירוע אינו נדרש עוד",
    llmTurnedOnByFacilitator: "ה-LLM הופעל על ידי המנחה",
    llmTurnedOffByFacilitator: "ה-LLM כובה על ידי המנחה",
    facilitatorGroupCountPreferenceChanged:
      "העדפת המנחה למספר הקבוצות השתנתה",
  },
  ja: {
    conversationClosed: "この会話は閉じられました",
    conversationOpened: "この会話は再開されました",
    conversationSettingsUpdated: "会話設定が更新されました",
    conversationPublic: "この会話は公開になりました",
    conversationPrivate: "この会話は非公開になりました",
    participationGuestAllowed: "誰でもゲストとして参加できるようになりました",
    participationAccountRequired: "参加にはアカウントが必要になりました",
    participationEmailVerificationRequired:
      "参加にはメール認証が必要になりました",
    participationStrongVerificationRequired: "参加には強い認証が必要になりました",
    eventTicketRequired: "イベントチケットが必要になりました",
    eventTicketNotRequired: "イベントチケットは不要になりました",
    llmTurnedOnByFacilitator: "ファシリテーターが LLM をオンにしました",
    llmTurnedOffByFacilitator: "ファシリテーターが LLM をオフにしました",
    facilitatorGroupCountPreferenceChanged:
      "ファシリテーターのグループ数設定が変更されました",
  },
  ky: {
    conversationClosed: "Бул талкуу жабылды",
    conversationOpened: "Бул талкуу кайра ачылды",
    conversationSettingsUpdated: "Талкуунун жөндөөлөрү жаңыртылды",
    conversationPublic: "Бул талкуу эми коомдук",
    conversationPrivate: "Бул талкуу эми жеке",
    participationGuestAllowed: "Эми ар ким конок катары катыша алат",
    participationAccountRequired: "Катышуу үчүн эми аккаунт талап кылынат",
    participationEmailVerificationRequired:
      "Катышуу үчүн эми email текшерүүсү талап кылынат",
    participationStrongVerificationRequired:
      "Катышуу үчүн эми күчтүү текшерүү талап кылынат",
    eventTicketRequired: "Эми иш-чара билети талап кылынат",
    eventTicketNotRequired: "Иш-чара билети эми талап кылынбайт",
    llmTurnedOnByFacilitator: "LLM фасилитатор тарабынан иштетилди",
    llmTurnedOffByFacilitator: "LLM фасилитатор тарабынан өчүрүлдү",
    facilitatorGroupCountPreferenceChanged:
      "Фасилитатордун топ саны боюнча тандоосу өзгөрдү",
  },
  ru: {
    conversationClosed: "Это обсуждение закрыто",
    conversationOpened: "Это обсуждение снова открыто",
    conversationSettingsUpdated: "Настройки обсуждения обновлены",
    conversationPublic: "Это обсуждение теперь публичное",
    conversationPrivate: "Это обсуждение теперь приватное",
    participationGuestAllowed: "Теперь любой может участвовать как гость",
    participationAccountRequired: "Для участия теперь нужен аккаунт",
    participationEmailVerificationRequired:
      "Для участия теперь нужна проверка e-mail",
    participationStrongVerificationRequired:
      "Для участия теперь нужна строгая проверка",
    eventTicketRequired: "Теперь требуется билет события",
    eventTicketNotRequired: "Билет события больше не требуется",
    llmTurnedOnByFacilitator: "LLM включена фасилитатором",
    llmTurnedOffByFacilitator: "LLM выключена фасилитатором",
    facilitatorGroupCountPreferenceChanged:
      "Предпочтение фасилитатора по числу групп изменено",
  },
};
