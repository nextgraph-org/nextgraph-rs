# NextGraph native apps (Linux, MacOS, Windows, Android, iOS)

NextGraph native apps use the Tauri framework.

The apps are using an embedded WebView that renders the Svelte app.

## Install

```
cargo install tauri-cli --version "^2.0.0-alpha"
npm install -g pnpm
pnpm install
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Desktop

Install [all prerequisites](https://next--tauri.netlify.app/next/guides/getting-started/prerequisites/) for your dev platform.

to run the dev env :

```
## on macos
cargo tauri dev
## on linux
cargo tauri dev --target x86_64-unknown-linux-gnu
## on win
cargo tauri dev --target x86_64-pc-windows-msvc
```

to build the production app installer :

### MacOs

```
cargo tauri build
```

### Linux (Ubuntu 22.04)

```
cargo tauri build --target x86_64-unknown-linux-gnu
```

### Windows (7)

```
cargo tauri build --target x86_64-pc-windows-msvc
```

## Android

- [Install Android Studio](https://developer.android.com/studio)

- add the rust targets for android

```
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

- follow the steps for Android in the [Prerquisites guide of Tauri](https://next--tauri.netlify.app/next/guides/getting-started/prerequisites/)

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

## iOS

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
