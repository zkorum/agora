import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { parseHTML } from "linkedom";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { getLanguageTextDirection } from "@/shared/languages.js";
import { sanitizeRichTextContent } from "@/shared/richTextHtml.js";
import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import {
    AGORA_WEBSITE_URL,
    poweredByAgoraTranslations,
} from "@/shared/branding/poweredByAgora.js";
import ConversationUpdateEmail from "./ConversationUpdateEmail.vue";
import {
    projectAttributionSections,
    projectAttributionTranslations,
} from "@/shared/branding/projectAttributionTranslations.js";

export const EMAIL_TEMPLATE_VERSION = "vue-email-v1";

interface FixedCopy {
    test: string;
    adminCopy: string;
    why: string;
    conversations: string;
    unsubscribeConversations: string;
    unsubscribeProject: string;
    manage: string;
    report: string;
    reply: string;
}

const englishCopy: FixedCopy = {
    test: "TEST EMAIL - no participant actions are active",
    adminCopy: "Admin Copy",
    why: "You opted in to conversation updates.",
    conversations: "Included conversations",
    unsubscribeConversations: "Unsubscribe from these conversations",
    unsubscribeProject: "Unsubscribe from all project updates",
    manage: "Manage preferences",
    report: "Report this update",
    reply: "Reply to this email to contact the facilitator.",
};

const fixedCopy: Record<SupportedDisplayLanguageCodes, FixedCopy> = {
    en: englishCopy,
    es: {
        test: "CORREO DE PRUEBA - las acciones para participantes no están activas",
        adminCopy: "Copia de administración",
        why: "Elegiste recibir novedades de las conversaciones.",
        conversations: "Conversaciones incluidas",
        unsubscribeConversations: "Darse de baja de estas conversaciones",
        unsubscribeProject: "Darse de baja de todas las novedades del proyecto",
        manage: "Gestionar preferencias",
        report: "Denunciar esta novedad",
        reply: "Responde a este correo para contactar con la persona facilitadora.",
    },
    fr: {
        test: "E-MAIL DE TEST - aucune action destinée aux participants n'est active",
        adminCopy: "Copie admin",
        why: "Vous avez choisi de suivre les conversations par e-mail.",
        conversations: "Conversations incluses",
        unsubscribeConversations: "Se désabonner de ces conversations",
        unsubscribeProject: "Se désabonner de toutes les nouvelles du projet",
        manage: "Gérer les préférences",
        report: "Signaler cette nouvelle",
        reply: "Répondez à cet e-mail pour contacter votre facilitateur.",
    },
    "zh-Hans": {
        test: "测试邮件 - 参与者操作未启用",
        adminCopy: "管理员副本",
        why: "您选择了接收对话更新。",
        conversations: "包含的对话",
        unsubscribeConversations: "退订这些对话的更新",
        unsubscribeProject: "退订此项目的所有更新",
        manage: "管理偏好",
        report: "举报此更新",
        reply: "回复此邮件即可联系协调员。",
    },
    "zh-Hant": {
        test: "測試郵件 - 參與者操作未啟用",
        adminCopy: "管理員副本",
        why: "您選擇了接收對話更新。",
        conversations: "包含的對話",
        unsubscribeConversations: "取消訂閱這些對話的更新",
        unsubscribeProject: "取消訂閱此專案的所有更新",
        manage: "管理偏好",
        report: "檢舉此更新",
        reply: "回覆此郵件即可聯絡協調員。",
    },
    ja: {
        test: "テストメール - 参加者向け操作は無効です",
        adminCopy: "管理者用コピー",
        why: "会話の更新メールの受信を希望したため、お送りしています。",
        conversations: "対象の会話",
        unsubscribeConversations: "これらの会話の更新の配信を停止",
        unsubscribeProject: "プロジェクトのすべての更新の配信を停止",
        manage: "設定の管理",
        report: "この更新を報告",
        reply: "ファシリテーターへの連絡は、このメールに返信してください。",
    },
    ar: {
        test: "رسالة اختبار - إجراءات المشاركين غير مفعلة",
        adminCopy: "نسخة إدارية",
        why: "اخترت تلقي تحديثات المحادثات.",
        conversations: "المحادثات المشمولة",
        unsubscribeConversations: "إلغاء الاشتراك في تحديثات هذه المحادثات",
        unsubscribeProject: "إلغاء الاشتراك في جميع تحديثات المشروع",
        manage: "إدارة التفضيلات",
        report: "الإبلاغ عن هذا التحديث",
        reply: "رد على هذه الرسالة للتواصل مع المُيسّر.",
    },
    he: {
        test: "הודעת בדיקה - פעולות משתתפים אינן פעילות",
        adminCopy: "עותק למנהל",
        why: "בחרת לקבל עדכונים על שיחות.",
        conversations: "שיחות כלולות",
        unsubscribeConversations: "ביטול הרשמה לעדכונים על השיחות האלה",
        unsubscribeProject: "ביטול הרשמה לכל עדכוני הפרויקט",
        manage: "ניהול העדפות",
        report: "דיווח על עדכון זה",
        reply: "אפשר להשיב להודעה זו כדי ליצור קשר עם המנחה.",
    },
    fa: {
        test: "ایمیل آزمایشی - اقدام‌های شرکت‌کننده فعال نیست",
        adminCopy: "نسخه مدیر",
        why: "شما دریافت به‌روزرسانی‌های گفت‌وگوها را انتخاب کرده‌اید.",
        conversations: "گفت‌وگوهای موجود",
        unsubscribeConversations: "لغو اشتراک به‌روزرسانی‌های این گفت‌وگوها",
        unsubscribeProject: "لغو اشتراک همهٔ به‌روزرسانی‌های پروژه",
        manage: "مدیریت ترجیحات",
        report: "گزارش این به‌روزرسانی",
        reply: "برای تماس با تسهیل‌گر به این ایمیل پاسخ دهید.",
    },
    ky: {
        test: "СЫНОО КАТЫ - катышуучунун аракеттери иштебейт",
        adminCopy: "Администратор көчүрмөсү",
        why: "Сиз талкуулардын жаңыртууларын алууну тандагансыз.",
        conversations: "Камтылган талкуулар",
        unsubscribeConversations:
            "Бул талкуулардын жаңыртууларына жазылуудан чыгуу",
        unsubscribeProject: "Долбоордун бардык жаңыртууларына жазылуудан чыгуу",
        manage: "Жөндөөлөрдү башкаруу",
        report: "Бул жаңыртууну билдирүү",
        reply: "Фасилитатор менен байланышуу үчүн бул катка жооп бериңиз.",
    },
    ru: {
        test: "ТЕСТОВОЕ ПИСЬМО - действия участников неактивны",
        adminCopy: "Копия для администратора",
        why: "Вы подписались на обновления обсуждений.",
        conversations: "Включенные обсуждения",
        unsubscribeConversations: "Отписаться от обновлений этих обсуждений",
        unsubscribeProject: "Отписаться от всех обновлений проекта",
        manage: "Управлять настройками",
        report: "Пожаловаться на это обновление",
        reply: "Ответьте на это письмо, чтобы связаться с фасилитатором.",
    },
};

