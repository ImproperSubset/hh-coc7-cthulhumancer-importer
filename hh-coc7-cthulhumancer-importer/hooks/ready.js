import HHCthulhumancerActorImporter from '../apps/cthulhumancer-importer.js'

/**
 * Ready Hook
 */
export default function () {
  if (game.user.isGM && !HHCthulhumancerActorImporter.systemSupported()) {
    ui.notifications.warn('HHCTHULHUMANCER.NeedsSystem', { localize: true })
  }
}
