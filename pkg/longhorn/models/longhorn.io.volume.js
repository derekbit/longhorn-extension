import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import LonghornModel from './longhorn';

const STATE_DISPLAY_MAP = {
  attached: 'Attached',
  detached: 'Detached',
  faulted: 'Faulted',
  healthy: 'Healthy',
  degraded: 'Degraded',
};

export default class VolumeModel extends LonghornModel {
  static get STATES() {
    return {
      FAULTED: 'faulted',
      ATTACHED: 'attached',
      DETACHED: 'detached',
      HEALTHY: 'healthy',
      DEGRADED: 'degraded',
    };
  }

  get availableActions() {
    const out = super._availableActions || [];
    const isLocked = this.isStandby || this.isRestoring;

    return out.map((action) => {
      const cloned = { ...action };

      switch (cloned.action) {
        case 'cloneYaml':
          cloned.enabled = !isLocked;
          break;
        case 'goToEditYaml':
        case 'goToEdit':
          if (this.isFaulted) cloned.enabled = false;
          break;
      }

      return cloned;
    });
  }

  get _canEdit() {
    return !this.isFaulted && super._canEdit;
  }

  get robustness() {
    return this.status?.robustness?.toLowerCase() || 'unknown';
  }

  get state() {
    return this.status?.state?.toLowerCase() || '';
  }

  get isFaulted() {
    return this.robustness === VolumeModel.STATES.FAULTED;
  }

  get isAttached() {
    return this.state === VolumeModel.STATES.ATTACHED;
  }

  get isStandby() {
    return !!(this.status?.isStandby || this.spec?.standby);
  }

  get isRestoring() {
    return this.status?.restoreStatus?.some((item) => item?.isRestoring) ?? false;
  }

  get displayState() {
    const { state, robustness } = this;

    const isStable =
      (state === VolumeModel.STATES.ATTACHED &&
        [VolumeModel.STATES.HEALTHY, VolumeModel.STATES.DEGRADED].includes(robustness)) ||
      (state === VolumeModel.STATES.DETACHED && robustness === VolumeModel.STATES.FAULTED);

    const target = isStable ? robustness : state;

    return STATE_DISPLAY_MAP[target] || target.charAt(0).toUpperCase() + target.slice(1);
  }

  get readyStatus() {
    if (this.isFaulted) {
      return { ready: false, msg: 'Volume is faulted.' };
    }

    if (this.status?.restoreRequired) {
      return { ready: false, msg: 'Restoration required.' };
    }

    const scheduledCondition = this.status?.conditions?.find((c) => c.type?.toLowerCase() === 'scheduled');
    const isScheduled = scheduledCondition?.status?.toLowerCase() === 'true';

    if (this.state === VolumeModel.STATES.DETACHED && !isScheduled) {
      return { ready: false, msg: 'Insufficient resources to schedule.' };
    }

    return { ready: true };
  }

  get inStore() {
    return this.$rootGetters['currentProduct']?.inStore;
  }

  get engines() {
    if (!this.inStore) return [];

    return this.$rootGetters[`${this.inStore}/all`](LONGHORN_RESOURCES.ENGINES) || [];
  }

  get currentEngine() {
    return this.engines.find((e) => e.spec?.volumeName === this.metadata.name) || null;
  }

  get volumeAttachments() {
    if (!this.inStore) return [];

    return (this.$rootGetters[`${this.inStore}/all`](LONGHORN_RESOURCES.VOLUME_ATTACHMENTS) || []).filter(
      (va) => va.volumeName === this.metadata.name
    );
  }

  get attachmentRows() {
    return this.volumeAttachments.flatMap((va) => va.ticketRows || []);
  }
}
