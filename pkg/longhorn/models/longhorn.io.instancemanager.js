import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { BADGE_COLOR } from '@longhorn/types/badge';

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
      active: { display: 'Running', background: BADGE_COLOR.SUCCESS },
      error: { display: 'Error', background: BADGE_COLOR.ERROR },
      stopped: { display: 'Stopped', background: BADGE_COLOR.INFO },
      stopping: { display: 'Stopping', background: BADGE_COLOR.WARNING },
      transitioning: { display: 'Starting', background: BADGE_COLOR.WARNING },
    };
  }

  get availableActions() {
    const availableActions = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML];

    return availableActions.filter((item) => !forbiddenActions.includes(item.action));
  }

  get state() {
    const currentState = this.status?.currentState?.toLowerCase();
    const failedConditionMessage = this.findConditionMessage(
      (condition) => condition.status?.toLowerCase() === 'false'
    );

    if (failedConditionMessage) return 'error';

    return CURRENT_STATE_TO_STATE[currentState] || currentState || 'unknown';
  }

  get stateDescription() {
    const failedConditionMessage = this.findConditionMessage(
      (condition) => condition.status?.toLowerCase() === 'false'
    );
    const statusError = this.getStatusErrorMessage(() => (this.status?.currentState || '').toLowerCase() === 'error');

    return failedConditionMessage || statusError || '';
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
