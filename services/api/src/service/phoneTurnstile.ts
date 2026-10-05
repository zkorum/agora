import { z } from "zod";

const SITEVERIFY_URL =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const PHONE_ACTION = "phone_sms";
const siteverifyResponse = z.object({
    success: z.boolean(),
    hostname: z.string().optional(),
    action: z.string().optional(),
});
const tokenSchema = z.string().min(1).max(2048);

export function createPhoneTurnstileVerifier({
    secretKey,
    allowedHostnames,
    fetchSiteverify = fetch,
    log,
}: {
    secretKey: string;
    allowedHostnames: readonly string[];
    fetchSiteverify?: typeof fetch;
    log: Pick<Console, "warn">;
}) {
    const verify = async (rawToken: unknown): Promise<boolean> => {
        const token = tokenSchema.safeParse(rawToken);
        if (!token.success) return false;

        try {
            const response = await fetchSiteverify(SITEVERIFY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    secret: secretKey,
                    response: token.data,
                }),
                signal: AbortSignal.timeout(4000),
            });
            if (!response.ok) {
                log.warn("[Phone Turnstile] Siteverify returned an error");
                return false;
            }
            const parsed = siteverifyResponse.safeParse(await response.json());
            return (
                parsed.success &&
                parsed.data.success &&
                parsed.data.action === PHONE_ACTION &&
                parsed.data.hostname !== undefined &&
                allowedHostnames.includes(parsed.data.hostname)
            );
        } catch (error) {
            log.warn(error, "[Phone Turnstile] Siteverify failed");
            return false;
        }
    };

    return { verify };
}
