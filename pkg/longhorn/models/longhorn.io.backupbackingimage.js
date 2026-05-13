import LonghornModel from './longhorn';
import { BADGE_COLOR } from '@longhorn/types/general';

const RESTORABLE_STATE = 'completed';
const RESTORE_DISABLED_TOOLTIP = 'Only complete state backup can be restored';

export default class BackupBackingImageModel extends LonghornModel {
  get availableActions() {
    const out = [...(super._availableActions || [])];
    const restoreAction = {
      action: 'restore',
      enabled: this.canRestore,
      icon: 'icon icon-backup-restore',
      label: 'Restore',
      tooltip: this.canRestore ? '' : RESTORE_DISABLED_TOOLTIP,
    };
    const firstDividerIndex = out.findIndex((item) => item.divider);

    if (firstDividerIndex !== -1) {
      out.splice(firstDividerIndex, 0, restoreAction);
    } else {
      out.unshift(restoreAction);
    }

    return this.sanitizeAvailableActions(out);
  }

  get canRestore() {
    const state = (this.status?.state || '').toLowerCase();

    return state === RESTORABLE_STATE;
  }

  restore(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'RestoreBackupBackingImageDialog',
    });
  }

  static get STATE_MAP() {
    return {
      ready: { display: 'Ready', background: BADGE_COLOR.SUCCESS },
      error: { display: 'Error', background: BADGE_COLOR.ERROR },
      failed: { display: 'Failed', background: BADGE_COLOR.ERROR },
      uploading: { display: 'Uploading', background: BADGE_COLOR.WARNING },
      'ready-for-transfer': { display: 'Ready For Transfer', background: BADGE_COLOR.WARNING },
      'failed-and-cleanup': { display: 'Failed', background: BADGE_COLOR.ERROR },
    };
  }

  get state() {
    return this.status?.state?.toLowerCase() || 'unknown';
  }

  get stateDisplay() {
    const state = this.status?.state || 'unknown';

    return this.getDisplayForState(state, BackupBackingImageModel.STATE_MAP);
  }

  get stateBackground() {
    const state = this.status?.state || 'unknown';

    return this.getBackgroundForState(state, BackupBackingImageModel.STATE_MAP);
  }

  get stateDescription() {
    const isErrorState = ['error', 'failed'].includes((this.status?.state || '').toLowerCase());

    return this.getStatusErrorMessage(isErrorState);
  }

  get stateObj() {
    const baseState = super.stateObj;
    const hasError = !!this.stateDescription;

    return this.buildStateObj(baseState, {
      hasError,
      message: hasError ? this.stateDescription : baseState?.message,
    });
  }
}
