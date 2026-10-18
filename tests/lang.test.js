import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'fs'

const folder = new URL('../static/lang/', import.meta.url)
const en = JSON.parse(fs.readFileSync(new URL('en.json', folder), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(new URL('../static/module.json', import.meta.url), 'utf8'))

for (const language of manifest.languages.filter(l => l.path !== 'lang/en.json')) {
  test(language.path + ' has the same keys and placeholders as en.json', () => {
    const strings = JSON.parse(fs.readFileSync(new URL('../static/' + language.path, import.meta.url), 'utf8'))
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(en).sort())
    for (const key in en) {
      assert.deepEqual(strings[key].match(/\{\w+\}/g)?.sort() ?? [], en[key].match(/\{\w+\}/g)?.sort() ?? [], key)
    }
  })
}
