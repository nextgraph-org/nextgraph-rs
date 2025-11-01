
## Register an account at https://git.nextgraph.org

- select "Sign in with NextGraph"
- then either use your sign in with github SSO or "register" at the bottom
- add an SSH key to your account

## Install

```
cargo install wasm-pack --git https://git.nextgraph.org/NextGraph/wasm-pack.git --branch master
cargo install cargo-run-script
git clone git@git.nextgraph.org:NextGraph/nextgraph-rs.git
cd nextgraph-rs
git checkout allelo
npm install -g pnpm
pnpm buildfrontallelo
```

## front-end dev env

```
cd app/allelo
bun i
bun webdev
```

## First run of your ngd broker

```
// in the root folder of the repo
cargo run -p ngd -- -vv --save-key -l 14400
```

- take note of the PeerID of the node that is displayed in the log output (you will maybe need it later)
- copy the second invitation link, change the port of the http://localhost:14400 part to be port 1421
- open this link in your browser
- enter a username and password, by example: admin / admin
- open your console log, and copy the USER PRIV_KEY that is displayed in a warning (you will maybe need it later)

If you only need one wallet, you can continue using this admin wallet, and you don't need to do the next step.

If instead you are going to need to create many wallets, and/or develop and test the creation of wallet flow, then follow the next step.

## setting up local account server

```
// in the root folder of the repo
cd infra/ngaccount
export NG_ACCOUNT_ADMIN=[YOUR_USER_PRIV_KEY]
export NG_ACCOUNT_LOCAL_PEER_KEY=kbz34OFqaWu59xYaqViP0esME2MmcroS94pc4lEEsEsA
export NG_ACCOUNT_SERVER=127.0.0.1,14400,[YOUR_NGD_PEER_ID]
cargo run-script buildfront
cargo run
```


