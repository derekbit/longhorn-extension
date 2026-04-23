import LonghornModel from '../longhorn';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { AVAILABLE_ACTIONS } from '@longhorn/types/longhorn';
import { CONDITION_STATUS, NODE_BADGE } from '@longhorn/types/node';
import { asNumber, countMapEntries, sumMapValues } from '@longhorn/utils/node';

export default class NodeModel extends LonghornModel {
  getConditionStatusLower(condition) {
    return condition?.status?.toLowerCase();
  }

  get _availableActions() {
    const actions = super._availableActions || [];

    actions.forEach((action) => {
      if (action.action === AVAILABLE_ACTIONS.EDIT) {
        action.enabled = !this.isDown;
      } else if (action.action === AVAILABLE_ACTIONS.DELETE) {
        action.enabled = this.isDown;
      }
    });

    return actions;
  }

  get isDown() {
    return this.getConditionStatusLower(this.readyCondition) === CONDITION_STATUS.FALSE.toLowerCase();
  }

  get isReady() {
    return this.readyCondition?.status === CONDITION_STATUS.TRUE;
  }

  get isSchedulable() {
    return (
      this.isReady && this.spec?.allowScheduling === true && this.schedulableCondition?.status === CONDITION_STATUS.TRUE
    );
  }

  get isConditionSchedulable() {
    return this.schedulableCondition?.status === CONDITION_STATUS.TRUE;
  }

  get conditionsByType() {
    const conditionMap = {};
    const conditions = this.status?.conditions || [];

    conditions.forEach((condition) => {
      if (condition?.type) {
        conditionMap[condition.type] = condition;
      }
    });

    return conditionMap;
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

    return nodeStatus?.stateBackground || NODE_BADGE.ERROR;
  }

