# nextgraph.one server (ngone)

This server is used internally by NextGraph to redirect users to the right app server from web clients. You probably don't need this server in your infrastructure, even if you decide to self-host a broker under a domain name.

## Install

```
cd web
npm install -g pnpm
pnpm --ignore-workspace install
```

## Dev

```
cd web
pnpm run dev
// in another terminal
cd ../
cargo watch -c -w src -x run
// then open http://localhost:5173/
```

## Build

First you will need to build the single-file release of ng-app.

```
// uncomment line 14 of src/App.svelte: import * as api from "ng-sdk-js";
cd ../ng-app
pnpm filebuild
cd ../ngone
```

then, in ngone:

```
cd web
pnpm run build
cd ..
cargo build --release
```

## run

```
../target/release/ngone
```
