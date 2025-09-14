# @ldo/cli

The `@ldo/cli` is a command line interface for initializing LDO and building ShapeTypes.

## Setup

### Automatic Setup
To setup LDO, `cd` into your typescript project and run `npx @ldo/cli init`.

```bash
cd my-typescript-project
npx @ldo/cli init
```

<details>
<summary>
Manual Setup
</summary>
The following is handled by the __automatic setup__:

Install the LDO dependencies.
```bash
npm install @ldo/ldo
npm install @ldo/cli --save-dev
```

Create a folder to store your ShEx shapes:
```bash
mkdir shapes
```

Create a script to build ShEx shapes and convert them into Linked Data Objects. You can put this script in `package.json`
```json
{
  ...
  scripts: {
    ...
    "build:ldo": "ldo build --input ./shapes --output ./ldo"
    ...
  }
  ...
}
```
</details>

## Generating a ShapeType

@ldo/cli generates shape types using the `*.shex` files in the "input" folder. If you followed the instructions above, run the following command:

```bash
npm run build:ldo
```

This will generate five files:
 - `./ldo/foafProfile.shapeTypes.ts` <-- This is the important file
 - `./ldo/foafProfile.typings.ts`
 - `./ldo/foafProfile.schema.ts`
 - `./ldo/foafProfile.context.ts`

## Creating a new project to distribure shapes

Sometimes, you might want to distribute shapes to others. The easiest way to do that is to deploy them to NPM. The LDO CLI has an easy-to-use command for generating a standalone project just for your shapes.

```bash
npx @ldo/cli create ./my-project
```

This script will generate a project with a place to put your shapes. Running `npm publish` will build the shapes and push to project to NPM for you.

## API Details
 - [`init` command](https://ldo.js.org/latest/api/cli/init/)
 - [`build` command](https://ldo.js.org/latest/api/cli/build/)
 - [`create` command](https://ldo.js.org/latest/api/cli/create/)


## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT