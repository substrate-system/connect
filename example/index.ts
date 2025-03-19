import { type FunctionComponent, render } from 'preact'
import { example } from '../src/index.js'
import Party from 'partysocket'
import { html } from 'htm/preact'
import Debug from '@substrate-system/debug'
const debug = Debug()

if (import.meta.env.DEV) {
    // @ts-expect-error dev
    window.debug = debug
}

example()

const party = new Party({
    host: 'localhost:1999',
    room: 'example'
})

debug('party', party)
console.log('party', party)
console.log('import meta debug var', import.meta.env.VITE_DEBUG)
console.log('import meta', import.meta.env.VITE_DEBUG)

debug('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

console.log('import meta env', import.meta.env.DEV)

const Example:FunctionComponent<unknown> = function () {
    return html`<div>hello</div>`
}

render(html`<${Example} />`, document.getElementById('root')!)
