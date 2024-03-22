# ngd - NextGraph Daemon

## Building

See [Build release binaries](../README.md#build-release-binaries) in the main page.

## Usage

### For a localhost server: The first start will create an invitation for the admin, so you can create your wallet

```
ngd --save-key -l 1440 --invite-admin --save-config
```

this will give you a link that you should open in your web browser. If there are many links, choose the one that starts with `http://localhost:`.

The computer you use to open the link should have direct access to the ngd server on localhost. In most of the cases, it will work, as you are running ngd on localhost. If you are running ngd in a docker container, then you need to give access to the container to the local network of the host by using `docker run --network="host"`. https://docs.docker.com/network/drivers/host/

Follow the steps on the screen to create your wallet :)

for the next start of ngd :

```
ngd
```

### For a server behind a domain: create the first admin user

The current directory will be used to save all the config, keys and storage data.
If you prefer to change the base directory, use the argument `--base [PATH]` when using `ngd` and/or `ngcli`.

```
ngcli gen-key
ngd -v --save-key -l 1440 -d <SERVER_DOMAIN> --admin <THE_USER_ID_YOU_JUST_CREATED>
// note the server peerID from the logs
```

in another terminal:

```
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
ngd -l 1440 --save-config
ngcli -s 127.0.0.1,1440,<PEER_ID_OF_SERVER> -d <SERVER_DOMAIN> -u <THE_PRIVATE_KEY_OF_THE_USER_YOU_JUST_CREATED> --save-config
```
