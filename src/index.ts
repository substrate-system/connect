import { customAlphabet } from 'nanoid'
import { numbers } from 'nanoid-dictionary'
import { PartySocket, type PartySocketOptions } from 'partysocket'
import { createDebug } from '@substrate-system/debug'
import ky, { type HTTPError } from 'ky'
const debug = createDebug()
const createCode = customAlphabet(numbers, 6)

// export const PARTYKIT_HOST:string = (import.meta.env.DEV ?
//     'https://connect.nichoth.partykit.dev')

export class Connection extends PartySocket {
    PARTYKIT_HOST:string

    constructor (opts:PartySocketOptions) {
        super(Object.assign(opts))

        this.PARTYKIT_HOST = opts.host
    }

    /**
     * Create a new WS room as a 6 digit numeric code.
     * Called by the existing machine.
     * @param {KyRequest} request Should be a POST request with some way of
     * authenticating.
     * @param {()=>string} [createRoom] A function to create the room name.
     * @returns {Promise<[string, WebSocket]>} The room name & websocket
     * instance.
     */
    static async init (
        publicURL:string,
        opts:{ headers:Record<string, string>, note?:any },
        createRoom?:()=>string,
    ):Promise<[string, Connection]> {
        const host = import.meta.env.DEV ? 'http://localhost:1999' : publicURL
        const code = await getRoom(host, createRoom)

        // first need to "open" the room -- send a POST request
        await ky.post(getPartyUrl(host, code), {
            json: { note: opts.note },
            headers: opts.headers
        })

        const ws = new Connection({
            host,
            room: code
        })

        ws.PARTYKIT_HOST = host

        debug('init', ws)

        ws.addEventListener('message', function onMessage (ev) {
            // we should get 1 message from the new machine
            const msg:{ type:string, data:any } = JSON.parse(ev.data)
            debug('got join event in init')

            if (msg.type === 'join') {
                const joinEv = new CustomEvent('join', {
                    bubbles: true,
                    cancelable: true,
                    detail: msg.data
                })
                ws.dispatchEvent(joinEv)

                return ws.removeEventListener('message', onMessage)
            }
            debug('unexpected message type', msg)
        })

        return [code, ws]
    }

    /**
     * Called by machine 1 after seeing machine 2 connect.
     */
    approve () {
        this.send(JSON.stringify({ type: 'approve' }))
    }

    /**
     * Called by machine 1 after seeing machine 2 connect.
     */
    reject () {
        this.send(JSON.stringify({ type: 'reject' }))
    }

    /**
     * This is called by the new machine, to connect to an existing machine.
     * The room must be opened before connecting.
     */
    static async join (
        code:string,
        publicHost:string,
        data?:any,
    ):Promise<Connection> {
        const host = (import.meta.env.DEV ?
            'http://localhost:1999' :
            publicHost)

        // first get the note from other machine
        const wsData:{ note } = await ky.get(getPartyUrl(host, code)).json()

        const ws = new Connection({
            host,
            room: code
        })

        const noteEvent = new CustomEvent('note', {
            bubbles: true,
            cancelable: true,
            detail: wsData
        })
        setTimeout(() => {
            ws.dispatchEvent(noteEvent)
        }, 0)

        ws.send(JSON.stringify({ type: 'join', data }))

        ws.addEventListener('message', function onMsg (ev) {
            const msg = JSON.parse(ev.data)
            const { type, data } = msg
            if (type === 'approve') {
                debug('approve msg in joiner', msg)
                const approveEvent = new CustomEvent('approve', {
                    bubbles: true,
                    cancelable: true,
                    detail: data
                })
                ws.dispatchEvent(approveEvent)
                return ws.removeEventListener('message', onMsg)
            }

            if (type === 'reject') {
                debug('reject msg in joiner')
                const rejectEvent = new CustomEvent('reject', {
                    bubbles: true,
                    cancelable: true,
                    detail: data
                })
                ws.dispatchEvent(rejectEvent)
                ws.removeEventListener('message', onMsg)
            }
        })

        return ws
    }
}

/**
 * Get a room in partykit. Make sure it doesn't collide with
 * any other room.
 */
async function getRoom (
    baseUrl:string,
    _createCode?:()=>string
):Promise<string> {
    const roomName = (_createCode && createCode()) || createCode()

    try {
        // 200 response means the room is available
        await ky.head(getPartyUrl(baseUrl, roomName))
        return roomName
    } catch (_err) {
        const err = _err as HTTPError
        if (err.response.status === 409) {
            // 409 response to a `HEAD` request means
            // the room is taken, so try again
            return getRoom(baseUrl)
        } else {
            // should not get any other errors
            throw err
        }
    }
}

export function getPartyUrl (baseUrl:string, code:string) {
    return baseUrl + `/parties/main/${code}`
}
