import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

export default class SystemBackupModel extends LonghornModel {
  // State mapping specific to SystemBackup
  static get STATE_MAP() {
    return {
      active: { display: 'Completed', background: 'bg-success' },
      error: { display: 'Error', background: 'bg-error' },
      transitioning: { display: 'In Progress', background: 'bg-warning' },
    };
  }

  get availableActions() {
    const out = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML, AVAILABLE_ACTIONS.EDIT_YAML];
    const filtered = out.filter((item) => !forbiddenActions.includes(item.action));
    const firstDividerIndex = filtered.findIndex((item) => item.divider);

    const restoreAction = {
      action: 'restore',
      enabled: true,
      icon: 'icon icon-backup-restore',
      label: 'Restore',
    };

    if (firstDividerIndex !== -1) {
      filtered.splice(firstDividerIndex + 1, 0, restoreAction);
    } else {
      filtered.push(restoreAction);
    }

    return filtered;
  }

  restore(resources = this) {
    this.$dispatch('promptModal', {
      resources,
      component: 'SystemBackupRestore',
    });
  }

  get _errorMessage() {
    const statusError = this.getStatusErrorMessage(() => (this.status?.state || '').toLowerCase() === 'error');

    return statusError || this.findConditionMessage((c) => c.type === 'Error' && c.status === 'True');
  }

  get state() {
    if (this._errorMessage) return 'error';

    const s = (this.status?.state || '').toLowerCase();

    if (s === 'completed') return 'active';
    if (s === 'error') return 'error';
    if (['uploading', 'generating', 'backingup'].includes(s)) return 'transitioning';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    return this._errorMessage;
  }

  get stateDisplay() {
    const state = this.state;
    const stateMap = {
      active: 'Completed',
      error: 'Error',
      transitioning: 'In Progress',
    };

    return stateMap[state] || state?.charAt(0).toUpperCase() + state?.slice(1) || 'Unknown';
  }

  get stateBackground() {
    const state = this.state;

    if (state === 'error') return 'bg-error';
    if (state === 'transitioning') return 'bg-warning';

    return 'bg-success';
  }

  get stateObj() {
    const baseState = super.stateObj;
    const hasError = !!this._errorMessage;

    return this.buildStateObj(baseState, {
      hasError,
      message: hasError ? this.stateDescription : baseState?.message,
    });
  }
}
