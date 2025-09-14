# @ldo/test-solid-server

This is a reusable Solid Server to be used in Jest integration tests.

## Setup

Install cross-env

```
npm i --save-dev cross-env
```

Use the following to run your tests

```
"test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage",
```