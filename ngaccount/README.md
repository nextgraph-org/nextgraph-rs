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
pnpm run dev
// in another terminal
cd ../
cargo watch -c -w src -x run
// then open http://localhost:5173/
```

## Build

```
cd web
pnpm run build
cd ..
cargo build --release
```

## run

```
../target/release/ngaccount
```
