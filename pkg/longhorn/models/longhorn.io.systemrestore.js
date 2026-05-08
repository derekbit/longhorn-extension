import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { BADGE_COLOR } from '@longhorn/types/badge';

export default class SystemRestoreModel extends LonghornModel {
  // State mapping specific to SystemRestore
  static get STATE_MAP() {
    return {
      active: { display: 'Completed', background: BADGE_COLOR.SUCCESS },
      error: { display: 'Error', background: BADGE_COLOR.ERROR },
      transitioning: { display: 'In Progress', background: BADGE_COLOR.WARNING },
    };
  }

  get availableActions() {
    const availableActions = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML];

    return availableActions.filter((item) => !forbiddenActions.includes(item.action));
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

    return (
      statusError || this.findConditionMessage((condition) => condition.type === 'Error' && condition.status === 'True')
    );
  }

  get state() {
    if (this._errorMessage) return 'error';

    const currentState = (this.status?.state || '').toLowerCase();

    // Only define final states, everything else is transitioning
    if (currentState === 'completed') return 'active';
    if (currentState === 'error') return 'error';
    if (!currentState) return 'unknown';

    // All other non-empty states are transitioning
    return 'transitioning';
  }

  get stateDescription() {
    return this._errorMessage;
  }

  /**
   * Convert state name from PascalCase/camelCase to human-readable format
   * e.g., "InProgress" -> "In Progress"
   */
  formatStateName(stateName) {
    if (!stateName) return '';

    // Insert space before capital letters and uppercase first letter
    return stateName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  }

  get stateDisplay() {
    const state = this.state;
    const rawState = this.status?.state || '';

    if (state === 'active') return 'Completed';
    if (state === 'error') return 'Error';
    if (state === 'unknown') return 'Unknown';

    // For transitioning state, use the raw state name with auto-formatting
    return this.formatStateName(rawState);
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
