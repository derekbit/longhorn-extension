import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

const CURRENT_STATE_TO_STATE = {
  running: 'active',
  stopped: 'stopped',
  starting: 'transitioning',
  stopping: 'stopping',
  error: 'error',
};

export default class InstanceManagerModel extends LonghornModel {
  // State mapping specific to InstanceManager
  static get STATE_MAP() {
    return {
      active: { display: 'Running', background: 'bg-success' },
      error: { display: 'Error', background: 'bg-error' },
      stopped: { display: 'Stopped', background: 'bg-info' },
      stopping: { display: 'Stopping', background: 'bg-warning' },
      transitioning: { display: 'Starting', background: 'bg-warning' },
    };
  }

  get availableActions() {
    const out = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML];

    return out.filter((item) => !forbiddenActions.includes(item.action));
  }

  get state() {
    const currentState = this.status?.currentState?.toLowerCase();
    const failedCond = this.findConditionMessage((c) => c.status?.toLowerCase() === 'false');

    if (failedCond) return 'error';

    return CURRENT_STATE_TO_STATE[currentState] || currentState || 'unknown';
  }

  get stateDescription() {
    const failedCond = this.findConditionMessage((c) => c.status?.toLowerCase() === 'false');
    const statusError = this.getStatusErrorMessage(() => (this.status?.currentState || '').toLowerCase() === 'error');

    return failedCond || statusError || '';
  }

  get stateDisplay() {
    return this.getDisplayForState(this.state, InstanceManagerModel.STATE_MAP);
  }

  get stateBackground() {
    return this.getBackgroundForState(this.state, InstanceManagerModel.STATE_MAP);
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
