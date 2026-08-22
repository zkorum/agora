import pino from "pino";
import { runtimeConfig } from "./config.js";

export const log = pino({
    name: "conversation-email-update-worker",
    level: runtimeConfig.logLevel,
});
