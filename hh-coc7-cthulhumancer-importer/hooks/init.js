import { IMPORT_TYPE } from '../constants.js'
import HHCthulhumancerActorImporter from '../apps/cthulhumancer-importer.js'

/**
 * Init Hook
 */
export default function () {
  if (!HHCthulhumancerActorImporter.systemSupported()) {
    return
  }
  game.CoC7.actorImporterType(IMPORT_TYPE, 'HHCTHULHUMANCER.ImportType', HHCthulhumancerActorImporter.importActor, 'HHCTHULHUMANCER.Summary', 'HHCTHULHUMANCER.PickFile')
}
