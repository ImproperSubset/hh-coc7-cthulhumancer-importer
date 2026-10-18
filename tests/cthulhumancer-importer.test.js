import { test } from 'node:test'
import assert from 'node:assert/strict'
import HHCthulhumancerActorImporter from '../hh-coc7-cthulhumancer-importer/apps/cthulhumancer-importer.js'

// The two Foundry helpers the pure logic uses, as Foundry defines them
globalThis.foundry = {
  utils: {
    duplicate: (original) => JSON.parse(JSON.stringify(original)),
    setProperty: (object, key, value) => {
      const parts = key.split('.')
      let target = object
      for (const part of parts.slice(0, -1)) {
        if (typeof target[part] !== 'object' || target[part] === null) {
          target[part] = {}
        }
        target = target[part]
      }
      target[parts[parts.length - 1]] = value
      return true
    }
  }
}

const skill = (name, adjustments = {}, flags = {}) => ({ name, type: 'skill', system: { adjustments, flags } })
const names = (entries) => entries.map(e => e.name)

test('a Cthulhumancer export is a character with _cthulhumancer data and items', () => {
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer({ _cthulhumancer: {}, type: 'character', items: [] }), true)
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer({ _cthulhumancer: null, type: 'character', items: [] }), false)
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer({ _cthulhumancer: {}, type: 'npc', items: [] }), false)
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer({ _cthulhumancer: {}, type: 'character' }), false)
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer({ Investigator: {} }), false)
  assert.equal(HHCthulhumancerActorImporter.isCthulhumancer(undefined), false)
})

test('skill names lose extra spaces and Art / Craft is written as the system writes it', () => {
  assert.equal(HHCthulhumancerActorImporter.makeSkillName('  Spot   Hidden '), 'Spot Hidden')
  assert.equal(HHCthulhumancerActorImporter.makeSkillName('Art / Craft (Acting)'), 'Art/Craft (Acting)')
  assert.equal(HHCthulhumancerActorImporter.makeSkillName('art/craft (Forgery)'), 'Art/Craft (Forgery)')
})

test('duplicate skills add their points, keep the higher base and keep any flag', () => {
  const merged = skill('Fighting (Brawl)', { base: '25', occupation: '20' }, { occupation: true })
  HHCthulhumancerActorImporter.mergeSkill(merged, skill('Fighting (Brawl)', { base: '30', occupation: '10', archetype: 5 }, { archetype: true }))
  assert.deepEqual(merged.system.adjustments, { base: 30, occupation: 30, archetype: 5 })
  assert.deepEqual(merged.system.flags, { occupation: true, archetype: true })
})

test('a skill is at its default with no points beyond its base and no occupation or archetype flag', () => {
  assert.equal(HHCthulhumancerActorImporter.isAtDefault(skill('Listen', { base: 20, personal: 0 })), true)
  assert.equal(HHCthulhumancerActorImporter.isAtDefault(skill('Listen', { base: 20, personal: 5 })), false)
  assert.equal(HHCthulhumancerActorImporter.isAtDefault(skill('Listen', { base: 20 }, { occupation: true })), false)
  assert.equal(HHCthulhumancerActorImporter.isAtDefault(skill('Listen', { base: 20 }, { archetype: true })), false)
})

test('filtering merges duplicates and drops unspent specializations and unspent generic skills', () => {
  const filtered = HHCthulhumancerActorImporter.filterSkills([
    skill('Science', { base: 1 }),
    skill('Science (Biology)', { base: 1, occupation: 40 }),
    skill('Science (Chemistry)', { base: 1 }),
    skill('Art / Craft', { base: 5 }),
    skill('Listen', { base: 20 }),
    skill('Listen', { base: 20, personal: 10 })
  ], 60)
  assert.deepEqual(names(filtered), ['Science (Biology)', 'Art/Craft', 'Listen'])
  assert.equal(filtered[2].skill.system.adjustments.personal, 10)
})

test('unspent specializations every investigator has, and skills the player added, are kept', () => {
  const filtered = HHCthulhumancerActorImporter.filterSkills([
    skill('Fighting (Brawl)', { base: 25 }),
    skill('Firearms (Handgun)', { base: 20 }),
    skill('Firearms (Rifle/Shotgun)', { base: 25 }),
    skill('Language (English)', { base: 60 }),
    skill('Language (Latin)', { base: 1 }),
    skill('Pilot (Aircraft)', { base: 1 }),
    skill('Survival (Desert)', { base: 10 })
  ], 60, ['survival (desert)'])
  assert.deepEqual(names(filtered), ['Fighting (Brawl)', 'Firearms (Handgun)', 'Firearms (Rifle/Shotgun)', 'Language (English)', 'Survival (Desert)'])
})

test('the own language is the one whose base is EDU', () => {
  const entry = { name: 'Language (French)', skill: skill('Language (French)', { base: '70' }) }
  assert.equal(HHCthulhumancerActorImporter.isOwnLanguage(entry, 70), true)
  assert.equal(HHCthulhumancerActorImporter.isOwnLanguage(entry, 60), false)
  assert.equal(HHCthulhumancerActorImporter.isOwnLanguage(entry, undefined), false)
  assert.equal(HHCthulhumancerActorImporter.isOwnLanguage({ name: 'Listen', skill: skill('Listen', { base: 70 }) }, 70), false)
})

