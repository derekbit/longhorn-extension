import LonghornModel from './longhorn';

export default class BackingImageModel extends LonghornModel {
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

  get stateObj() {
    return {
      ...this.metadata?.state,
      error: this.isUnavailable,
    };
  }
}
