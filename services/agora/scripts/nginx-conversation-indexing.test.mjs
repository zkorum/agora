// @ts-check
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

import { z } from "zod";

const shell = "conversation shell";
/** @type {readonly ("GET" | "HEAD")[]} */
const methods = ["GET", "HEAD"];
const upstreamLine = 'set $indexing_api "http://api:8080";';
const nginxConfig = readFileSync(
  new URL("../nginx.conf", import.meta.url),
  "utf8"
);
assert.ok(
  nginxConfig.includes(upstreamLine),
  "test replaces the configured API origin"
);

/** @typedef {"index" | "noindex"} Policy */

/** @param {readonly string[]} args */
function docker(args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    timeout: 30_000,
  }).trim();
}

/** @param {{ baseUrl: string, path: string, method?: "GET" | "HEAD", headers?: HeadersInit }} options */
async function fetchShell({ baseUrl, path, method = "GET", headers }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    robots: response.headers.get("x-robots-tag"),
    cacheControl: response.headers.get("cache-control"),
    contentType: response.headers.get("content-type"),
    authenticate: response.headers.get("www-authenticate"),
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

/** @param {{ response: Awaited<ReturnType<typeof fetchShell>>, policy: Policy, path: string, method?: "GET" | "HEAD" }} options */
function assertShell({ response, policy, path, method = "GET" }) {
  assert.equal(response.status, 200, path);
  assert.equal(
    response.robots,
    policy === "index" ? null : "noindex, nofollow",
    path
  );
  assert.match(response.cacheControl ?? "", /no-store/, path);
  assert.match(response.contentType ?? "", /text\/html/, path);
  assert.equal(response.authenticate, null, path);
  assert.equal(response.location, null, path);
  assert.equal(response.body, method === "HEAD" ? "" : shell, path);
}

/** @param {{ baseUrl: string, path: string, policy: Policy }} options */
async function waitForShell({ baseUrl, path, policy }) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      assertShell({
        response: await fetchShell({ baseUrl, path }),
        policy,
        path,
      });
      return;
    } catch (error) {
      if (attempt === 49) throw error;
    }
    await sleep(100);
  }
}

const observationsSchema = z.array(
  z.strictObject({
    slug: z.string(),
    authorization: z.boolean(),
    cookie: z.boolean(),
    policyHeader: z.boolean(),
  })
);

