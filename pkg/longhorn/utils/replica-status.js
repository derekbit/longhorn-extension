export const REPLICA_STATUS_MAP = {
  healthy: { key: 'healthy', color: 'bg-info' },
  rebuilding: { key: 'rebuilding', color: 'bg-warning' },
  err: { key: 'err', color: 'bg-error' },
  failed: { key: 'failed', color: 'bg-error' },
  stopped: { key: 'stopped', color: 'bg-darker' },
  unknown: { key: 'unknown', color: 'bg-darker' },
};

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
