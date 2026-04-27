export const RECURRING_JOB_TASK = {
  BACKUP: 'backup',
  SNAPSHOT: 'snapshot',
  SNAPSHOT_DELETE: 'snapshot-delete',
  SNAPSHOT_CLEANUP: 'snapshot-cleanup',
  SYSTEM_BACKUP: 'system-backup',
  FILESYSTEM_TRIM: 'filesystem-trim',
};

export const PARAM_KEYS = {
  FULL_BACKUP_INTERVAL: 'full-backup-interval',
  VOLUME_BACKUP_POLICY: 'volume-backup-policy',
};

export const VOLUME_BACKUP_POLICY = {
  IF_NOT_PRESENT: 'if-not-present',
  ALWAYS: 'always',
  DISABLED: 'disabled',
};

export const RECURRING_JOB_FORCE_CREATE_SUFFIX = '-force-create';

export const RECURRING_JOB_DEFAULT_SPEC = {
  retain: 1,
  concurrency: 1,
  cron: '0 0 * * *',
  groups: [],
  labels: {},
  parameters: {},
};

export const RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS = [RECURRING_JOB_TASK.BACKUP, RECURRING_JOB_TASK.SNAPSHOT];

export const RECURRING_JOB_TASKS_WITH_PARAMETERS = [RECURRING_JOB_TASK.BACKUP, RECURRING_JOB_TASK.SYSTEM_BACKUP];

export const RECURRING_JOB_TASKS_WITHOUT_RETAIN = [
  RECURRING_JOB_TASK.FILESYSTEM_TRIM,
  RECURRING_JOB_TASK.SNAPSHOT_CLEANUP,
];

export const RECURRING_JOB_TASKS_WITHOUT_GROUPS_AND_LABELS = [RECURRING_JOB_TASK.SYSTEM_BACKUP];
