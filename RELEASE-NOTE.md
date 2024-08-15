# Release 0.1.0-preview.7

_15 August 2024_

This release is not stable and should not be used for any productive work or to store personal documents. This release is meant as a **preview** of what NextGraph can do as of today and hints at its future potential.

**Please note: The binary format of the Documents or Wallet might change, that might result in a complete loss of data. We will not provide migration scripts as the APIs and formats aren't stable yet.**

If you previously installed any NextGraph app on your device, please uninstall it first, by following the normal uninstall procedure specific to your OS. If you have previously created a Wallet, it will not work with this new release. Please create a new one now.

## App

Please read the :

-   [Getting started](https://docs.nextgraph.org/en/getting-started) guide.
-   list of [features](https://docs.nextgraph.org/en/features).
-   the [CRDTs page](https://docs.nextgraph.org/en/framework/crdts) in the framework docs.

[changelog](CHANGELOG.md#app-0-1-0-preview-7-2024-08-15)

## SDK

The SDK for is not documented yet.

[changelog](CHANGELOG.md#sdk-0-1-0-preview-6-2024-08-15)

## Broker

The `ngd` daemon is release with the basic features listed in `ngd --help`. More documentation will come soon

[changelog](CHANGELOG.md#broker-0-1-0-preview-7-2024-08-15)

## CLI

The `ngcli` daemon is release with the basic features listed in `ngcli --help`. More documentation will come soon.

[changelog](CHANGELOG.md#cli-0-1-0-preview-7-2024-08-15)

## Limitations of this release

-   you cannot share documents with other users. Everything is ready for this internally, but there is still some wiring to do that will take some more time.
-   the Rich text editors (both for normal Post/Article and in Markdown) do not let you insert images nor links to other documents.
-   your documents listed in your 3 stores do not display any title or content type, making it difficult to understand which document is which by just reading the 7-character ID of the documents. This will be addressed very quickly, as soon as the "Header branch" feature will be implemented. For the same reason (lack of this feature), and in the web-app only, when you will have created many docs with many modifications, the loading of your app can take some time because it is loading all the content of all the docs at startup. The native apps are already working well and do not suffer from this caveat. For the web-app, it is not the intended behaviour of course, but we need the "Header branch" feature to fix this.
-   The webapp has some limitation for now when it is offline, because it doesn't have a UserStorage. it works differently than the native apps, as it has to replay all the commits at every load. This will stay like that for now, as the feature "Web UserStorage" based on IndexedDB will take some time to be coded.
-   JSON-LD isn't ready yet as we need the "Context branch" feature in order to enter the list of ontologies each document is based on.
