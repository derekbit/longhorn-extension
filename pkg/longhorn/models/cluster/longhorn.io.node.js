import LonghornModel from '../longhorn';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';

const STATUS_TRUE = 'True';
const STATUS_FALSE = 'False';

const BADGE = {
  ERROR: 'bg-error',
  WARNING: 'bg-warning',
  SUCCESS: 'bg-success',
  DISABLED: 'badge-disabled',
};

export default class NodeModel extends LonghornModel {
  createState(stateDisplay, stateBackground, message = '') {
    return {
      stateDisplay,
      stateBackground,
      message,
    };
  }

  getConditionStatusLower(condition) {
    return condition?.status?.toLowerCase();
  }

  get _availableActions() {
    const out = super._availableActions || [];

    out.forEach((a) => {
      if (a.action === AVAILABLE_ACTIONS.EDIT) {
        a.enabled = !this.isDown;
      } else if (a.action === AVAILABLE_ACTIONS.DELETE) {
        a.enabled = this.isDown;
      }
    });

    return out;
  }

  get isDown() {
    return this.getConditionStatusLower(this.readyCondition) === STATUS_FALSE.toLowerCase();
  }

  get isReady() {
    return this.readyCondition?.status === STATUS_TRUE;
  }

  get isSchedulable() {
    return this.isReady && this.spec?.allowScheduling === true && this.schedulableCondition?.status === STATUS_TRUE;
  }

  get isConditionSchedulable() {
    return this.schedulableCondition?.status === STATUS_TRUE;
  }

  get conditionsByType() {
    const out = {};
    const conditions = this.status?.conditions || [];

    conditions.forEach((c) => {
      if (c?.type) {
        out[c.type] = c;
      }
    });

    return out;
  }

  get readyCondition() {
    return this.conditionsByType.Ready || {};
  }

  get schedulableCondition() {
    return this.conditionsByType.Schedulable || {};
  }

  get nodeStatus() {
    const readyCond = this.readyCondition;
    const schedulableCond = this.schedulableCondition;

    const isReady = this.isReady;
    const isSchedulableCondTrue = schedulableCond.status === STATUS_TRUE;

    // Keep the same precedence as Longhorn dashboard node readiness logic.
    if (!isReady) {
      return this.createState('Down', BADGE.ERROR, readyCond.message || '');
    }

    if (this.spec?.allowScheduling === false) {
      return this.createState('Disabled', BADGE.DISABLED, schedulableCond.message || readyCond.message || '');
    }

    if (!isSchedulableCondTrue) {
      return this.createState('Unschedulable', BADGE.WARNING, schedulableCond.message || readyCond.message || '');
    }

    if (isReady && isSchedulableCondTrue) {
      return this.createState('Schedulable', BADGE.SUCCESS, schedulableCond.message || readyCond.message || '');
    }

    return this.createState('Down', BADGE.ERROR, readyCond.message || '');
  }

  get readiness() {
    return this.isReady ? 'Ready' : 'Not Ready';
  }

