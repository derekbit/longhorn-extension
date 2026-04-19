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
  get availableActions() {
    const out = super._availableActions;
    const forbiddenActions = [AVAILABLE_ACTIONS.CLONE_YAML];

    return out.filter((item) => !forbiddenActions.includes(item.action));
  }

  get state() {
    const currentState = this.status?.currentState?.toLowerCase();
    const failedCond = (this.status?.conditions || []).find((c) => c.status?.toLowerCase() === 'false' && c.message);

    if (failedCond) return 'error';

    return CURRENT_STATE_TO_STATE[currentState] || currentState || 'unknown';
  }

  get stateDescription() {
    const failedCond = (this.status?.conditions || []).find((c) => c.status?.toLowerCase() === 'false' && c.message);

    return failedCond?.message || this.status?.error || '';
  }

  get stateObj() {
    const hasError = !!(
      this.status?.error ||
      (this.status?.conditions || []).some((c) => c.status?.toLowerCase() === 'false' && c.message)
    );

    return {
      ...this.metadata?.state,
      error: hasError,
    };
  }
}
