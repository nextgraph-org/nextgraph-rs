# in-memory LocalBroker

Example of LocalBroker configured with in-memory (no persistence).

run with:

```
cargo run -p nextgraph -r --example in_memory
```

we assume that you run this command from the root of the git repo (nextgraph-rs)

the `-r` for release version is important, without it, the creation and opening of the wallet will take ages.
