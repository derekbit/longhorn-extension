import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { VOLUME_STATE } from '@longhorn/types/volume';
import { resolveKubernetesStatus } from '@longhorn/utils/json';
import LonghornModel from './longhorn';

const BADGE = {
  ERROR: 'bg-error',
  WARNING: 'bg-warning',
  SUCCESS: 'bg-success',
  DISABLED: 'badge-disabled',
};

const STATE_DISPLAY_MAP = {
  attached: 'Attached',
  detached: 'Detached',
  faulted: 'Faulted',
  healthy: 'Healthy',
  degraded: 'Degraded',
};

const ROBUSTNESS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  FAULTED: 'faulted',
  UNKNOWN: 'unknown',
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
    return this.status?.robustness?.toLowerCase() || ROBUSTNESS.UNKNOWN;
  }

  get state() {
    return this.status?.state?.toLowerCase() || '';
  }

  get isFaulted() {
    return this.robustness === ROBUSTNESS.FAULTED;
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
      (state === VolumeModel.STATES.ATTACHED && [ROBUSTNESS.HEALTHY, ROBUSTNESS.DEGRADED].includes(robustness)) ||
      (state === VolumeModel.STATES.DETACHED && robustness === ROBUSTNESS.FAULTED);
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

  get isDataLocalityNotMet() {
    if (this.spec?.dataLocality !== 'best-effort' || !this.isAttached) return false;
    const attachedNodeId = this.status?.currentNodeID || '';

    return (this.status?.replicas || []).every((r) => r.hostID !== attachedNodeId);
  }

  get stateDescription() {
    return '';
  }

  get stateDisplay() {
    return this.volumeStatus?.stateDisplay || this.getDisplayForState('unknown');
  }

  get stateBackground() {
    return this.volumeStatus?.stateBackground || this.getBackgroundForState('unknown');
  }

  get stateObj() {
    return this.buildStateObj(this.metadata?.state || {});
  }

  get volumeStatus() {
    const { state, robustness } = this;

    if (robustness === ROBUSTNESS.FAULTED) {
      return { stateDisplay: 'Faulted', stateBackground: BADGE.ERROR, message: '' };
    }
    if (this.isRestoring) {
      return { stateDisplay: 'Restoring', stateBackground: BADGE.WARNING, message: '' };
    }
    if (this.isStandby) {
      return { stateDisplay: 'Standby', stateBackground: BADGE.DISABLED, message: '' };
    }
    if (state === VolumeModel.STATES.ATTACHED) {
      if (robustness === ROBUSTNESS.HEALTHY) {
        return { stateDisplay: 'Healthy', stateBackground: BADGE.SUCCESS, message: '' };
      }
      if (robustness === ROBUSTNESS.DEGRADED) {
        return { stateDisplay: 'Degraded', stateBackground: BADGE.WARNING, message: '' };
      }
    }
    if (state === VolumeModel.STATES.DETACHED) {
      return { stateDisplay: 'Detached', stateBackground: BADGE.DISABLED, message: '' };
    }

    return { stateDisplay: this.displayState, stateBackground: BADGE.DISABLED, message: '' };
  }

  // Keep dashboard metric labels and list query filtering in sync.
  get dashboardStateDisplay() {
    const { state, robustness } = this;

    if (state === VolumeModel.STATES.DETACHED && robustness === ROBUSTNESS.FAULTED) {
      return VOLUME_STATE.FAULTED;
    }

    if (state === VolumeModel.STATES.ATTACHED && robustness === ROBUSTNESS.DEGRADED) {
      return VOLUME_STATE.DEGRADED;
    }

    if (state === VolumeModel.STATES.ATTACHED && robustness === ROBUSTNESS.HEALTHY) {
      return VOLUME_STATE.HEALTHY;
    }

    if (state === VolumeModel.STATES.DETACHED) {
      return VOLUME_STATE.DETACHED;
    }

    return VOLUME_STATE.IN_PROGRESS;
  }

  // Space-delimited host IDs used for simple table filtering by replica location.
  get replicaNodeIds() {
    const inStore = this.$rootGetters['currentProduct']?.inStore;
    const allReplicas = inStore ? this.$rootGetters[`${inStore}/all`]?.(LONGHORN_RESOURCES.REPLICAS) || [] : [];
    const volumeName = this.metadata?.name || this.id;
    const relatedReplicas = allReplicas.filter(
      (replica) => replica?.spec?.volumeName === volumeName || replica?.volumeName === volumeName
    );
    const replicas = this.status?.replicas?.length
      ? this.status.replicas
      : this.replicas?.length
        ? this.replicas
        : relatedReplicas;
    const ids = replicas
      .map((replica) => replica?.hostID || replica?.hostId || replica?.spec?.nodeID || replica?.spec?.nodeId)
      .filter((id) => !!id);

    return [...new Set(ids)].join(' ');
  }

  get kubernetesStatus() {
    const metadataLabels = this.labels || this.metadata?.labels || {};

    return resolveKubernetesStatus({
      value: this.status?.kubernetesStatus,
      statusLabels: this.status?.labels,
      metadataLabels,
    });
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