  get disks() {
    const specDisks = this.spec?.disks || {};

    const statusMap = this.status?.diskStatus || {};
    const nodeReadyStatus = this.getConditionStatusLower(this.readyCondition);
    const nodeSchedulableStatus = this.getConditionStatusLower(this.schedulableCondition);

    return Object.entries(specDisks).map(([id, specDisk]) => {
      const statusDisk = statusMap[id] || {};
      const diskConditions = statusDisk.conditions || [];
      const diskSchedulableCondition = diskConditions.find((c) => c.type === 'Schedulable') || {};
      const diskSchedulableStatus = this.getConditionStatusLower(diskSchedulableCondition);
      const nodeSchedulableMessage = this.schedulableCondition?.message || '';
      const diskMessage =
        diskSchedulableCondition.message || (nodeSchedulableMessage.startsWith('Disk ') ? nodeSchedulableMessage : '');

      let diskStatus;

      if (nodeReadyStatus === STATUS_FALSE.toLowerCase()) {
        // Node-level errors are shown at node row level, not per disk row.
        diskStatus = this.createState('Error', BADGE.ERROR, '');
      } else if (this.spec?.allowScheduling === false || specDisk.allowScheduling === false) {
        diskStatus = this.createState('Disabled', BADGE.DISABLED);
      } else if (
        nodeSchedulableStatus === STATUS_FALSE.toLowerCase() ||
        diskSchedulableStatus === STATUS_FALSE.toLowerCase()
      ) {
        diskStatus = this.createState('Unschedulable', BADGE.WARNING, diskMessage);
      } else {
        diskStatus = this.createState('Schedulable', BADGE.SUCCESS);
      }

      const scheduledReplicaCounts = {
        text: Object.keys(statusDisk.scheduledReplica || {}).length,
        to: 'dsads',
      };

      const diskAllocated = {
        used: statusDisk.storageScheduled || 0,
        capacity: statusDisk.storageMaximum || 0,
      };

      const diskUsed = {
        used: (statusDisk.storageMaximum || 0) - (statusDisk.storageAvailable || 0),
        capacity: statusDisk.storageMaximum || 0,
      };

      const diskSize = {
        reserved: specDisk.storageReserved || 0,
        capacity: (statusDisk.storageMaximum || 0) - (specDisk.storageReserved || 0),
      };

      const healthData = statusDisk.healthData?.[id] || {};
      const rawHealthStatus = (healthData.healthStatus || 'UNKNOWN').toUpperCase();
      const healthMessage = Array.isArray(healthData.attributes)
        ? healthData.attributes.map((attr) => `${attr.name}: ${attr.rawValue}`).join('<br/>')
        : '';

      let diskHealthStatus = {
        stateDisplay: 'Unknown',
        stateBackground: BADGE.DISABLED,
        message: healthMessage,
      };

      if (rawHealthStatus === 'PASSED') {
        diskHealthStatus = this.createState('Passed', BADGE.SUCCESS, healthMessage);
      } else if (rawHealthStatus === 'WARNING') {
        diskHealthStatus = this.createState('Warning', BADGE.WARNING, healthMessage);
      } else if (rawHealthStatus === 'FAILED') {
        diskHealthStatus = this.createState('Failed', BADGE.ERROR, healthMessage);
      }

      return {
        id,
        ...specDisk,
        ...statusDisk,
        scheduledReplicaCounts,
        diskAllocated,
        diskUsed,
        diskSize,
        diskStatus,
        diskHealthStatus,
        diskTags: specDisk.tags || [],
        stateObj: {
          error: diskStatus.stateBackground === BADGE.ERROR,
          warning: diskStatus.stateBackground === BADGE.WARNING,
        },
        stateDescription:
          diskStatus.stateBackground === BADGE.ERROR || diskStatus.stateBackground === BADGE.WARNING
            ? diskStatus.message || ''
            : '',
      };
    });
  }

  get replicas() {
    const total = this.disks.reduce((sum, disk) => sum + (disk.scheduledReplicaCounts?.text || 0), 0);

    return { text: total, to: 'dsadas' };
  }

  get storageOverProvisioningPercentage() {
    const setting = this.$getters?.['byId']?.(
      LONGHORN_RESOURCES.SETTINGS,
      LONGHORN_SETTINGS.STORAGE_OVER_PROVISIONING_PERCENTAGE
    );

    return Number(setting?.value || 100);
  }

  sumBy(keyOrFn) {
    return this.disks.reduce((total, disk) => {
      if (typeof keyOrFn === 'function') return total + keyOrFn(disk);

      return total + (disk[keyOrFn] || 0);
    }, 0);
  }

  get totalDiskCapacity() {
    const max = this.sumBy((d) => d.storageMaximum || 0);
    const reserved = this.sumBy((d) => d.storageReserved || 0);

    return ((max - reserved) * this.storageOverProvisioningPercentage) / 100;
  }

  get disksAllocated() {
    const used = this.sumBy((d) => d.storageScheduled || 0);
    const capacity = this.totalDiskCapacity;

    return { used, capacity };
  }

  get disksUsed() {
    const used = this.sumBy((d) => (d.storageMaximum || 0) - (d.storageAvailable || 0));
    const capacity = this.sumBy((d) => d.storageMaximum || 0);

    return { used, capacity };
  }

  get disksSize() {
    const reserved = this.sumBy((d) => d.storageReserved || 0);
    const capacity = this.sumBy((d) => (d.storageMaximum || 0) - (d.storageReserved || 0));

    return { reserved, capacity };
  }
}
