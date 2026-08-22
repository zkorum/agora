import sanitizeHtml from "sanitize-html";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { getLanguageTextDirection } from "@/shared/languages.js";

const BRAND = "Agora Citizen Network";

interface FixedCopy {
    test: string;
    owner: string;
    why: string;
    conversations: string;
    unsubscribe: string;
    manage: string;
    report: string;
    reply: string;
}

const englishCopy: FixedCopy = {
    test: "TEST EMAIL - no participant actions are active",
    owner: "You received this mandatory copy because you own a selected conversation.",
    why: "You received this update because you chose email updates for a conversation in which you participated.",
    conversations: "Included conversations",
    unsubscribe: "Unsubscribe from these updates",
    manage: "Manage preferences or unsubscribe from specific conversations",
    report: "Report this update",
    reply: "Reply to this email to contact the project team.",
};

const fixedCopy: Record<SupportedDisplayLanguageCodes, FixedCopy> = {
    en: englishCopy,
    es: {
        test: "CORREO DE PRUEBA - las acciones para participantes no están activas",
        owner: "Recibió esta copia obligatoria porque gestiona una conversación seleccionada.",
        why: "Recibió esta actualización porque eligió recibir correos sobre una conversación en la que participó.",
        conversations: "Conversaciones incluidas",
        unsubscribe: "Cancelar la suscripción a estas actualizaciones",
        manage: "Gestionar preferencias o cancelar la suscripción a conversaciones específicas",
        report: "Denunciar esta actualización",
        reply: "Responda a este correo para contactar al equipo del proyecto.",
    },
    fr: {
        test: "E-MAIL DE TEST - aucune action destinée aux participants n'est active",
        owner: "Vous recevez cette copie obligatoire car vous gérez une conversation sélectionnée.",
        why: "Vous recevez cette mise à jour car vous avez choisi les e-mails pour une conversation à laquelle vous avez participé.",
        conversations: "Conversations incluses",
        unsubscribe: "Se désabonner de ces mises à jour",
        manage: "Gérer les préférences ou se désabonner de conversations précises",
        report: "Signaler cette mise à jour",
        reply: "Répondez à cet e-mail pour contacter l'équipe du projet.",
    },
    "zh-Hans": {
        test: "测试邮件 - 参与者操作未启用",
        owner: "您收到此必要副本，是因为您负责所选对话。",
        why: "您收到此更新，是因为您选择接收您参与过的对话的电子邮件更新。",
        conversations: "包含的对话",
        unsubscribe: "退订这些更新",
        manage: "管理偏好或退订特定对话",
        report: "举报此更新",
        reply: "回复此邮件即可联系项目团队。",
    },
    "zh-Hant": {
        test: "測試郵件 - 參與者操作未啟用",
        owner: "您收到此必要副本，是因為您負責所選對話。",
        why: "您收到此更新，是因為您選擇接收您參與過的對話的電子郵件更新。",
        conversations: "包含的對話",
        unsubscribe: "取消訂閱這些更新",
        manage: "管理偏好或取消訂閱特定對話",
        report: "檢舉此更新",
        reply: "回覆此郵件即可聯絡專案團隊。",
    },
    ja: {
        test: "テストメール - 参加者向け操作は無効です",
        owner: "選択された会話の管理者であるため、この必須コピーを受信しています。",
        why: "参加した会話のメール更新を希望したため、この更新を受信しています。",
        conversations: "対象の会話",
        unsubscribe: "この更新の配信を停止",
        manage: "設定の管理または会話ごとの配信停止",
        report: "この更新を報告",
        reply: "プロジェクトチームへの連絡は、このメールに返信してください。",
    },
    ar: {
        test: "رسالة اختبار - إجراءات المشاركين غير مفعلة",
        owner: "تلقيت هذه النسخة الإلزامية لأنك تدير محادثة محددة.",
        why: "تلقيت هذا التحديث لأنك اخترت تحديثات البريد لمحادثة شاركت فيها.",
        conversations: "المحادثات المشمولة",
        unsubscribe: "إلغاء الاشتراك في هذه التحديثات",
        manage: "إدارة التفضيلات أو إلغاء محادثات محددة",
        report: "الإبلاغ عن هذا التحديث",
        reply: "رد على هذه الرسالة للتواصل مع فريق المشروع.",
    },
    he: {
        test: "הודעת בדיקה - פעולות משתתפים אינן פעילות",
        owner: "קיבלת עותק חובה זה כי באחריותך שיחה שנבחרה.",
        why: "קיבלת עדכון זה כי בחרת לקבל עדכונים לשיחה שבה השתתפת.",
        conversations: "שיחות כלולות",
        unsubscribe: "ביטול הרשמה לעדכונים אלה",
        manage: "ניהול העדפות או ביטול הרשמה לשיחות מסוימות",
        report: "דיווח על עדכון זה",
        reply: "אפשר להשיב להודעה זו כדי ליצור קשר עם צוות הפרויקט.",
    },
    fa: {
        test: "ایمیل آزمایشی - اقدام‌های شرکت‌کننده فعال نیست",
        owner: "این نسخه الزامی را چون مسئول یک گفت‌وگوی انتخاب‌شده هستید دریافت کردید.",
        why: "این به‌روزرسانی را چون ایمیل‌های گفت‌وگویی را که در آن شرکت کردید انتخاب کرده‌اید دریافت کردید.",
        conversations: "گفت‌وگوهای موجود",
        unsubscribe: "لغو اشتراک این به‌روزرسانی‌ها",
        manage: "مدیریت ترجیحات یا لغو گفت‌وگوهای مشخص",
        report: "گزارش این به‌روزرسانی",
        reply: "برای تماس با تیم پروژه به این ایمیل پاسخ دهید.",
    },
    ky: {
        test: "СЫНОО КАТЫ - катышуучунун аракеттери иштебейт",
        owner: "Тандалган талкууну башкарганыңыз үчүн бул милдеттүү көчүрмөнү алдыңыз.",
        why: "Катышкан талкууңуз боюнча каттарды тандаганыңыз үчүн бул жаңыртууну алдыңыз.",
        conversations: "Камтылган талкуулар",
        unsubscribe: "Бул жаңыртуулардан чыгуу",
        manage: "Жөндөөлөрдү башкаруу же айрым талкуулардан чыгуу",
        report: "Бул жаңыртууну билдирүү",
        reply: "Долбоор тобуна байланышуу үчүн бул катка жооп бериңиз.",
    },
    ru: {
        test: "ТЕСТОВОЕ ПИСЬМО - действия участников неактивны",
        owner: "Вы получили обязательную копию, так как управляете выбранным обсуждением.",
        why: "Вы получили обновление, так как выбрали письма об обсуждении, в котором участвовали.",
        conversations: "Включенные обсуждения",
        unsubscribe: "Отписаться от этих обновлений",
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
    unsubscribeUrl: string;
    manageUrl: string;
    reportUrl: string;
}

export interface RenderConversationEmailParams {
    subject: string;
    bodyHtml: string;
    bodyPlainText: string;
    projectTitle: string;
    conversations: readonly { title: string; url: string }[];
    language: SupportedDisplayLanguageCodes;
    variant: "test" | "owner_copy" | "participant";
    actions: ConversationEmailActionLinks | undefined;
}

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

export function renderConversationEmail({
    subject,
    bodyHtml,
    bodyPlainText,
    projectTitle,
    conversations,
    language,
    variant,
    actions,
}: RenderConversationEmailParams): RenderedConversationEmail {
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
    const actionHtml =
        variant === "participant" && actions !== undefined
            ? `<p style="margin:20px 0 8px"><a href="${htmlUrl(actions.unsubscribeUrl)}">${escapeHtml(copy.unsubscribe)}</a></p><p style="margin:8px 0"><a href="${htmlUrl(actions.manageUrl)}">${escapeHtml(copy.manage)}</a></p><p style="margin:8px 0"><a href="${htmlUrl(actions.reportUrl)}">${escapeHtml(copy.report)}</a></p>`
            : "";
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
    const actionText =
        variant === "participant" && actions !== undefined
            ? `\n\n${copy.unsubscribe}: ${textUrl(actions.unsubscribeUrl)}\n${copy.manage}: ${textUrl(actions.manageUrl)}\n${copy.report}: ${textUrl(actions.reportUrl)}`
            : "";
    const text = `${marker === undefined ? "" : `${marker}\n\n`}${projectTitle}\n${subject}\n\n${bodyPlainText.trim()}\n\n${copy.conversations}\n${conversationText}\n\n${explanation}\n${copy.reply}${actionText}\n\n${BRAND}`;
    return {
        subject: marker === undefined ? subject : `[TEST] ${subject}`,
        html,
        text,
    };
}
