# Agora (@zkorum/agora-app)

## Prepare the dependencies

### (Optional) NVM

Install [nvm](https://github.com/nvm-sh/nvm).

### NPM

Install npm LTS using `nvm install lts/*` and make this default.

### Yarn

Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable).

### Install dependencies

Then cd to this root directy and install the dependencies:

```bash
yarn
```

This will also run `prepare`, so you can start using your IDE.

## Start the app in development mode (hot-code reloading, error reporting, etc.)

Remember to first load the environment files in `.env` file by running `. ./.env`.
There is an example file `env.example` which can be used as the reference.

```bash
cp env.example .env
# modify .env
. ./.env
yarn dev
```

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
