import type * as Party from 'partykit/server'

const codeRegex = /^[0-9]{1,6}$/

/**
 * The websocket server
 *   - Open a room with a 6 digit code as name. Need to do a POST request
 *     to "open" the room.
 *   - Once a room is "open", then the new machine can connect.
 *
 * Room ID is defined in the Party URL, e.g. /parties/:name/:roomId.
 */
export abstract class Connection implements Party.Server {
    readonly room:Party.Room
    private note:null|false|string
    static CORS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'HEAD, POST, GET, OPTIONS',
        'Access-Control-Allow-Headers':
            'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    }

    constructor (room:Party.Room) {
        this.room = room
        this.note = null
    }

    /**
     * Is this room name a 6 digit number?
     */
    get isCodeRoom ():boolean {
        return codeRegex.test(this.room.id)
    }

    /**
     * This room has the idea of being "open".
     * Must get an auth'd POST request to the room to open it, before any WS
     * connections
     */
    get isOpen ():boolean {
        return (this.note !== null)
    }

    /**
     * Consumer must implement this method. We use this when an exising
     * machine "opens" a room. This is called in the `onRequest` method.
     */
    abstract auth (req:Party.Request):Promise<Response>

    abstract onApprove (msg:JSONSerializeable):Promise<this>

    abstract onReject (msg:JSONSerializeable):Promise<this>

    /**
     * The existing device must make a POST request before the new machine
     * tries to connect. The POST request will have a signature that we verify.
     * Then the new machine connects. If this room has not been verified, then
     * the new machine is rejected.
     *
     * Each room has the concept of being "open" or "closed"
     * to open a room, you need to make a POST request
     * with a valid key + signature.
     *
     * The new machine makes a `PATCH` reuqest. It sends the server two random
     * words, which we show to the existing machine.
     *
     * If the existing machine approves the new machine, then we add the new
     * machine to the DB.
     */
    async onRequest (req:Party.Request):Promise<Response> {
        if (req.method === 'OPTIONS') {
            // respond to cors preflight requests
            return new Response(null, {
                status: 200,
                headers: Connection.CORS
            })
        }

        if (req.method === 'HEAD') {
            // this is the existing machine, checking if the room name
            // has been used yet. 200 means it is not in use.
            if (!this.isOpen) {
                return new Response(null, {
                    status: 200,
                    headers: Connection.CORS
                })
            } else {
                return new Response(null, {
                    status: 409,
                    headers: Connection.CORS
                })
            }
        }

        /**
         * The new device does a GET request, which returns
         * the note.
         */
        if (req.method === 'GET') {
            if (!this.isOpen) {
                return new Response(null, {
                    status: 409,
                    headers: Connection.CORS
                })
            }

            // is open
            // this is the new machine
            return Response.json({ note: this.note }, {
                status: 200,
                headers: Connection.CORS
            })
        }

        /**
         * First request should be a POST, to open the room.
         */
        if (req.method === 'POST') {
            // check the signature of the request,
            // make sure it is valid for the DID &
            // is authorized for the given username
            if (this.isOpen) {
                // this should not happen
                // this means this is not the first connection
                // the new machine does not do POST calls
                return new Response(null, {
                    status: 409,
                    headers: Connection.CORS
                })
            }

            // Need to auth the first machine.
            // Should happen in implementation code.
            const res = await this.auth(req)

            // if auth fail
            if (!(res.status >= 200 && res.status < 300)) {
                return res
            }

            // else, handle the incoming `note`
            let msg:{ note:string }
            try {
                msg = await req.json<{ note:string }>()
            } catch (err) {
                console.log('**err parsing**', err)
                return new Response(null, {
                    status: 422,
                    headers: Connection.CORS
                })
            }

            this.note = msg.note || false

            return res
        }

        return new Response(null, { status: 405, headers: Connection.CORS })
    }

    /**
     * Need to do a POST call to this room to "open" it before WS connection.
     */
    async onConnect (conn:Party.Connection) {
        if (!this.isOpen) {
            // must call with a POST request to "open" the room, handle auth
            return conn.close(1002, 'Room is not open')
        }
    }

    async onMessage (message:string, sender:Party.Connection) {
        if (!this.isOpen) {
            // should not happen
            return
        }

        // new machine sends an arbitrary message

        // existing machine listens for the message, then
        // approves the new machine, and sends a message telling
        // the new machine it was approved

        const msg:{ type:string } = JSON.parse(message)
        if (msg.type === 'approve') {
            // emit approve event here
            this.onApprove(msg)
        }

        if (msg.type === 'reject') {
            this.onReject(msg)
        }

        // tell the other machine
        this.room.broadcast(message, [sender.id])
    }
}
