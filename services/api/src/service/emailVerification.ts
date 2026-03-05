import type { AxiosInstance } from "axios";
import { z } from "zod";
import { log } from "@/app.js";

const zodReacherIsReachable = z.enum(["safe", "risky", "invalid", "unknown"]);
export type ReacherIsReachable = z.infer<typeof zodReacherIsReachable>;

const zodReacherResponse = z.looseObject({
    input: z.string(),
    is_reachable: zodReacherIsReachable,
    misc: z.object({
        is_disposable: z.boolean(),
    }),
});

type EmailDeliverabilityResult =
    | { deliverable: true; isReachable: ReacherIsReachable | null }
    | {
          deliverable: false;
          isReachable: ReacherIsReachable;
          reason: "unreachable" | "disposable";
      };

interface CheckEmailDeliverabilityParams {
    axiosReacher: AxiosInstance;
    email: string;
}

export async function checkEmailDeliverability({
    axiosReacher,
    email,
}: CheckEmailDeliverabilityParams): Promise<EmailDeliverabilityResult> {
    try {
        const response = await axiosReacher.post(
            "/v0/check_email",
            { to_email: email },
            { timeout: 5_000 },
        );
        const parsed = zodReacherResponse.parse(response.data);
        if (parsed.is_reachable === "invalid") {
            return {
                deliverable: false,
                isReachable: "invalid",
                reason: "unreachable",
            };
        }
        if (parsed.misc.is_disposable) {
            return {
                deliverable: false,
                isReachable: parsed.is_reachable,
                reason: "disposable",
            };
        }
        return {
            deliverable: true,
            isReachable: parsed.is_reachable,
        };
    } catch (error) {
        log.warn(
            error,
            `[Email Verification] Reacher check failed for email, proceeding without verification (fail-open)`,
        );
        return {
            deliverable: true,
            isReachable: null,
        };
    }
}
