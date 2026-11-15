import { dirname, isAbsolute, relative, resolve } from "node:path";

import { getStaticValue } from "@eslint-community/eslint-utils";
import { resolve as resolveImport } from "eslint-import-resolver-typescript";

const appRoot = resolve(import.meta.dirname, "..");
const sharedRoot = resolve(appRoot, "../shared/src");
const layers = new Set([
  "components",
  "ui",
  "logic",
  "state",
  "server",
  "assets",
]);
const assetFeatures = new Set(["shared", "landing", "agora"]);
const toolingPackages = [
  "storybook",
  "@storybook",
  "vitest",
  "@vitest",
  "playwright",
  "playwright-core",
  "@playwright",
  "@testing-library",
  "eslint",
  "@eslint",
  "@eslint-community",
  "@typescript-eslint",
  "typescript",
  "typescript-eslint",
  "svelte-eslint-parser",
];

/** @param {{ directory: string, file: string }} paths */
function contains({ directory, file }) {
  const path = portable(relative(directory, file));
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith("../"))
  );
}

/** @param {string} path */
function portable(path) {
  return path.replaceAll("\\", "/");
}

/** @param {string} specifier */
function isTooling(specifier) {
  return (
    toolingPackages.some(
      (name) => specifier === name || specifier.startsWith(`${name}/`),
    ) || /^eslint-(?:plugin|config|import-resolver)-/.test(specifier)
  );
}

/** @param {string} path */
function isDevelopmentFile(path) {
  const normalized = portable(path);
  return (
    /(^|\/)(?:stories|tests|[.]storybook|eslint)\//.test(normalized) ||
    /[.](?:test|spec|stories)[.]/.test(normalized)
  );
}

/** @param {string} file */
function location(file) {
  const path = portable(relative(resolve(appRoot, "src/lib"), file));
  const parts = path.split("/");
  const layer = parts.at(0);
  const feature = parts.at(1);
  if (layer === undefined || !layers.has(layer)) return undefined;
  // Assets also have content categories such as team/partners, not feature names.
  const featureFolder =
    feature !== undefined &&
    !feature.includes(".") &&
    (layer !== "assets" || assetFeatures.has(feature));
  return { layer, feature: featureFolder ? feature : undefined };
}

/** @param {{ specifier: string, filename: string }} input */
function resolveTarget({ specifier, filename }) {
  const result = resolveImport(specifier, filename, {
    project: resolve(appRoot, "tsconfig.json"),
  });
  if (result.found && result.path !== null) return result.path;
  // Unresolved relative paths still have an architectural destination. Resolution
  // errors are reported separately; this also covers a newly created test module.
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    return resolve(dirname(filename), specifier);
  }
  return undefined;
}

