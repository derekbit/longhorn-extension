import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';

export default class SystemRestoreModel extends LonghornModel {
  // State mapping specific to SystemRestore
  static get STATE_MAP() {
    return {
      active: { display: 'Completed', background: 'bg-success' },
      error: { display: 'Error', background: 'bg-error' },
      transitioning: { display: 'In Progress', background: 'bg-warning' },
    };
  }

  get availableActions() {
    const out = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML];

    return out.filter((item) => !forbiddenActions.includes(item.action));
  }

  get systemBackups() {
    const inStore = this.$rootGetters['currentProduct']?.inStore;

    if (!inStore) {
      return [];
    }

    this.$dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.SYSTEM_BACKUPS }, { root: true });

    return this.$rootGetters[`${inStore}/all`](LONGHORN_RESOURCES.SYSTEM_BACKUPS) || [];
  }

  get version() {
    const backupName = this.spec?.systemBackup;

    if (!backupName) return '';

    const matchingBackup = this.systemBackups.find((backup) => backup.metadata?.name === backupName);

    return matchingBackup?.status?.version || '';
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
    if (['restoring', 'pending'].includes(s)) return 'transitioning';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    return this._errorMessage;
  }

  get stateDisplay() {
    return this.getDisplayForState(this.state, SystemRestoreModel.STATE_MAP);
  }

  get stateBackground() {
    return this.getBackgroundForState(this.state, SystemRestoreModel.STATE_MAP);
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