export interface RenderedConversationEmail {
    subject: string;
    html: string;
    text: string;
}

export interface ConversationEmailActionLinks {
    conversationUnsubscribeUrl: string;
    projectUnsubscribeUrl: string | undefined;
    manageUrl: string;
    reportUrl: string;
}

export interface RenderConversationEmailParamsCommon {
    subject: string;
    bodyHtml: string;
    bodyPlainText: string;
    branding: EmailBranding;
    conversations: readonly { title: string; url: string }[];
    language: SupportedDisplayLanguageCodes;
}

export type RenderConversationEmailParams =
    RenderConversationEmailParamsCommon &
        (
            | { variant: "test"; actions?: never }
            | {
                  variant: "owner_copy";
                  actions: Pick<ConversationEmailActionLinks, "reportUrl">;
              }
            | {
                  variant: "participant";
                  actions: ConversationEmailActionLinks;
              }
        );

function safeUrl(value: string): string | undefined {
    try {
        const parsed = new URL(value);
        return (parsed.protocol === "https:" || parsed.protocol === "http:") &&
            parsed.username === "" &&
            parsed.password === ""
            ? parsed.toString()
            : undefined;
    } catch {
        return undefined;
    }
}

function textUrl(value: string): string {
    return safeUrl(value) ?? "#";
}

export interface EmailView {
    subject: string;
    bodyHtml: string;
    branding: EmailBranding;
    conversations: readonly { title: string; url: string }[];
    language: SupportedDisplayLanguageCodes;
    direction: "ltr" | "rtl";
    copy: FixedCopy;
    marker: string | undefined;
    explanation: string | undefined;
    actions: readonly { label: string; url: string }[];
}

