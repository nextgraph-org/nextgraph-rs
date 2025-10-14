# broker service provider account manager (ngaccount)

This server is used internally by NextGraph to handle the creation of accounts at our broker service provider servers. You probably don't need this server in your infrastructure, even if you decide to self-host a broker under your own domain name.

## Install

```
cd web
npm install -g pnpm
pnpm --ignore-workspace install
```

## Dev

edit your `.env` file as follow

`YOUR_USER_PRIV_KEY` is found in your admin user's wallet, by going to the "User panel" then click on "Accounts" and under "Personal account" you will see box called "User Private Key (for ngcli)". Copy the string that is below. and put it in place of YOUR_USER_PRIV_KEY

`YOUR_NGD_PEER_ID` you will find in the logs of your ngd server. There will be a line, in the first lines of output, called "PeerId of node:" and you should copy the string you find there and put it in place of YOUR_NGD_PEER_ID

`NG_ACCOUNT_LOCAL_PEER_KEY` is given as an example. You can generate a random one by using the command `ngcli gen-key` and use the private key.

```
export NG_ACCOUNT_DOMAIN=test.com
export NG_ACCOUNT_ADMIN=[YOUR_USER_PRIV_KEY]
export NG_ACCOUNT_LOCAL_PEER_KEY=kbz34OFqaWu59xYaqViP0esME2MmcroS94pc4lEEsEsA
export NG_ACCOUNT_SERVER=127.0.0.1,14400,[YOUR_NGD_PEER_ID]
export RUST_LOG=debug
```


```bash
cd web
pnpm run dev --host

# In another terminal... in the folder ngaccount

# Please set the required environment variables in the .env and then source it it with:
source .env

cargo watch -c -w src -x run
```

> Currently, the ng-account server api is listening on http://127.0.0.1:3031 only which might cause you trouble with Android emulator (hardcoded in `main.rs`, `Create.svelte` and `Delete.svelte`).
> If you need to test from a (virtual) android device, you can use adb to tunnel the connection like: [`adb reverse tcp:3031 tcp:3031`](https://justinchips.medium.com/proxying-adb-client-connections-2ab495f774eb).

## Prod

```
cd web
export NG_ACCOUNT_DOMAIN=[domain name]
pnpm build
cd ..
cargo build --release
```

## run

```
../target/release/ngaccount
```
