# @ldo/connected

@ldo/connected provides tools for LDO to connect to a remote datasource. It requires plugins for that datasource.

## Installation

Navigate into your project's root folder and run the following command:
```
cd my_project/
npx run @ldo/cli init
```

Now install the @ldo/solid library

```
npm i @ldo/connected
```

You may also install a connected plugin, for example `@ldo/connected-solid` and `@ldo/connected-nextgraph`.

```
npm i @ldo/connected-nextgraph
```

<details>
<summary>
Manual Installation
</summary>

If you already have generated ShapeTypes, you may install the `@ldo/ldo` and `@ldo/solid` libraries independently.

```
npm i @ldo/ldo @ldo/solid
```
</details>

## Simple Examples

Below is a simple example of @ldo/solid. Assume that a ShapeType was previously generated and placed at `./.ldo/foafProfile.shapeTypes`. Also assume we have a shape type for social media at `./.ldo/socialMediaPost.shapeTypes`

```typescript
import {
  changeData,
  commitData,
  createConnectedLdoDataset
} from "@ldo/connected";
import { solidConnectedPlugin } from "@ldo/connected-solid";
import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";


// Shape Types
import { FoafProfileShapeType } from "./.ldo/foafProfile.shapeTypes.js";
import { SocialMediaPostShapeType } from "./.ldo/socialMediaPost.shapeTypes.js";

// These are tools for Solid and NextGraph outside of the LDO ecosystem
import { fetch, getDefaultSession } from "@inrupt/solid-client-authn-browser";
import ng from "nextgraph";

async function main() {
  /**
   * ===========================================================================
   * SETTING UP A CONNECTED LDO DATASTORE WITH 2 PLUGINS
   * ===========================================================================
   */
  const connectedLdoDataset = createConnectedLdoDataset([
    solidConncetedPlugin,
    nextGraphConnectedPlugin
  ]);
  // Set context to be able to make authenticated requests
  connectedLdoDataset.setContext("solid", { fetch });
  const session = await ng.session_in_memory_start(
    openedWallet.V0.wallet_id,
    openedWallet.V0.personal_site
  );
  connectedLdoDataset.setContext("nextGraph", { sessionId: session.sessionId });

  /**
   * ===========================================================================
   * READING DATA FROM REMOTE
   * ===========================================================================
   */

  // We can get a Solid resource by including a Solid-Compatible URL
  const solidResource = solidLdoDataset.getResource(
    "https://pod.example.com/profile.ttl"
  );
  // Similarly, we can get a NextGraph resource by including a
  // NextGraph-Compatible URL
  const nextGraphResource = solidLdoDataset.getResource(
    "did:ng:o:W6GCQRfQkNTLtSS_2-QhKPJPkhEtLVh-B5lzpWMjGNEA:v:h8ViqyhCYMS2I6IKwPrY6UZi4ougUm1gpM4QnxlmNMQA"
  );
  // Optionally, you can provide the name of the specific plugin you want to use
  const anotherSolidResource = solidLdoDataset.getResource("", "solid");


  // This resource is currently unfetched
  console.log(solidResource.isUnfetched()); // Logs true
  console.log(nextGraphResource.isUnfetched()); // Logs true

  // So let's fetch it! Running the `read` command will make a request to get
  // the WebId.
  const solidReadResult = await solidResource.read();
  const ngReadResult = await nextGraphREsource.read();

  // @ldo/connected will never throw an error. Instead, it will return errors.
  // This design decision was made to force you to handle any errors. It may
  // seem a bit annoying at first, but it will result in more resiliant code.
  // You can easily follow intellisense tooltips to see what kinds of errors
  // each action can throw.
  if (solidReadResult.isError) {
    switch (solidReadResult.type) {
      case "serverError":
        console.error("The solid server had an error:", solidReadResult.message);
        return;
      case "noncompliantPodError":
        console.error("The Pod responded in a way not compliant with the spec");
        return;
      default:
        console.error("Some other error was detected:", solidReadResult.message);
    }
  }

  // When fetching a data resource, read triples will automatically be added to
  // the solidLdoDataset. You can access them using Linked Data Objects. In
  // the following example we're using a Profile Linked Data Object that was
  // generated with the init step.
  const profile = connectedLdoDataset
    .usingType(FoafProfileShapeType)
    .fromSubject("https://pod.example.com/profile#me");

  // Now you can read "profile" like any JSON.
  console.log(profile.name);

  /**
   * ===========================================================================
   * MODIFYING DATA
   * ===========================================================================
   */

  // When we want to modify data the first step is to use the `changeData`
  // function. We pass in an object that we want to change (in this case,
  // "profile") as well an a list of any resources to which we want those
  // changes to be applied (in this case, just the webIdResource). This gives
  // us a new variable (conventionally named with a c for "changed") that we can
  // write changes to.
  const cProfile = changeData(profile, solidResource);

  // We can make changes just like it's regular JSON
  cProfile.name = "Captain Cool Dude";

  // Committing data is as easy as running the "commitData" function.
  const commitResult = await commitData(cProfile);

  // Remember to check for and handle errors! We'll keep it short this time.
  if (commitResult.isError) throw commitResult;

  /**
   * ===========================================================================
   * CREATING NEW RESOURCES
   * ===========================================================================
   */

  // Let's create some social media posts to be stored on the Solid Pod and in
  // NextGraph! We can create new resources using the "createResource" method.
  const newSolidResource = await connectedLdoDataset.createResource("solid");
  const newNgResource = await connectedLdoDataset.createResource("nextGraph");

  // For Solid, you can also create resources at a predefined location
  const postContainer = connectedLdoDataset
    .getResource("https://pod.example.com/socialPosts/");
  const createPostContainerResult =
    await solidSocialPostsContainer.createIfAbsent();
  if (createPostContainerResult.isError) throw createPostContainerResult;
  const postResourceResult =
    await postContainer.createChildAndOverwrite("post1.ttl");
  if (postResourceResult.isError) throw postResourceResult;
  const postResource = postResourceResult.resource;

  // We can also create binary resources with things like images
  const imageResourceResult = await postContainer.uploadChildAndOverwrite(
    // name of the binary
    "image1.svg",
    // A blob for the binary
    new Blob([`<svg><circle r="9" /></svg>`]),
    // mime type of the binary
    "image/svg+xml",
  );
  if (imageResourceResult.isError) throw imageResourceResult;
  const imageResource = imageResourceResult.resource;

  /**
   * ===========================================================================
   * CREATING NEW DATA
   * ===========================================================================
   */

  // We create data in a similar way to the way we modify data. We can use the
  // "createData" method.
  const cPost = solidLdoDataset.createData(
    // An LDO ShapeType saying that this is a social media psot
    SocialMediaPostShapeType,
    // The URI of the post (in this case we'll make it the same as the resource)
    postResource.uri,
    // The resource we should write it to
    postResource,
  );

  // We can add new data
  cPost.text = "Check out this bad svg:";
  cPost.image = { "@id": imageResource.uri };

  // And now we commit data
  const newDataResult = await commitData(cPost);
  if (newDataResult.isError) throw newDataResult;

  /**
   * ===========================================================================
   * DELETING RESOURCES
   * ===========================================================================
   */

  // Deleting resources can be done with a single method call. In this case,
  // the container will be deleted along with all its contained resources
  const deleteResult = await postContainer.delete();
  if (deleteResult.isError) throw deleteResult;
}
main();
```

