import sanitizeHtml from "sanitize-html";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { getLanguageTextDirection } from "@/shared/languages.js";

const BRAND = "Agora Citizen Network";

interface FixedCopy {
    test: string;
    owner: string;
    why: string;
    conversations: string;
    unsubscribeProject: string;
    unsubscribeConversation: string;
    manage: string;
    report: string;
    reply: string;
}

const englishCopy: FixedCopy = {
    test: "TEST EMAIL - no participant actions are active",
    owner: "You received this operational owner copy because you are authorized to manage Email Updates for an organization that owns this project. Participant email preferences do not disable operational owner copies.",
    why: "You received this update because you chose email updates for a conversation in which you participated.",
    conversations: "Included conversations",
    unsubscribeProject: "Unsubscribe from updates for this project",
    unsubscribeConversation: "Unsubscribe from updates for this conversation",
    manage: "Manage preferences or unsubscribe from specific conversations",
    report: "Report this update",
    reply: "Reply to this email to contact the project team.",
};

const fixedCopy: Record<SupportedDisplayLanguageCodes, FixedCopy> = {
    en: englishCopy,
    es: {
        test: "CORREO DE PRUEBA - las acciones para participantes no están activas",
        owner: "Recibió esta copia operativa para propietarios porque tiene autorización para gestionar las Actualizaciones por correo electrónico de una organización propietaria de este proyecto. Las preferencias de correo electrónico de los participantes no desactivan las copias operativas para propietarios.",
        why: "Recibió esta actualización porque eligió recibir correos sobre una conversación en la que participó.",
        conversations: "Conversaciones incluidas",
        unsubscribeProject: "Cancelar las actualizaciones de este proyecto",
        unsubscribeConversation: "Cancelar las actualizaciones de esta conversación",
        manage: "Gestionar preferencias o cancelar la suscripción a conversaciones específicas",
        report: "Denunciar esta actualización",
        reply: "Responda a este correo para contactar al equipo del proyecto.",
    },
    fr: {
        test: "E-MAIL DE TEST - aucune action destinée aux participants n'est active",
        owner: "Vous recevez cette copie opérationnelle destinée aux propriétaires car vous êtes autorisé à gérer les Mises à jour par e-mail pour une organisation propriétaire de ce projet. Les préférences e-mail des participants ne désactivent pas les copies opérationnelles destinées aux propriétaires.",
        why: "Vous recevez cette mise à jour car vous avez choisi les e-mails pour une conversation à laquelle vous avez participé.",
        conversations: "Conversations incluses",
        unsubscribeProject: "Se désabonner des mises à jour de ce projet",
        unsubscribeConversation: "Se désabonner des mises à jour de cette conversation",
        manage: "Gérer les préférences ou se désabonner de conversations précises",
        report: "Signaler cette mise à jour",
        reply: "Répondez à cet e-mail pour contacter l'équipe du projet.",
    },
    "zh-Hans": {
        test: "测试邮件 - 参与者操作未启用",
        owner: "您收到这封项目所有者运营副本，是因为您有权为拥有此项目的组织管理电子邮件更新。参与者的电子邮件偏好不会停用项目所有者运营副本。",
        why: "您收到此更新，是因为您选择接收您参与过的对话的电子邮件更新。",
        conversations: "包含的对话",
        unsubscribeProject: "退订此项目的更新",
        unsubscribeConversation: "退订此对话的更新",
        manage: "管理偏好或退订特定对话",
        report: "举报此更新",
        reply: "回复此邮件即可联系项目团队。",
    },
    "zh-Hant": {
        test: "測試郵件 - 參與者操作未啟用",
        owner: "您收到這封專案擁有者營運副本，是因為您有權為擁有此專案的組織管理電子郵件更新。參與者的電子郵件偏好不會停用專案擁有者營運副本。",
        why: "您收到此更新，是因為您選擇接收您參與過的對話的電子郵件更新。",
        conversations: "包含的對話",
        unsubscribeProject: "取消訂閱此專案的更新",
        unsubscribeConversation: "取消訂閱此對話的更新",
        manage: "管理偏好或取消訂閱特定對話",
        report: "檢舉此更新",
        reply: "回覆此郵件即可聯絡專案團隊。",
    },
    ja: {
        test: "テストメール - 参加者向け操作は無効です",
        owner: "このプロジェクトを所有する組織のメール更新を管理する権限があるため、この運用上の所有者向けコピーを受信しています。参加者のメール設定で運用上の所有者向けコピーが無効になることはありません。",
        why: "参加した会話のメール更新を希望したため、この更新を受信しています。",
        conversations: "対象の会話",
        unsubscribeProject: "このプロジェクトの更新配信を停止",
        unsubscribeConversation: "この会話の更新配信を停止",
        manage: "設定の管理または会話ごとの配信停止",
        report: "この更新を報告",
        reply: "プロジェクトチームへの連絡は、このメールに返信してください。",
    },
    ar: {
        test: "رسالة اختبار - إجراءات المشاركين غير مفعلة",
        owner: "تلقيت نسخة المالك التشغيلية هذه لأنك مخوّل بإدارة تحديثات البريد الإلكتروني لمؤسسة تملك هذا المشروع. لا تؤدي تفضيلات البريد الإلكتروني للمشاركين إلى تعطيل نسخ المالك التشغيلية.",
        why: "تلقيت هذا التحديث لأنك اخترت تحديثات البريد لمحادثة شاركت فيها.",
        conversations: "المحادثات المشمولة",
        unsubscribeProject: "إلغاء الاشتراك في تحديثات هذا المشروع",
        unsubscribeConversation: "إلغاء الاشتراك في تحديثات هذه المحادثة",
        manage: "إدارة التفضيلات أو إلغاء محادثات محددة",
        report: "الإبلاغ عن هذا التحديث",
        reply: "رد على هذه الرسالة للتواصل مع فريق المشروع.",
    },
    he: {
        test: "הודעת בדיקה - פעולות משתתפים אינן פעילות",
        owner: "קיבלת עותק תפעולי זה לבעלים כי יש לך הרשאה לנהל עדכוני דוא״ל עבור ארגון שבבעלותו הפרויקט הזה. העדפות הדוא״ל של המשתתפים אינן משביתות עותקים תפעוליים לבעלים.",
        why: "קיבלת עדכון זה כי בחרת לקבל עדכונים לשיחה שבה השתתפת.",
        conversations: "שיחות כלולות",
        unsubscribeProject: "ביטול הרשמה לעדכונים מהפרויקט הזה",
        unsubscribeConversation: "ביטול הרשמה לעדכונים מהשיחה הזאת",
        manage: "ניהול העדפות או ביטול הרשמה לשיחות מסוימות",
        report: "דיווח על עדכון זה",
        reply: "אפשר להשיב להודעה זו כדי ליצור קשר עם צוות הפרויקט.",
    },
    fa: {
        test: "ایمیل آزمایشی - اقدام‌های شرکت‌کننده فعال نیست",
        owner: "این نسخه عملیاتی مالک را دریافت کرده‌اید زیرا مجاز به مدیریت به‌روزرسانی‌های ایمیلی برای سازمانی هستید که مالک این پروژه است. ترجیحات ایمیلی شرکت‌کنندگان نسخه‌های عملیاتی مالک را غیرفعال نمی‌کند.",
        why: "این به‌روزرسانی را چون ایمیل‌های گفت‌وگویی را که در آن شرکت کردید انتخاب کرده‌اید دریافت کردید.",
        conversations: "گفت‌وگوهای موجود",
        unsubscribeProject: "لغو اشتراک به‌روزرسانی‌های این پروژه",
        unsubscribeConversation: "لغو اشتراک به‌روزرسانی‌های این گفت‌وگو",
        manage: "مدیریت ترجیحات یا لغو گفت‌وگوهای مشخص",
        report: "گزارش این به‌روزرسانی",
        reply: "برای تماس با تیم پروژه به این ایمیل پاسخ دهید.",
    },
    ky: {
        test: "СЫНОО КАТЫ - катышуучунун аракеттери иштебейт",
        owner: "Бул долбоорго ээлик кылган уюм үчүн электрондук почта жаңыртууларын башкарууга укуктуу болгонуңуз үчүн ээсине арналган бул операциялык көчүрмөнү алдыңыз. Катышуучулардын электрондук почта жөндөөлөрү ээсине арналган операциялык көчүрмөлөрдү өчүрбөйт.",
        why: "Катышкан талкууңуз боюнча каттарды тандаганыңыз үчүн бул жаңыртууну алдыңыз.",
        conversations: "Камтылган талкуулар",
        unsubscribeProject: "Бул долбоордун жаңыртууларынан чыгуу",
        unsubscribeConversation: "Бул талкуунун жаңыртууларынан чыгуу",
        manage: "Жөндөөлөрдү башкаруу же айрым талкуулардан чыгуу",
        report: "Бул жаңыртууну билдирүү",
        reply: "Долбоор тобуна байланышуу үчүн бул катка жооп бериңиз.",
    },
    ru: {
        test: "ТЕСТОВОЕ ПИСЬМО - действия участников неактивны",
        owner: "Вы получили эту служебную копию для владельца, поскольку уполномочены управлять почтовыми обновлениями от имени организации, владеющей этим проектом. Настройки электронной почты участников не отключают служебные копии для владельцев.",
        why: "Вы получили обновление, так как выбрали письма об обсуждении, в котором участвовали.",
        conversations: "Включенные обсуждения",
        unsubscribeProject: "Отписаться от обновлений этого проекта",
        unsubscribeConversation: "Отписаться от обновлений этого обсуждения",
        manage: "Управлять настройками или отписаться от отдельных обсуждений",
        report: "Пожаловаться на это обновление",
        reply: "Ответьте на это письмо, чтобы связаться с командой проекта.",
    },
};

