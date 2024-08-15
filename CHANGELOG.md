# Changelog

Access the sub-sections directly :

[App](#app) - [SDK](#sdk) - [Broker](#broker) - [CLI](#cli)

## App

### App [0.1.0-preview.7] - 2024-08-15

#### Added

-   Wallet Creation : Downlaod Recovery PDF
-   Wallet Creation : Download wallet file
-   Wallet Login : with pazzle
-   Wallet Login : correct errors while entering pazzle
-   Wallet Login : with mnemonic
-   Wallet Login : in-memory session (save nothing locally)
-   Wallet Import : from file
-   Wallet Import : from QR code
-   Wallet Import : from TextCode
-   User Panel : Online / Offline status
-   User Panel : Toggle Personal Connection
-   User Panel : Logout
-   User Panel / Wallet : Export by scanning QRCode
-   User Panel / Wallet : Export by generating QRCode
-   User Panel / Wallet : Export by generating TextCode
-   User Panel / Wallet : Download file
-   User Panel / Accounts Info : basic info (not accurate)
-   Document Menu : switch Viewer / Editor
-   Document Menu : switch Graph / Document
-   Document Menu : Live editing
-   Document Menu : Upload binary file + Attachements and Files pane
-   Document Menu : History pane
-   Add Document : Save in current Store
-   Document class: Source Code: Rust, JS, TS, Svelte, React
-   Document class: Data : Graph, Container, JSON, Array, Object
-   Document class: Post (rich text)
-   Document class: Markdown (rich text)
-   Document class: Plain Text
-   A11Y : limited ARIA and tabulation navigation on all pages. not tested with screen-reader.
-   I18N : english
-   I18N : german (partial)
-   Native app: macOS
-   Native app: android
-   Native app: linux and Ubuntu
-   Native app: Windows

## SDK

### SDK [0.1.0-preview.6] - 2024-08-15

#### Added

-   js : session_start
-   js : session_start_remote
-   js : session_stop
-   js : user_connect
-   js : user_disconnect
-   js : discrete_update
-   js : sparql_update
-   js : sparql_query (returns SPARQL Query Results JSON Format, a list of turtle triples, or a boolean )
-   js : branch_history
-   js : app_request_stream (fetch and subscribe)
-   js : app_request
-   js : doc_create
-   js : file_get
-   js : upload_start
-   js : upload_done
-   js : upload_chunk
-   nodejs : init_headless
-   nodejs : session_headless_start
-   nodejs : session_headless_stop
-   nodejs : sparql_query (returns SPARQL Query Results JSON Format, RDF-JS data model, or a boolean)
-   nodejs : discrete_update
-   nodejs : sparql_update
-   nodejs : rdf_dump
-   nodejs : admin_create_user
-   nodejs : doc_create
-   nodejs : file_get
-   nodejs : file_put
-   rust : session_start
-   rust : session_stop
-   rust : app_request_stream, gives access to:
    -   fetch and subscribe
    -   file_get
-   rust : app_request, gives access to:
    -   create_doc
    -   sparql_query
    -   sparql_update
    -   discrete_update
    -   rdf_dump
    -   history
    -   file_put

## Broker

### Broker [0.1.0-preview.7] - 2024-08-15

#### Added

-   listen on localhost
-   listen on domain
-   listen on private LAN
-   listen on public IP
-   invite-admin
-   broker service provider : add invitation for user
-   serve web app

## CLI

### CLI [0.1.0-preview.7] - 2024-08-15

#### Added

-   gen-key
-   admin : add/remove admin user
-   admin : add invitation
-   admin : list users
-   admin : list invitations
