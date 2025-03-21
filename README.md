# connect
![tests](https://github.com/substrate-system/connect/actions/workflows/nodejs.yml/badge.svg)
[![types](https://img.shields.io/npm/types/@substrate-system/connect?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/connect)](https://packagephobia.com/result?p=@substrate-system/connect)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![license](https://img.shields.io/badge/license-Polyform_Small_Business-249fbc?style=flat-square)](LICENSE)

A websocket client and server, with semantics for adding
a second machine to an account.

This depends on [partykit](https://partykit.io/)

[See a live demo](https://substrate-system.github.io/connect/)

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
</details>

## install

```sh
npm i -S @substrate-system/connect
```

## API

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

### ESM
```js
import '@substrate-system/connect'
```

### Common JS
```js
require('@substrate-system/connect')
```

## use

### JS
```js
import { Connection } from '@substrate-system/connect'
```

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/connect/dist/index.min.js ./public/connect.min.js
```

#### HTML
```html
<script type="module" src="./connect.min.js"></script>
```
