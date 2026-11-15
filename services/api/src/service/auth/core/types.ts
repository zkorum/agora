import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";

export type AuthResult =
    | { readonly type: "restore_deleted"; readonly userId: string }
    | { readonly type: "register"; readonly userId: string }
    | { readonly type: "login_known_device"; readonly userId: string }
    | { readonly type: "login_new_device"; readonly userId: string }
    | {
          readonly type: "merge";
          readonly toUserId: string;
          readonly fromUserId: string;
      }
    | {
          readonly type: "associated_with_another_user";
          readonly userId: string;
      };

export type DeviceStatus =
    | Pick<
          Extract<DeviceLoginStatusExtended, { isKnown: false }>,
          "isKnown" | "isRegistered" | "isLoggedIn"
      >
    | Pick<
          Extract<DeviceLoginStatusExtended, { isKnown: true }>,
          "isKnown" | "isRegistered" | "isLoggedIn" | "userId"
      >;
