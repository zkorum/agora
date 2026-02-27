import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import { config, log } from "@/app.js";
import { codeToString } from "@/crypto.js";

// Lazy-initialized: only created when actually sending emails (production)
// This avoids crashing in development where SES is not configured
let transporter: nodemailer.Transporter | undefined;

function getTransporter(): nodemailer.Transporter {
    if (transporter === undefined) {
        const ses = new SESv2Client({
            region: config.AWS_SES_REGION,
        });
        transporter = nodemailer.createTransport({
            SES: { ses, aws: { SendEmailCommand } },
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
        from: config.EMAIL_FROM_ADDRESS,
        to,
        subject,
        text,
        html,
    });
    log.info("[Email] Email sent successfully");
}

interface SendOtpEmailProps {
    email: string;
    otp: number;
}

export async function sendOtpEmail({
    email,
    otp,
}: SendOtpEmailProps): Promise<void> {
    const code = codeToString(otp);
    await sendEmail({
        to: email,
        subject: `Agora confirmation code: ${code}`,
        text: `Your confirmation code is ${code}\n\nEnter it shortly in the same browser/device that you used for your authentication request.\n\nIf you didn't request this email, there's nothing to worry about: you can safely ignore it.`,
    });
}
