import { z } from "zod";
import { projectOrganizationAttributionRoleValues } from "../types/project.js";

export const zodConversationEmailExample = z.discriminatedUnion("fixture", [
    z
        .object({
            fixture: z.literal("project"),
            backgroundPicture: z.boolean().optional(),
            attributions: z
                .array(z.enum(projectOrganizationAttributionRoleValues))
                .max(3)
                .refine((roles) => new Set(roles).size === roles.length)
                .optional(),
            attributionLogos: z.boolean().optional(),
        })
        .strict(),
    z
        .object({
            fixture: z.literal("organization"),
            organizationLogo: z.boolean().optional(),
        })
        .strict(),
    z.object({ fixture: z.literal("personal") }).strict(),
]);

export type ConversationEmailExample = z.infer<
    typeof zodConversationEmailExample
>;

export const conversationEmailExampleNames = {
    project: "Amplify: Civil Society Collaboration",
    organization: "Civic Union",
    personal: "Alex Citizen",
};

export const conversationEmailExampleConversations = [
    { id: "demo0001", title: "Choose the river restoration plan" },
    { id: "demo0002", title: "Prioritize the new park design" },
    { id: "demo0003", title: "Improve public transport connections" },
    { id: "demo0004", title: "Create safer walking routes to school" },
    { id: "demo0005", title: "Make housing more affordable" },
    { id: "demo0006", title: "Support local shops and markets" },
    { id: "demo0007", title: "Expand access to community health services" },
    { id: "demo0008", title: "Design activities for young people" },
    { id: "demo0009", title: "Protect green spaces and local wildlife" },
    { id: "demo0010", title: "Reduce waste and improve recycling" },
    { id: "demo0011", title: "Plan the community library's next chapter" },
    { id: "demo0012", title: "Prepare our neighborhoods for extreme weather" },
    { id: "demo0013", title: "Make public buildings accessible to everyone" },
    { id: "demo0014", title: "Strengthen support for older residents" },
    { id: "demo0015", title: "Celebrate local arts, culture and heritage" },
    { id: "demo0016", title: "Build a connected network of cycling routes" },
    { id: "demo0017", title: "Help residents develop digital skills" },
    { id: "demo0018", title: "Choose priorities for the participatory budget" },
    { id: "demo0019", title: "Welcome new residents into community life" },
    {
        id: "demo0020",
        title: "How can residents and local organizations work together to turn these priorities into lasting improvements?",
    },
] as const;
