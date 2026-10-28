<h1 align="center">Cthulhumancer Importer for CoC7</h1>

## Overview.

Adds Cthulhumancer's Foundry export to the Actor Importer of the [Call of Cthulhu 7th Edition system](https://github.com/Miskatonic-Investigative-Society/CoC7-FoundryVTT) on [Foundry Virtual Tabletop](https://foundryvtt.com). Skills, weapons and gear are matched against your item compendiums, as the system's own Dhole's House import does, so imported investigators have the system's combat, specialization and uncommon skill settings and their CoC IDs.

Requires Foundry VTT 12, 13 or 14 and CoC7 8.16.hh.4 or later from [ImproperSubset/CoC7-FoundryVTT](https://github.com/ImproperSubset/CoC7-FoundryVTT), installed from the manifest URL `https://github.com/ImproperSubset/CoC7-FoundryVTT/releases/latest/download/system.json`. With any other CoC7 system, the module warns the Keeper when the world loads and adds nothing.

## Installation.

In Foundry VTT's setup screen, open **Add-on Modules**, click **Install Module** and paste this manifest URL:

```
https://github.com/ImproperSubset/hh-coc7-cthulhumancer-importer/releases/latest/download/module.json
```

Then enable **Cthulhumancer Importer for CoC7** in your world under **Game Settings → Manage Modules**.

## Usage.

1. In Cthulhumancer, export your investigator with its Foundry export.
2. In Foundry VTT, open the **Actor Importer**, from the button at the foot of the **Actors** directory or, as the Keeper, from **Keeper's tools**.
3. Choose **Cthulhumancer Foundry export JSON** as the type, choose where to look for skills, spells and weapons, pick the exported file and click **Import**.

The investigator is created in the **Imported characters** folder and its sheet opens.

## What it imports.

- **Skills** keep Cthulhumancer's points: base, occupation, archetype and personal points, and the occupation and archetype marks. Two skills of the same name, which Cthulhumancer allows, become one skill with their points added together. Skills you added in Cthulhumancer are kept even with no points spent. Unspent specializations are dropped, except Fighting (Brawl), Firearms (Handgun), Firearms (Rifle/Shotgun) and your own language, which every investigator sheet has, and so is a generic skill with no points that also has a specialization. A skill no compendium has is created as a new skill.
- **Your own language** is the Language skill whose base is your EDU, and is marked as such.
- **Throw** can be pushed. Weapon attacks still can't.
- **Weapons, talents and other items** in the export are matched by type and name. Items that match nothing are kept as exported.
- **Gear** from Cthulhumancer's background is matched against weapons, then items. A name that matches nothing is tried without a trailing part in brackets, then with its words in any order, then against the only weapon whose name contains all of its words, so `.32 Revolver` finds `.32 or 7.65mm Revolver`. Gear that still matches nothing becomes a plain item.
- **Pulp worlds** also match items made for the era the Pulp era is based on: 1920s items in Pulp Cthulhu, Modern items in Modern Pulp, and so on. The system on its own matches only items for the world's era or for every era. When both versions have the same CoC ID, the one with the higher CoC ID priority is used, such as the Keeper Rulebook's weapons from a compendium that marks them 1920s and Modern only.
- **Pulp talents** that the system can apply get their rules: Quick Healer the natural healing effect, Endurance a bonus die on CON, and Beady Eye the talent adjustments that remove the small target and in melee penalties. A talent that already has effects or adjustments keeps its own.
- **Weapons** are linked to the investigator's skills, adding the skill if the investigator doesn't have it.
- **Portrait and token** come from [Tokenizer](https://foundryvtt.com/packages/vtta-tokenizer) when the export has only the default image. The module looks for files named after the investigator with `Avatar` or `Token` in their name, in Tokenizer's upload folder and in each folder in `tokenizer/`. The dynamic token ring follows Tokenizer's own setting.

## Languages.

The module's own text is machine-translated into the 14 other languages the CoC7 system supports, using the system's terms. Corrections from native speakers are welcome.

## Contributing.

Bug reports and pull requests are welcome. The [contributing guide](CONTRIBUTING.md) covers building, testing and releasing.

## Licenses.

Copyright © 2026 Rhett D. Hudson. Licensed under the [GNU General Public License v3.0 only](LICENSE). The importer and the build scripts are adapted from the CoC7 system by the Miskatonic Investigative Society, also GPL-3.0. [LICENSING.md](LICENSING.md) lists them.

This is an unofficial fan module, not published, endorsed or specifically approved by Chaosium Inc. Call of Cthulhu is a trademark of Chaosium Inc., used under [Chaosium's Fan Material Policy](https://www.chaosium.com/fan-material-policy/). Cthulhumancer is not affiliated with this module.
