import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

export default class SystemBackupModel extends LonghornModel {
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
    if (this.status?.error) return this.status.error;

    const errorCond = (this.status?.conditions || []).find(
      (c) => c.type === 'Error' && c.status === 'True' && c.message
    );

    return errorCond?.message || '';
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

  get stateObj() {
    return {
      ...this.metadata?.state,
      error: !!this._errorMessage,
    };
  }
}
