import "dotenv/config";
import pino from "pino";
import { config } from "./config.js";

export type Environment = "development" | "production" | "staging" | "test";

function envToLogger(env: Environment) {
    switch (env) {
        case "development":
        case "test":
            return {
                transport: {
                    target: "pino-pretty",
                    options: {
                        translateTime: "HH:MM:ss Z",
                        ignore: "pid,hostname",
                    },
                },
            };
        case "staging":
        case "production":
            return {};
    }
}

export const log = pino(envToLogger(config.NODE_ENV));
