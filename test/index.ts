import { test } from '@substrate-system/tapzero'
import { HeaderFactory } from '@bicycle-codes/request'
import { Keys } from '@bicycle-codes/keys'
import { Connection } from '../src/index.js'

const PARTY_URL = 'http://localhost:1999'
let init:Connection
let code:string
test('initialize connection', async t => {
    // for the auth header
    const keys = await Keys.load()
    await keys.persist()
    const createHeaders = HeaderFactory({
        privateKey: keys.privateSignKey,
        publicKey: keys.publicSignKey
    })

    const [newCode, ws] = await Connection.init(PARTY_URL, {
        headers: { authorization: await createHeaders() },
        note: 'hello'
    })

    code = newCode
    init = ws
    t.equal(typeof newCode, 'string', 'should return a code')
})

test('events', async t => {
    t.plan(3)
    const newMachine = await Connection.join(code, PARTY_URL)

    init.addEventListener('join', ev => {
        console.log('join event...', ev)
        t.ok(ev, 'should get a join event')
        setTimeout(() => {
            init.approve()
        }, 0)
    })

    newMachine.addEventListener('approve', ev => {
        console.log('approved!', ev)
        t.ok(ev, 'should get approval message')
    })

    newMachine.addEventListener('note', function onNote (ev) {
        console.log('**** note ****', JSON.stringify(ev.detail, null, 2))
        t.ok(ev)
        // t.equal(ev.data.note, 'hello', 'should get the note from machine 1')
    })
})
