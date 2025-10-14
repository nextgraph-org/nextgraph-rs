# open LocalBroker

Example of LocalBroker configured with persistence to disk, and opening of a previsouly saved wallet

You need to replace `wallet_name` on line 35 with the name that was given to you when you ran the example [persistent], in `Your wallet name is : `

You need to replace the argument `pazzle` in the function call `wallet_open_with_pazzle` with the array that you received in `Your pazzle is:`

then, run with:

```
cargo run -p nextgraph -r --example open
```

we assume that you run this command from the root of the git repo (nextgraph-rs).

the `-r` for release version is important, without it, the creation and opening of the wallet will take ages.
