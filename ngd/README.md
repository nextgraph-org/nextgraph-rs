# ngd - NextGraph Daemon

## Building

See [Build release binaries](../README.md#build-release-binaries) in the main page.

## Usage

### Create the first admin user

The current directory will be used to save all the config, keys and storage data.
If you prefer to change the base directory, use the argument `--base [PATH]` when using `ngd` and/or `ngcli`.

```
ngcli gen-key
ngd --save-key -d <DOMAIN_NAME> -l 1440 --admin <THE_USER_ID_YOU_JUST_CREATED>
// note the server peerID in the logs
ngcli --save-key -s 127.0.0.1,1440,<PEER_ID_OF_SERVER> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> admin add-user <THE_USER_ID_YOU_JUST_CREATED> -a
```

you should see a message `User added successfully`.

to check that the admin user has been created :

```
ngcli --save-key -s 127.0.0.1,1440,<PEER_ID_OF_SERVER> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> admin list-users -a
```

should return your userId

you can now save the configs of both the server and client

```
ngd -d <DOMAIN_NAME> -l 1440 --save-config
ngcli -s 127.0.0.1,1440,<PEER_ID_OF_SERVER> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> --save-config
```
