import { z } from "zod";

const governanceConstraint = z.enum([
    "organization_active_admin_required",
    "project_active_owner_required",
]);
export type GovernanceConstraint = z.infer<typeof governanceConstraint>;

export function getGovernanceConstraint(
    error: unknown,
): GovernanceConstraint | undefined {
    const parsed = z
        .object({
            code: z.literal("23514"),
            constraint_name: governanceConstraint,
        })
        .safeParse(error);
    if (parsed.success) return parsed.data.constraint_name;
    const wrapped = z.object({ cause: z.unknown() }).safeParse(error);
    if (
        wrapped.success &&
        wrapped.data.cause !== error &&
        wrapped.data.cause !== undefined
    ) {
        return getGovernanceConstraint(wrapped.data.cause);
    }
    return undefined;
}
