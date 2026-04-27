import cronstrue from 'cronstrue';
import { LONGHORN_LABELS } from '@longhorn/types/resources';
import {
  PARAM_KEYS,
  RECURRING_JOB_FORCE_CREATE_SUFFIX,
  RECURRING_JOB_TASK,
  VOLUME_BACKUP_POLICY,
} from '@longhorn/types/recurringjob';

const TASK_LABELS = {
  [RECURRING_JOB_TASK.BACKUP]: 'backup',
  [`${RECURRING_JOB_TASK.BACKUP}${RECURRING_JOB_FORCE_CREATE_SUFFIX}`]: 'backup-force-create',
  [RECURRING_JOB_TASK.SNAPSHOT]: 'snapshot',
  [`${RECURRING_JOB_TASK.SNAPSHOT}${RECURRING_JOB_FORCE_CREATE_SUFFIX}`]: 'snapshot-force-create',
  [RECURRING_JOB_TASK.SNAPSHOT_DELETE]: 'snapshot-delete',
  [RECURRING_JOB_TASK.SNAPSHOT_CLEANUP]: 'snapshot-cleanup',
  [RECURRING_JOB_TASK.SYSTEM_BACKUP]: 'system-backup',
  [RECURRING_JOB_TASK.FILESYSTEM_TRIM]: 'filesystem-trim',
};

const VOLUME_BACKUP_POLICY_LABELS = {
  [VOLUME_BACKUP_POLICY.IF_NOT_PRESENT]: 'If Not Present',
  [VOLUME_BACKUP_POLICY.ALWAYS]: 'Always',
  [VOLUME_BACKUP_POLICY.DISABLED]: 'Disabled',
};

const RECURRING_JOB_SELECTOR_STATUS = 'enabled';

const RECURRING_JOB_SELECTOR_PREFIX = {
  job: `${LONGHORN_LABELS.RECURRING_JOB}/`,
  group: `${LONGHORN_LABELS.RECURRING_JOB_GROUP}/`,
};

export function getRecurringJobBaseTask(task = '') {
  return task.replace(RECURRING_JOB_FORCE_CREATE_SUFFIX, '');
}

export function sanitizeRecurringJobParameters(parameterMap = {}) {
  return Object.entries(parameterMap).reduce((sanitizedParameters, [parameterKey, parameterValue]) => {
    if (parameterKey && parameterKey.trim()) {
      sanitizedParameters[parameterKey] = parameterValue;
    }

    return sanitizedParameters;
  }, {});
}

export function formatRecurringJobTask(task) {
  return TASK_LABELS[task] || task || '-';
}

export function formatRecurringJobCron(cronExpression) {
  if (!cronExpression) {
    return '-';
  }

  try {
    return `${cronstrue.toString(cronExpression, { use24HourTimeFormat: true })} (${cronExpression})`;
  } catch {
    return cronExpression;
  }
}

export function formatRecurringJobGroups(groups = []) {
  return groups.length ? groups.join(', ') : '-';
}

export function formatRecurringJobLabels(labels = {}) {
  const labelEntries = Object.entries(labels);

  return labelEntries.length
    ? labelEntries.map(([labelKey, labelValue]) => `${labelKey}: ${labelValue}`).join(', ')
    : '-';
}

export function getVolumeBackupPolicyDisplay(policy) {
  return policy ? VOLUME_BACKUP_POLICY_LABELS[policy] || policy : null;
}

export function formatRecurringJobParameters(parameterMap = {}) {
  const parameterEntries = Object.entries(parameterMap).filter(([parameterKey]) => parameterKey && parameterKey.trim());

  if (!parameterEntries.length) {
    return '-';
  }

  return parameterEntries
    .map(([parameterKey, parameterValue]) => {
      if (parameterKey === PARAM_KEYS.VOLUME_BACKUP_POLICY) {
        return `${parameterKey}: ${getVolumeBackupPolicyDisplay(parameterValue)}`;
      }

      return `${parameterKey}: ${parameterValue}`;
    })
    .join(', ');
}

export function getRecurringJobSelectorsFromLabels(labels = {}) {
  return Object.entries(labels).reduce(
    (selectors, [labelKey, labelValue]) => {
      if (labelValue?.toLowerCase() !== RECURRING_JOB_SELECTOR_STATUS) {
        return selectors;
      }

      if (labelKey.startsWith(RECURRING_JOB_SELECTOR_PREFIX.job)) {
        selectors.jobs.push(labelKey.replace(RECURRING_JOB_SELECTOR_PREFIX.job, ''));
      } else if (labelKey.startsWith(RECURRING_JOB_SELECTOR_PREFIX.group)) {
        selectors.groups.push(labelKey.replace(RECURRING_JOB_SELECTOR_PREFIX.group, ''));
      }

      return selectors;
    },
    { jobs: [], groups: [] }
  );
}
