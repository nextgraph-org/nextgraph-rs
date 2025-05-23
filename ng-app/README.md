# NextGraph apps (Linux, MacOS, Windows, Android, iOS, web)

All the apps are based on Svelte and share the same code.

The native apps are using the Tauri framework with an embedded WebView to render the Svelte app.

## Install

```
npm install -g pnpm
pnpm install
```

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Web

prerequisites: compile the local SDK

```
cd ../ng-sdk-js
cargo install cargo-run-script
cargo run-script app
cd ../ng-app
```

#### Dev

First time:
```
pnpm -C ../helpers/net-auth builddev
pnpm -C ../helpers/net-bootstrap builddev
```

Then run your local front-end:

```
pnpm webdev
// then open http://localhost:1421/
```

#### Prod

this will produce a single html file embedding all the resources. this is what you need for production

```
pnpm webfilebuild
// single file is available in dist-file/index.html

```

alternatively, to obtain a regular dist folder with all resources in separate files (we dont use it anymore):

```
pnpm webbuild
// then the application is available in dist-web folder
// can be served with:
cd dist-web ; python3 -m http.server
```

## Desktop

```
cargo install tauri-cli --version "2.0.0-alpha.11" --locked
```

Install [all prerequisites](https://v2.tauri.app/start/prerequisites/) for your dev platform.

to run the dev env :

```
## on macos
cargo tauri dev --no-watch
## on linux
cargo tauri dev --no-watch --target x86_64-unknown-linux-gnu
## on win
cargo tauri dev --no-watch --target x86_64-pc-windows-msvc
```

to build the production app installer :

### MacOs (10.14+)

```
cargo tauri build
// the installer is then available in target/x86_64-apple-darwin/release/bundle/dmg/NextGraph_0.1.0_x64.dmg
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

-   [Install Android Studio](https://developer.android.com/studio)

-   add the rust targets for android

```
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

-   follow the steps for Android in the [Prerequisites guide of Tauri](https://v2.tauri.app/start/prerequisites/#configure-for-mobile-targets)

Until I find out how to do this properly, if you are compiling the android app from a macos station, you need to override an env var. this is due to reqwest needing SSL support, and on linux and android it compiles it from source. apparently the compiler (cc-rs) doesn't know that when cross compiling to android targets, the tool ranlib is called llvm-ranlib (and not [target]-ranlib)

```
export RANLIB=/Users/[user]/Library/Android/sdk/ndk/[yourNDKversion]/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-ranlib
```

On a linux setup, you will need to add the `glibc-devel.i386` package, see this [SO article](https://stackoverflow.com/questions/7412548/error-gnu-stubs-32-h-no-such-file-or-directory-while-compiling-nachos-source) for instructions for your distro.

Before you can generate the APK, you will need to [configure Android Studio with your Signing keys.](https://web.archive.org/web/20240222072319/https://next--tauri.netlify.app/next/guides/distribution/sign-android/)

to launch the dev app :

```
cargo tauri android dev
```

to build the production app :

```
cargo tauri android build
```

to debug the Svelte app, use Chrome :

-   [chrome://inspect/#devices](chrome://inspect/#devices)
-   install the [svelte extension](https://chrome.google.com/webstore/detail/svelte-devtools/ckolcbmkjpjmangdbmnkpjigpkddpogn)

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
