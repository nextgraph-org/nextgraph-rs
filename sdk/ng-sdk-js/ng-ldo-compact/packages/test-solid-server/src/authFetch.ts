import type { KeyPair } from "@inrupt/solid-client-authn-core";
import {
  buildAuthenticatedFetch,
  createDpopHeader,
  generateDpopKeyPair,
} from "@inrupt/solid-client-authn-core";
import fetch from "cross-fetch";

const config = {
  podName: "example",
  email: "hello@example.com",
  password: "abc123",
};

async function reportError(response: Response) {
  if (response.status >= 400) {
    console.error(await response.text());
  }
}

async function getAuthorization(port: number): Promise<string> {
  // First we request the account API controls to find out where we can log in
  const indexResponse = await fetch(`http://localhost:${port}/.account/`);
  const { controls } = await indexResponse.json();

  // And then we log in to the account API
  const response = await fetch(controls.password.login, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
    }),
  });
  // This authorization value will be used to authenticate in the next step
  await reportError(response);
  const result = await response.json();
  return result.authorization;
}

async function getSecret(
  port: number,
  authorization: string,
): Promise<{ id: string; secret: string; resource: string }> {
  // Now that we are logged in, we need to request the updated controls from the server.
  // These will now have more values than in the previous example.
  const indexResponse = await fetch(`http://localhost:${port}/.account/`, {
    headers: { authorization: `CSS-Account-Token ${authorization}` },
  });
  const { controls } = await indexResponse.json();

  // Here we request the server to generate a token on our account
  const response = await fetch(controls.account.clientCredentials, {
    method: "POST",
    headers: {
      authorization: `CSS-Account-Token ${authorization}`,
      "content-type": "application/json",
    },
    // The name field will be used when generating the ID of your token.
    // The WebID field determines which WebID you will identify as when using the token.
    // Only WebIDs linked to your account can be used.
    body: JSON.stringify({
      name: "my-token",
      webId: `http://localhost:${port}/${config.podName}/profile/card#me`,
    }),
  });
  await reportError(response);
  // These are the identifier and secret of your token.
  // Store the secret somewhere safe as there is no way to request it again from the server!
  // The `resource` value can be used to delete the token at a later point in time.
  const response2 = await response.json();
  return response2;
}

async function getAccessToken(
  port: number,
  id: string,
  secret: string,
): Promise<{ accessToken: string; dpopKey: KeyPair }> {
  try {
    // A key pair is needed for encryption.
    // This function from `solid-client-authn` generates such a pair for you.
    const dpopKey = await generateDpopKeyPair();

    // These are the ID and secret generated in the previous step.
    // Both the ID and the secret need to be form-encoded.
    const authString = `${encodeURIComponent(id)}:${encodeURIComponent(
      secret,
    )}`;
    // This URL can be found by looking at the "token_endpoint" field at
    // http://localhost:PORT/.well-known/openid-configuration
    // if your server is hosted at http://localhost:3000/.
    const tokenUrl = `http://localhost:${port}/.oidc/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        // The header needs to be in base64 encoding.
        authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
        dpop: await createDpopHeader(tokenUrl, "POST", dpopKey),
      },
      body: "grant_type=client_credentials&scope=webid",
    });
    await reportError(response);
    // This is the Access token that will be used to do an authenticated request to the server.
    // The JSON also contains an "expires_in" field in seconds,
    // which you can use to know when you need request a new Access token.
    const response2 = await response.json();
    return { accessToken: response2.access_token, dpopKey };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function generateAuthFetch(port: number) {
  const authorization = await getAuthorization(port);
  const { id, secret } = await getSecret(port, authorization);
  const { accessToken, dpopKey } = await getAccessToken(port, id, secret);
  return await buildAuthenticatedFetch(accessToken, { dpopKey });
}