test('skills the player added are read from Cthulhumancer state', () => {
  const data = { _cthulhumancer: { state: { customSkills: [{ name: 'Art / Craft (Origami)' }, { name: 5 }, null] } } }
  assert.deepEqual(HHCthulhumancerActorImporter.customSkillNames(data), ['art/craft (origami)'])
  assert.deepEqual(HHCthulhumancerActorImporter.customSkillNames({}), [])
})

test('gear comes from gearItems, or from the semicolon separated gear text', () => {
  assert.deepEqual(HHCthulhumancerActorImporter.gearNames({ _cthulhumancer: { state: { background: { gearItems: [' Lantern ', 'Rope.', '', 3] } } } }), ['Lantern', 'Rope'])
  assert.deepEqual(HHCthulhumancerActorImporter.gearNames({ _cthulhumancer: { state: { background: { gear: 'Notebook; .32 Revolver;  ' } } } }), ['Notebook', '.32 Revolver'])
  assert.deepEqual(HHCthulhumancerActorImporter.gearNames({}), [])
})

test('gear names match whatever their word order and punctuation', () => {
  assert.deepEqual(HHCthulhumancerActorImporter.words('.32 or 7.65mm Revolver'), ['32', 'or', '7', '65mm', 'revolver'])
  assert.equal(HHCthulhumancerActorImporter.wordKey('Revolver, .38'), HHCthulhumancerActorImporter.wordKey('.38 Revolver'))
})

test('Tokenizer image names are compared by letters and digits only', () => {
  assert.equal(HHCthulhumancerActorImporter.imageKey('Dr. Jean-Luc Ménard'), 'drjeanlucménard')
  assert.equal(HHCthulhumancerActorImporter.imageKey('Dr_Jean_Luc_Ménard'), 'drjeanlucménard')
})

test('Tokenizer folder settings split into source, bucket and folder', () => {
  assert.deepEqual(HHCthulhumancerActorImporter.parseDirectory('[data] tokenizer/pc-images'), { activeSource: 'data', bucket: '', current: 'tokenizer/pc-images' })
  assert.deepEqual(HHCthulhumancerActorImporter.parseDirectory('[s3:my-bucket] images/tokens'), { activeSource: 's3', bucket: 'my-bucket', current: 'images/tokens' })
  assert.deepEqual(HHCthulhumancerActorImporter.parseDirectory('[forgevtt]'), { activeSource: 'forgevtt', bucket: '', current: '' })
  assert.deepEqual(HHCthulhumancerActorImporter.parseDirectory('tokenizer'), { activeSource: 'data', bucket: '', current: 'tokenizer' })
  assert.deepEqual(HHCthulhumancerActorImporter.parseDirectory(undefined), { activeSource: 'data', bucket: '', current: '' })
})

test('talents get adjustments for Beady Eye, and keep adjustments they already have', () => {
  const beadyEye = { name: 'Beady Eye', type: 'talent', system: {} }
  HHCthulhumancerActorImporter.applyTalentRule(beadyEye)
  assert.deepEqual(beadyEye.system.adjustments.map(a => a.config.disable), ['sizeSmall', 'inMelee'])
  const own = { name: 'Beady Eye', type: 'talent', system: { adjustments: [{ type: 'other' }] } }
  HHCthulhumancerActorImporter.applyTalentRule(own)
  assert.deepEqual(own.system.adjustments, [{ type: 'other' }])
  const unknown = { name: 'Lucky', type: 'talent', system: {} }
  HHCthulhumancerActorImporter.applyTalentRule(unknown)
  assert.deepEqual(unknown, { name: 'Lucky', type: 'talent', system: {} })
})

test('talent effects use the Active Effect format of each Foundry version', () => {
  globalThis.CONST = { ACTIVE_EFFECT_MODES: { ADD: 2 } }
  globalThis.game = { release: { generation: 13 } }
  const v13 = { name: 'Endurance', type: 'talent', system: {} }
  HHCthulhumancerActorImporter.applyTalentRule(v13)
  assert.deepEqual(v13.effects[0].changes, [{ key: 'system.characteristics.con.bonusDice', mode: 2, value: 1 }])
  globalThis.game = { release: { generation: 14 } }
  const v14 = { name: 'Quick Healer', type: 'talent', system: {} }
  HHCthulhumancerActorImporter.applyTalentRule(v14)
  assert.deepEqual(v14.effects[0].system.changes, [{ key: 'system.config.naturalHealing', type: 'add', value: 1 }])
  const own = { name: 'Endurance', type: 'talent', system: {}, effects: [{ name: 'Mine' }] }
  HHCthulhumancerActorImporter.applyTalentRule(own)
  assert.deepEqual(own.effects, [{ name: 'Mine' }])
})

test('the module needs every system function it uses', () => {
  const fn = () => {}
  globalThis.game = { CoC7: { actorImporterType: fn, createImportCharactersFolderIfNotExists: fn, guessItems: fn, toKebabCase: fn } }
  assert.equal(HHCthulhumancerActorImporter.systemSupported(), true)
  globalThis.game = { CoC7: { actorImporterType: fn, guessItems: fn, toKebabCase: fn } }
  assert.equal(HHCthulhumancerActorImporter.systemSupported(), false)
  globalThis.game = {}
  assert.equal(HHCthulhumancerActorImporter.systemSupported(), false)
})
