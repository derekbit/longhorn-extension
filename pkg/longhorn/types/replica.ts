import { BADGE_COLOR } from '@longhorn/types/general';

export const REPLICA_STATUS_MAP = Object.freeze({
  healthy: { key: 'healthy', color: BADGE_COLOR.INFO },
  rebuilding: { key: 'rebuilding', color: BADGE_COLOR.WARNING },
  err: { key: 'err', color: BADGE_COLOR.ERROR },
  failed: { key: 'failed', color: BADGE_COLOR.ERROR },
  stopped: { key: 'stopped', color: BADGE_COLOR.DARKER },
  unknown: { key: 'unknown', color: BADGE_COLOR.DARKER },
});
