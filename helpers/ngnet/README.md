# ngnet

This server is used by NextGraph infrastructure for redirects, and for authentication on third-party web apps. It also serves the API for getting the list of Broker Service Providers.
And should eventually provide the TextCode API.

## Install

```
cd web
npm install -g pnpm
pnpm install
```

## Dev

compile the 2 helpers, in dev mode

```
pnpm -C ../net-auth builddev
pnpm -C ../net-bootstrap builddev
```

```bash
cd web
pnpm run dev --host

# In another terminal... in the folder ngnet
cargo watch -c -w src -x run
```

> Currently, the ngnet server api is listening on http://127.0.0.1:3033 only which might cause you trouble with Android emulator (hardcoded in `main.rs`).
> If you need to test from a (virtual) android device, you can use adb to tunnel the connection like: [`adb reverse tcp:3033 tcp:3033`](https://justinchips.medium.com/proxying-adb-client-connections-2ab495f774eb).

## Prod

```
pnpm -C ../net-auth build
pnpm -C ../net-bootstrap build
pnpm -C ./web build
cargo build -r
```

## run

```
../target/release/ngnet
```
