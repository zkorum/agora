import { config, log } from "@/app.js";
import { codeToString } from "@/crypto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";

// Lazy-initialized: only created when actually sending emails (production)
// This avoids crashing in development where SES is not configured
let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
    if (transporter === undefined) {
        const sesClient = new SESv2Client({
            region: config.AWS_SES_REGION,
        });
        transporter = nodemailer.createTransport({
            SES: { sesClient, SendEmailCommand },
        });
    }
    return transporter;
}

interface SendEmailProps {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmail({
    to,
    subject,
    text,
    html,
}: SendEmailProps): Promise<void> {
    await getTransporter().sendMail({
        from: `"Agora Citizen Network" <${config.EMAIL_FROM_ADDRESS}>`,
        to,
        subject,
        text,
        html,
    });
    log.info("[Email] Email sent successfully");
}

interface OtpEmailTranslation {
    subject: string;
    text: (code: string) => string;
}

const otpEmailTranslations: Record<
    SupportedDisplayLanguageCodes,
    OtpEmailTranslation
> = {
    en: {
        subject: "Your Agora confirmation code",
        text: (code) =>
            `Your confirmation code is ${code}\n\nEnter it shortly in the same browser/device that you used for your authentication request.\n\nIf you didn't request this email, there's nothing to worry about: you can safely ignore it.`,
    },
    es: {
        subject: "Su código de confirmación de Agora",
        text: (code) =>
            `Su código de confirmación es ${code}\n\nIntrodúzcalo pronto en el mismo navegador/dispositivo que utilizó para su solicitud de autenticación.\n\nSi no solicitó este correo electrónico, no se preocupe: puede ignorarlo con tranquilidad.`,
    },
    fr: {
        subject: "Votre code de confirmation Agora",
        text: (code) =>
            `Votre code de confirmation est ${code}\n\nSaisissez-le rapidement dans le même navigateur/appareil que celui utilisé pour votre demande d'authentification.\n\nSi vous n'avez pas demandé cet e-mail, ne vous inquiétez pas : vous pouvez l'ignorer en toute sécurité.`,
    },
    "zh-Hans": {
        subject: "您的 Agora 确认码",
        text: (code) =>
            `您的确认码是 ${code}\n\n请尽快在您发起身份验证请求的同一浏览器/设备上输入此确认码。\n\n如果您没有请求此邮件，无需担心，请放心忽略。`,
    },
    "zh-Hant": {
        subject: "您的 Agora 確認碼",
        text: (code) =>
            `您的確認碼是 ${code}\n\n請儘快在您發起身份驗證請求的同一瀏覽器/裝置上輸入此確認碼。\n\n如果您沒有請求此郵件，無需擔心，請放心忽略。`,
    },
    ja: {
        subject: "Agora 認証コード",
        text: (code) =>
            `認証コードは ${code} です\n\n認証リクエストを行ったブラウザ/デバイスで速やかにご入力ください。\n\nこのメールに心当たりがない場合は、無視していただいて問題ありません。`,
    },
    ar: {
        subject: "رمز التأکید شما در Agora",
        text: (code) =>
            `رمز التأکید شما ${code} است\n\nآن را به‌زودی در همان مرورگر/دستگاهی که برای درخواست احراز هویت استفاده کردید وارد کنید.\n\nاگر این ایمیل را درخواست نکرده‌اید، نگران نباشید: می‌توانید آن را نادیده بگیرید.`,
    },
    fa: {
        subject: "رمز تأیید شما در تراز",
        text: (code) =>
            `رمز تأیید شما ${code} است\n\nآن را به‌زودی در همان مرورگر/دستگاهی که برای درخواست احراز هویت استفاده کردید وارد کنید.\n\nاگر این ایمیل را درخواست نکرده‌اید، نگران نباشید: می‌توانید آن را نادیده بگیرید.`,
    },
    ky: {
        subject: "Agora тастыктоо кодуңуз",
        text: (code) =>
            `Тастыктоо кодуңуз ${code}\n\nАны аутентификация сурамыңызда колдонгон браузерге/түзмөккө тезирээк киргизиңиз.\n\nЭгер бул катты сиз сурабасаңыз, тынчсызданбаңыз: аны көңүл бурбай коюңуз.`,
    },
    ru: {
        subject: "Ваш код подтверждения Agora",
        text: (code) =>
            `Ваш код подтверждения: ${code}\n\nВведите его в том же браузере/устройстве, с которого вы отправили запрос на аутентификацию.\n\nЕсли вы не запрашивали это письмо, не беспокойтесь: просто проигнорируйте его.`,
    },
};

interface SendOtpEmailProps {
    email: string;
    otp: number;
    languageCode: SupportedDisplayLanguageCodes;
}

export async function sendOtpEmail({
    email,
    otp,
    languageCode,
}: SendOtpEmailProps): Promise<void> {
    const code = codeToString(otp);
    const translation = otpEmailTranslations[languageCode];
    await sendEmail({
        to: email,
        subject: translation.subject,
        text: translation.text(code),
    });
}
