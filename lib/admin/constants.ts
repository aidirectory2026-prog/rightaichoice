// Phase 10.7a (2026-06-12) — admin-wide tracking constants.
//
// TRACKING_EPOCHS: the dates on which a tracked dimension STARTED being
// captured. Rows older than an epoch simply don't carry the dimension —
// admin panels must bucket them explicitly (never silently hide them) and
// their ⓘ provenance docs must state the epoch. Companion to the prose
// epoch strings in lib/admin/metric-docs.ts EPOCHS.
export const TRACKING_EPOCHS = {
  /** properties.traffic_channel / traffic_source / click-ids stamped by
   *  mirrorContext() via lib/analytics/channels.ts since the 10.7a deploy
   *  (namespaced traffic_* — `channel` is a payload prop of share_clicked).
   *  Earlier rows surface as '(unknown — pre-channel epoch)'. */
  channel: '2026-06-12',
} as const

/** The exact bucket label the insights_top_property 'traffic_channel'
 *  branch (migrations 160+161) emits for rows captured before
 *  TRACKING_EPOCHS.channel. */
export const PRE_CHANNEL_EPOCH_BUCKET = '(unknown — pre-channel epoch)'
