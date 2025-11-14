# Agora (@zkorum/agora-app)

## Prepare the dependencies

### NPM

Recommended: Install [nvm](https://github.com/nvm-sh/nvm) and install npm LTS using `nvm install lts/*` and make this default.

Or follow [npm documentation](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)

### Yarn

Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

### Install dependencies

Then cd to this root directy and install the dependencies:

```bash
yarn
```

### Prepare for IDE work

Run:

```bash
yarn prepare
```

## Environment Variables

### Setup

The project uses separate environment files for different build modes:

- `.env.dev` - Development configuration (used by `yarn dev`)
- `.env.staging` - Staging configuration (production build with `VITE_STAGING=true`)
- `.env.production` - Production configuration

Copy `env.example` to create your local environment files:

```bash
cp env.example .env.dev
```

Edit the files with your configuration values. Quasar uses `process.env` (not `import.meta.env`) to access environment variables.

**Build Process**: The build scripts (`yarn build:staging` / `yarn build:production`) copy the appropriate env file to `.env.local.prod` before building, which Quasar automatically loads during production builds. The temporary file is cleaned up after the build completes.

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
   - Runs during `yarn dev` / `yarn build` before app starts
   - Calls `validateEnv()` function during Vite's config phase
   - **Build fails immediately** if validation fails (missing/invalid variables)

4. **Runtime Validation** ([src/utils/processEnv.ts](src/utils/processEnv.ts) module load):
   - Additional safety check that runs when app code first imports `processEnv`
   - Ensures env vars are valid even if build-time check was somehow bypassed

For full documentation including variable descriptions and validation rules, see [src/utils/processEnv.ts](src/utils/processEnv.ts).

## Start the app in development mode (hot-code reloading, error reporting, etc.)

Start the app with:
`yarn dev` in the `services/agora` directory or running `make dev-app` at the root of this project.

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
yarn lint
```

## Format the files

```bash
yarn format
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
