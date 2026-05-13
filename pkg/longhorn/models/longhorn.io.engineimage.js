import LonghornModel from './longhorn';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { BADGE_COLOR } from '@longhorn/types/general';

export default class EngineImageModel extends LonghornModel {
  // State mapping specific to EngineImage
  static get STATE_MAP() {
    return {
      active: { display: 'Ready', background: BADGE_COLOR.SUCCESS },
      error: { display: 'Error', background: BADGE_COLOR.ERROR },
      transitioning: { display: 'Deploying', background: BADGE_COLOR.WARNING },
    };
  }

  get availableActions() {
    const availableActions = (super._availableActions || [])
      .filter((action) => ![AVAILABLE_ACTIONS.CLONE].includes(action.action))
      .map((action) => {
        if (action.action === AVAILABLE_ACTIONS.DELETE) {
          return { ...action, enabled: !this.isDefault };
        }

        return action;
      });

    return this.sanitizeAvailableActions(availableActions);
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
    return this.findConditionMessage((condition) => condition.status?.toLowerCase() === 'false');
  }

  get state() {
    const failedConditionMessage = this.stateDescription;

    if (failedConditionMessage) return 'error';

    const currentState = (this.status?.state || '').toLowerCase();

    if (currentState === 'ready') return 'active';
    if (currentState === 'error') return 'error';
    if (currentState === 'deploying') return 'transitioning';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDisplay() {
    return this.getDisplayForState(this.state, EngineImageModel.STATE_MAP);
  }

  get stateBackground() {
    return this.getBackgroundForState(this.state, EngineImageModel.STATE_MAP);
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
