# broker service provider account manager (ngaccount)

This server is used internally by NextGraph to handle the creation of accounts at our broker service provider servers. You probably don't need this server in your infrastructure, even if you decide to self-host a broker under your own domain name.

## Install

```
cd web
npm install -g pnpm
pnpm --ignore-workspace install
```

## Dev

```
cd web
pnpm run dev --host
// in another terminal
cd ../
export NG_ACCOUNT_DOMAIN=[?]; export NG_ACCOUNT_ADMIN=[?]; export NG_ACCOUNT_LOCAL_PEER_KEY=[?]; export NG_ACCOUNT_SERVER=127.0.0.1,14400,[?]; export RUST_LOG=debug
cargo watch -c -w src -x run
// then open http://localhost:5173/
```

## Prod

```
cd web
export NG_ACCOUNT_DOMAIN=[domain name]
pnpm run build
cd ..
cargo build --release
```

## run

```
../target/release/ngaccount
```
