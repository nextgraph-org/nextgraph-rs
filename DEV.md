# Contributors or compilation guide

- [Install Rust](https://www.rust-lang.org/tools/install) minimum required MSRV 1.81.0
- [Install Nodejs](https://nodejs.org/en/download/)
- [Install LLVM](https://rust-lang.github.io/rust-bindgen/requirements.html)

On OpenBSD, for LLVM you need to choose llvm-17.

On all platforms, we have to install wasm-pack this way:

```
cargo install wasm-pack --git https://git.nextgraph.org/NextGraph/wasm-pack.git --branch master
```

On Debian distros

```
sudo apt install pkg-config gcc build-essential libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev gcc-multilib curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

```
cargo install cargo-watch
cargo install cargo-run-script
// optionally, if you want a Rust REPL: cargo install evcxr_repl
git clone git@git.nextgraph.org:NextGraph/nextgraph-rs.git
// or if you don't have a git account with us: git clone https://git.nextgraph.org/NextGraph/nextgraph-rs.git
cd nextgraph-rs
npm install -g pnpm
pnpm buildfront
```

For building the native apps, see the [ng-app/README](ng-app/README.md)

### First run

The current directory will be used to save all the config, keys and storage data.
If you prefer to change the base directory, use the argument `--base [PATH]` when using `ngd` and/or `ngcli`.

```
// runs the daemon in one terminal
cargo run -p ngd -- -vv --save-key -l 14400
```

In the logs/output of ngd, you will see an invitation link that you should open in your web browser. If there are many links, choose the one that starts with `http://localhost:`, and if you run a local front-end, replace the prefix `http://localhost:14400/` with `http://localhost:1421/` before you open the link in your browser.

The computer you use to open the link should have direct access to the ngd server on localhost. In most of the cases, it will work, as you are running ngd on localhost. If you are running ngd in a docker container, then you need to give access to the container to the local network of the host by using `docker run --network="host"`. see more here https://docs.docker.com/network/drivers/host/

Follow the steps on the screen to create your wallet :)

Once your ngd server will run in your dev env, replace the string in `sdk/rust/src/local_broker_dev_env.rs` with the actual PEER ID of your ngd server that is displayed when you first start `ngd`, with a line starting with `INFO  ngd] PeerId of node:`. This step is needed if you want to test or develop the import of wallet with QRCode.

More details about usage of ngd [here](bin/ngd/README.md).

### If you are developing the front-end too

If you are also developing the front-end of NextGraph app, you should run it with this command in a separate terminal:

```
// run this only once, from root folder:
pnpm buildfrontdev
// to start the front-end for development
cd app/nextgraph
pnpm webdev
```

more details about developing the front-end [here](app/nextgraph/README.md).

### Using ngcli with the account you just created

The current directory will be used to save all the config, keys and storage data.
If you prefer to change the base directory, use the argument `--base [PATH]` when using `ngd` and/or `ngcli`.

`PEER_ID_OF_SERVER` is displayed when you first start `ngd`, with a line starting with `INFO  ngd] PeerId of node:`.

`THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED` can be found in the app, after you opened your wallet, click on the logo of NextGraph, and you will see the User Panel. Click on `Accounts` and you will find the User Private Key.

By example, to list all the admin users :

```
cargo run -p ngcli -- --save-key --save-config -s 127.0.0.1,14400,<PEER_ID_OF_SERVER> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> admin list-users -a
```

### Adding more accounts and wallets

In your dev env, if you want to create more wallets and accounts, you have 2 options:

- creating an invitation link from the admin account

```
cargo run -p ngcli -- -s 127.0.0.1,14400,<PEER_ID_OF_SERVER> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> admin add-invitation --notos
```

and then open the link after replacing the port number from `14400` to `1421` (if you are running the front-end in development mode).

- run a local instance of `ngaccount`. this is useful if you want to test or develop the ngaccount part of the flow..

See the [README of ngaccount here](ngaccount/README.md).

Then you need to stop your ngd and start it again with the additional option :

```
--registration-url="http://127.0.0.1:5173/#/create"
```

### Packages

The crates and packages are organized as follow :

- app : the main application of NextGraph
    - ui-common : common UI elements
    - [nextgraph](app/nextgraph/README.md)
        - src-tauri : the Tauri based native apps
        - src : the Web-based app
- bin : the binaries
    - [ngcli](bin/ngcli/README.md) : CLI tool to manipulate the local documents and repos and administrate the server
    - [ngd](bin/ngd/README.md) : binary executable of the daemon (that runs a broker, the verifier and additional Rust services)
- engine : the core engine including NGproto
    - repo : Repositories common library
    - net : Network common library
    - oxigraph : Fork of OxiGraph. contains our CRDT of RDF
    - verifier : Verifier library, that exposes the document API to the app
    - wallet : keeps the secret keys of all identities of the user in a safe wallet
    - broker : Core and Server Broker library
    - client-ws : Websocket client library
    - storage-rocksdb : RocksDB backed stores. see also dependency [repo here](https://git.nextgraph.org/NextGraph/rust-rocksdb)
- infra : tools and binaries for infrastructure of the platform
    - ngaccount : broker service provider (BSP) account manager
    - ngapp : server of the web app used by self-hosters on the public web
    - ngnet : server of nextgraph.net that shelps with authentication of third-party web apps.
- sdk
    - [js](sdk/js/README.md)
        - api-web : the web version of the API
        - [lib-wasm](sdk/js/lib-wasm/DEV.md) : the WASM library used by api-web
        - [examples](sdk/js/DEV.md) : example for: web app, React/Svelte app, or node service
        - alien-deepsignals, shex-orm and signals : used by the ORM mechanism
    - [rust](sdk/rust/README.md) : Client library. Use this crate to embed NextGraph client in your Rust application
    - [python](sdk/python/README.md) : contains the Python SDK.

### Test

Please test by following this order (as we need to generate some files locally)

```
cargo test --package nextgraph -r --lib -- local_broker::test::gen_wallet_for_test --show-output --nocapture
cargo test -r
cargo test --package nextgraph -r --lib -- local_broker::test::import_session_for_test_to_disk --show-output --nocapture --ignored
```

Test a single crate:

```
cargo test --package ng-repo --lib --  --show-output --nocapture
cargo test --package ng-wallet --lib --  --show-output --nocapture
cargo test --package ng-verifier --lib --  --show-output --nocapture
cargo test --package lib-wasm --lib --  --show-output --nocapture
cargo test --package ng-broker --lib --  --show-output --nocapture
cargo test --package ng-client-ws --lib --  --show-output --nocapture
```

Test WASM websocket

First you need to install the `chromedriver` that matches your version of Chrome

https://googlechromelabs.github.io/chrome-for-testing/

then:

```
cd lib-wasm
wasm-pack test --chrome --headless
```

Test Rust websocket

```
cargo test --package ng-client-ws --lib -- remote_ws::test::test_ws --show-output --nocapture
```

### Build release binaries

First you will need to have the production build of the frontend.
You need to freshly built it from source, following those instructions:

```
cargo install cargo-run-script
npm install -g pnpm
cargo run-script libwasm
pnpm buildfront
```

then build the ngd daemon

```
cargo build -r -p ngd
```

you can then find the binary `ngd` in `target/release`

The CLI tool can be obtained with :

```
cargo build -r -p ngcli
```

you can then use the binary `target/release/ngcli`

For usage, see the documentation [here](bin/ngd/README.md).

For building the native apps, see this [documentation](app/nextgraph/README.md).

#### OpenBSD

On OpenBSD, a conflict between the installed LibreSSL library and the reqwest crate, needs a bit of attention.
Before compiling the daemon for OpenBSD, please comment out lines 41-42 of `ng-net/Cargo.toml`. This will be solved soon by using `resolver = "2"`.

```
#[target.'cfg(target_arch = "wasm32")'.dependencies]
#reqwest = { version = "0.11.18", features = ["json","native-tls-vendored"] }
```

to use the app on OpenBSD, you need to run the daemon locally.

```
ngd -l 14400 --save-key
```

then open chrome (previously installed with `doas pkg_add chrome`)

```
env ENABLE_WASM=1 chrome --enable-wasm --process-per-site --new-window --app=http://localhost:14400
```

### Generate documentation

Generate documentation for all packages without their dependencies:

```
cargo doc --no-deps
```

The generated documentation can be found in `target/doc/nextgraph`.

### Contributions license

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be dual licensed as below, without any
additional terms or conditions.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.
