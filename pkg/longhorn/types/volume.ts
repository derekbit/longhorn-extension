export const DATA_ENGINE_V1 = 'v1';
export const DATA_ENGINE_V2 = 'v2';

export const VOLUME_SOURCE_TYPE = Object.freeze({
  VOLUME: 'volume',
  SNAPSHOT: 'snapshot',
});

export const VOLUME_SOURCE_PROTOCOL = Object.freeze({
  VOLUME: 'vol://',
  SNAPSHOT: 'snap://',
});

export const BACKUP_BLOCK_SIZE_BYTES = Object.freeze({
  IGNORED: '0',
  TWO_MIB: '2097152',
  SIXTEEN_MIB: '16777216',
});

export const FRONTENDS = Object.freeze([
  {
    labelKey: 'longhorn.volume.options.frontend.blockDevice',
    value: 'blockdev',
    dataEngine: [DATA_ENGINE_V1, DATA_ENGINE_V2],
  },
  {
    labelKey: 'longhorn.volume.options.frontend.iScsi',
    value: 'iscsi',
    dataEngine: [DATA_ENGINE_V1],
  },
  {
    labelKey: 'longhorn.volume.options.frontend.nvmf',
    value: 'nvmf',
    dataEngine: [DATA_ENGINE_V2],
  },
  {
    labelKey: 'longhorn.volume.options.frontend.ublk',
    value: 'ublk',
    dataEngine: [DATA_ENGINE_V2],
  },
]);

export const VOLUME_STATE = Object.freeze({
  HEALTHY: 'Healthy',
  DEGRADED: 'Degraded',
  IN_PROGRESS: 'In Progress',
  FAULTED: 'Faulted',
  DETACHED: 'Detached',
});

export const VOLUME_DEFAULT_SNAPSHOT_MAX_COUNT = 250;

export const VOLUME_CONDITION_TYPE = Object.freeze({
  RESTORE: 'Restore',
  SCHEDULED: 'Scheduled',
  TOO_MANY_SNAPSHOTS: 'TooManySnapshots',
  OFFLINE_REBUILDING: 'OfflineRebuilding',
});

export const VOLUME_CONDITION_ORDER = Object.freeze([
  VOLUME_CONDITION_TYPE.RESTORE,
  VOLUME_CONDITION_TYPE.SCHEDULED,
  VOLUME_CONDITION_TYPE.TOO_MANY_SNAPSHOTS,
  VOLUME_CONDITION_TYPE.OFFLINE_REBUILDING,
]);

export const VOLUME_CREATE_SPEC_DEFAULTS = Object.freeze({
  size: String(20 * 1024 ** 3),
  numberOfReplicas: 3,
  dataEngine: 'v1',
  frontend: 'blockdev',
  dataLocality: 'disabled',
  accessMode: 'rwo',
  encrypted: false,
  dataSource: '',
  dataSourceVolume: '',
  dataSourceSnapshot: '',
  backupTargetName: '',
  ublkQueueDepth: 128,
  ublkNumberOfQueue: 1,
  snapshotDataIntegrity: 'ignored',
  replicaAutoBalance: 'ignored',
  unmapMarkSnapChainRemoved: 'ignored',
  replicaSoftAntiAffinity: 'ignored',
  replicaZoneSoftAntiAffinity: 'ignored',
  replicaDiskSoftAntiAffinity: 'ignored',
  freezeFilesystemForSnapshot: 'ignored',
  offlineRebuilding: 'ignored',
  snapshotMaxCount: 0,
  snapshotMaxSize: '0',
  backupBlockSize: '0',
  replicaRebuildingBandwidthLimit: 0,
  revisionCounterDisabled: false,
});

export const VOLUME_STATE_ORDER = Object.freeze([
  VOLUME_STATE.HEALTHY,
  VOLUME_STATE.DEGRADED,
  VOLUME_STATE.IN_PROGRESS,
  VOLUME_STATE.FAULTED,
  VOLUME_STATE.DETACHED,
]);
