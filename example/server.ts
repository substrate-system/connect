import type * as Party from 'partykit/server'
import {
    type ParsedHeader,
    parseHeader,
    verifyParsed
} from '@bicycle-codes/request'
import { Connection } from '../src/server.js'

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
            console.log('**header parse failed**', err)

            return new Response('Invalid header', {
                status: 403,
                headers: Connection.CORS
            })
        }

        return new Response(null, { status: 200, headers: Connection.CORS })
    }

    /**
     * The new machine has been verified by the original machine.
     */
    async onApprove (msg:JSONSerializeable):Promise<this> {
        console.log('approved this machine', msg)
        // add the new machine to a database...
        return this
    }

    async onReject (msg:JSONSerializeable):Promise<this> {
        console.log('reject this machine', msg)
        return this
    }
}

Server satisfies Party.Worker
