import { type FunctionComponent, render } from 'preact'
import { Linker } from '../src/index.js'
import Party from 'partysocket'
import { html } from 'htm/preact'
import Debug from '@substrate-system/debug'
const debug = Debug()

const party = new Party({
    host: 'localhost:1999',
    room: 'example'
})

Linker(party)

debug('party', party)

const Example:FunctionComponent<unknown> = function () {
    return html`<div>hello</div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
