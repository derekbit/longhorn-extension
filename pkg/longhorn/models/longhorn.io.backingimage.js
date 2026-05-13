import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { BACKING_IMAGE_CREATE_SOURCE_TYPE_OPTIONS } from '@longhorn/types/backingimage';
import { BADGE_COLOR } from '@longhorn/types/general';

export default class BackingImageModel extends LonghornModel {
  get availableActions() {
    const out = super._availableActions || [];
    const deletingHiddenActions = [
      AVAILABLE_ACTIONS.DELETE,
      AVAILABLE_ACTIONS.EDIT,
      AVAILABLE_ACTIONS.EDIT_YAML,
      AVAILABLE_ACTIONS.CLONE_YAML,
    ];
    const visibleActions = this.isDeleting
      ? out.filter((action) => !deletingHiddenActions.includes(action.action))
      : out;

    const actionsWithModified = visibleActions.map((action) => {
      if (action.action === AVAILABLE_ACTIONS.CLONE) {
        return { ...action, enabled: this.canClone };
      }

      return action;
    });

    const backupAction = {
      action: 'backup',
      enabled: this.canBackup,
      icon: 'icon icon-backup',
      label: 'Backup',
    };

    const downloadAction = {
      action: 'downloadBackingImage',
      enabled: this.canDownload,
      icon: 'icon icon-download',
      label: 'Download Image',
    };

    const firstDividerIndex = actionsWithModified.findIndex((item) => item.divider);

    if (firstDividerIndex !== -1) {
      actionsWithModified.splice(firstDividerIndex, 0, downloadAction, backupAction);
    } else {
      actionsWithModified.unshift(downloadAction, backupAction);
    }

    return this.sanitizeAvailableActions(actionsWithModified);
  }

  get canClone() {
    return this.supportsDataOperations;
  }

  get canBackup() {
    return this.supportsDataOperations;
  }

  get canDownload() {
    return this.supportsDataOperations;
  }

  get supportsDataOperations() {
    return !this.isUnavailable && this.spec?.dataEngine !== 'v2';
  }

  backup(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'BackingImageBackupDialog',
    });
  }

  downloadBackingImage() {
    // TODO: Implement backing image download via Longhorn manager API.
    // This action should trigger a download of the backing image file via the endpoint:
    // GET /v1/backingimages/{name}/download
    // See longhorn-ui/src/services/backingImage.js for reference implementation.
  }

  get sourceTypeOptions() {
    return [...BACKING_IMAGE_CREATE_SOURCE_TYPE_OPTIONS];
  }

  static get STATE_MAP() {
    return {
      deleting: { display: 'Deleting', background: BADGE_COLOR.INFO },
      error: { display: 'Unavailable', background: BADGE_COLOR.ERROR },
      active: { display: 'Available', background: BADGE_COLOR.SUCCESS },
    };
  }

  get isDeleting() {
    return !!this.metadata?.deletionTimestamp;
  }

  get isUnavailable() {
    const diskFileStatusMap = this.status?.diskFileStatusMap;

    if (!diskFileStatusMap || Object.keys(diskFileStatusMap).length === 0) {
      return true;
    }

    const statusList = Object.values(diskFileStatusMap);

    return statusList.every((diskStatus) => (diskStatus.state || '').toLowerCase().includes('failed'));
  }

  get state() {
    if (this.isDeleting) return 'deleting';

    if (this.isUnavailable) return 'error';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    if (this.isDeleting) return 'Backing image is being deleted';

    if (this.isUnavailable) return 'The backing image is unavailable';

    return '';
  }

  get stateDisplay() {
    return this.getDisplayForState(this.state, BackingImageModel.STATE_MAP);
  }

  get stateBackground() {
    return this.getBackgroundForState(this.state, BackingImageModel.STATE_MAP);
  }

  get stateObj() {
    const baseState = super.stateObj;
    const hasError = this.isUnavailable;

    return this.buildStateObj(baseState, {
      hasError,
      message: hasError ? this.stateDescription : baseState?.message,
    });
  }
}
