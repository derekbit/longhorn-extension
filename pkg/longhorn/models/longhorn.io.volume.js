import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { VOLUME_STATE } from '@longhorn/types/volume';
import { getVolumeStateQueryValue } from '@longhorn/utils/volume';
import { BADGE_COLOR } from '@longhorn/types/general';
import { resolveKubernetesStatus } from '@longhorn/utils/general';
import LonghornModel from './longhorn';

const BADGE = {
  ERROR: BADGE_COLOR.ERROR,
  WARNING: BADGE_COLOR.WARNING,
  SUCCESS: BADGE_COLOR.SUCCESS,
  DISABLED: BADGE_COLOR.DISABLED,
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

const VOLUME_ACTION = {
  ATTACH: 'promptAttach',
  DETACH: 'detachVolume',
  ENGINE_UPGRADE: 'engineUpgrade',
  TRIM_FILESYSTEM: 'trimFilesystem',
  PV_AND_PVC_CREATE: 'pvAndpvcCreate',
  BACKEND_PV_CREATE: 'pvCreate',
  BACKEND_PVC_CREATE: 'pvcCreate',
};

const MANUAL_ACTION_FILTERS = new Set([
  VOLUME_ACTION.ENGINE_UPGRADE,
  VOLUME_ACTION.TRIM_FILESYSTEM,
  VOLUME_ACTION.BACKEND_PV_CREATE,
  VOLUME_ACTION.BACKEND_PVC_CREATE,
]);

const VOLUME_DIALOG = {
  ATTACH: 'AttachVolumeDialog',
  CREATE_PV_AND_PVC: 'CreatePVAndPVCDialog',
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

    // TODO: remove these custom entries once the backend exposes the corresponding
    // volume actions consistently and the UI can rely on them without hiding items.
    const custom = [
      {
        action: VOLUME_ACTION.ATTACH,
        label: 'Attach',
        icon: 'icon-plus',
        enabled: !this.isRestoring && this.state === VolumeModel.STATES.DETACHED,
      },
      {
        action: VOLUME_ACTION.DETACH,
        label: 'Detach',
        icon: 'icon-minus',
        enabled: this.canDetach,
      },
      {
        action: VOLUME_ACTION.ENGINE_UPGRADE,
        label: 'Upgrade Engine',
        icon: 'icon-upgrade-alt',
        enabled: true,
      },
      {
        action: VOLUME_ACTION.TRIM_FILESYSTEM,
        label: 'Trim Filesystem',
        icon: 'icon-file',
        enabled: true,
      },
      {
        action: VOLUME_ACTION.PV_AND_PVC_CREATE,
        label: 'Create PV/PVC',
        icon: 'icon-storage',
        enabled: true,
      },
    ];

    // TODO: stop filtering these backend actions once the UI can rely on the
    // backend-provided action list for visibility without losing menu entries.
    const baseActions = out.filter((action) => !MANUAL_ACTION_FILTERS.has(action.action));

    return this.sanitizeAvailableActions([
      ...custom,
      ...baseActions.map((action) => {
        const cloned = { ...action };

        switch (cloned.action) {
          case 'cloneYaml':
            cloned.enabled = !isLocked;
            break;
          case 'salvage':
            cloned.enabled = !this.isRestoring;
            break;
          case 'goToEditYaml':
          case 'goToEdit':
            if (this.isFaulted) cloned.enabled = false;
            break;
        }

        return cloned;
      }),
    ]);
  }

  openVolumeDialog(component) {
    this.$dispatch('promptModal', {
      resources: [this],
      component,
    });
  }

  promptAttach() {
    this.openVolumeDialog(VOLUME_DIALOG.ATTACH);
  }

  detachVolume() {
    // TODO: implement detach
    // Use volume API action: this.doAction('detach', { attachmentID, hostId, forceDetach })
  }

  engineUpgrade() {
    // TODO: implement engine upgrade
    // Use volume API action: this.doAction('engineUpgrade', { image })
  }

  salvage() {
    // TODO: implement salvage
    // Use volume API action: this.doAction('salvage', { names })
  }

  trimFilesystem() {
    // TODO: implement trim filesystem
    // Use volume API action: this.doAction('trimFilesystem')
  }

  pvAndpvcCreate() {
    this.openVolumeDialog(VOLUME_DIALOG.CREATE_PV_AND_PVC);
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

  get canDetach() {
    if (this.isStandby || this.isRestoring) {
      return false;
    }

    if (this.spec?.accessMode === 'rwx') {
      if (this.spec?.migratable) {
        return this.state === VolumeModel.STATES.ATTACHED && (this.controllers || []).length <= 1;
      }

      return this.state === VolumeModel.STATES.ATTACHED && !!this.disableFrontend;
    }

    return this.state === VolumeModel.STATES.ATTACHED;
  }

  get canEngineUpgrade() {
    if (this.isRestoring || this.spec?.dataEngine === 'v2') {
      return false;
    }

    if (![VolumeModel.STATES.DETACHED, VolumeModel.STATES.ATTACHED].includes(this.state)) {
      return false;
    }

    return true;
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

    const scheduledCondition = this.status?.conditions?.find(
      (condition) => condition.type?.toLowerCase() === 'scheduled'
    );
    const isScheduled = scheduledCondition?.status?.toLowerCase() === 'true';

    if (this.state === VolumeModel.STATES.DETACHED && !isScheduled) {
      return { ready: false, msg: 'Insufficient resources to schedule.' };
    }

    return { ready: true };
  }

  get isDataLocalityNotMet() {
    if (this.spec?.dataLocality !== 'best-effort' || !this.isAttached) return false;
    const attachedNodeId = this.status?.currentNodeID || '';

    return (this.status?.replicas || []).every((replica) => replica.hostID !== attachedNodeId);
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

  // Legacy longhorn-ui style query value used by dashboard volume status filtering.
  get dashboardStateQueryValue() {
    return getVolumeStateQueryValue(this.dashboardStateDisplay);
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
    return this.engines.find((engine) => engine.spec?.volumeName === this.metadata.name) || null;
  }

  get volumeAttachments() {
    if (!this.inStore) return [];

    return (this.$rootGetters[`${this.inStore}/all`](LONGHORN_RESOURCES.VOLUME_ATTACHMENTS) || []).filter(
      (volumeAttachment) => volumeAttachment.volumeName === this.metadata.name
    );
  }

  get attachmentRows() {
    return this.volumeAttachments.flatMap((volumeAttachment) => volumeAttachment.ticketRows || []);
  }
}
