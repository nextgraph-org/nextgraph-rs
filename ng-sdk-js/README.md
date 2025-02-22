# ng-sdk-js

[![Apache 2.0 Licensed][license-image]][license-link]
[![MIT Licensed][license-image2]][license-link2]
[![project chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://forum.nextgraph.org)

JavaScript/WASM package containing the SDK of NextGraph

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## For developers

Read our [getting started guide](https://docs.nextgraph.org/en/getting-started/).

```
npm i ng-sdk-js
```

The API is divided in 4 parts:

-   the wallet API that lets user open and change their wallet and use its credentials
-   the LocalVerifier API to open the documents locally
-   the RemoteVerifier API that is connecting to the ngd server and runs the verifier on the server.
-   a special mode of operation for ngd called `Headless` where all the users of that server have given full control of their data, to the server.

All of those API share a common `Session API` (all the functions that have a session_id as first argument)

The wallet API is not documented as it will be deprecated as soon as we will have an Authorization/Capability Delegation mechanism between the NextGraph apps and the Wallet.
Still, this API will always be available as it is used internally by the NextGraph app, and could be used also by the owner of a wallet, to access its data with nodeJS or Rust.

## Headless server (runs the verifiers of the users on the server)

NextGraph daemon (ngd) is normally used only as a Broker of encrypted messages, but it can also be configured to run the verifiers of some or all of the users' data.
The verifier is the service that opens the encrypted data and "materialize" it. In local-first/CRDT terminology, this means that the many commits that form the DAG of operations, are reduced in order to obtain the current state of a document, that can then be read or edited locally by the user. Usually, the verifier runs locally in the native NextGraph app, and the materialized state is persisted locally (with encryption at rest). The web version of the app (available at https://nextgraph.net) is not persisting the materialized state yet, because the "UserStorage for Web" feature is not ready yet. Programmers can also run a local verifier with the wallet API in Rust or nodeJS (not documented), or use the CLI to create a local materialized state.

It is also possible to run a remote verifier on ngd, and the user has to give their credentials to the server (partially or fully) so the server can decrypt the data and process it. Obviously this breaks the end-to-end-encryption. But depending on the use-cases, it can be useful to have the verifier run on some server.

## APIs

The nodeJS API is limited for now, to the following functions.

All the functions are async. you must use them with `await` (or `.then()`).

They all can throw errors. You must enclose them in `try {} catch(e) {}`

See the example [here](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/ng-sdk-js/app-node).

## Wallet API

open and modify the wallet.
not documented yet. We don't really want developers to use it, as the opening of a wallet is a sensitive operation, that shouldn't be necessary for developers to create apps and ask permission to access the data of users.
We will provide an adhoc API for Permission/Capability delegation so the wallet API will be deprecated.

## LocalVerifier API

can manipulate partial access to the user's data. coming soon

## RemoteVerifier API

entrust the credentials of user to an ngd server. coming soon

## Headless API

-   `ng.init_headless(config)` must be called before any other call.
-   `ng.admin_create_user(config)` creates a new user on the server, and populates their 3P stores. returns the user_id
-   `ng.session_headless_start(user_id)` starts a new session for the user. returns the session info, including the session_id
-   `ng.sparql_query(session_id, "[SPARQL query]", base, nuri)` returns or:
    -   for SELECT queries: a JSON Sparql Query Result as a Javascript object. [SPARQL Query Results JSON Format](https://www.w3.org/TR/sparql11-results-json/)
    -   for CONSTRUCT queries: a list of quads in the format [RDF-JS data model](http://rdf.js.org/data-model-spec/) that can be used as ingress to RDFjs lib.
    -   for ASK queries: a boolean
-   `ng.sparql_update(session_id, "[SPARQL update]")` returns nothing, but can throw an error.
-   `ng.file_put_to_private_store(session_id,"[filename]","[mimetype]")` returns the Nuri (NextGraph URI) of the file, as a string.
-   `ng.file_get_from_private_store(session_id, "[nuri]", callback)` returns a cancel function. The `callback(file)` function will be called as follow
    -   once at first with some metadata information in `file.V0.FileMeta`
    -   one or more times with all the blobs of data, in `file.V0.FileBinary`
    -   finally, one more time with `file.V0 == 'EndOfStream'`. See the example on how to reconstruct a buffer out of this.
-   `ng.session_headless_stop(session_id, force_close)` stops the session, but doesn't close the remote verifier, except if force_close is true. if false, the verifier is detached from the session and continues to run on the server. A new session can then be reattached to it, by calling session_headless_start with the same user_id.

Here is the format of the config object to be supplied in the calls to `init_headless` and `admin_create_user`:

```js
config = {
    server_peer_id: "[your server ID]",
    admin_user_key: "[your admin key]",
    client_peer_key: "[the client key]",
    server_addr: "[IP and PORT of the server]", // this one is optional. it will default to localhost:1440. Format is: A.A.A.A:P for IPv4 or [AAAA:::]:P for IpV6
};
```

Alternatively, you can use the environnement variables:

```
NG_HEADLESS_SERVER_PEER_ID
NG_HEADLESS_ADMIN_USER_KEY
NG_HEADLESS_CLIENT_PEER_KEY
NG_HEADLESS_SERVER_ADDR
```

If you supply both, the values passed in the API function call takes precedence over the env vars.

In order to generate those keys, you will have first to run the `ngd` server, by following those instructions.

## Install and configure ngd

The binaries can be obtained from the [release page](https://git.nextgraph.org/NextGraph/nextgraph-rs/releases).

You can also, [compile](https://git.nextgraph.org/NextGraph/nextgraph-rs#build-release-binaries) them from source.

The current directory will be used to save all the config, keys and storage data, in a subfolder called `.ng`.
If you prefer to change the base directory, use the argument `--base [PATH]` when using `ngd` and/or `ngcli` commands.
Use `--help` to see a full list of options and commands on those 2 binaries.

```bash
ngcli gen-key
# this will output 2 keys. keep both keys
# the private key is the NG_HEADLESS_ADMIN_USER_KEY value you need for the config of the above API calls.
ngd -v --save-key -l 1440 -d <SERVER_DOMAIN> --admin <THE_PUBLIC_KEY_YOU_JUST_CREATED>
# In the terminal output of the server, find the line `PeerId of node` and keep the value. You will need it for the next step, as PEER_ID_OF_NODE.
# and it is also the value you need to give to NG_HEADLESS_SERVER_PEER_ID in the config for the above API calls.
```

`SERVER_DOMAIN` can be anything you want. If you run a web server with some content at `server.com`, then the NextGraph web app could be served at the subdomain `app.server.com` or `ng.server.com`.
This is what you should enter in `SERVER_DOMAIN`. You also have to setup your reverse proxy (haproxy, nginx, etc...) to forward incoming TLS connections to ngd. ngd listens for TCP connections on localhost port 1440 as configured above. The header `X-Forwarded-For` must be set by your reverse proxy. ngd does not handle TLS. Your reverse proxy has to handle the TLS terminated connections, and forward a TCP connection to ngd.
You can use ngd in your internal network (Docker, etc...) without exposing it to the internet. In this case, remove the `-d <SERVER_DOMAIN>` option. But the goal of ngd is to be a broker that connects to other brokers on the internet, so it should have a public interface configured at some point.

In another terminal, same current working directory:

```bash
ngcli --save-key -s 127.0.0.1,1440,<PEER_ID_OF_NODE> -u <THE_PRIVATE_KEY_YOU_JUST_CREATED> admin add-user <THE_PUBLIC_KEY_YOU_JUST_CREATED> -a
```

you should see a message `User added successfully`.

to check that the admin user has been created :

```bash
ngcli -s 127.0.0.1,1440,<PEER_ID_OF_NODE> -u <THE_PRIVATE_KEY_YOU_JUST_CREATED> admin list-users -a
```

should return your UserId

you can now save the configs on both the server and client

```bash
# stop the running server by entering ctrl+C on its terminal.
ngd -l 1440 -d <SERVER_DOMAIN> --save-config
# in the other terminal
ngcli -s 127.0.0.1,1440,<PEER_ID_OF_NODE> -u <THE_PRIVATE_KEY_YOU_JUST_CREATED> --save-config
```

From now on, you can just use `ngd` and `ngcli` commands without the need to specify the above options, as the config has been saved to disk. Except if you changed the base directory, in which case you have to supply the `--base` option at every call.

The 2 API functions that need a config, also need a `NG_HEADLESS_CLIENT_PEER_KEY` that we haven't created yet.

You should create it with another call to:

```bash
ngcli gen-key
# the private key is what goes to NG_HEADLESS_CLIENT_PEER_KEY . it identifies the client (the process that is using this library. a nodeJS process)
# the public key will go to the ngd config for authorization (but this is not implemented yet. just keep it somewhere for now)
```

That's it. The broker is configured. You can create an entry in systemd/init.d for your system to start the daemon at every boot. Don't forget to change the working directory to where your data is, or use `--base` option.

If you have configured a domain, then the web app can be accessed at https://app.server.com by example.

---

## License

Licensed under either of

-   Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
-   MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
    at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.

[license-image]: https://img.shields.io/badge/license-Apache2.0-blue.svg
[license-link]: https://git.nextgraph.org/NextGraph/nextgraph-rs/raw/branch/master/LICENSE-APACHE2
[license-image2]: https://img.shields.io/badge/license-MIT-blue.svg
[license-link2]: https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/LICENSE-MIT
