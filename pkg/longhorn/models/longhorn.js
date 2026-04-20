import SteveModel from '@shell/plugins/steve/steve-class';

// Standard state display and color mapping for all resources
const DEFAULT_STATE_MAP = {
  error: { display: 'Error', background: 'bg-error' },
  failed: { display: 'Failed', background: 'bg-error' },
  active: { display: 'Active', background: 'bg-success' },
  ready: { display: 'Ready', background: 'bg-success' },
  available: { display: 'Available', background: 'bg-success' },
  healthy: { display: 'Healthy', background: 'bg-success' },
  transitioning: { display: 'In Progress', background: 'bg-warning' },
  warning: { display: 'Warning', background: 'bg-warning' },
  degraded: { display: 'Degraded', background: 'bg-warning' },
  disabled: { display: 'Disabled', background: 'badge-disabled' },
  stopped: { display: 'Stopped', background: 'bg-info' },
  info: { display: 'Info', background: 'bg-info' },
  unknown: { display: 'Unknown', background: 'badge-disabled' },
};

export default class LonghornModel extends SteveModel {
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

    return map[normalized]?.background || 'bg-info';
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
