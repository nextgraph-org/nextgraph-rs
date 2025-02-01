# Contributors or compilation guide

-   [Install Rust](https://www.rust-lang.org/tools/install) minimum required MSRV 1.74.0
-   [Install Nodejs](https://nodejs.org/en/download/)
-   [Install LLVM](https://rust-lang.github.io/rust-bindgen/requirements.html)

On openbsd, for LLVM you need to choose llvm-17.

until this [PR](https://github.com/rustwasm/wasm-pack/pull/1271) is accepted, will have to install wasm-pack this way:

```
cargo install wasm-pack --git https://github.com/rustwasm/wasm-pack.git --rev c2b663f25abe50631a236d57a8c6d7fd806413b2
```

```
cargo install cargo-watch
// optionally, if you want a Rust REPL: cargo install evcxr_repl
git clone git@git.nextgraph.org:NextGraph/nextgraph-rs.git
// or if you don't have a git account: git clone https://git.nextgraph.org/NextGraph/nextgraph-rs.git
cd nextgraph-rs
cargo build
```

once your ngd server will run in your dev env, replace the above string in `src/local_broker_dev_env.rs` with the actual PEER ID of your ngd server.

### Packages

The crates are organized as follow :

-   [nextgraph](nextgraph/README.md) : Client library. Use this crate to embed NextGraph client in your Rust application
-   [ngcli](ngcli/README.md) : CLI tool to manipulate the local documents and repos and administrate the server
-   [ngd](ngd/README.md) : binary executable of the daemon (that can run a broker, verifier and/or Rust services)
-   [ng-app](ng-app/README.md) : all the native apps, based on Tauri, and the official web app.
-   [ng-sdk-js](ng-sdk-js/DEV.md) : contains the JS SDK, with example for: web app, react app, or node service.
-   ng-repo : Repositories common library
-   ng-net : Network common library
-   ng-oxigraph : Fork of OxiGraph. contains our CRDT of RDF
-   ng-verifier : Verifier library, that exposes the document API to the app
-   ng-wallet : keeps the secret keys of all identities of the user in a safe wallet
-   ng-broker : Core and Server Broker library
-   ng-client-ws : Websocket client library
-   ng-storage-rocksdb : RocksDB backed stores. see also dependency [repo here](https://git.nextgraph.org/NextGraph/rust-rocksdb)
-   ngone : server for nextgraph.one. helps user bootstrap into the right app. Not useful to you. Published here for transparency
-   ngaccount : server for nextgraph's Broker Service Provider account manager. Not useful to you. Published here for transparency

### Run

Build & run debug executables:

```
// runs the daemon
cargo run --bin ngd

// runs the client
cargo run --bin ngcli
```

For the apps, see the [README](ng-app/README.md)

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
cargo test --package ng-sdk-js --lib --  --show-output --nocapture
cargo test --package ng-broker --lib --  --show-output --nocapture
cargo test --package ng-client-ws --lib --  --show-output --nocapture
```

Test WASM websocket

First you need to install the `chromedriver` that matches your version of Chrome

https://googlechromelabs.github.io/chrome-for-testing/

then:

```
cd ng-sdk-js
wasm-pack test --chrome --headless
```

Test Rust websocket

```
cargo test --package ng-client-ws --lib -- remote_ws::test::test_ws --show-output --nocapture
```

### Build release binaries

First you will need to have the production build of the frontend.
If you do not want to setup a whole development environment for the frontend, you can use the precompiled release of the frontend available in `dist-file.tar.gz` that you can download from the release page.

```
cd ng-app
tar -xzf dist-file.tar.gz
cd ..
```

Otherwise, build from source the single-file release of ng-app

```
npm install -g pnpm
cd ng-sdk-js
wasm-pack build --target bundler
cd ../ng-app
pnpm install
pnpm webfilebuild
cd ..
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

For usage, see the documentation [here](ngd/README.md).

For building the apps, see this [documentation](ng-app/README.md).

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