  get nodeStatus() {
    const readyCond = this.readyCondition;
    const schedulableCond = this.schedulableCondition;

    const isReady = this.isReady;
    const isSchedulableCondTrue = schedulableCond.status === CONDITION_STATUS.TRUE;
    const allowScheduling = this.spec?.allowScheduling === true;
    const autoEvicting = this.status?.autoEvicting === true;

    // Keep the same precedence as Longhorn dashboard node readiness logic.
    // down > disabled > autoEvicting > unschedulable > schedulable
    if (!isReady) {
      return {
        stateDisplay: 'Down',
        stateBackground: NODE_BADGE.ERROR,
        message: readyCond.message || '',
      };
    }

    if (this.spec?.allowScheduling === false) {
      return {
        stateDisplay: 'Disabled',
        stateBackground: NODE_BADGE.DISABLED,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (isReady && !isSchedulableCondTrue && allowScheduling && autoEvicting) {
      return {
        stateDisplay: 'AutoEvicting',
        stateBackground: NODE_BADGE.WARNING,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (!isSchedulableCondTrue) {
      return {
        stateDisplay: 'Unschedulable',
        stateBackground: NODE_BADGE.WARNING,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    if (isReady && isSchedulableCondTrue) {
      return {
        stateDisplay: 'Schedulable',
        stateBackground: NODE_BADGE.SUCCESS,
        message: schedulableCond.message || readyCond.message || '',
      };
    }

    return {
      stateDisplay: 'Unknown',
      stateBackground: NODE_BADGE.ERROR,
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
    const inStore = this.$rootGetters?.['currentProduct']?.inStore;
    const allReplicas = inStore ? this.$rootGetters?.[`${inStore}/all`]?.(LONGHORN_RESOURCES.REPLICAS) || [] : [];
    const nodeId = this.metadata?.name || this.id;
    const nodeReplicaNames = new Set();
    const nodeReplicaCountByDisk = {};

    allReplicas.forEach((replica) => {
      const hostId = replica?.hostID || replica?.hostId || replica?.spec?.nodeID || replica?.spec?.nodeId;

      if (hostId !== nodeId) {
        return;
      }

      const replicaName = replica?.metadata?.name || replica?.name || '';

      if (replicaName) {
        nodeReplicaNames.add(replicaName);
      }

      const replicaDiskId = replica?.spec?.diskID || replica?.diskID;

      if (replicaDiskId) {
        nodeReplicaCountByDisk[replicaDiskId] = (nodeReplicaCountByDisk[replicaDiskId] || 0) + 1;
      }
    });

    return Object.entries(specDisks).map(([id, specDisk]) => {
      const statusDisk = statusMap[id] || {};
      const diskConditions = statusDisk.conditions || [];
      const diskSchedulableCondition = diskConditions.find((condition) => condition.type === 'Schedulable') || {};
      const diskSchedulableStatus = this.getConditionStatusLower(diskSchedulableCondition);
      const nodeSchedulableMessage = this.schedulableCondition?.message || '';
      const diskMessage =
        diskSchedulableCondition.message || (nodeSchedulableMessage.startsWith('Disk ') ? nodeSchedulableMessage : '');

      let diskStatus;

      if (nodeReadyStatus === CONDITION_STATUS.FALSE.toLowerCase()) {
        // Node-level errors are shown at node row level, not per disk row.
        diskStatus = {
          stateDisplay: 'Error',
          stateBackground: NODE_BADGE.ERROR,
          message: '',
        };
      } else if (this.spec?.allowScheduling === false || specDisk.allowScheduling === false) {
        diskStatus = {
          stateDisplay: 'Disabled',
          stateBackground: NODE_BADGE.DISABLED,
          message: '',
        };
      } else if (
        nodeSchedulableStatus === CONDITION_STATUS.FALSE.toLowerCase() ||
        diskSchedulableStatus === CONDITION_STATUS.FALSE.toLowerCase()
      ) {
        diskStatus = {
          stateDisplay: 'Unschedulable',
          stateBackground: NODE_BADGE.WARNING,
          message: diskMessage,
        };
      } else {
        diskStatus = {
          stateDisplay: 'Schedulable',
          stateBackground: NODE_BADGE.SUCCESS,
          message: '',
        };
      }

      const scheduledReplicaMap = statusDisk.scheduledReplica || {};
      const scheduledReplicaNames = new Set(Object.keys(scheduledReplicaMap));
      let replicaCount = countMapEntries(scheduledReplicaMap);

      if (allReplicas.length) {
        if (scheduledReplicaNames.size > 0) {
          replicaCount = [...scheduledReplicaNames].reduce((count, name) => {
            return count + (nodeReplicaNames.has(name) ? 1 : 0);
          }, 0);
        } else {
          replicaCount = nodeReplicaCountByDisk[id] || 0;
        }
      }

      const scheduledReplicaCounts = replicaCount;

      const replicaSize = sumMapValues(statusDisk.scheduledReplica);
      const backingImageSize = sumMapValues(statusDisk.scheduledBackingImage);

      const diskStorageMax = asNumber(statusDisk.storageMaximum);
      const diskStorageReserved = asNumber(specDisk.storageReserved);
      const diskAllocatedCapacity =
        ((diskStorageMax - diskStorageReserved) * this.storageOverProvisioningPercentage) / 100;

      const diskAllocated = {
        used: asNumber(statusDisk.storageScheduled),
        capacity: diskAllocatedCapacity,
        replicaSize,
        backingImageSize,
      };

      const diskUsed = {
        used: asNumber(statusDisk.storageMaximum) - asNumber(statusDisk.storageAvailable),
        capacity: asNumber(statusDisk.storageMaximum),
      };

      const diskSize = {
        reserved: asNumber(specDisk.storageReserved),
        capacity: asNumber(statusDisk.storageMaximum) - asNumber(specDisk.storageReserved),
      };

      const healthData = statusDisk.healthData?.[id] || {};
      const rawHealthStatus = String(healthData.healthStatus || '');
      const normalizedHealthStatus = rawHealthStatus.toUpperCase();
      const healthAttributes = Array.isArray(healthData.attributes) ? healthData.attributes : [];
      const healthMessage = healthAttributes
        .map((attr) => {
          const label = String(attr.name || '')
            .replace(/([A-Z])/g, ' $1')
            .trim();

          return `${label}: ${attr.rawValue}`;
        })
        .join('<br/>');

      let diskHealthStatus = {
        stateDisplay: rawHealthStatus,
        stateBackground: NODE_BADGE.DISABLED,
        message: healthMessage,
      };

      if (normalizedHealthStatus === 'PASSED') {
        diskHealthStatus = {
          stateDisplay: 'Passed',
          stateBackground: NODE_BADGE.SUCCESS,
          message: healthMessage,
        };
      } else if (normalizedHealthStatus === 'WARNING') {
        diskHealthStatus = {
          stateDisplay: 'Warning',
          stateBackground: NODE_BADGE.WARNING,
          message: healthMessage,
        };
      } else if (normalizedHealthStatus === 'FAILED') {
        diskHealthStatus = {
          stateDisplay: 'Failed',
          stateBackground: NODE_BADGE.ERROR,
          message: healthMessage,
        };
      }

      return {
        id,
        nodeId: this.metadata?.name || this.id,
        ...specDisk,
        ...statusDisk,
        stateDisplay: diskStatus.stateDisplay,
        stateBackground: diskStatus.stateBackground,
        diskType: specDisk?.diskType?.trim?.() ? specDisk.diskType : '',
        path: specDisk?.path?.trim?.() ? specDisk.path : '',
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
            hasError: diskStatus.stateBackground === NODE_BADGE.ERROR,
            message:
              diskStatus.stateBackground === NODE_BADGE.ERROR || diskStatus.stateBackground === NODE_BADGE.WARNING
                ? diskStatus.message
                : '',
          }
        ),
      };
    });
  }

  get replicas() {
    const inStore = this.$rootGetters?.['currentProduct']?.inStore;
    const allReplicas = inStore ? this.$rootGetters?.[`${inStore}/all`]?.(LONGHORN_RESOURCES.REPLICAS) || [] : [];
    const nodeId = this.metadata?.name || this.id;

    if (allReplicas.length && nodeId) {
      const names = new Set(
        allReplicas
          .filter((replica) => {
            const hostId = replica?.hostID || replica?.hostId || replica?.spec?.nodeID || replica?.spec?.nodeId;

            return hostId === nodeId;
          })
          .map((replica) => replica?.metadata?.name || replica?.name)
          .filter((name) => !!name)
      );

      return names.size;
    }

    const total = this.disks.reduce((sum, disk) => sum + asNumber(disk.scheduledReplicaCounts), 0);

    return total;
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
    const max = this.sumBy((disk) => disk.storageMaximum || 0);
    const reserved = this.sumBy((disk) => disk.storageReserved || 0);

    return ((max - reserved) * this.storageOverProvisioningPercentage) / 100;
  }

  get disksAllocated() {
    const used = this.sumBy((disk) => asNumber(disk.storageScheduled));
    const capacity = this.totalDiskCapacity;
    const replicaSize = this.sumBy((disk) => sumMapValues(disk.scheduledReplica));
    const backingImageSize = this.sumBy((disk) => sumMapValues(disk.scheduledBackingImage));

    return {
      used,
      capacity,
      replicaSize,
      backingImageSize,
    };
  }

  get disksUsed() {
    const used = this.sumBy((disk) => (disk.storageMaximum || 0) - (disk.storageAvailable || 0));
    const capacity = this.sumBy((disk) => disk.storageMaximum || 0);

    return { used, capacity };
  }

  get disksSize() {
    const reserved = this.sumBy((disk) => disk.storageReserved || 0);
    const capacity = this.sumBy((disk) => (disk.storageMaximum || 0) - (disk.storageReserved || 0));

    return { reserved, capacity };
  }
}