export async function renderConversationEmail(
    params: RenderConversationEmailParams,
): Promise<RenderedConversationEmail> {
    const {
        subject,
        bodyHtml,
        bodyPlainText,
        branding,
        conversations,
        language,
        variant,
    } = params;
    const copy = fixedCopy[language];
    const direction = getLanguageTextDirection(language);
    const marker = variant === "test" ? copy.test : undefined;
    const explanation = variant === "participant" ? copy.why : undefined;
    const displaySubject =
        variant === "owner_copy" ? `[${copy.adminCopy}] ${subject}` : subject;
    const sanitizedBodyHtml = sanitizeRichTextContent({
        htmlString: bodyHtml,
        mode: "input",
    });
    const sortedConversations = [...conversations].sort((left, right) =>
        left.title.localeCompare(right.title, language),
    );
    const actions: { label: string; url: string }[] = [];
    if (params.variant === "participant") {
        actions.push({
            label: copy.unsubscribeConversations,
            url: textUrl(params.actions.conversationUnsubscribeUrl),
        });
        if (params.actions.projectUnsubscribeUrl !== undefined) {
            actions.push({
                label: copy.unsubscribeProject,
                url: textUrl(params.actions.projectUnsubscribeUrl),
            });
        }
        actions.push({
            label: copy.manage,
            url: textUrl(params.actions.manageUrl),
        });
    }
    if (params.variant !== "test") {
        actions.push({
            label: copy.report,
            url: textUrl(params.actions.reportUrl),
        });
    }
    const actionText =
        actions.length === 0
            ? ""
            : `\n\n${actions.map((action) => `${action.label}: ${action.url}`).join("\n")}`;
    const view: EmailView = {
        subject: displaySubject,
        bodyHtml: sanitizedBodyHtml,
        language,
        direction,
        copy,
        marker,
        explanation,
        actions,
        branding: {
            ...branding,
            projectUrl:
                branding.scopeKind === "project" &&
                branding.projectUrl !== undefined
                    ? safeUrl(branding.projectUrl)
                    : undefined,
            attributions: branding.attributions?.map((entry) => ({
                ...entry,
                imageUrl:
                    entry.imageUrl === undefined
                        ? undefined
                        : safeUrl(entry.imageUrl),
                websiteUrl:
                    entry.websiteUrl === undefined
                        ? undefined
                        : safeUrl(entry.websiteUrl),
            })),
            imageUrl:
                branding.imageUrl === undefined
                    ? undefined
                    : safeUrl(branding.imageUrl),
            bannerImageUrl:
                branding.bannerImageUrl === undefined
                    ? undefined
                    : safeUrl(branding.bannerImageUrl),
        },
        conversations: sortedConversations.map((conversation) => ({
            ...conversation,
            url: textUrl(conversation.url),
        })),
    };
    const html = `<!doctype html>${await renderToString(createSSRApp(ConversationUpdateEmail, { view }))}`;

    const conversationText = sortedConversations
        .map(
            (conversation) =>
                `- ${conversation.title}: ${textUrl(conversation.url)}`,
        )
        .join("\n");
    const attributionText = projectAttributionSections
        .flatMap((section) => {
            const entries =
                view.branding.attributions?.filter(
                    (entry) => entry.role === section.role,
                ) ?? [];
            return entries.length === 0
                ? []
                : [
                      projectAttributionTranslations[language][
                          section.titleKey
                      ],
                      ...entries.map(
                          (entry) =>
                              `- ${entry.displayName}${entry.websiteUrl === undefined ? "" : `: ${entry.websiteUrl}`}`,
                      ),
                  ];
        })
        .join("\n");
    const text = `${branding.name}${view.branding.projectUrl === undefined ? "" : `: ${view.branding.projectUrl}`}\n\n${marker === undefined ? "" : `${marker}\n\n`}${bodyPlainText.trim()}${attributionText === "" ? "" : `\n\n${attributionText}`}\n\n${copy.conversations}\n${conversationText}\n\n${explanation === undefined ? "" : `${explanation} `}${copy.reply}${actionText}\n\n${poweredByAgoraTranslations[language]} Agora: ${AGORA_WEBSITE_URL}`;
    return {
        subject: marker === undefined ? displaySubject : `[TEST] ${subject}`,
        html,
        text,
    };
}

export function createConversationEmailPreviewDocument({
    email,
    imageOrigins,
}: {
    email: RenderedConversationEmail;
    imageOrigins: readonly string[];
}): RenderedConversationEmail {
    // Parse the trusted renderer output server-side; this parser does not fetch resources.
    const { document } = parseHTML(email.html);
    const origins = imageOrigins.flatMap((value) => {
        const url = safeUrl(value);
        return url === undefined ? [] : [new URL(url).origin];
    });
    for (const link of Array.from(document.querySelectorAll("[href]")))
        link.removeAttribute("href");
    for (const image of Array.from(document.querySelectorAll("img"))) {
        const value = image.getAttribute("src");
        const url = value === null ? undefined : safeUrl(value);
        if (url === undefined || !origins.includes(new URL(url).origin))
            image.remove();
    }
    const policy = document.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src ${origins.length === 0 ? "'none'" : origins.join(" ")}; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`;
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.prepend(policy, referrer);
    return {
        ...email,
        html: `<!doctype html>${document.documentElement.outerHTML}`,
    };
}
