import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { BADGE_COLOR } from '@longhorn/types/badge';

export default class BackupTargetModel extends LonghornModel {
  // State mapping specific to BackupTarget
  static get STATE_MAP() {
    return {
      error: { display: 'Unavailable', background: BADGE_COLOR.ERROR },
      active: { display: 'Available', background: BADGE_COLOR.SUCCESS },
    };
  }

  get availableActions() {
    const availableActions = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE];

    if (this.metadata?.name === 'default') {
      forbiddenActions.push(AVAILABLE_ACTIONS.DELETE);
    }

    return availableActions.filter((item) => !forbiddenActions.includes(item.action));
  }

  get _isUnavailable() {
    return this.status?.available === false;
  }

  get _errorMessage() {
    return this.findConditionMessage((condition) => condition.type === 'Unavailable' && condition.status === 'True');
  }

  get state() {
    if (this._isUnavailable || this._errorMessage) return 'error';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    return this._errorMessage;
  }

  get stateDisplay() {
    return this.getDisplayForState(this.state, BackupTargetModel.STATE_MAP);
  }

  get stateBackground() {
    return this.getBackgroundForState(this.state, BackupTargetModel.STATE_MAP);
  }

  get stateObj() {
    const baseState = super.stateObj;
    const hasError = this._isUnavailable || !!this._errorMessage;

    return this.buildStateObj(baseState, {
      hasError,
      message: hasError ? this.stateDescription : baseState?.message,
    });
  }
}
