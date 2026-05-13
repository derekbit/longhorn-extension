import cronstrue from 'cronstrue';
import { LONGHORN_LABELS } from '@longhorn/types/resources';
import { EMPTY_DISPLAY } from '@longhorn/types/general';
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
} as const;

export const RECURRING_JOB_SELECTOR_TYPE = {
  JOB: 'job',
  GROUP: 'group',
} as const;

type RecurringJobSelectorType = (typeof RECURRING_JOB_SELECTOR_TYPE)[keyof typeof RECURRING_JOB_SELECTOR_TYPE];

export const RECURRING_JOB_SELECTOR_ENABLED = RECURRING_JOB_SELECTOR_STATUS;

export function getRecurringJobBaseTask(task = ''): string {
  return task.replace(RECURRING_JOB_FORCE_CREATE_SUFFIX, '');
}

export function getRecurringJobName(job: any = {}): string {
  return job?.metadata?.name || job?.name || '';
}

export function getRecurringJobGroups(job: any = {}): string[] {
  return job?.spec?.groups || job?.groups || [];
}

export function buildRecurringJobSelectorLabelKey(
  name: string,
  type: RecurringJobSelectorType = RECURRING_JOB_SELECTOR_TYPE.JOB
): string {
  const prefix = RECURRING_JOB_SELECTOR_PREFIX[type];

  if (!prefix || !name) {
    return '';
  }

  return `${prefix}${name}`;
}

export function getRecurringJobSelectorPrefix(
  type: RecurringJobSelectorType = RECURRING_JOB_SELECTOR_TYPE.JOB
): string {
  return RECURRING_JOB_SELECTOR_PREFIX[type] || '';
}

export function sanitizeRecurringJobParameters(parameterMap: Record<string, any> = {}): Record<string, any> {
  return Object.entries(parameterMap).reduce(
    (sanitizedParameters, [parameterKey, parameterValue]) => {
      if (parameterKey && parameterKey.trim()) {
        sanitizedParameters[parameterKey] = parameterValue;
      }

      return sanitizedParameters;
    },
    {} as Record<string, any>
  );
}

export function formatRecurringJobTask(task: string): string {
  return TASK_LABELS[task] || task || EMPTY_DISPLAY;
}

export function formatRecurringJobCron(cronExpression: string): string {
  if (!cronExpression) {
    return EMPTY_DISPLAY;
  }

  try {
    return `${cronstrue.toString(cronExpression, { use24HourTimeFormat: true })} (${cronExpression})`;
  } catch {
    return cronExpression;
  }
}

export function formatRecurringJobGroups(groups: string[] = []): string {
  return groups.length ? groups.join(', ') : EMPTY_DISPLAY;
}

export function formatRecurringJobLabels(labels: Record<string, unknown> = {}): string {
  const labelEntries = Object.entries(labels);

  return labelEntries.length
    ? labelEntries.map(([labelKey, labelValue]) => `${labelKey}: ${labelValue}`).join(', ')
    : EMPTY_DISPLAY;
}

export function getVolumeBackupPolicyDisplay(policy: string | undefined): string | null {
  return policy ? (VOLUME_BACKUP_POLICY_LABELS as Record<string, string>)[policy] || policy : null;
}

export function formatRecurringJobParameters(parameterMap: Record<string, unknown> = {}): string {
  const parameterEntries = Object.entries(parameterMap).filter(([parameterKey]) => parameterKey && parameterKey.trim());

  if (!parameterEntries.length) {
    return EMPTY_DISPLAY;
  }

  return parameterEntries
    .map(([parameterKey, parameterValue]) => {
      if (parameterKey === PARAM_KEYS.VOLUME_BACKUP_POLICY) {
        return `${parameterKey}: ${getVolumeBackupPolicyDisplay(String(parameterValue || ''))}`;
      }

      return `${parameterKey}: ${parameterValue}`;
    })
    .join(', ');
}

export function getRecurringJobSelectorsFromLabels(labels: Record<string, unknown> = {}): {
  jobs: string[];
  groups: string[];
} {
  return Object.entries(labels).reduce(
    (selectors, [labelKey, labelValue]) => {
      if (String(labelValue || '').toLowerCase() !== RECURRING_JOB_SELECTOR_STATUS) {
        return selectors;
      }

      if (labelKey.startsWith(RECURRING_JOB_SELECTOR_PREFIX.job)) {
        selectors.jobs.push(labelKey.replace(RECURRING_JOB_SELECTOR_PREFIX.job, ''));
      } else if (labelKey.startsWith(RECURRING_JOB_SELECTOR_PREFIX.group)) {
        selectors.groups.push(labelKey.replace(RECURRING_JOB_SELECTOR_PREFIX.group, ''));
      }

      return selectors;
    },
    { jobs: [], groups: [] } as { jobs: string[]; groups: string[] }
  );
}
