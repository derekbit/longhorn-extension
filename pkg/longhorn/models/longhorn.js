import SteveModel from '@shell/plugins/steve/steve-class';
import { BADGE_COLOR } from '@longhorn/types/general';
import { sanitizeAvailableActions } from '@longhorn/utils/general';

// Standard state display and color mapping for all resources
const DEFAULT_STATE_MAP = {
  error: { display: 'Error', background: BADGE_COLOR.ERROR },
  failed: { display: 'Failed', background: BADGE_COLOR.ERROR },
  active: { display: 'Active', background: BADGE_COLOR.SUCCESS },
  ready: { display: 'Ready', background: BADGE_COLOR.SUCCESS },
  available: { display: 'Available', background: BADGE_COLOR.SUCCESS },
  healthy: { display: 'Healthy', background: BADGE_COLOR.SUCCESS },
  transitioning: { display: 'In Progress', background: BADGE_COLOR.WARNING },
  warning: { display: 'Warning', background: BADGE_COLOR.WARNING },
  degraded: { display: 'Degraded', background: BADGE_COLOR.WARNING },
  disabled: { display: 'Disabled', background: BADGE_COLOR.DISABLED },
  stopped: { display: 'Stopped', background: BADGE_COLOR.INFO },
  info: { display: 'Info', background: BADGE_COLOR.INFO },
  unknown: { display: 'Unknown', background: BADGE_COLOR.DISABLED },
};

export default class LonghornModel extends SteveModel {
  sanitizeAvailableActions(actions = []) {
    return sanitizeAvailableActions(actions);
  }

  normalizeStateMessage(message) {
    if (message === null || message === undefined) {
      return '';
    }

    const normalizedMessage = String(message).trim();

    if (!normalizedMessage) {
      return '';
    }

    return normalizedMessage;
  }

  getStatusErrorMessage(shouldUse = true) {
    const enabled = typeof shouldUse === 'function' ? shouldUse() : shouldUse;

    if (!enabled) {
      return '';
    }

    return this.normalizeStateMessage(this.status?.error);
  }

  findConditionMessage(matchFn = () => true) {
    const conditions = this.status?.conditions || [];

    for (const condition of conditions) {
      if (!matchFn(condition)) {
        continue;
      }

      const message = this.normalizeStateMessage(condition?.message);

      if (message) {
        return message;
      }
    }

    return '';
  }

  sanitizeStateObj(stateObj = {}) {
    const state = { ...stateObj };

    state.message = this.normalizeStateMessage(state.message);

    return state;
  }

  buildStateObj(baseState = {}, { hasError, message } = {}) {
    const nextState = { ...baseState };

    if (typeof hasError === 'boolean') {
      nextState.error = hasError;
    }

    if (message !== undefined) {
      nextState.message = message;
    }

    return this.sanitizeStateObj(nextState);
  }

  // Unified state display and background mapping
  // Each model can define its own stateMap and call these methods
  getDisplayForState(state, customMap = {}) {
    const map = { ...DEFAULT_STATE_MAP, ...customMap };
    const normalized = (state || '').toLowerCase();

    return map[normalized]?.display || this._capitalizeState(normalized);
  }

  getBackgroundForState(state, customMap = {}) {
    const map = { ...DEFAULT_STATE_MAP, ...customMap };
    const normalized = (state || '').toLowerCase();

    return map[normalized]?.background || BADGE_COLOR.INFO;
  }

  _capitalizeState(state) {
    if (!state) return 'Unknown';

    return state
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  get stateObj() {
    return this.buildStateObj(this.metadata?.state || {});
  }
}
