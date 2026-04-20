import LonghornModel from './longhorn';

export default class BackingImageModel extends LonghornModel {
  // State mapping specific to BackingImage
  static get STATE_MAP() {
    return {
      error: { display: 'Unavailable', background: 'bg-error' },
      active: { display: 'Available', background: 'bg-success' },
    };
  }

  get isUnavailable() {
    const diskFileStatusMap = this.status?.diskFileStatusMap;

    if (!diskFileStatusMap || Object.keys(diskFileStatusMap).length === 0) {
      return true;
    }

    const statusList = Object.values(diskFileStatusMap);

    return statusList.every((diskStatus) => (diskStatus.state || '').toLowerCase().includes('failed'));
  }

  get state() {
    if (this.isUnavailable) return 'error';

    return this.metadata?.state?.name || 'unknown';
  }

  get stateDescription() {
    if (this.isUnavailable) return 'The backingImage is unavailable';

    return '';
  }

  get stateDisplay() {
    const state = this.state;

    return state === 'error' ? 'Unavailable' : 'Available';
  }

  get stateBackground() {
    const state = this.state;

    return state === 'error' ? 'bg-error' : 'bg-success';
  }

  get stateObj() {
    const baseState = super.stateObj;
    const hasError = this.isUnavailable;

    return this.buildStateObj(baseState, {
      hasError,
      message: hasError ? this.stateDescription : baseState?.message,
    });
  }
}
