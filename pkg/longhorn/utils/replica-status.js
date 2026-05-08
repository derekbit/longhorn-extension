import { BADGE_COLOR } from '@longhorn/types/badge';

export const REPLICA_STATUS_MAP = Object.freeze({
  healthy: { key: 'healthy', color: BADGE_COLOR.INFO },
  rebuilding: { key: 'rebuilding', color: BADGE_COLOR.WARNING },
  err: { key: 'err', color: BADGE_COLOR.ERROR },
  failed: { key: 'failed', color: BADGE_COLOR.ERROR },
  stopped: { key: 'stopped', color: BADGE_COLOR.DARKER },
  unknown: { key: 'unknown', color: BADGE_COLOR.DARKER },
});

export function getReplicaNodeStatus({ running, mode, failedAt }) {
  if (running) {
    if (mode === 'rw') {
      return REPLICA_STATUS_MAP.healthy;
    }

    if (mode === 'wo') {
      return REPLICA_STATUS_MAP.rebuilding;
    }

    if (mode === 'err') {
      return REPLICA_STATUS_MAP.err;
    }

    return REPLICA_STATUS_MAP.unknown;
  }

  if (String(failedAt) === '') {
    return REPLICA_STATUS_MAP.stopped;
  }

  return REPLICA_STATUS_MAP.failed;
}

export function getReplicaSyncStatus({ mode, hasFailed }) {
  if (hasFailed || mode === 'err') {
    return REPLICA_STATUS_MAP.failed;
  }

  if (mode === 'rw') {
    return REPLICA_STATUS_MAP.healthy;
  }

  if (mode === 'wo') {
    return REPLICA_STATUS_MAP.rebuilding;
  }

  return REPLICA_STATUS_MAP.unknown;
}