## API Details

ConnectedLdoDataset

- [createConnectedLdoDataset](https://ldo.js.org/latest/api/connected/functions/createConnectedLdoDataset/)
- [ConnectedLdoDataset](https://ldo.js.org/latest/api/connected/classes/ConnectedLdoDataset/)
- [ConnectedLdoTransactionDataset](https://ldo.js.org/latest/api/connected/classes/ConnectedLdoTransactionDataset/)
- [IConnectedLdoDataset](https://ldo.js.org/latest/api/connected/interfaces/IConnectedLdoDataset/)

ConnectedPlugins

- [ConnectedPlugin](https://ldo.js.org/latest/api/connected/interfaces/ConnectedPlugin/)

Resources (Manage batching requests)

- [Resource](https://ldo.js.org/latest/api/connected/interfaces/Resource/)

Data Functions

- [changeData](https://ldo.js.org/latest/api/connected/functions/changeData/)
- [commitData](https://ldo.js.org/latest/api/connected/functions/commitData/)

SuccessResult

- [SuccessResult](https://ldo.js.org/latest/api/connected/classes/SuccessResult/)
- [AbsentReadSuccess](https://ldo.js.org/latest/api/connected/classes/AbsentReadSuccess/)
- [AggregateSuccess](https://ldo.js.org/latest/api/connected/classes/AggregateSuccess/)
- [IgnoredInvalidUpdateSuccess](https://ldo.js.org/latest/api/connected/classes/IgnoredInvalidUpdateSuccess/)
- [ReadSuccess](https://ldo.js.org/latest/api/connected/classes/ReadSuccess/)
- [ResourceSuccess](https://ldo.js.org/latest/api/connected/classes/ResourceSuccess/)
- [Unfetched](https://ldo.js.org/latest/api/connected/classes/Unfetched/)
- [UpdateDefaultGraphSuccess](https://ldo.js.org/latest/api/connected/classes/UpdateDefaultGraphSuccess/)
- [UpdateSuccess](https://ldo.js.org/latest/api/connected/classes/UpdateSuccess/)å

ErrorResult

- [ErrorResult](https://ldo.js.org/latest/api/connected/classes/ErrorResult/)
- [AggregateError](https://ldo.js.org/latest/api/connected/classes/AggregateError/)
- [DisconnectedAttemptingReconnectError](https://ldo.js.org/latest/api/connected/classes/DisconnectedAttemptingReconnectError/)
- [InvalidUriError](https://ldo.js.org/latest/api/connected/classes/InvalidUriError/)
- [ResourceError](https://ldo.js.org/latest/api/connected/classes/ResourceError/)
- [UnexpectedResourceError](https://ldo.js.org/latest/api/connected/classes/UnexpectedResourceError/)
- [UnsupportedNotificationError](https://ldo.js.org/latest/api/connected/classes/UnsupportedNotificationError/)

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