/** @type {import("eslint").Rule.RuleModule} */
const moduleBoundaries = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      tooling:
        "Production source must not depend on test, story or lint tooling, including local test modules.",
      bits: "Only UI wrappers may import Bits UI. Compose $ui/ components instead.",
      vue: "This app is Svelte-only; do not import Vue or Quasar integrations.",
      runed:
        "runed/kit is incompatible with Kit 3. Use supported Kit APIs directly.",
      crossApp:
        "Import only this app or canonical services/shared/src code, not another app or repository tooling.",
      layer:
        "{{from}} must not depend on {{to}}. Keep presentation, feature logic and pure logic in their own layers.",
      feature:
        "{{from}} must not depend on {{to}}. Promote genuinely reusable code to shared first.",
    },
  },
  create(context) {
    const filename = context.filename;
    const source = location(filename);
    const production =
      contains({ directory: resolve(appRoot, "src"), file: filename }) &&
      !/[.]test[.]ts$/.test(filename);
    /** @param {{ node: import("eslint").JSSyntaxElement, path: string }} input */
    function checkPackage({ node, path }) {
      if (production && (isTooling(path) || isDevelopmentFile(path))) {
        context.report({ node, messageId: "tooling" });
        return true;
      }
      if (
        ["vue", "vue-router", "quasar", "@quasar", "@vue"].some(
          (name) => path === name || path.startsWith(`${name}/`),
        )
      ) {
        context.report({ node, messageId: "vue" });
        return true;
      }
      if (path === "bits-ui" || path.startsWith("bits-ui/")) {
        if (production && source?.layer !== "ui")
          context.report({ node, messageId: "bits" });
        return true;
      }
      if (path === "runed/kit" || path.startsWith("runed/kit/")) {
        context.report({ node, messageId: "runed" });
        return true;
      }
      return false;
    }

    /** @param {{ node: import("eslint").JSSyntaxElement, specifier: string | undefined, glob?: boolean }} input */
    function check({ node, specifier, glob = false }) {
      if (specifier === undefined) return;
      const path = specifier.split("?")[0] ?? specifier;
      if (checkPackage({ node, path })) return;
      if (
        production &&
        source?.layer === "logic" &&
        /^\$app\/(?:navigation|state|forms|server)(?:\/|$)/.test(path)
      ) {
        context.report({
          node,
          messageId: "layer",
          data: { from: source.layer, to: path },
        });
        return;
      }

      const target = resolveTarget({
        specifier:
          glob && path.startsWith("/") ? resolve(appRoot, `.${path}`) : path,
        filename,
      });
      if (target === undefined) return;
      // Resolvers can turn aliases or relative paths into dependency files. Apply
      // the same package policy instead of trusting every node_modules target.
      const targetPath = portable(target);
      const dependency = targetPath.split("/node_modules/").at(-1);
      if (dependency !== targetPath && dependency !== undefined) {
        checkPackage({ node, path: dependency });
        return;
      }
      if (
        !contains({ directory: appRoot, file: target }) &&
        !contains({ directory: sharedRoot, file: target })
      ) {
        context.report({ node, messageId: "crossApp" });
        return;
      }
      if (!production) return;
      if (isDevelopmentFile(portable(relative(appRoot, target)))) {
        context.report({ node, messageId: "tooling" });
        return;
      }
      const destination = location(target);
      if (source === undefined) return;
      const routeTarget = contains({
        directory: resolve(appRoot, "src/routes"),
        file: target,
      });
      const upward =
        destination !== undefined &&
        ((source.layer === "ui" &&
          ["components", "server", "state"].includes(destination.layer)) ||
          (source.layer === "logic" && destination.layer !== "logic") ||
          (source.layer === "state" &&
            ["components", "ui", "server"].includes(destination.layer)) ||
          (source.layer === "components" && destination.layer === "server"));
      if (upward || routeTarget) {
        context.report({
          node,
          messageId: "layer",
          data: { from: source.layer, to: destination?.layer ?? "routes" },
        });
        return;
      }
      if (
        source.feature !== undefined &&
        destination?.feature !== undefined &&
        destination.feature !== "shared" &&
        source.feature !== destination.feature
      ) {
        context.report({
          node,
          messageId: "feature",
          data: { from: source.feature, to: destination.feature },
        });
      }
    }

    /** @param {Parameters<typeof getStaticValue>[0]} node */
    function staticSpecifier(node) {
      const result = getStaticValue(node, context.sourceCode.getScope(node));
      return result !== null && typeof result.value === "string"
        ? result.value
        : undefined;
    }

    return {
      ImportDeclaration(node) {
        check({ node, specifier: staticSpecifier(node.source) });
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null && node.source !== undefined)
          check({ node, specifier: staticSpecifier(node.source) });
      },
      ExportAllDeclaration(node) {
        check({ node, specifier: staticSpecifier(node.source) });
      },
      ImportExpression(node) {
        check({ node, specifier: staticSpecifier(node.source) });
      },
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.object.type !== "MetaProperty" ||
          callee.object.meta.name !== "import" ||
          callee.object.property.name !== "meta" ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "glob"
        )
          return;
        const argument = node.arguments.at(0);
        if (argument === undefined) return;
        const value = getStaticValue(
          argument,
          context.sourceCode.getScope(argument),
        );
        /** @type {unknown} */
        const patterns = value?.value;
        for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
          // Negative patterns remove files; they do not introduce dependencies.
          if (typeof pattern === "string" && !pattern.startsWith("!")) {
            check({ node: argument, specifier: pattern, glob: true });
          }
        }
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const noBarrelExports = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      barrel:
        "Import the defining module directly; do not create authored re-export barrels.",
    },
  },
  create(context) {
    /** @param {{ node: import("eslint").Rule.Node, name: string }} input */
    function checkBinding({ node, name }) {
      const variable = context.sourceCode.getScope(node).set.get(name);
      if (
        variable?.defs.some((definition) => definition.type === "ImportBinding")
      ) {
        context.report({ node, messageId: "barrel" });
      }
    }
    // Visit declarations directly: Program.body-only scans miss Svelte scripts.
    return {
      ExportAllDeclaration(node) {
        context.report({ node, messageId: "barrel" });
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null && node.source !== undefined) {
          context.report({ node, messageId: "barrel" });
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.local.type === "Identifier")
            checkBinding({ node, name: specifier.local.name });
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === "Identifier")
          checkBinding({ node, name: node.declaration.name });
      },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const noHtmlLintDirectives = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      directive:
        "Do not weaken lint rules inline. Fix the code or document a narrow exception in the ESLint configuration.",
    },
  },
  create(context) {
    return {
      /** @param {import("eslint").JSSyntaxElement} node */
      SvelteHTMLComment(node) {
        // ESLint's core visitor types do not include Svelte's HTML comment nodes.
        if (
          "value" in node &&
          typeof node.value === "string" &&
          /^\s*eslint(?:\s|-(?:disable|enable))/.test(node.value)
        ) {
          context.report({ node, messageId: "directive" });
        }
      },
    };
  },
};

export default {
  meta: { name: "agora-app-policy" },
  rules: {
    "module-boundaries": moduleBoundaries,
    "no-barrel-exports": noBarrelExports,
    "no-html-lint-directives": noHtmlLintDirectives,
  },
};
