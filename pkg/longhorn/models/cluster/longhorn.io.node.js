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

  get stateObj() {
    const isReady = this.isReady;
    const readyCond = this.readyCondition;

    if (!isReady) {
      return this.buildStateObj(
        { state: 'down' },
        {
          hasError: true,
          message: readyCond.message || '',
        }
      );
    }

    return this.buildStateObj({ state: 'ready' }, { hasError: false });
  }

  get stateDescription() {
    const nodeStatus = this.nodeStatus;

    return nodeStatus?.stateDisplay || 'Unknown';
  }

  get state() {
    const nodeStatus = this.nodeStatus;
    const stateDisplay = nodeStatus?.stateDisplay || 'Unknown';

    return stateDisplay.toLowerCase();
  }

  get stateDisplay() {
    const nodeStatus = this.nodeStatus;

    return nodeStatus?.stateDisplay || 'Unknown';
  }

  get stateBackground() {
    const nodeStatus = this.nodeStatus;

    return nodeStatus?.stateBackground || BADGE.ERROR;
  }

  get nodeStatus() {
    const readyCond = this.readyCondition;
    const schedulableCond = this.schedulableCondition;

    const isReady = this.isReady;
    const isSchedulableCondTrue = schedulableCond.status === STATUS_TRUE;
    const allowScheduling = this.spec?.allowScheduling === true;
    const autoEvicting = this.status?.autoEvicting === true;

    // Keep the same precedence as Longhorn dashboard node readiness logic.
    // down > disabled > autoEvicting > unschedulable > schedulable
    if (!isReady) {
      return {
        stateDisplay: 'Down',
        stateBackground: BADGE.ERROR,
        message: readyCond.message || '',
      };
    }

    if (this.spec?.allowScheduling === false) {
      return {
        stateDisplay: 'Disabled',
        stateBackground: BADGE.DISABLED,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (isReady && !isSchedulableCondTrue && allowScheduling && autoEvicting) {
      return {
        stateDisplay: 'AutoEvicting',
        stateBackground: BADGE.WARNING,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (!isSchedulableCondTrue) {
      return {
        stateDisplay: 'Unschedulable',
        stateBackground: BADGE.WARNING,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (isReady && isSchedulableCondTrue) {
      return {
        stateDisplay: 'Schedulable',
        stateBackground: BADGE.SUCCESS,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    return {
      stateDisplay: 'Unknown',
      stateBackground: BADGE.ERROR,
      message: readyCond.message || '',
    };
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
        diskStatus = {
          stateDisplay: 'Error',
          stateBackground: BADGE.ERROR,
          message: '',
        };
      } else if (this.spec?.allowScheduling === false || specDisk.allowScheduling === false) {
        diskStatus = {
          stateDisplay: 'Disabled',
          stateBackground: BADGE.DISABLED,
          message: '',
        };
      } else if (
        nodeSchedulableStatus === STATUS_FALSE.toLowerCase() ||
        diskSchedulableStatus === STATUS_FALSE.toLowerCase()
      ) {
        diskStatus = {
          stateDisplay: 'Unschedulable',
          stateBackground: BADGE.WARNING,
          message: diskMessage,
        };
      } else {
        diskStatus = {
          stateDisplay: 'Schedulable',
          stateBackground: BADGE.SUCCESS,
          message: '',
        };
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
        diskHealthStatus = {
          stateDisplay: 'Passed',
          stateBackground: BADGE.SUCCESS,
          message: healthMessage,
        };
      } else if (rawHealthStatus === 'WARNING') {
        diskHealthStatus = {
          stateDisplay: 'Warning',
          stateBackground: BADGE.WARNING,
          message: healthMessage,
        };
      } else if (rawHealthStatus === 'FAILED') {
        diskHealthStatus = {
          stateDisplay: 'Failed',
          stateBackground: BADGE.ERROR,
          message: healthMessage,
        };
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
        stateObj: this.buildStateObj(
          {},
          {
            hasError: diskStatus.stateBackground === BADGE.ERROR,
            message:
              diskStatus.stateBackground === BADGE.ERROR || diskStatus.stateBackground === BADGE.WARNING
                ? diskStatus.message
                : '',
          }
        ),
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
