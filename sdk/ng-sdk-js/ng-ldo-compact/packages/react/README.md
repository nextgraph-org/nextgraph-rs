# @ldo/react

`@ldo/react` provides tool and hooks for easily building Solid applications using react.

## Guide

A full walkthrough for using the `@ldo/solid` library can be found in the [For Solid + React Guide](https://ldo.js.org/latest/guides/solid_react/)

## Installation

Navigate into your project's root folder and run the following command:
```
cd my_project/
npx run @ldo/cli init
```

Now install the @ldo/solid library

```
npm i @ldo/solid @ldo/react
```

<details>
<summary>
Manual Installation
</summary>

If you already have generated ShapeTypes, you may install the `@ldo/ldo` and `@ldo/solid` libraries independently.

```
npm i @ldo/ldo @ldo/solid @ldo/react
```
</details>

## Simple Example

Below is a simple example of @ldo/react in a real use-case. Assume that a ShapeType was previously generated and placed at `./.ldo/solidProfile.shapeTypess`.


```typescript
import type { FunctionComponent } from "react";
import React, { useCallback } from "react";
import {
  BrowserSolidLdoProvider,
  useResource,
  useSolidAuth,
  useSubject,
} from "@ldo/react";
import { SolidProfileShapeShapeType } from "./.ldo/solidProfile.shapeTypes.js";
import { changeData, commitData } from "@ldo/solid";

// The base component for the app
const App: FunctionComponent = () => {
  return (
    /* The application should be surrounded with the BrowserSolidLdoProvider
    this will set up all the underlying infrastructure for the application */
    <BrowserSolidLdoProvider>
      <Login />
    </BrowserSolidLdoProvider>
  );
};

// A component that handles login
const Login: FunctionComponent = () => {
  // Get login information using the "useSolidAuth" hook
  const { login, logout, session } = useSolidAuth();

  const onLogin = useCallback(() => {
    const issuer = prompt("What is your Solid IDP?");
    // Call the "login" function to initiate login
    if (issuer) login(issuer);
  }, []);

  // You can use session.isLoggedIn to check if the user is logged in
  if (session.isLoggedIn) {
    return (
      <div>
        {/* Get the user's webId from session.webId */}
        <p>Logged in as {session.webId}</p>
        {/* Use the logout function to log out */}
        <button onClick={logout}>Log Out</button>
        <Profile />
      </div>
    );
  }
  return <button onClick={onLogin}>Log In</button>;
};

// Renders the name on the profile
const Profile: FunctionComponent = () => {
  const { session } = useSolidAuth();
  // With useResource, you can automatically fetch a resource
  const resource = useResource(session.webId);
  // With useSubject, you can extract data from that resource
  const profile = useSubject(SolidProfileShapeShapeType, session.webId);

  const onNameChange = useCallback(async (e) => {
    // Ensure that the
    if (!profile || !resource) return;
    // Change data lets you create a new object to make changes to
    const cProfile = changeData(profile, resource);
    // Change the name
    cProfile.name = e.target.value;
    // Commit the data back to the Pod
    await commitData(cProfile);
  }, []);

  return <input type="text" value={profile?.name} onChange={onNameChange} />;
};

export default App;
```

## API Details

Providers

 - [BrowserSolidLdoProvider](https://ldo.js.org/latest/api/react/BrowserSolidLdoProvider/)
 - [SolidLdoProvider](https://ldo.js.org/latest/api/react/SolidLdoProvider/)

Hooks
 - [useLdo](https://ldo.js.org/latest/api/react/useLdo/)
 - [useResource](https://ldo.js.org/latest/api/react/useResource/)
 - [useRootContainer](https://ldo.js.org/latest/api/react/useRootContainer/)
 - [useSolidAuth](https://ldo.js.org/latest/api/react/useSolidAuth/)
 - [useSubject](https://ldo.js.org/latest/api/react/useSubject/)
 - [useMatchSubject](https://ldo.js.org/latest/api/react/useMatchSubject/)
 - [useMatchObject](https://ldo.js.org/latest/api/react/useMatchSubject/)
 - [useSubscribeToResource](https://ldo.js.org/latest/api/react/useMatchSubject/)
 - [useLinkQuery](https://ldo.js.org/latest/api/react/useLinkQuery/)

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT