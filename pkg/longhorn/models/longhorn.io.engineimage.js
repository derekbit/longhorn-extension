import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';

export default class EngineImageModel extends LonghornModel {
  get availableActions() {
    const out = super._availableActions
      .filter((action) => ![AVAILABLE_ACTIONS.CLONE].includes(action.action))
      .map((action) => {
        if (action.action === AVAILABLE_ACTIONS.DELETE) {
          return { ...action, enabled: !this.isDefault };
        }

        return action;
      });

    return out;
  }

  get image() {
    return this.spec.image;
  }

  get isDefault() {
    const defaultEngineImageSetting = this.defaultEngineImageSetting;
    const defaultEngineImage = defaultEngineImageSetting?.value;

    return this.spec?.image && defaultEngineImage ? this.spec.image === defaultEngineImage : false;
  }

  get defaultEngineImageSetting() {
    const inStore = this.$rootGetters['currentProduct']?.inStore;

    if (!inStore) {
      return null;
    }

    this.$dispatch(
      `${inStore}/find`,
      {
        type: LONGHORN_RESOURCES.SETTINGS,
        id: LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE,
      },
      { root: true }
    );

    return this.$rootGetters[`${inStore}/byId`](LONGHORN_RESOURCES.SETTINGS, LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE);
  }

  get stateDescription() {
    const failedCond = (this.status?.conditions || []).find((c) => c.status?.toLowerCase() === 'false' && c.message);

    return failedCond?.message || '';
  }

  get state() {
    const failedCond = (this.status?.conditions || []).find((c) => c.status?.toLowerCase() === 'false' && c.message);

    if (failedCond) return 'error';

    const s = (this.status?.state || '').toLowerCase();

    if (s === 'ready') return 'active';
    if (s === 'error') return 'error';
    if (s === 'deploying') return 'transitioning';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateObj() {
    const hasError = (this.status?.conditions || []).some((c) => c.status?.toLowerCase() === 'false' && c.message);

    return {
      ...this.metadata?.state,
      error: hasError,
    };
  }
}
