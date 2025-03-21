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
    // our ws connection
    const [connection, setConnection] = useState<Connection|null>(null)
    const [code, setCode] = useState<string|null>(null)
    // a string for the other machine
    const [otherMachine, setOtherMachine] = useState<any|null>(null)
    const [note, setNote] = useState<{ note:string }|null>(null)
    const [verified, setVerified] = useState<null|boolean>(null)

    const init = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const note = els['note'].value

        // an example of auth via headers
        const [code, ws] = await Connection.init(
            'https://connect.nichoth.partykit.dev',
            {
                headers: { authorization: await createHeaders() },
                note
            }
        )
        setConnection(ws)
        setCode(code)

        ws.addEventListener('join', ev => {
            const detail = ev.detail
            debug('second machine is here', detail)
            setOtherMachine(detail)
        })
    }, [])

    const approve = useCallback((ev:MouseEvent) => {
        debug('approve them', connection)
        ev.preventDefault()
        connection!.approve()
        setVerified(true)
    }, [connection])

    const join = useCallback(async (ev:SubmitEvent) => {
        ev.preventDefault()
        const els = (ev.target as HTMLFormElement).elements
        const code = els['code'].value
        const note = els['joinnote'].value
        const ws = await Connection.join(code, PARTYKIT_HOST, { note })
        setConnection(ws)
        setCode(code)
        ws.addEventListener('note', function onNote (ev) {
            setNote(ev.detail)
            ws.removeEventListener('note', onNote)
        })
        ws.addEventListener('approve', function onApprove (ev) {
            debug('the new device was approved', ev.detail)
            setVerified(true)
            ws.removeEventListener('approve', onApprove)
        })
        ws.addEventListener('reject', function onReject (ev) {
            setVerified(false)
            debug('the new device was rejected :(', ev.detail)
            ws.removeEventListener('reject', onReject)
        })
    }, [])

    return html`<div>
        <div>
            Room number: <code>${code}</code>
        </div>

        <div>
            Connected? ${(!!connection).toString()}
        </div>

        <div>
            Other machine connected? ${(!!otherMachine).toString()}
        </div>

        <div>
            Second device approved? ${(verified === null ?
                html`<code>null</code>` :
                html`<code>${verified.toString()}</code>`)}
        </div>

        <hr />

        <p>
            This demonstrates using websockets to authenticate &
            authorize a second machine for a user account.
        </p>

        ${note ?
            html`
                <p>
                    Note from the first machine:
                </p>
                <div><pre>${JSON.stringify(note, null, 2)}</pre></div>
            ` :
            null
        }

        ${otherMachine ?
            html`<div>
                The second machine is here.
                <pre>${JSON.stringify(otherMachine, null, 2)}</pre>

                <form>
                    <button onClick=${approve}>Approve</button>
                </form>
            </div>` :
            null
        }

        ${connection ?
            null :
            html`
                <form onSubmit=${init}>
                    <h2>Initiate connection</h2>
                    <p>
                        This session must be started by a machine that is
                        already active on your account.
                    </p>
                    <p>
                        We check the headers in a POST request to validate
                        the session.
                    </p>
                    <label for="note">Note</label>
                    <input id="note" name="note" type="text" />
                    <button type="submit">init</button>
                </form>

                <form onSubmit=${join}>
                    <h2>Connect to another machine</h2>
                    <p>
                        This should be filled out by the new machine,
                        with the room number created by the first machine.
                    </p>
                    <div>
                        <label for="joinnote">Note:</label>
                        <input id="joinnote" name="joinnote" type="text" />
                    </div>
                    <div>
                        <label for="code">Code</label>
                        <input name="code" id="code" type="number" />
                    </div>
                    <button type="submit">Join</button>
                </form>
            `
        }
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
