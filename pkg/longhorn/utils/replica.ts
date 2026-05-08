import { REPLICA_STATUS_MAP } from '@longhorn/types/replica';

export { REPLICA_STATUS_MAP };

export function getReplicaNodeStatus({
  running,
  mode,
  failedAt,
}: {
  running?: boolean;
  mode?: string;
  failedAt?: unknown;
}) {
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

export function getReplicaSyncStatus({ mode, hasFailed }: { mode?: string; hasFailed?: boolean }) {
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
