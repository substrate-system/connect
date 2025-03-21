# connect
![tests](https://github.com/substrate-system/connect/actions/workflows/nodejs.yml/badge.svg)
[![types](https://img.shields.io/npm/types/@substrate-system/connect?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/connect)](https://packagephobia.com/result?p=@substrate-system/connect)
[![license](https://img.shields.io/badge/license-Polyform_Small_Business-249fbc?style=flat-square)](LICENSE)

This is a websocket client and server, with semantics appropriate for adding
a new machine to a resource, for example, adding a second machine to a "user" 
account.

This depends on [partykit](https://partykit.io/).

[See a live demo](https://substrate-system.github.io/connect/)

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [install](#install)
- [Modules](#modules)
  * [ESM](#esm)
  * [Common JS](#common-js)
  * [pre-built JS](#pre-built-js)
- [Use](#use)
  * [server](#server)
  * [client](#client)
- [API](#api)
  * [client](#client-1)

<!-- tocstop -->

</details>

## install

```sh
npm i -S @substrate-system/connect
```

## How this works
This uses some out-of-band data to approve or deny
a request. This was originally developed for the use-case of adding a new
machine to an existing user's account, so the method names and events are
appropriate for that use-case.

Each machine sends a single message to the other machine. The
root machine, the one that started the session, then either approves or denies
the other machine.

There is a server-side method `onApprove`, where you can run any
server-side logic for approving a request.

Also note the method `auth` that needs to be implemented.


----------------------------------------------------------------------


## Modules
This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

### ESM
```js
import { Connection } from '@substrate-system/connect'
```

### Common JS
```js
const { Connection } = require('@substrate-system/connect')
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

----------------------------------------


## Use
This is an example of the confirmation process, as would be relevant to
adding a second machine to an existing user.

Start a session from an authorized machine. You need to implement the `auth`
method in the serverside class. The `auth` method will be passed any data
that the existing device sent with the "approve" message.

### server
This is a partykit server instance.

Permissive CORS headers are exposed at `Connection.CORS`. Override this static
property to use different CORS headers.

The `Connection` class reads the response code in the `Response` obuject
returned from `auth`. That's how we **determine if we should open a**
**session or not**.

```js
import { Connection } from '@substrate-system/connect/server'
import type * as Party from 'partykit/server'
import {
    type ParsedHeader,
    parseHeader,
    verifyParsed
} from '@bicycle-codes/request'

export default class Server extends Connection implements Party.Server {
    /**
     * `auth` must be implemented by the consumer.
     * This is called when you start a new session.
     */
    async auth (req:Party.Request) {
        // first connection
        // check the auth header, then open the room
        const token = req.headers.get('authorization') ?? ''
        if (!token) {
            return new Response('Missing auth header', {
                status: 401,
                headers: Connection.CORS
            })
        }

        let header:ParsedHeader
        try {
            header = parseHeader<{ seq }>(token)
            if (!(await verifyParsed(header))) {
                throw new Error('bad header signature')
            }
        } catch (err) {
            // header parse failed
            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        // the parent class reads the response code returned here
        return new Response(null, { status: 200, headers: Connection.CORS })
    }

    /**
     * Must implement `onApprove`.
     * The new machine has been verified by the original machine.
     */
    async onApprove (msg:JSONSerializeable):Promise<this> {
        console.log('approved this machine', msg)
        // add the new machine to a database...
        return this
    }

    /**
     * Must implement `onReject`.
     */
    async onReject (msg:JSONSerializeable):Promise<this> {
        console.log('reject this machine', msg)
        return this
    }
}

Server satisfies Party.Worker
```

-------------------------------------------------------

### client
The client-side websocket implements semantics that are appropriate for the
use-case: methods `init`, `join`, `approve` and `reject`, and events `note`,
`join`, `approve`, and `reject`.


#### The existing device
The existing (already verified) device should call the `init` method.
Under the hood, this will make a `POST` request to our partykit server
to authenticate, which is necessary for the server to allow
websocket connections.

You an add a "note" to the request, which is any JSON serializable data.
The note will be sent to the new machine when it connects.

```ts
import { Connection } from '@substrate-system/connect'
import Debug from '@substrate-system/debug'
const debug = Debug()

/**
 * Called by the existing device, to open a new session.
 */
async function init (ev:SubmitEvent) {
    ev.preventDefault()

    // an example of auth via headers
    const [code, ws] = await Connection.init(
        'https://connect.nichoth.partykit.dev',
        {
            headers: { authorization: await createHeaders() },
            note: 'hello new machine'
        }
    )
    setConnection(ws)
    setCode(code)

    ws.addEventListener('join', ev => {
        const detail = ev.detail
        debug('second machine is here', detail)
    })
}
```

#### The new device
The new device should call the `join` method. The server implementation will
reject connections that are to a room name that has not been verified
previously, meaning `join` must be called after the other machine has called
`init`.

The `join` method accepts a third argument of some arbitrary data,
which will be JSON encoded and send to the other machine via websocket.

After getting a websocket via `join`, it will emit several events specific
to the use-case:

* `note` -- some data created by the existing device.
* `approve` -- when the other device sends an "approve" message
* `reject` -- if the other device sends a "reject" message

```ts
import { Connection } from '@substrate-system/connect'
import Debug from '@substrate-system/debug'
const debug = Debug()
const PARTYKIT_HOST:string = (import.meta.env.DEV ?
    'http://localhost:1999' :
    'https://example-party.username.partykit.dev')

/**
 * Called by the new machine.
 */
async function startConnection (ev:SubmitEvent) {
    ev.preventDefault()
    const els = (ev.target as HTMLFormElement).elements
    const code = els['code'].value
    const note = els['joinnote'].value
    // Can send arbitrary data with the `join` message.
    const ws = await Connection.join(code, PARTYKIT_HOST, { note })

    // the note sent by the existing device
    ws.addEventListener('note', function onNote (ev) {
        setNote(ev.detail)
        ws.removeEventListener('note', onNote)
    })

    // domain-specific events
    ws.addEventListener('approve', function onApprove (ev) {
        debug('the new device was approved', ev.detail)
        ws.removeEventListener('approve', onApprove)
    })
    ws.addEventListener('reject', function onReject (ev) {
        debug('the new device was rejected :(', ev.detail)
        ws.removeEventListener('reject', onReject)
    })
}, [])
```

## API

### client
Don't use the constructor, use the static methods `init` and `join`.

#### Connection class

```ts
import { PartySocket, type PartySocketOptions } from 'partysocket'

export class Connection extends PartySocket {
    constructor (opts:PartySocketOptions) {
        // ...
    }
```

#### init
Should be called by the existing (already auth'd) device, to start a session.
Takes an optional argument for a function to create the "room name" in
partykit. The default is a 6 digit numeric code as room name.

```ts
class Connection {
    static async init (
        publicURL:string,
        opts:{ headers:Record<string, string>, note?:any },
        createRoom?:()=>string,
    ):Promise<[string, Connection]>
}
```

#### join
Should be called by the new device, after the existing device has called `init`.

```ts
class Connection {
    static async join (
        code:string,
        publicHost:string,
        data?:any,
    ):Promise<Connection>
}
```
