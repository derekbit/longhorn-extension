import LonghornModel from './longhorn';
import { PARAM_KEYS } from '@longhorn/types/recurringjob';
import {
  formatRecurringJobCron,
  formatRecurringJobGroups,
  formatRecurringJobLabels,
  formatRecurringJobParameters,
  formatRecurringJobTask,
  getRecurringJobBaseTask,
  getVolumeBackupPolicyDisplay,
} from '@longhorn/utils/recurringjob';

export default class RecurringJobModel extends LonghornModel {
  get baseTask() {
    return getRecurringJobBaseTask(this.spec?.task || '');
  }

  get isForceCreate() {
    return !!this.spec?.task?.endsWith('-force-create');
  }

  get taskDisplay() {
    return formatRecurringJobTask(this.spec?.task || '');
  }

  get cronDisplay() {
    return formatRecurringJobCron(this.spec?.cron);
  }

  get groupsDisplay() {
    return formatRecurringJobGroups(this.spec?.groups || []);
  }

  get labelsDisplay() {
    return formatRecurringJobLabels(this.spec?.labels || {});
  }

  get volumeBackupPolicyDisplay() {
    const volumeBackupPolicy = this.spec?.parameters?.[PARAM_KEYS.VOLUME_BACKUP_POLICY];

    return getVolumeBackupPolicyDisplay(volumeBackupPolicy);
  }

  get fullBackupInterval() {
    return this.spec?.parameters?.[PARAM_KEYS.FULL_BACKUP_INTERVAL] ?? null;
  }

  get parametersDisplay() {
    return formatRecurringJobParameters(this.spec?.parameters || {});
  }
}
