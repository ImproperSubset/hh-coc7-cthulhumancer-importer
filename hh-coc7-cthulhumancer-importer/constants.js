export const FOLDER_ID = 'hh-coc7-cthulhumancer-importer'

export const SYSTEM_ID = 'CoC7'

export const IMPORT_TYPE = 'cthulhumancer'

// Pulp eras and the era whose items they also use, the system has no such link and matches only the world era
export const BASE_ERAS = {
  pulp: 'standard',
  modernPulp: 'modern',
  darkAgesPulp: 'darkAges',
  downDarkerTrailsPulp: 'downDarkerTrails',
  regencyPulp: 'regency',
  gasLightPulp: 'gasLight'
}

// CoC ID of the system's Unarmed weapon
export const UNARMED_COCID = 'i.weapon.brawl'

// What the module needs on game.CoC7
export const SYSTEM_API = ['actorImporterType', 'createImportCharactersFolderIfNotExists', 'guessItems', 'toKebabCase']
