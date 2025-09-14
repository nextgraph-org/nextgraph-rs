# @ldo/connected-solid

@ldo/solid is a client that implements the Solid specification with the use of Linked Data Objects.

## Installation

Navigate into your project's root folder and run the following command:
```
cd my_project/
npx run @ldo/cli init
```

Now install the @ldo/connected-solid library

```
npm i @ldo/connected-solid
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
import { changeData, commitData } from "@ldo/connected";
import { createSolidLdoDataset } from "@ldo/solid";
import { fetch, getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { FoafProfileShapeType } from "./.ldo/foafProfile.shapeTypes.js";
import { SocialMediaPostShapeType } from "./.ldo/socialMediaPost.shapeTypes.js";

async function main() {
  /**
   * ===========================================================================
   * READING DATA FROM A POD
   * ===========================================================================
   */

  // Before we begin using @ldo/solid. Let's get the WebId of the current user
  const webIdUri = getDefaultSession().info.webId;
  if (!webIdUri) throw new Error("User is not logged in");

  // Now let's proceed with @ldo/solid. Our first step is setting up a
  // SolidLdoDataset. You can think of this dataset as a local store for all the
  // information in the Solidverse. Don't forget to pass the authenticated fetch
  // function to do your queries!
  const solidLdoDataset = createSolidLdoDataset();
  solidLdoDataset.setContext({ fetch });

  // We'll start with getting a representation of our WebId's resource
  const webIdResource = solidLdoDataset.getResource(webIdUri);

  // This resource is currently unfetched
  console.log(webIdResource.isUnfetched()); // Logs true

  // So let's fetch it! Running the `read` command will make a request to get
  // the WebId.
  const readResult = await webIdResource.read();

  // @ldo/solid will never throw an error. Instead, it will return errors. This
  // design decision was made to force you to handle any errors. It may seem a
  // bit annoying at first, but it will result in more resiliant code. You can
  // easily follow intellisense tooltips to see what kinds of errors each action
  // can throw.
  if (readResult.isError) {
    switch (readResult.type) {
      case "serverError":
        console.error("The solid server had an error:", readResult.message);
        return;
      case "noncompliantPodError":
        console.error("The Pod responded in a way not compliant with the spec");
        return;
      default:
        console.error("Some other error was detected:", readResult.message);
    }
  }

  // When fetching a data resource, read triples will automatically be added to
  // the solidLdoDataset. You can access them using Linked Data Objects. In
  // the following example we're using a Profile Linked Data Object that was
  // generated with the init step.
  const profile = solidLdoDataset
    .usingType(FoafProfileShapeType)
    .fromSubject(webIdUri);

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
  const cProfile = changeData(profile, webIdResource);

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

  // Let's create some social media posts to be stored on the Solid Pod!
  // Our first step is going to be finding where to place these posts. In the
  // future, there will be advanced ways to determine the location of resources
  // but for now, let's throw it in the root folder.

  // But, first, let's find out where the root folder is. We can take our WebId
  // resource and call `getRootContainer`. Let's assume the root container has
  // a URI "https://example.com/"
  const rootContainer = await webIdResource.getRootContainer();
  if (rootContainer.isError) throw rootContainer;

  // Now, let's create a container for our posts
  const createPostContainerResult =
    await rootContainer.createChildIfAbsent("social-posts/");
  if (createPostContainerResult.isError) throw createPostContainerResult;

  // Most results store the affected resource in the "resource" field. This
  // container has the URI "https://example.com/social-posts/"
  const postContainer = createPostContainerResult.resource;

  // Now that we have our container, let's make a Post resource! This is a data
  // resource, which means we can put raw Solid Data (RDF) into it.
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

SolidLdoDataset

 - [createSolidLdoDataset](https://ldo.js.org/latest/api/solid/functions/createSolidLdoDataset/)

Resources (Manage batching requests)

 - [SolidResource](https://ldo.js.org/latest/api/classes/SolidResource/)
 - [SolidLeafUri](https://ldo.js.org/latest/api/solid/types/SolidLeafUri/)
 - [SolidContainerUri](https://ldo.js.org/latest/api/solid/types/SolidContainerUri/)
 - [SolidLeaf](https://ldo.js.org/latest/api/solid/classes/SolidLeaf/)
 - [SolidContainer](https://ldo.js.org/latest/api/solid/classes/SolidContainer/)


## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT
