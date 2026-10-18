# Contributing to Cthulhumancer Importer for CoC7.

This guide is for people who want to work on the module itself. If you just want to use it, see the [README](README.md).

## Reporting bugs.

Open an [issue](https://github.com/ImproperSubset/hh-coc7-cthulhumancer-importer/issues) with your Foundry VTT and CoC7 system versions, what you did, what you expected and what happened instead. Attach the Cthulhumancer export if you can. Errors from the browser console (F12) help a lot.

## Translations.

Each language is one file in [`static/lang/`](static/lang/). Edit it and open a pull request. `npm test` checks that every language file has exactly the same keys and `{placeholders}` as `en.json`, so a new key has to be added to all of them.

## Development.

The build reuses the CoC7 system's webpack scripts, which compile the module and write it directly into one or more Foundry VTT user data folders so you can test it live.

### Prerequisites.

- Node.js 20.19+, 22.13+ or 24+ (CI uses Node 24). The build alone runs on Node 20.9 or later; ESLint needs the newer versions.
- A local Foundry VTT installation with the [patched CoC7 system](#patched-coc7-system), for testing

### Setup.

```sh
npm ci         # install the exact dependency versions in package-lock.json
npm run init   # interactive: choose the Foundry VTT user data folder(s) to build into
```

`npm run init` asks for your Foundry VTT **user data** folder, the one that contains `Data/` (on Linux usually `~/.local/share/FoundryVTT`), and saves your choices to `fvtt.config.json`, which git ignores. You can register several folders, such as a v13 and a v14 install, and build into one or all of them.

### Build and test.

```sh
npm run build   # production build into <user data>/Data/modules/hh-coc7-cthulhumancer-importer
npm run watch   # development build that rebuilds on every change
npm run eslint  # lint the module, build scripts and tests
npm test        # run the unit tests with node:test
```

> **Note:** a production build **empties** `Data/modules/hh-coc7-cthulhumancer-importer` before writing to it. If that folder exists but doesn't contain a `module.json`, the build asks for confirmation first. Don't point it at a folder you care about.

After a build, reload Foundry VTT (F5) to pick up the changes.

### Tests.

The tests run under Node with no Foundry VTT runtime. `foundry.utils.duplicate` and `foundry.utils.setProperty` are replaced by equivalents, so they cover the logic that doesn't reach into Foundry or the system:

- `tests/cthulhumancer-importer.test.js`: recognizing an export, skill names, merging duplicate skills, which unspent skills are kept, the own language, skills the player added, gear names and word matching, Tokenizer image names and folder settings, Pulp talent rules in the v13 and v14 effect formats, and the system check.
- `tests/lang.test.js`: every language listed in `module.json` has the same keys and placeholders as `en.json`.

Matching against compendiums, creating the actor and the Actor Importer itself are tested in a running Foundry VTT world.

### Project layout.

```
hh-coc7-cthulhumancer-importer/
  module.js                        entry point: registers the hooks
  constants.js                     IDs, the import type and the system functions the module needs
  hooks/init.js                    adds the import type to the system's Actor Importer
  hooks/ready.js                   warns the Keeper when the system can't take the import type
  apps/cthulhumancer-importer.js   converts a Cthulhumancer export into a CoC7 investigator
static/
  module.json                      Foundry VTT manifest
  lang/*.json                      translations
scripts/, webpack.config.js        build scripts adapted from the CoC7 system
tests/                             node:test unit tests
```

### Continuous integration.

Every push to `main` and every pull request runs [`ci.yml`](.github/workflows/ci.yml): actionlint on the workflows, a [REUSE](https://reuse.software/) licensing check, ESLint, the tests and a production build.

### Patched CoC7 system.

The module adds its import type with `game.CoC7.actorImporterType` and uses the system's own `game.CoC7.guessItems`, `game.CoC7.toKebabCase` and `game.CoC7.createImportCharactersFolderIfNotExists`, so imported investigators match items, get CoC IDs and land in the same folder as the system's own imports. The released CoC7 system has none of them.

They come from two commits on the [fork](https://github.com/ImproperSubset/CoC7-FoundryVTT)'s `actor-importer-types` branch, which sits on CoC7's latest release:

- `Expose importer helpers on game.CoC7` adds the three helpers in `coc7/hooks/init.js`.
- `Let packages add import types to the Actor Importer` adds `game.CoC7.actorImporterType(key, label, importer, summary, pick)`, shaped like the system's own `game.CoC7.journalStyle`, and the Actor Importer branch that shows a registered type's summary and JSON file picker and calls `importer(json, { source })`.

Fork release branches and fork releases are described in the [Group Checks for CoC7 contributing guide](https://github.com/ImproperSubset/hh-coc7-group-check/blob/main/CONTRIBUTING.md#patched-coc7-system).

## Releasing.

1. Bump the version everywhere it lives, and commit:

   ```sh
   npm version 0.2.0 --no-git-tag-version   # updates package.json and package-lock.json
   # then set "version": "0.2.0" in static/module.json by hand
   git commit -am "Release 0.2.0"
   ```

2. Push, then publish a GitHub release whose tag is exactly the version (`0.2.0`, no `v` prefix).

The [release workflow](.github/workflows/release.yml) runs the full CI check, fails if the tag doesn't match the version in both `package.json` and `static/module.json`, builds the module, sets the `download` URL in `module.json`, and attaches `module.json` and `module.zip` to the release. Foundry VTT's manifest URL points at the latest release's `module.json`, so users get the update automatically.
