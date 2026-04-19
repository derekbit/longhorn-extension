import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

export default class BackupTargetModel extends LonghornModel {
  get availableActions() {
    const out = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE];

    if (this.metadata?.name === 'default') {
      forbiddenActions.push(AVAILABLE_ACTIONS.DELETE);
    }

    return out.filter((item) => !forbiddenActions.includes(item.action));
  }

  get _isUnavailable() {
    return this.status?.available === false;
  }

  get _errorMessage() {
    const errorCond = (this.status?.conditions || []).find(
      (c) => c.type === 'Unavailable' && c.status === 'True' && c.message
    );

    return errorCond?.message || '';
  }

  get state() {
    if (this._isUnavailable || this._errorMessage) return 'error';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    return this._errorMessage;
  }

  get stateObj() {
    const hasError = this._isUnavailable || !!this._errorMessage;

    return {
      ...this.metadata?.state,
      error: hasError,
      message: hasError ? this.stateDescription : this.metadata?.state?.message,
    };
  }
}
