import { type FunctionComponent, render } from 'preact'
import { html } from 'htm/preact'
import { useCallback, useState } from 'preact/hooks'
import { HeaderFactory } from '@bicycle-codes/request'
import { Keys } from '@bicycle-codes/keys'
import { Connection } from '../src/index.js'
import Debug from '@substrate-system/debug'
const debug = Debug()

const PARTYKIT_HOST:string = (import.meta.env.DEV ?
    'http://localhost:1999' :
    'https://connect.nichoth.partykit.dev')

// for the auth header
const keys = await Keys.load()
await keys.persist()
const createHeaders = HeaderFactory({
    privateKey: keys.privateSignKey,
    publicKey: keys.publicSignKey
})

const Example:FunctionComponent<unknown> = function () {
    const [connection, setConnection] = useState<WebSocket|null>(null)
    const [code, setCode] = useState<string|null>(null)
    const [otherMachine, setOtherMachine] = useState<string|null>(null)

    debug('connection', connection)

    const init = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        debug('submit')
        const els = (ev.target as HTMLFormElement).elements
        const note = els['note']
        const [code, ws] = await Connection.init(
            'https://connect.nichoth.partykit.dev',
            {
                headers: { authorization: await createHeaders() },
                note
            }
        )
        debug('connected...', ws)
        debug('the code', code)
        setConnection(ws)
        setCode(code)

        ws.addEventListener('join', ev => {
            const detail = ev.detail
            debug('second machine is here', detail)
            setOtherMachine(detail)
        })
    }, [])

    const join = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const code = els['code']
        const ws = await Connection.join(code, PARTYKIT_HOST, {
            hello: 'hello'
        })
        setConnection(ws)
    }, [])

    return html`<div>
        <p>
            Room number: <code>${code}</code>
        </p>

        <div>
            Connected? ${(!!connection).toString()}
        </div>

        <div>
            Other machine connected? ${(!!otherMachine).toString()}
        </div>

        <form onSubmit=${init}>
            <label for="note">Note</label>
            <input id="note" name="note" type="text" />
            <button type="submit">init</button>
        </form>

        <form onSubmit=${join}>
            <label for="code">Code</label>
            <input name="code" id="code" type="number" />
            <button type="submit">Join</button>
        </form>
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
