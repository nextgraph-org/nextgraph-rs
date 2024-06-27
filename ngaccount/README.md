# broker service provider account manager (ngaccount)

This server is used internally by NextGraph to handle the creation of accounts at our broker service provider servers. You probably don't need this server in your infrastructure, even if you decide to self-host a broker under your own domain name.

## Install

```
cd web
npm install -g pnpm
pnpm --ignore-workspace install
```

## Dev

```bash
cd web
pnpm run dev --host

# In another terminal...
cd ../

# Please set the required environment variables in the .env and then source it it with:
source .env

cargo watch -c -w src -x run
# Then open http://localhost:5173/#/create
```

> TODO: 
> Currently, the ng-account server api is listening on http://127.0.0.1:3031 only which might cause you trouble.
> See files: `main.rs`, `Create.svelte` and `Delete.svelte`.

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
