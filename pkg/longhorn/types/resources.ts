export const LONGHORN_RESOURCES = {
  NODES: 'longhorn.io.node',
  VOLUMES: 'longhorn.io.volume',
  RECURRING_JOBS: 'longhorn.io.recurringjob',
  BACKUP_TARGETS: 'longhorn.io.backuptarget',
  BACKUP_VOLUMES: 'longhorn.io.backupvolume',
  SYSTEM_BACKUPS: 'longhorn.io.systembackup',
  SYSTEM_RESTORE: 'longhorn.io.systemrestore',
  SETTINGS: 'longhorn.io.setting',
  ENGINE_IMAGES: 'longhorn.io.engineimage',
  ENGINES: 'longhorn.io.engine',
  INSTANCE_MANAGERS: 'longhorn.io.instancemanager',
  BACKING_IMAGES: 'longhorn.io.backingimage',
  SNAPSHOTS: 'longhorn.io.snapshot',
  BACKUPS: 'longhorn.io.backup',
  VOLUME_ATTACHMENTS: 'longhorn.io.volumeattachment',
  REPLICAS: 'longhorn.io.replica',
  ORPHANS: 'longhorn.io.orphan',
  BACKING_IMAGE_BACKUPS: 'longhorn.io.backupbackingimage',
};

export const LONGHORN_SETTINGS = {
  DEFAULT_ENGINE_IMAGE: 'longhorn-system/default-engine-image',
  CURRENT_LONGHORN_VERSION: 'longhorn-system/current-longhorn-version',
  STORAGE_OVER_PROVISIONING_PERCENTAGE: 'longhorn-system/storage-over-provisioning-percentage',
  DEFAULT_REPLICA_COUNT: 'longhorn-system/default-replica-count',
  DEFAULT_DATA_LOCALITY: 'longhorn-system/default-data-locality',
  DEFAULT_UBLK_NUMBER_OF_QUEUE: 'longhorn-system/default-ublk-number-of-queue',
  DEFAULT_UBLK_QUEUE_DEPTH: 'longhorn-system/default-ublk-queue-depth',
  V1_DATA_ENGINE: 'longhorn-system/v1-data-engine',
  V2_DATA_ENGINE: 'longhorn-system/v2-data-engine',
  DEFAULT_MIN_NUMBER_OF_BACKING_IMAGE_COPIES: 'longhorn-system/default-min-number-of-backing-image-copies',
};

export const LONGHORN_LABELS = {
  RECURRING_JOB: 'recurring-job.longhorn.io',
  RECURRING_JOB_GROUP: 'recurring-job-group.longhorn.io',
};
