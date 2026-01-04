# Agora (@zkorum/agora-app)

## Prepare the dependencies

### NPM

Recommended: Install [nvm](https://github.com/nvm-sh/nvm) and install npm LTS using `nvm install lts/*` and make this default.

Or follow [npm documentation](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)

### Install dependencies

Then cd to this root directy and install the dependencies:

```bash
pnpm install
```

### Prepare for IDE work

Run:

```bash
pnpm prepare
```

## Environment Variables

### Setup

The project uses separate environment files for different build modes:

- `.env.dev` - Development configuration (automatically loaded by `pnpm dev`)
- `.env.staging` - Staging configuration (must include `VITE_STAGING=true`)
- `.env.production` - Production configuration (must include `VITE_STAGING=false`)

Copy `env.example` to create your local environment files:

```bash
cp env.example .env.dev
```

Edit the files with your configuration values. Environment variables are accessed via the typed `processEnv` export, which wraps `import.meta.env` at runtime.

**Build Process**:
- Development: `pnpm dev` automatically loads `.env.dev` via Quasar/Vite
- Production builds: `pnpm build:staging` and `pnpm build:production` use `env-cmd` to load the appropriate env file before building

We use `env-cmd` because:
- Quasar has no built-in support for staging environments (only dev/production)
- It's consistent with Docker environments
- It ensures all variables (including `VITE_STAGING`) are available when `quasar.config.ts` evaluates

### Validation System

Environment variables are validated using a multi-layer approach:

1. **Schema Definition** ([src/utils/processEnv.ts](src/utils/processEnv.ts)):
   - Single source of truth using zod schema
   - Defines required vs optional variables with types and descriptions
   - Includes production safety checks (e.g., dev-only variables must not be set in production)

2. **TypeScript Types** ([src/env.d.ts](src/env.d.ts)):
   - Types automatically derived from zod schema using `z.infer<typeof envSchema>`
   - Provides IDE autocomplete and compile-time type checking

3. **Build-Time Validation** (custom Vite plugin in [quasar.config.ts](quasar.config.ts)):
   - Runs during `pnpm dev` / `pnpm build` before app starts
   - Calls `validateEnv()` function during Vite's config phase
   - **Build fails immediately** if validation fails (missing/invalid variables)
   - Env object generated dynamically from schema keys (line 247-249)

4. **Runtime Access** ([src/utils/processEnv.ts](src/utils/processEnv.ts)):
   - Exported `processEnv` object casts `import.meta.env` to `ProcessEnv` type
   - Provides typed access to environment variables in browser runtime
   - No validation at import time (validation already completed at build time)

For full documentation including variable descriptions and validation rules, see [src/utils/processEnv.ts](src/utils/processEnv.ts).

## Start the app in development mode (hot-code reloading, error reporting, etc.)

Start the app with:
`pnpm dev` in the `services/agora` directory or running `make dev-app` at the root of this project.

## Logos

Currently we are not bundling company logos in the source code due to copyright.
Please add them manually to the following folder:

`public/development/logos`

## Capacitor Build

New builds have the following requirements:

- Version number to be updated in the `build.gradle` file for the app module
- The signed bundle needs to be a release build instead of a debug build

```
quasar dev -m capacitor -T android
quasar dev -m capacitor -T ios
```

## Lint the files

```bash
pnpm lint
```

## Format the files

```bash
pnpm format
```

## Build the app for production

```bash
quasar build
```

## Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## Icon Genie Bootstrap Commands

Generate the json configuration file:

`icongenie profile  --output icongenie-profile-png.json --assets spa,capacitor --icon ./icongenie/appIcon.png --theme-color 090f53 --filter png --background ./icongenie/splash-background.png`

`icongenie profile  --output icongenie-profile-splashscreen.json --assets spa,capacitor --icon ./icongenie/splash-set.png --theme-color 090f53 --filter splashscreen --background ./icongenie/splash-background.png`

Generate the actual icons:

`icongenie generate -p ./icongenie-profile-png.json`

`icongenie generate -p ./icongenie-profile-splashscreen.json`

## License

See [COPYING](./COPYING)

## Country Flags

MIT - [https://gitlab.com/catamphetamine/country-flag-icons/](https://gitlab.com/catamphetamine/country-flag-icons/)
