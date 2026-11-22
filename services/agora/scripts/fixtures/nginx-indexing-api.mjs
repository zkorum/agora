// @ts-check
import { createServer } from "node:http";

/** @typedef {{ status: number, policy: string | string[] | undefined }} PolicyResponse */
/** @type {Map<string, PolicyResponse>} */
const policies = new Map([
  ["listed", { status: 200, policy: "index" }],
  ["empty", { status: 200, policy: undefined }],
  ["invalid", { status: 200, policy: "unexpected" }],
  ["upper", { status: 200, policy: "INDEX" }],
  ["mixed", { status: 200, policy: "Index" }],
  ["duplicate", { status: 200, policy: ["index", "index"] }],
  ["conflict", { status: 200, policy: ["index", "noindex"] }],
  ["failed", { status: 503, policy: undefined }],
  ["badstatus", { status: 503, policy: "index" }],
  ["unauth", { status: 401, policy: "index" }],
  ["forbidden", { status: 403, policy: "index" }],
  ["notfound", { status: 404, policy: "index" }],
  ["redirect", { status: 302, policy: "index" }],
  ["created", { status: 201, policy: "index" }],
  ["nocontent", { status: 204, policy: "index" }],
]);

/** @type {{ slug: string, authorization: boolean, cookie: boolean, policyHeader: boolean }[]} */
const observations = [];

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/observations") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(observations));
    return;
  }
  const isProject = request.url === "/api/v1/project/indexing";
  if (
    request.method !== "POST" ||
    (!isProject && request.url !== "/api/v1/conversation/indexing") ||
    request.headers["content-type"] !== "application/json"
  ) {
    response.writeHead(400).end();
    return;
  }

  let body = "";
  for await (const chunk of request) body += chunk;
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (typeof parsed !== "object" || parsed === null) {
    response.writeHead(400).end();
    return;
  }
  const slug = isProject
    ? "projectSlug" in parsed
      ? parsed.projectSlug
      : undefined
    : "conversationSlugId" in parsed
      ? parsed.conversationSlugId
      : undefined;
  if (typeof slug !== "string") {
    response.writeHead(400).end();
    return;
  }

  const policyHeader = isProject
    ? "X-Project-Indexing"
    : "X-Conversation-Indexing";
  const observation = {
    slug,
    authorization: request.headers.authorization !== undefined,
    cookie: request.headers.cookie !== undefined,
    policyHeader: request.headers[policyHeader.toLowerCase()] !== undefined,
  };
  observations.push(observation);
  if (
    observation.authorization ||
    observation.cookie ||
    observation.policyHeader
  ) {
    response.writeHead(400).end();
    return;
  }

  if (slug === "slow") {
    setTimeout(() => {
      if (response.destroyed) return;
      response.setHeader(policyHeader, "index");
      response.writeHead(200).end("{}");
    }, 2000);
    return;
  }

  const { status, policy } = policies.get(slug) ?? {
    status: 200,
    policy: "noindex",
  };
  if (policy !== undefined) response.setHeader(policyHeader, policy);
  if (status === 302) response.setHeader("Location", "/unexpected");
  if (status === 401)
    response.setHeader("WWW-Authenticate", 'Basic realm="mock"');
  response.writeHead(status).end("{}");
});

server.listen(8080, "0.0.0.0");
process.once("SIGTERM", () => {
  server.close();
  server.closeAllConnections();
});
