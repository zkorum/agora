/**
 * ESM Loader to fix import issues in @pcd packages and dependencies
 *
 * Fixes multiple ESM compatibility issues:
 * 1. @pcd/gpc uses CommonJS-style lodash imports without .js extension
 * 2. @pcd/gpcircuits imports JSON without import assertions
 * 3. blakejs package has broken named exports in ESM mode
 *
 * Note: This loader is only used in production (node --loader).
 * Development (tsx) handles these issues automatically.
 */

export async function resolve(specifier, context, nextResolve) {
  // Fix lodash imports from @pcd/gpc package
  if (specifier.startsWith('lodash/') && !specifier.endsWith('.js')) {
    // Check if this import is coming from @pcd/gpc
    if (context.parentURL && context.parentURL.includes('@pcd/gpc')) {
      const fixedSpecifier = `${specifier}.js`;
      console.log(`[ESM Loader] Rewriting lodash import: ${specifier} -> ${fixedSpecifier}`);
      return nextResolve(fixedSpecifier, context);
    }
  }

  // Add import assertion for JSON files from @pcd packages
  if (specifier.endsWith('.json') && context.parentURL) {
    if (context.parentURL.includes('@pcd/')) {
      console.log(`[ESM Loader] Adding JSON import assertion in resolve: ${specifier}`);

      const result = await nextResolve(specifier, context);

      // Ensure importAttributes is set
      return {
        ...result,
        importAttributes: { type: 'json' },
        format: 'json'
      };
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Force JSON format for .json files from @pcd packages
  if (url.endsWith('.json') && url.includes('@pcd/')) {
    console.log(`[ESM Loader] Loading JSON file: ${url}`);

    // Ensure format is set to 'json'
    const result = await nextLoad(url, {
      ...context,
      format: 'json',
      importAttributes: { type: 'json' }
    });

    return {
      ...result,
      format: 'json'
    };
  }

  // Fix blakejs named exports issue
  // The blakejs package is CommonJS-only, but @zk-kit/eddsa-poseidon tries to use named imports
  // We need to transform the importing module's source code to use default import + destructuring
  if (url.includes('@zk-kit/eddsa-poseidon') && url.includes('node_modules')) {
    console.log(`[ESM Loader] Patching @zk-kit/eddsa-poseidon to fix blakejs imports`);

    const result = await nextLoad(url, context);

    if (result.source) {
      let source = typeof result.source === 'string'
        ? result.source
        : new TextDecoder().decode(result.source);

      // Replace named imports from blakejs with default import + destructuring
      // From: import { blake2bInit, blake2bUpdate, blake2bFinal } from 'blakejs';
      // To:   import blakejs from 'blakejs'; const { blake2bInit, blake2bUpdate, blake2bFinal } = blakejs;
      const blakejsImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]blakejs['"]\s*;/g;

      source = source.replace(blakejsImportRegex, (match, namedImports) => {
        const imports = namedImports.trim();
        return `import blakejs from 'blakejs'; const { ${imports} } = blakejs;`;
      });

      return {
        format: result.format || 'module',
        shortCircuit: true,
        source
      };
    }
  }

  return nextLoad(url, context);
}
