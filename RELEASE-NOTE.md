# Release 0.1.2-alpha.1

_08 November 2025_

This release is not stable and should not be used for any productive work or to store personal documents. This release is meant as a **preview** of what NextGraph can do as of today and hints at its future potential.

**Please note: The binary format of the Documents or Wallet might change, that might result in a complete loss of data. We will not provide migration scripts as the APIs and formats aren't stable yet.**

If you previously installed any NextGraph app on your device, please uninstall it first, by following the normal uninstall procedure specific to your OS. If you have previously created a Wallet, it will not work with this new release. Please create a new one now.

This is an intermediary release, before the big refactor we are currently working on is completed. This should be done by the end of November 2025.

## App

Please read the [Getting started](https://docs.nextgraph.org/en/getting-started) guide.

[changelog](CHANGELOG.md#app-0-1-2-alpha-1-2025-11-08)

## SDK

The SDK for is not documented yet.

[changelog](CHANGELOG.md#sdk-0-1-2-alpha-2-2025-11-08)

## Broker

The `ngd` daemon is released with the basic features listed in `ngd --help`. More documentation will come soon. This release does not contain changes from previous one.

[changelog](CHANGELOG.md#broker-0-1-1-alpha-2024-09-02)

## CLI

The `ngcli` daemon is released with the basic features listed in `ngcli --help`. More documentation will come soon. This release does not contain changes from previous one.

[changelog](CHANGELOG.md#cli-0-1-1-alpha-2024-09-02)

## Limitations of this release

-   you cannot share documents with other users. Everything is ready for this internally, but there is still some wiring to do that will take some more time.
-   the Rich text editors (both for normal Post/Article and in Markdown) do not let you insert images nor links to other documents.
-   The webapp has some limitation for now when it is offline, because it doesn't have a UserStorage. it works differently than the native apps, as it has to replay all the commits at every load. This will stay like that for now, as the feature "Web UserStorage" based on IndexedDB will take some time to be coded.
-   JSON-LD isn't ready yet as we need the "Context branch" feature in order to enter the list of ontologies each document is based on.
