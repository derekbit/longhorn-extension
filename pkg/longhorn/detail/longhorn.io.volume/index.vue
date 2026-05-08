<script>
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import Tab from '@shell/components/Tabbed/Tab';
import Tabbed from '@shell/components/Tabbed';
import Loading from '@shell/components/Loading';

import VolumeDetails from './VolumeDetails';
import Attachments from './Attachments';
import Replicas from './Replicas';
import RecurringJobs from './RecurringJobs';
import SnapshotsAndBackups from './SnapshotsAndBackups';

export default {
  name: 'VolumeIndex',

  components: {
    Tab,
    Tabbed,
    Loading,
    VolumeDetails,
    Attachments,
    Replicas,
    RecurringJobs,
    SnapshotsAndBackups,
  },

  props: {
    value: { type: Object, required: true },
  },

  data() {
    return {
      allBackingImagesRaw: [],
      allReplicasRaw: [],
      allInstanceManagersRaw: [],
      allEnginesRaw: [],
      allNodesRaw: [],
      allBackupTargetsRaw: [],
      allRecurringJobsRaw: [],
      allSnapshotsRaw: [],
      allBackupsRaw: [],
    };
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct']?.inStore;

    if (!inStore) return;

    const resourceMap = {
      allBackingImagesRaw: LONGHORN_RESOURCES.BACKING_IMAGES,
      allReplicasRaw: LONGHORN_RESOURCES.REPLICAS,
      allInstanceManagersRaw: LONGHORN_RESOURCES.INSTANCE_MANAGERS,
      allEnginesRaw: LONGHORN_RESOURCES.ENGINES,
      allNodesRaw: LONGHORN_RESOURCES.NODES,
      allBackupTargetsRaw: LONGHORN_RESOURCES.BACKUP_TARGETS,
      allRecurringJobsRaw: LONGHORN_RESOURCES.RECURRING_JOBS,
      allSnapshotsRaw: LONGHORN_RESOURCES.SNAPSHOTS,
      allBackupsRaw: LONGHORN_RESOURCES.BACKUPS,
    };

    const keys = Object.keys(resourceMap);
    const schemaFor = this.$store.getters[`${inStore}/schemaFor`];
    const promises = Object.values(resourceMap).map((type) => {
      if (!schemaFor?.(type)) {
        return Promise.resolve([]);
      }

      return this.$store.dispatch(`${inStore}/findAll`, { type }).catch(() => []);
    });

    try {
      const results = await Promise.all(promises);

      keys.forEach((key, index) => {
        this[key] = results[index] || [];
      });
    } catch {
      keys.forEach((key) => {
        this[key] = [];
      });
    }
  },

  computed: {
    volumeName() {
      return this.value?.metadata?.name || this.value?.id;
    },

    volumeState() {
      return (this.value?.status?.state || this.value?.state || '').toLowerCase();
    },

    volumeEngines() {
      if (!this.volumeName) return [];

      return this.allEnginesRaw.filter(
        (engineResource) =>
          engineResource.spec?.volumeName === this.volumeName || engineResource.volumeName === this.volumeName
      );
    },

    runningEngine() {
      // Mirror manager.GetRunningEngineByVolume semantics as closely as possible with CRD data:
      // 1) snapshot listing is meaningful only when volume is attached
      // 2) exactly one engine should exist
      // 3) that engine must be running
      if (this.volumeState !== 'attached') return null;
      if (this.volumeEngines.length !== 1) return null;

      const [engine] = this.volumeEngines;
      const currentState = (engine.status?.currentState || '').toLowerCase();

      return currentState === 'running' ? engine : null;
    },

    engineSnapshotNames() {
      return new Set(Object.keys(this.runningEngine?.status?.snapshots || {}));
    },

    currentReplicas() {
      if (!this.volumeName) return [];

      return this.allReplicasRaw.filter(
        (replicaResource) =>
          replicaResource.spec?.volumeName === this.volumeName || replicaResource.volumeName === this.volumeName
      );
    },

    combinedDataSource() {
      const { volumeName } = this;

      // Align with longhorn-manager snapshotList behavior: it reads snapshots from the running engine.
      // If no running engine exists, treat snapshot list as unavailable/empty.
      if (!volumeName || !this.runningEngine) return [];

      const finalMap = this.allSnapshotsRaw
        .filter((snapshotResource) => {
          const isTargetVolume =
            snapshotResource.spec?.volume === volumeName ||
            snapshotResource.metadata?.labels?.['longhornvolume'] === volumeName;
          const name = snapshotResource.metadata?.name || snapshotResource.name;

          return isTargetVolume && this.engineSnapshotNames.has(name);
        })
        .reduce((snapshotMap, snapshotResource) => {
          const name = snapshotResource.metadata?.name || snapshotResource.name;

          snapshotMap[name] = { ...snapshotResource, type: 'snapshot' };

          return snapshotMap;
        }, {});

      this.allBackupsRaw.forEach((backupResource) => {
        const isTargetVolume =
          backupResource.status?.volumeName === volumeName ||
          backupResource.metadata?.labels?.['backup-volume'] === volumeName;

        if (!isTargetVolume) return;

        const snapName = backupResource.spec?.snapshotName;
        const snapEntry = finalMap[snapName];

        if (snapEntry && backupResource.status?.state === 'Completed') {
          snapEntry.type = 'backup';
          snapEntry.backupStatusObject = {
            snapshot: snapName,
            progress: backupResource.status?.progress || 100,
            size: backupResource.status?.size || backupResource.spec?.size || 0,
            state: backupResource.status?.state,
            backupIds: [backupResource.metadata?.name],
            replicaAddress: backupResource.status?.replicaAddress || '',
          };
        }
      });

      return Object.values(finalMap);
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <Tabbed v-else :side-tabs="true" :resource="value">
    <Tab name="details" :label="t('longhorn.volume.detail.tabs.details')" :weight="100">
      <VolumeDetails :value="value" :all-backing-images-raw="allBackingImagesRaw" />
    </Tab>

    <Tab name="replicas" :label="t('longhorn.volume.detail.tabs.replicas')" :weight="90">
      <Replicas :value="value" :replicas="currentReplicas" :nodes="allNodesRaw" :engines="allEnginesRaw" />
    </Tab>

    <Tab name="attachments" :label="t('longhorn.volume.detail.tabs.attachments')" :weight="80">
      <Attachments :value="value" />
    </Tab>

    <Tab name="snapshots-and-backups" :label="t('longhorn.volume.detail.tabs.snapshotsAndBackups')" :weight="70">
      <SnapshotsAndBackups
        :data-source="combinedDataSource"
        :volume="value"
        :snapshot-state="!!runningEngine"
        :backup-targets="allBackupTargetsRaw"
      />
    </Tab>

    <Tab name="recurring-jobs" :label="t('longhorn.volume.detail.tabs.recurringJobs')" :weight="60">
      <RecurringJobs :value="value" :recurring-job-data="allRecurringJobsRaw" />
    </Tab>
  </Tabbed>
</template>
