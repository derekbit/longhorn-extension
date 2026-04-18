import LonghornModel from './longhorn';
import { RECURRING_JOB_TASK, PARAM_KEYS, VOLUME_BACKUP_POLICY } from '@longhorn/types/recurringjob';
import cronstrue from 'cronstrue';

const TASK_LABELS = {
  [RECURRING_JOB_TASK.BACKUP]: 'Backup',
  [RECURRING_JOB_TASK.SNAPSHOT]: 'Snapshot',
  [RECURRING_JOB_TASK.SNAPSHOT_DELETE]: 'Snapshot Delete',
  [RECURRING_JOB_TASK.SNAPSHOT_CLEANUP]: 'Snapshot Cleanup',
  [RECURRING_JOB_TASK.SYSTEM_BACKUP]: 'System Backup',
  [RECURRING_JOB_TASK.FILESYSTEM_TRIM]: 'Filesystem Trim',
};

const VOLUME_BACKUP_POLICY_LABELS = {
  [VOLUME_BACKUP_POLICY.IF_NOT_PRESENT]: 'If Not Present',
  [VOLUME_BACKUP_POLICY.ALWAYS]: 'Always',
  [VOLUME_BACKUP_POLICY.DISABLED]: 'Disabled',
};

export default class RecurringJobModel extends LonghornModel {
  get baseTask() {
    return (this.spec?.task || '').replace('-force-create', '');
  }

  get isForceCreate() {
    return !!this.spec?.task?.endsWith('-force-create');
  }

  get taskDisplay() {
    return TASK_LABELS[this.baseTask] || this.baseTask || '—';
  }

  get cronDisplay() {
    const cron = this.spec?.cron;

    if (!cron) return '—';
    try {
      return `${cronstrue.toString(cron, { use24HourTimeFormat: true })} (${cron})`;
    } catch {
      return cron;
    }
  }

  get groupsDisplay() {
    const groups = this.spec?.groups || [];

    return groups.length ? groups.join(', ') : '—';
  }

  get labelsDisplay() {
    const labels = this.spec?.labels || {};
    const entries = Object.entries(labels);

    return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join(', ') : '—';
  }

  get volumeBackupPolicyDisplay() {
    const val = this.spec?.parameters?.[PARAM_KEYS.VOLUME_BACKUP_POLICY];

    return val ? VOLUME_BACKUP_POLICY_LABELS[val] || val : null;
  }

  get fullBackupInterval() {
    return this.spec?.parameters?.[PARAM_KEYS.FULL_BACKUP_INTERVAL] ?? null;
  }
}