test(
  "nginx serves conversation shells and fails closed for indexing",
  {
    timeout: 120_000,
  },
  async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "agora-indexing-"));
    const network = `agora-indexing-${process.pid}`;
    const apiName = `${network}-api`;
    const nginxName = `${network}-nginx`;

    function startApi() {
      docker([
        "run",
        "--detach",
        "--rm",
        "--name",
        apiName,
        "--network",
        network,
        "--volume",
        `${directory}:/fixtures:ro`,
        "node:26.13.1-alpine",
        "node",
        "/fixtures/api.mjs",
      ]);
    }

    try {
      writeFileSync(join(directory, "index.html"), shell);
      copyFileSync(
        new URL("./fixtures/nginx-indexing-api.mjs", import.meta.url),
        join(directory, "api.mjs")
      );
      docker(["network", "create", network]);
      startApi();
      const apiAddress = docker([
        "inspect",
        "--format",
        "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
        apiName,
      ]);
      // Only the origin changes: Docker and Podman use different internal DNS resolvers.
      const config = nginxConfig.replace(
        upstreamLine,
        `set $indexing_api "http://${apiAddress}:8080";`
      );
      writeFileSync(join(directory, "nginx.conf"), config);
      docker([
        "run",
        "--detach",
        "--rm",
        "--name",
        nginxName,
        "--network",
        network,
        "--publish",
        "127.0.0.1::80",
        "--volume",
        `${directory}/nginx.conf:/etc/nginx/conf.d/default.conf:ro`,
        "--volume",
        `${directory}/index.html:/usr/share/nginx/html/index.html:ro`,
        "nginx:stable-alpine",
      ]);
      const baseUrl = `http://${docker(["port", nginxName, "80/tcp"])}`;
      await waitForShell({
        baseUrl,
        path: "/conversation/listed",
        policy: "index",
      });

      await t.test(
        "exact policies and failures across all conversation route families",
        async () => {
          for (const slug of [
            "listed",
            "unlisted",
            "missing",
            "empty",
            "invalid",
            "upper",
            "mixed",
            "duplicate",
            "conflict",
            "failed",
            "badstatus",
            "unauth",
            "forbidden",
            "notfound",
            "redirect",
            "created",
            "nocontent",
          ]) {
            for (const path of [
              `/conversation/${slug}`,
              `/conversation/${slug}/?opinion=statement`,
              `/conversation/${slug}/analysis`,
              `/conversation/${slug}/embed`,
              `/conversation/${slug}/embed/analysis`,
              `/conversation/${slug}/onboarding/verify/email`,
              `/conversation/${slug}/edit`,
              `/project/test/conversation/${slug}/analysis`,
              `/project/test/conversation/${slug}/onboarding/summary`,
              `/CONVERSATION/${slug}/ANALYSIS`,
              `/PROJECT/test/CONVERSATION/${slug}/ANALYSIS`,
            ]) {
              assertShell({
                response: await fetchShell({ baseUrl, path }),
                policy: slug === "listed" ? "index" : "noindex",
                path,
              });
            }
          }
        }
      );

      await t.test(
        "HEAD and authentication failures return only the static shell",
        async () => {
          for (const slug of [
            "listed",
            "unlisted",
            "failed",
            "unauth",
            "forbidden",
          ]) {
            for (const method of methods) {
              const path = `/conversation/${slug}`;
              assertShell({
                response: await fetchShell({ baseUrl, path, method }),
                policy: slug === "listed" ? "index" : "noindex",
                path,
                method,
              });
            }
          }
        }
      );

      await t.test(
        "client policy headers and credentials do not reach the lookup",
        async () => {
          for (const slug of ["listed", "unlisted"]) {
            const path = `/conversation/${slug}`;
            const response = await fetchShell({
              baseUrl,
              path,
              headers: {
                "X-Conversation-Indexing": "index",
                Authorization: "Bearer user-session",
                Cookie: "session=user-session",
              },
            });
            assertShell({
              response,
              policy: slug === "listed" ? "index" : "noindex",
              path,
            });
          }
          const output = docker([
            "exec",
            apiName,
            "node",
            "--input-type=module",
            "-e",
            `
        const response = await fetch("http://127.0.0.1:8080/observations", { method: "POST" });
        if (!response.ok) throw new Error("Cannot read mock observations");
        process.stdout.write(await response.text());
      `,
          ]);
          /** @type {unknown} */
          const raw = JSON.parse(output);
          const observations = observationsSchema.parse(raw);
          assert.ok(observations.length > 0);
          assert.ok(
            observations.every(
              ({ authorization, cookie, policyHeader }) =>
                !authorization && !cookie && !policyHeader
            )
          );
        }
      );

      await t.test(
        "encoded paths preserve policy and slug case; lookup remains internal",
        async () => {
          for (const path of [
            "/conversation/%75nlisted/analysis",
            "/CONVERSATION/Listed",
          ]) {
            assertShell({
              response: await fetchShell({ baseUrl, path }),
              policy: "noindex",
              path,
            });
          }
          const internal = await fetchShell({
            baseUrl,
            path: "/_conversation-indexing",
          });
          assert.equal(internal.status, 404);
        }
      );

      await t.test(
        "slow responses fall back after the response-read timeout",
        async () => {
          const path = "/conversation/slow";
          assertShell({
            response: await fetchShell({ baseUrl, path }),
            policy: "noindex",
            path,
          });
        }
      );

      await t.test(
        "API outages recover without restarting the frontend",
        async () => {
          docker(["pause", apiName]);
          const path = "/conversation/listed";
          assertShell({
            response: await fetchShell({ baseUrl, path }),
            policy: "noindex",
            path,
          });
          docker(["unpause", apiName]);
          await waitForShell({ baseUrl, path, policy: "index" });
          docker(["stop", "--time", "2", apiName]);
          assertShell({
            response: await fetchShell({ baseUrl, path }),
            policy: "noindex",
            path,
          });
        }
      );

      await t.test(
        "frontend starts and serves HTML with unavailable API DNS",
        async () => {
          writeFileSync(
            join(directory, "nginx.conf"),
            nginxConfig.replace(
              upstreamLine,
              'set $indexing_api "http://unavailable.invalid:8080";'
            )
          );
          docker(["restart", "--time", "2", nginxName]);
          await waitForShell({ baseUrl, path: "/", policy: "index" });
          const path = "/conversation/listed";
          assertShell({
            response: await fetchShell({ baseUrl, path }),
            policy: "noindex",
            path,
          });
        }
      );

      await t.test(
        "fallback does not disguise a missing frontend artifact as success",
        async () => {
          unlinkSync(join(directory, "index.html"));
          const response = await fetchShell({
            baseUrl,
            path: "/conversation/listed",
          });
          assert.equal(response.status, 404);
          assert.equal(response.robots, "noindex, nofollow");
          assert.notEqual(response.body, shell);
        }
      );
    } finally {
      try {
        const containers = new Set(
          docker(["ps", "--all", "--format", "{{.Names}}"]).split("\n")
        );
        for (const name of [nginxName, apiName]) {
          if (containers.has(name)) docker(["rm", "--force", name]);
        }
        const networks = new Set(
          docker(["network", "ls", "--format", "{{.Name}}"]).split("\n")
        );
        if (networks.has(network)) docker(["network", "rm", network]);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  }
);
