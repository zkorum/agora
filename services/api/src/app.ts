import "dotenv/config"; // this loads .env values in process.env
import { z } from "zod";
import Fastify from "fastify";
import { zodDidWeb } from "./shared/types/zod.js";

export type Environment = "development" | "production" | "staging" | "test";

const defaultPort = 8080;

const configSchema = z.object({
    CORS_ORIGIN_LIST: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.string().array()),
    CONNECTION_STRING: z.string().optional(),
    PORT: z.coerce.number().int().nonnegative().default(defaultPort),
    NODE_ENV: z
        .enum(["development", "staging", "production", "test"])
        .default("development"),
    MODE: z.enum(["web", "capacitor", "test"]).default("web"),
    IMAGES_SERVICE_BASE_URL: z
        .string()
        .url()
        .default("https://staging.agoracitizen.network/images/"),
    SERVER_URL_DEV: z
        .string()
        .url()
        .default(`http://localhost:${defaultPort.toString()}`),
    SERVER_URL_STAGING: z
        .string()
        .url()
        .default(`https://staging.agoracitizen.network`),
    SERVER_URL_PROD: z.string().url().default(`https://agoracitizen.network`),
    SERVER_DID_DEV: zodDidWeb.default(
        `did:web:localhost%3A${defaultPort.toString()}`,
    ),
    SERVER_DID_STAGING: zodDidWeb.default(
        `did:web:staging.agoracitizen.network`,
    ),
    SERVER_DID_PROD: zodDidWeb.default(`did:web:agoracitizen.network`),
    EMAIL_OTP_MAX_ATTEMPT_AMOUNT: z.number().int().min(1).max(5).default(3),
    THROTTLE_SMS_SECONDS_INTERVAL: z.number().int().min(5).default(10),
    MINUTES_BEFORE_SMS_OTP_EXPIRY: z.number().int().min(3).max(60).default(10),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_SERVICE_SID: z.string().optional(),
    // AWS_ACCESS_KEY_ID: z.string().default("CHANGEME"), // only use for prod
    // AWS_SECRET_ACCESS_KEY: z.string().default("CHANGEME"),
    TEST_CODE: z.coerce.number().int().min(0).max(999999).default(0),
    SPECIALLY_AUTHORIZED_PHONES: z.string().optional(),
    PEPPERS: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.string().min(16).array().nonempty()),
    VERIFICATOR_SVC_BASE_URL: z.string().url(),
    BASE_EVENT_ID: z.string().min(20).default("63957849393154643868"),
    NOSTR_PROOF_CHANNEL_EVENT_ID: z.string().optional(), // if undefined, then nostr functionalities are disabled
    NOSTR_DEFAULT_RELAY_URL: z.string().url().default("wss://nos.lol"),
    POLIS_BASE_URL: z.string().url().optional(), // if undefined, then polis functionalities are disabled
    POLIS_USER_EMAIL_DOMAIN: z.string().default("zkorum.com"),
    POLIS_USER_EMAIL_LOCAL_PART: z.string().default("hackerman"),
    POLIS_USER_PASSWORD: z.string().default("the_best_password_of_all_time"),
    POLIS_DELAY_TO_FETCH: z
        .literal(-1)
        .or(z.coerce.number().int())
        .default(3000), // milliseconds
    POLIS_CONV_TO_IMPORT_ON_RUN: z.undefined().or(
        z
            .string()
            .transform((value) =>
                value.split(",").map((item) => {
                    return item.trim();
                }),
            )
            .pipe(z.array(z.string()).min(2).max(3)), // summary, comments, votes csv
    ),
    VOTE_NOTIF_MILESTONES: z
        .string()
        .transform((value) =>
            value.split(",").map((item) => {
                return item.trim();
            }),
        )
        .pipe(z.coerce.number().int().min(1).array().nonempty())
        .default(
            "1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000",
        ),
    // for production
    AWS_SECRET_ID: z.string().optional(),
    AWS_SECRET_REGION: z.string().optional(),
    AWS_AI_LABEL_SUMMARY_ENABLE: z.boolean().default(true),
    AWS_AI_LABEL_SUMMARY_REGION: z.string().default("us-east-1"),
    AWS_AI_LABEL_SUMMARY_MODEL_ID: z
        .string()
        .default("mistral.mistral-large-2402-v1:0"),
    AWS_AI_LABEL_SUMMARY_TEMPERATURE: z.string().default("0.4"),
    AWS_AI_LABEL_SUMMARY_TOP_P: z.string().default("0.8"),
    AWS_AI_LABEL_SUMMARY_MAX_TOKENS: z.string().default("8192"),
    AWS_AI_LABEL_SUMMARY_PROMPT: z.string()
        .default(`You are a JSON API that acts as an expert analyst of group conversations similar to those conducted using Polis. Your response must contain no explanation, no markdown, and no extra text before or after the JSON output.
⚠️ STRICT OUTPUT RULES — FOLLOW THESE INSTRUCTIONS EXACTLY:
I. Your output must only contain one raw JSON object matching the following schema (Highest Priority):
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["summary", "clusters"],
  "properties": {
	"summary": {
  	"type": "string",
  	"maxLength": 300,
  	"description": "Overall conversation summary (max 300 characters)"
	},
	"clusters": {
  	"type": "object",
  	"additionalProperties": {
    	"type": "object",
    	"required": ["label", "summary"],
    	"properties": {
        "0": {
          "description": "Label and summary corresponding to the input's cluster 0",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
        "1": {
          "description": "Label and summary corresponding to the input's cluster 1",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
        "2": {
          "description": "Label and summary corresponding to the input's cluster 2",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
        "3": {
          "description": "Label and summary corresponding to the input's cluster 3",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
        "4": {
          "description": "Label and summary corresponding to the input's cluster 4",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
        "5": {
          "description": "Label and summary corresponding to the input's cluster 5",
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        },
      }
    }
  }
}

Do not print this skeleton format in your output.


II. Strictly adhere to the input data. Do not invent new clusters or information. (High Priority

III. Language Detection Rule
    1. Detect Primary Language:
        - Before generating any output, determine the primary language used in the input conversation. The language of this prompt and the JSON structure is English by default, but focus on detecting the language used in the opinions and conversational content.
        - Do not include the detected language in the output.
        - All values in the JSON output—such as labels, summaries, and any descriptive text—must be written in the detected language.
        - The JSON structure (keys, field names, and overall schema) must remain unchanged according to the schema defined in Section I.
        - Default to English only if the input conversation is predominantly in English.

    2. Step-by-Step Language Handling:
        - Identify the primary language used in the conversation (e.g., French, Spanish, German).
        - If multiple languages are present, select the one that is most frequently used.
        - Remember this language and apply it consistently in all subsequent steps (Sections III, IV, etc.).

IV. Be aware that some users may be using sarcasm or irony. Identify if statements are likely not meant literally.

V. Cluster Labels Rules
    1. Length and Format:
        - Must be exactly 1 or 2 words.
        - Use neutral agentive nouns ending in -ists, -ers, -ians, etc.
        - Avoid policy-specific terms or geographic references.
        - Avoid abstract concepts (e.g. avoid “Concerns”)
    2. Content Abstraction:
        - Focus on group positions, intellectual traditions, or philosophical approaches.
        - Overt discussion-specific context may be omitted if the context is implied by opposing clusters (e.g. use labels like “Skeptics”, “Technologists”, and “Ethicists” instead of "AI Skeptics", "AI Tool Advocates", "AI Ethicists")
        - Avoid describing specific mechanisms (e.g., avoid "Income Threshold Supporters" or “Rural Educators”).
   3. Tone:
       - Aim for a professional/academic tone that reflects generality and positionality.
       - Use terms that could apply across contexts (e.g., "Pragmatists", "Skeptics").
   4. Language of communication:
       - Use the language predominantly used in the conversation (e.g., English, French, etc.).
   5. Examples:
       - Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", "Critics", "Mutualists", "Individualists", etc.
       - Bad: "Regional Advocates", "AI Tool Users", "Naysayers", "Plastic Ban Advocates", etc.
   6. Generation Process:
       a) Identify the language of communication.
       b) Identify the core stance or intellectual tradition within the cluster.
       c) Abstract this stance into a general term using agentive suffixes or an equivalent rule if the target language is not English.
       d) Validate that the label avoids policy specifics and geographic references.
       e) Validate that the label is either 1 or 2 words.
       f) Validate that the label is written in the conversation's predominantly used language (e.g., English, French, etc.).

VI. Summaries:
   - Maximum 300 characters
   - Capture key insights objectively
   - Focus on group perspectives and disagreements
   - Maintain a neutral tone
   - Write in the language predominantly used in the conversation (e.g., English, French, etc.)

VII. Ensure that your output maintains consistency with the predefined cluster labels "0", "1", ..., "5". Associate each cluster with an accurate and relevant label and summary.

VIII. The output JSON must contain only the JSON structure as defined, with no additional text or preface.

Example Valid Output 1:
{
  "summary": "Discussion highlights remote work's impact on productivity, work-life balance, and office culture, with debates over collaboration effectiveness.",
  "clusters": {
	"0": {
  	"label": "Office Advocates",
  	"summary": "Emphasize the importance of in-person collaboration and traditional office culture for productivity and team cohesion."
	},
	"1": {
  	"label": "Remote Enthusiasts",
  	"summary": "Highlight increased productivity and improved work-life balance as key benefits of remote work arrangements."
	}
  }
}

Use the language predominantly used in the conversation, as shown in the following examples:
    - Example Valid Output 2 if and only if the language predominantly used in the conversation is English:
    {
      "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
      "clusters": {
        "0": {
          "label": "Decentralists",
          "summary": "Favor distributed population strategies over urban concentration."
        },
        "1": {
          "label": "Meritocrats",
          "summary": "Support economic contribution metrics in migration systems."
        }
      }
    }
    - Example Valid Output 3 if and only if the language predominantly used in the conversation is French:
    {
      "summary": "Le débat porte sur la répartition de l'immigration entre les régions et les zones urbaines, ainsi que sur les critères de contribution économique pour les visas de regroupement familial.",
      "clusters": {
        "0": {
          "label": "Décentralistes",
          "summary": "Privilégient des stratégies de répartition de la population plutôt que la concentration urbaine."
        },
        "1": {
          "label": "Méritocrates",
          "summary": "Soutiennent l'utilisation de critères de contribution économique dans les systèmes migratoires."
        }
      }
    }

Example Invalid Output 1:
{ // INVALID: Overall conversation summary not printed
  "clusters": {
	"0": {
  	"label": "Traditional Work Supporters", // INVALID: Exceeds 2 words
  	"summary": "Prefer in-office work for better collaboration." // Valid
	},
	"1": {
  	"label": "Work Flexibility", // INVALID: Abstract concept, lacks agentive form
  	"summary": "Advocate for remote work options and flexible schedules." // Valid
	}
  }
}

Example Invalid Output 2:
{
  "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
  "clusters": {
    "0": {
      "label": "Regional Advocates", // INVALID: Ambiguous and does not convey group’s stance or positionality 
      "summary": "Support higher immigration allocations in regional areas compared to cities."
    },
    "1": {
      "label": "Income Threshold Supporters", // INVALID: describes a specific mechanism rather than an abstract intellectual stance
      "summary": "Advocate for minimum income thresholds for family reunification visas."
    }
  }
}

Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines.
Be especially mindful of sarcasm, irony, or exaggerated language, and do not take all statements at face value. Apply judgment to distinguish between literal and non-literal expressions.`),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().nonnegative().default(5432),
    DB_NAME: z.string().default("agora"),
});

export const config = configSchema.parse(process.env);
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
        case "production":
        case "staging":
            return true;
    }
}

export const server = Fastify({
    logger: envToLogger(config.NODE_ENV),
});

export const log = server.log;