export interface RenderedConversationEmail {
    subject: string;
    html: string;
    text: string;
}

export interface ConversationEmailActionLinks {
    unsubscribeScope: "project" | "conversation";
    unsubscribeUrl: string;
    manageUrl: string;
    reportUrl: string;
}

interface RenderConversationEmailParamsCommon {
    subject: string;
    bodyHtml: string;
    bodyPlainText: string;
    projectTitle: string;
    conversations: readonly { title: string; url: string }[];
    language: SupportedDisplayLanguageCodes;
}

export type RenderConversationEmailParams =
    RenderConversationEmailParamsCommon &
        (
            | { variant: "test"; actions?: never }
            | {
                  variant: "owner_copy";
                  actions: ConversationEmailActionLinks;
              }
            | {
                  variant: "participant";
                  actions: ConversationEmailActionLinks;
              }
        );

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeUrl(value: string): string | undefined {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:"
            ? parsed.toString()
            : undefined;
    } catch {
        return undefined;
    }
}

function sanitizeAuthoredBody(bodyHtml: string): string {
    return sanitizeHtml(bodyHtml, {
        allowedTags: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "strike",
            "ul",
            "ol",
            "li",
        ],
        allowedAttributes: {},
    });
}

function htmlUrl(value: string): string {
    return escapeHtml(safeUrl(value) ?? "#");
}

