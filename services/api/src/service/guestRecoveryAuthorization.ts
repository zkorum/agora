import { Dto } from "@/shared/types/dto.js";

/** Call only with facts from a signature-verified UCAN. */
export function authorizesGuestRecoveryTarget({
    facts,
    freshDidWrite,
}: {
    facts: readonly unknown[];
    freshDidWrite: string;
}): boolean {
    return facts.some((fact) => {
        const authorization =
            Dto.recoverGuestAccountAuthorization.safeParse(fact);
        return (
            authorization.success &&
            authorization.data.freshDidWrite === freshDidWrite
        );
    });
}
