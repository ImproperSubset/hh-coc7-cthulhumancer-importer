# Cthulhumancer Importer for CoC7

Foundry VTT module `hh-coc7-cthulhumancer-importer`: adds Cthulhumancer's Foundry export as a type in the CoC7 system's Actor Importer and converts it into a CoC7 investigator. GPL-3.0-only.

- `README.md` describes what the module does for users.
- `CONTRIBUTING.md` covers building, tests, project layout, CI, releasing and the patched CoC7 system. Read it before changing code or releasing.

## Repositories

- **This repo**: `ImproperSubset/hh-coc7-cthulhumancer-importer`, public. `main` is what releases are cut from.
- **CoC7 system fork**: `ImproperSubset/CoC7-FoundryVTT`, local clone `~/git/CoC7-FoundryVTT` (remote `origin` is upstream, `fork` is the fork). The module needs the fork's `actor-importer-types` branch: CoC7's latest release plus two commits, `game.CoC7.actorImporterType` and the importer helpers. Fork release branches are described in `ImproperSubset/hh-coc7-group-check`'s `CONTRIBUTING.md`. Read the clone's `CLAUDE.local.md` before changing it.
- **Upstream CoC7**: `Miskatonic-Investigative-Society/CoC7-FoundryVTT`. Read its source to learn how the system works. Never push to it, open pull requests, issues or comments on it, or fork it again without the user's explicit permission for that specific action.

## How to work here

- Match the CoC7 system: use its APIs, localization keys (`CoC7.*`, `CHARAC.*`, `SETTINGS.*`) and terminology, and check its source before assuming how it behaves, citing `file:line`.
- The importer reaches the system only through `game.CoC7`, `CONFIG.Item.dataModels.skill` and Foundry's own APIs. If it needs something the system doesn't expose, expose it in the fork, shaped like the system's own `game.CoC7` entries, instead of copying the system's code.
- Support Foundry VTT 12, 13 and 14, as the system does. Version-specific code follows the system's `/* // FoundryVTT V12 */` convention.
- Ship every user-facing string in all 15 languages the system supports, using each language's terms from the system's own language files. `tests/lang.test.js` checks keys and placeholders.
- Docs and comments state what is true now. No history, no mention of removed features, no narration of decisions; a comment is only for a constraint that stops a wrong edit. Spell it "license". Keep side discussions out of docs.
- Before warning about a risk, trace it to the conditions under which it actually happens. If it can't be confirmed, say it's unconfirmed.
- This repo is public. Server, infrastructure and personal details never go in it; keep local notes in `CLAUDE.local.md`, which `.git/info/exclude` keeps out of git.
- Before pushing: `npm run eslint`, `npm test`, and `reuse lint`. CI also runs actionlint and a build.
- Commit as `ImproperSubset <1039371+ImproperSubset@users.noreply.github.com>`; GitHub rejects pushes containing the user's private email.
- The user's separate "workshop" development process doesn't apply here.
