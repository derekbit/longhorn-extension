import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

export default class SystemBackupModel extends LonghornModel {
  get availableActions() {
    const availableActions = super._availableActions;
    const forbiddenActions = [
      AVAILABLE_ACTIONS.EDIT,
      AVAILABLE_ACTIONS.CLONE,
      AVAILABLE_ACTIONS.CLONE_YAML,
      AVAILABLE_ACTIONS.EDIT_YAML,
    ];
    const filtered = availableActions.filter((item) => !forbiddenActions.includes(item.action));
    const firstDividerIndex = filtered.findIndex((item) => item.divider);

    const restoreAction = {
      action: 'restore',
      enabled: true,
      icon: 'icon icon-backup-restore',
      label: 'Restore',
    };

    if (firstDividerIndex !== -1) {
      filtered.splice(firstDividerIndex, 0, restoreAction);
    } else {
      filtered.unshift(restoreAction);
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

    return (
      statusError || this.findConditionMessage((condition) => condition.type === 'Error' && condition.status === 'True')
    );
  }

  get state() {
    if (this._errorMessage) return 'error';

    const currentState = (this.status?.state || '').toLowerCase();

    // Only define final states, everything else is transitioning
    if (currentState === 'completed' || currentState === 'ready') return 'active';
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
   * e.g., "CreatingVolumeBackups" -> "Creating Volume Backups"
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
    return this.getBackgroundForState(this.state);
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
