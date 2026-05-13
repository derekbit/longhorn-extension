import LonghornModel from './longhorn';
import { resolveKubernetesStatus } from '@longhorn/utils/general';

const CREATE_DR_VOLUME_ACTION = 'createDisasterRecoveryVolume';

export default class BackupVolumeModel extends LonghornModel {
  get availableActions() {
    const out = [...(super._availableActions || [])];
    const restoreAction = {
      action: CREATE_DR_VOLUME_ACTION,
      enabled: this.canCreateDisasterRecoveryVolume,
      icon: 'icon icon-backup-restore',
      label: 'Create Disaster Recovery Volume',
      tooltip: this.canCreateDisasterRecoveryVolume ? '' : 'No latest backup available',
    };

    const firstDividerIndex = out.findIndex((item) => item.divider);

    if (firstDividerIndex !== -1) {
      out.splice(firstDividerIndex, 0, restoreAction);
    } else {
      out.unshift(restoreAction);
    }

    return this.sanitizeAvailableActions(out);
  }

  get volumeName() {
    return this.spec?.volumeName || this.status?.volumeName || this.name || this.metadata?.name || '';
  }

  get size() {
    return this.status?.size || this.spec?.size || 0;
  }

  get backupTargetName() {
    return this.spec?.backupTargetName || this.status?.backupTargetName || '';
  }

  get lastBackupAt() {
    return this.status?.lastBackupAt || '';
  }

  get canCreateDisasterRecoveryVolume() {
    return !!this.status?.lastBackupName && !this.status?.messages?.error;
  }

  get kubernetesStatus() {
    const metadataLabels = this.labels || this.metadata?.labels || {};

    return resolveKubernetesStatus({
      value: this.status?.kubernetesStatus,
      statusLabels: this.status?.labels,
      metadataLabels,
    });
  }

  createDisasterRecoveryVolume(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'CreateDisasterRecoveryVolumeDialog',
      modalWidth: '760px',
    });
  }
}
