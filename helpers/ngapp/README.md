# nextgraph.app server (ngapp)

Serves the webapp for the web clients (browsers) of Broker accounts that are self-hosted (NGbox or else)

## Install

```
cd web
npm install -g pnpm
pnpm install
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

## Prod

```
cd web
pnpm run build
cd ..
cargo build --release
```

## run

```
../target/release/ngapp
```
