import LonghornModel from './longhorn';

export default class BackupBackingImageModel extends LonghornModel {
  // State mapping specific to BackupBackingImage
  static get STATE_MAP() {
    return {
      ready: { display: 'Ready', background: 'bg-success' },
      error: { display: 'Error', background: 'bg-error' },
      failed: { display: 'Failed', background: 'bg-error' },
      uploading: { display: 'Uploading', background: 'bg-warning' },
      'ready-for-transfer': { display: 'Ready For Transfer', background: 'bg-warning' },
      'failed-and-cleanup': { display: 'Failed', background: 'bg-error' },
    };
  }

  get state() {
    return this.status?.state?.toLowerCase() || 'unknown';
  }

  get stateDisplay() {
    const state = this.status?.state || 'unknown';

    return this.getDisplayForState(state, BackupBackingImageModel.STATE_MAP);
  }

  get stateBackground() {
    const state = this.status?.state || 'unknown';

    return this.getBackgroundForState(state, BackupBackingImageModel.STATE_MAP);
  }

  get stateDescription() {
    const isErrorState = ['error', 'failed'].includes((this.status?.state || '').toLowerCase());

    return this.getStatusErrorMessage(isErrorState);
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
