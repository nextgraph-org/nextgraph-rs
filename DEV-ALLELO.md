## Register an account at https://git.nextgraph.org

- select "Sign in with NextGraph"
- then either use your sign in with github SSO or "register" at the bottom
- add an SSH key to your account

## Install

- [Install Rust](https://www.rust-lang.org/tools/install) minimum required MSRV 1.81.0
- [Install Nodejs](https://nodejs.org/en/download/)
- [Install LLVM](https://rust-lang.github.io/rust-bindgen/requirements.html)

On OpenBSD, for LLVM you need to choose llvm-17.

On MacOS, there are several bugs with LLVM above version 17. So you have to install version 17 only.

```
brew install llvm@17
```

On Debian distros

```
sudo apt install pkg-config gcc build-essential libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev gcc-multilib curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Then, for everyone:

```
cargo install wasm-pack --git https://git.nextgraph.org/NextGraph/wasm-pack.git --branch master --locked
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
- log in with this username and password
- open your web-browser's console log, and copy the USER PRIV_KEY that is displayed in a warning (you will maybe need it later)

If you only need one wallet, you can continue using this admin wallet, and you don't need to do the next step.

If instead you are going to need to create many wallets, and/or develop and test the creation of wallet flow, then follow the next step.

## setting up local account server

```
// in the root folder of the repo
cd infra/ngaccount
export NG_ACCOUNT_DOMAIN=test.com
export NG_ACCOUNT_ADMIN=[YOUR_USER_PRIV_KEY]
export NG_ACCOUNT_LOCAL_PEER_KEY=kbz34OFqaWu59xYaqViP0esME2MmcroS94pc4lEEsEsA
export NG_ACCOUNT_SERVER=127.0.0.1,14400,[YOUR_NGD_PEER_ID]
cargo run-script buildfront
cargo run
```

on windows, it looks something like this:

```
cd infra\ngaccount; $env:NG_ACCOUNT_ADMIN="[YOUR_USER_PRIV_KEY]"; $env:NG_ACCOUNT_LOCAL_PEER_KEY="kbz34OFqaWu59xYaqViP0esME2MmcroS94pc4lEEsEsA"; $env:NG_ACCOUNT_SERVER="127.0.0.1,14400,[YOUR_NGD_PEER_ID]"; cargo run-script buildfront;$env:NG_ACCOUNT_DOMAIN='test.com'; cargo run
```