function textUrl(value: string): string {
    return safeUrl(value) ?? "#";
}

export function renderConversationEmail(
    params: RenderConversationEmailParams,
): RenderedConversationEmail {
    const {
        subject,
        bodyHtml,
        bodyPlainText,
        projectTitle,
        conversations,
        language,
        variant,
    } = params;
    const copy = fixedCopy[language];
    const direction = getLanguageTextDirection(language);
    const marker = variant === "test" ? copy.test : undefined;
    const explanation =
        variant === "owner_copy"
            ? copy.owner
            : variant === "participant"
              ? copy.why
              : copy.test;
    const sanitizedBodyHtml = sanitizeAuthoredBody(bodyHtml);
    const sortedConversations = [...conversations].sort((left, right) =>
        left.title.localeCompare(right.title, language),
    );
    const conversationHtml = sortedConversations
        .map(
            (conversation) =>
                `<li style="margin:0 0 8px"><a href="${htmlUrl(conversation.url)}" style="color:#4f46e5">${escapeHtml(conversation.title)}</a></li>`,
        )
        .join("");
    let actionHtml = "";
    let actionText = "";
    if (params.variant !== "test") {
        const unsubscribeCopy =
            params.actions.unsubscribeScope === "project"
                ? copy.unsubscribeProject
                : copy.unsubscribeConversation;
        actionHtml = `<p style="margin:20px 0 8px"><a href="${htmlUrl(params.actions.unsubscribeUrl)}">${escapeHtml(unsubscribeCopy)}</a></p><p style="margin:8px 0"><a href="${htmlUrl(params.actions.manageUrl)}">${escapeHtml(copy.manage)}</a></p><p style="margin:8px 0"><a href="${htmlUrl(params.actions.reportUrl)}">${escapeHtml(copy.report)}</a></p>`;
        actionText = `\n\n${unsubscribeCopy}: ${textUrl(params.actions.unsubscribeUrl)}\n${copy.manage}: ${textUrl(params.actions.manageUrl)}\n${copy.report}: ${textUrl(params.actions.reportUrl)}`;
    }
    const markerHtml =
        marker === undefined
            ? ""
            : `<tr><td style="background:#fff3cd;color:#664d03;padding:12px 24px;font-weight:700">${escapeHtml(marker)}</td></tr>`;
    const html = `<!doctype html><html lang="${escapeHtml(language)}" dir="${direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f4f4f7;font-family:Arial,sans-serif;color:#1f2937"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:#312e81;color:#fff;padding:22px 24px;font-size:20px;font-weight:700">${BRAND}</td></tr>${markerHtml}<tr><td style="padding:28px 24px"><p style="margin:0 0 8px;color:#6b7280">${escapeHtml(projectTitle)}</p><h1 style="font-size:24px;line-height:1.3;margin:0 0 24px">${escapeHtml(subject)}</h1><div style="font-size:16px;line-height:1.6">${sanitizedBodyHtml}</div><hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0"><h2 style="font-size:17px">${escapeHtml(copy.conversations)}</h2><ul style="padding-inline-start:22px">${conversationHtml}</ul></td></tr><tr><td style="background:#f9fafb;padding:22px 24px;font-size:13px;line-height:1.5;color:#4b5563"><p>${escapeHtml(explanation)}</p><p>${escapeHtml(copy.reply)}</p>${actionHtml}<p style="margin-top:20px">${BRAND}</p></td></tr></table></td></tr></table></body></html>`;

    const conversationText = sortedConversations
        .map(
            (conversation) =>
                `- ${conversation.title}: ${textUrl(conversation.url)}`,
        )
        .join("\n");
    const text = `${marker === undefined ? "" : `${marker}\n\n`}${projectTitle}\n${subject}\n\n${bodyPlainText.trim()}\n\n${copy.conversations}\n${conversationText}\n\n${explanation}\n${copy.reply}${actionText}\n\n${BRAND}`;
    return {
        subject: marker === undefined ? subject : `[TEST] ${subject}`,
        html,
        text,
    };
}
