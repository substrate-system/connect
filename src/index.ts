import { PartySocket } from 'partysocket'
import { createDebug } from '@substrate-system/debug'
const debug = createDebug()

export function Linker (WS:PartySocket) {
    debug('in here', WS)

    class Party extends PartySocket {

    }

    return Party
}
