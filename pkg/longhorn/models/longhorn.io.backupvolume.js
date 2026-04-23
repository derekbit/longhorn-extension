import LonghornModel from './longhorn';
import { resolveKubernetesStatus } from '@longhorn/utils/json';

export default class BackupVolumeModel extends LonghornModel {
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

  get kubernetesStatus() {
    const metadataLabels = this.labels || this.metadata?.labels || {};

    return resolveKubernetesStatus({
      value: this.status?.kubernetesStatus,
      statusLabels: this.status?.labels,
      metadataLabels,
    });
  }
}
