import LonghornModel from './longhorn';

export default class BackupBackingImageModel extends LonghornModel {
  get state() {
    return this.status?.state?.toLowerCase() || 'unknown';
  }

  get stateDisplay() {
    const state = this.status?.state || 'unknown';

    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
  }

  get stateDescription() {
    return this.status?.error || '';
  }

  get stateObj() {
    const hasError = !!this.status?.error;

    return {
      ...this.metadata?.state,
      error: hasError,
      message: hasError ? this.stateDescription : this.metadata?.state?.message,
    };
  }
}
