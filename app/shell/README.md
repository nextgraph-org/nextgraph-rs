# NextGraph apps (Linux, MacOS, Windows, Android, iOS, web)

All the apps are based on Svelte and share the same code.

The native apps are using the Tauri framework with an embedded WebView to render the Svelte app.

> The NextGraph app is undergoing a heavy refactor. This folder is almost empty at the moment. In order to compile the previous version of the app, go to the [refactor-wallet branch](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/refactor-wallet/ng-app). When the new refactor with Svelte 5, Daisy UI, and Ark UI will be ready, you will find it here.

## Install

```
npm install -g pnpm
pnpm install
```

## Recommended IDE Setup

[VS Codium](https://vscodium.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Web

prerequisites: compile the local JS/WASM SDK

```
pnpm libwasm
```

#### Dev

First time:

```
pnpm buildfrontdev
```

Then run your local front-end:

```
pnpm webdev
// then open http://localhost:1421/
```

#### Prod

this will produce a single html file embedding all the resources. this is what ngd broker needs for production

```
pnpm webbuild
```

## Desktop

```
cargo install tauri-cli --version "^2.0.0" --locked
```

Install [all prerequisites](https://tauri.app/start/prerequisites/) for your dev platform.

Add this line to your environment variables

```
export RANLIB="$NDK_HOME/toolchains/llvm/prebuilt/$(ls -1 $NDK_HOME/toolchains/llvm/prebuilt/)/bin/llvm-ranlib"
```

to run the dev env :

```
## on macos or linux or win
cargo tauri dev --no-watch
```

to build the production app installer :

### MacOs (10.14+)

```
cargo tauri build
// the installer is then available in target/x86_64-apple-darwin/release/bundle/dmg/NextGraph_0.1.2_x64.dmg
// or if you just want the app, it is at target/x86_64-apple-darwin/release/bundle/macos/NextGraph.app
```

### Linux (Ubuntu 22.04)

```
cargo tauri build --target x86_64-unknown-linux-gnu
```

### Windows (7+)

```
cargo tauri build --target x86_64-pc-windows-msvc
```

### Android

- [Install Android Studio](https://developer.android.com/studio)

- add the rust targets for android

```
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

- follow the steps for Android in the [Prerequisites guide of Tauri](https://tauri.app/start/prerequisites/#android)

Before you can generate the APK, you will need to [configure Android Studio with your Signing keys.](https://tauri.app/distribute/sign/android/)

to launch the dev app :

```
cargo tauri android dev
```

to build the production app :

```
cargo tauri android build
```

to debug the Svelte app, use Chrome :

- [chrome://inspect/#devices](chrome://inspect/#devices)
- install the [svelte extension](https://chrome.google.com/webstore/detail/svelte-devtools/ckolcbmkjpjmangdbmnkpjigpkddpogn)

### iOS

Disclaimer: iOS hasn't been tested yet, for lack of suitable dev env (latest MacOS version needed).

First, make sure Xcode is properly installed. then :

```
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

to launch the dev app :

```
cargo tauri ios dev
```

to build the production app :

```
cargo tauri ios build
```
