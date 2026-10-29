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

test('gear that matches nothing is left out and reported', async () => {
  const automatic = { _id: 'abc', name: '.45 Automatic', type: 'weapon', flags: { CoC7: { cocidFlag: { id: 'i.weapon.45-automatic', priority: 0 } } } }
  const errors = []
  globalThis.ui = { notifications: { error: (message, options) => errors.push({ message, options }) } }
  globalThis.game = {
    settings: { get: () => 'standard' },
    items: [],
    packs: [],
    i18n: { format: (key, data) => key + ' ' + data.names },
    CoC7: {
      guessItems: async (type, names) => type === 'weapon' && names.includes('.45 Automatic') ? { '.45 Automatic': automatic } : {}
    }
  }
  const progressBar = { current: 0, max: 3, bar: { update: () => {} } }
  const gear = await HHCthulhumancerActorImporter.extractGear(['.45 Automatic', 'Elephant Gun', 'Lucky Rabbit Foot'], { source: 'iwms' }, progressBar)
  assert.deepEqual(gear.map(i => i.name), ['.45 Automatic'])
  assert.deepEqual(errors, [{ message: 'HHCTHULHUMANCER.GearNotFound Elephant Gun, Lucky Rabbit Foot', options: { permanent: true } }])
  assert.equal(progressBar.current, 3)
  errors.length = 0
  await HHCthulhumancerActorImporter.extractGear(['.45 Automatic'], { source: 'iwms' }, progressBar)
  assert.deepEqual(errors, [])
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

const cocidItem = (name, id, priority) => ({ name, flags: { CoC7: { cocidFlag: { id, priority } } } })

test('a found item is replaced only by a higher priority item of the same CoC ID', () => {
  const system45 = cocidItem('.45 Automatic', 'i.weapon.45-automatic', 0)
  const keeper45 = cocidItem('.45 Automatic', 'i.weapon.45-automatic', 10)
  const keeperKnife = cocidItem('Knife, Medium', 'i.weapon.knife-medium', 10)
  const worldKnife = cocidItem('Knife, Medium', 'i.weapon.knife-medium', 20)
  const plain = { name: 'Rope', flags: {} }
  const output = HHCthulhumancerActorImporter.preferHigherPriority({ '.45 Automatic': system45, 'Knife, Medium': worldKnife, Rope: plain }, [keeper45, keeperKnife])
  assert.equal(output['.45 Automatic'], keeper45)
  assert.equal(output['Knife, Medium'], worldKnife)
  assert.equal(output.Rope, plain)
  assert.equal(HHCthulhumancerActorImporter.priority(cocidItem('x', 'i.item.x', '7')), 7)
  assert.equal(HHCthulhumancerActorImporter.priority(plain), 0)
})

test('on a Pulp world items are also looked up in the era it is based on', async () => {
  const system45 = cocidItem('.45 Automatic', 'i.weapon.45-automatic', 0)
  const keeper45 = cocidItem('.45 Automatic', 'i.weapon.45-automatic', 10)
  const lookups = []
  const mockGame = (worldEra, cocid) => ({
    settings: { get: (scope, key) => (scope === 'CoC7' && key === 'worldEra' ? worldEra : undefined) },
    CoC7: { guessItems: async () => ({ '.45 Automatic': system45 }), cocid }
  })
  const cocid = {
    makeGroupRegEx: (ids) => new RegExp('^(' + ids.join('|') + ')$'),
    fromCoCIDRegexBest: async (options) => {
      lookups.push(options)
      return [keeper45]
    }
  }
  globalThis.game = mockGame('pulp', cocid)
  assert.equal((await HHCthulhumancerActorImporter.guessItems('weapon', ['.45 Automatic'], { source: 'iwms' }))['.45 Automatic'], keeper45)
  assert.equal(lookups.length, 1)
  assert.equal(lookups[0].era, 'standard')
  assert.equal(lookups[0].type, 'i')
  assert.equal(lookups[0].cocidRegExp.test('i.weapon.45-automatic'), true)
  globalThis.game = mockGame('modernPulp', cocid)
  await HHCthulhumancerActorImporter.guessItems('weapon', ['.45 Automatic'], { source: 'iwms' })
  assert.equal(lookups[1].era, 'modern')
  globalThis.game = mockGame('standard', cocid)
  assert.equal((await HHCthulhumancerActorImporter.guessItems('weapon', ['.45 Automatic'], { source: 'iwms' }))['.45 Automatic'], system45)
  assert.equal(lookups.length, 2)
  globalThis.game = mockGame('pulp', undefined)
  assert.equal((await HHCthulhumancerActorImporter.guessItems('weapon', ['.45 Automatic'], { source: 'iwms' }))['.45 Automatic'], system45)
})

test('weapons holding no ammunition are loaded with as many bullets as they take', () => {
  const weapon = (bullets, ammo) => ({ type: 'weapon', system: { bullets, ammo } })
  const empty = weapon(7, 0)
  const partial = weapon(7, 4)
  const melee = weapon(null, 0)
  const text = weapon('2', undefined)
  const item = { type: 'item', system: { bullets: 6 } }
  HHCthulhumancerActorImporter.loadWeapons([empty, partial, melee, text, item])
  assert.equal(empty.system.ammo, 7)
  assert.equal(partial.system.ammo, 4)
  assert.equal(melee.system.ammo, 0)
  assert.equal(text.system.ammo, 2)
  assert.equal(item.system.ammo, undefined)
})

test('Unarmed and Mnvr are added unless a weapon with their CoC ID is already there', async () => {
  const unarmed = { _id: 'abc', name: 'Unarmed', type: 'weapon', folder: 'f', flags: { CoC7: { cocidFlag: { id: 'i.weapon.brawl', priority: 0 } } } }
  const mnvr = { _id: 'def', name: 'Mnvr', type: 'weapon', folder: 'f', flags: { CoC7: { cocidFlag: { id: 'i.weapon.mnvr', priority: 0 } } } }
  const asked = []
  globalThis.game = {
    settings: { get: () => 'standard' },
    CoC7: {
      guessItems: async (type, names, options) => {
        asked.push({ type, names, options })
        return Object.fromEntries([unarmed, mnvr].map(i => [i.flags.CoC7.cocidFlag.id, i]).filter(([id]) => names.includes(id)))
      }
    }
  }
  const added = await HHCthulhumancerActorImporter.extractStandardWeapons([{ type: 'weapon', name: '.45 Automatic', flags: {} }], { source: 'iwms' })
  assert.deepEqual(asked, [{ type: 'weapon', names: ['i.weapon.brawl', 'i.weapon.mnvr'], options: { source: 'iwms' } }])
  assert.deepEqual(added.map(i => i.name), ['Unarmed', 'Mnvr'])
  assert.equal(added[0]._id, undefined)
  assert.equal(added[0].folder, undefined)
  assert.equal(unarmed._id, 'abc')
  assert.deepEqual((await HHCthulhumancerActorImporter.extractStandardWeapons([unarmed], { source: 'iwms' })).map(i => i.name), ['Mnvr'])
  assert.deepEqual(asked[1].names, ['i.weapon.mnvr'])
  assert.deepEqual(await HHCthulhumancerActorImporter.extractStandardWeapons([unarmed, mnvr], { source: 'iwms' }), [])
  assert.equal(asked.length, 2)
  globalThis.game.CoC7.guessItems = async () => ({})
  assert.deepEqual(await HHCthulhumancerActorImporter.extractStandardWeapons([], { source: '' }), [])
})
