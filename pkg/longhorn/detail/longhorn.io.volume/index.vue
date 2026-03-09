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
      allRecurringJobsRaw: [],
      allSnapshotsRaw: [],
      allBackupsRaw: [],
      allBackupVolumesRaw: [],
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
      allRecurringJobsRaw: LONGHORN_RESOURCES.RECURRING_JOBS,
      allSnapshotsRaw: LONGHORN_RESOURCES.SNAPSHOTS,
      allBackupsRaw: LONGHORN_RESOURCES.BACKUPS,
      allBackupVolumesRaw: LONGHORN_RESOURCES.BACKUP_VOLUMES,
    };

    const keys = Object.keys(resourceMap);
    const promises = Object.values(resourceMap).map((type) => this.$store.dispatch(`${inStore}/findAll`, { type }));

    try {
      const results = await Promise.all(promises);

      keys.forEach((key, index) => {
        this[key] = results[index] || [];
      });
    } catch (e) {
      console.error('Failed to fetch Longhorn resources:', e);
    }
  },

  computed: {
    volumeName() {
      return this.value?.metadata?.name || this.value?.id;
    },

    currentReplicas() {
      if (!this.volumeName) return [];

      return this.allReplicasRaw.filter(
        (r) => r.spec?.volumeName === this.volumeName || r.volumeName === this.volumeName
      );
    },

    currentBackupVolume() {
      return this.allBackupVolumesRaw.find((bv) => bv.metadata?.name === this.volumeName);
    },

    combinedDataSource() {
      const { volumeName } = this;

      if (!volumeName) return [];

      const finalMap = this.allSnapshotsRaw
        .filter((s) => s.spec?.volume === volumeName || s.metadata?.labels?.['longhornvolume'] === volumeName)
        .reduce((acc, s) => {
          const name = s.metadata?.name || s.name;

          acc[name] = { ...s, type: 'snapshot' };

          return acc;
        }, {});

      this.allBackupsRaw.forEach((b) => {
        const isTargetVolume =
          b.status?.volumeName === volumeName || b.metadata?.labels?.['backup-volume'] === volumeName;

        if (!isTargetVolume) return;

        const snapName = b.spec?.snapshotName;
        const snapEntry = finalMap[snapName];

        if (snapEntry && b.status?.state === 'Completed') {
          snapEntry.type = 'backup';
          snapEntry.backupStatusObject = {
            snapshot: snapName,
            progress: b.status?.progress || 100,
            size: b.status?.size || b.spec?.size || 0,
            state: b.status?.state,
            backupIds: [b.metadata?.name],
            replicaAddress: b.status?.replicaAddress || '',
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
    <Tab name="details" label="Details" :weight="100">
      <VolumeDetails :value="value" :all-backing-images-raw="allBackingImagesRaw" />
    </Tab>

    <Tab name="replicas" label="Replicas" :weight="90">
      <Replicas :value="value" :replicas="currentReplicas" :nodes="allNodesRaw" :engines="allEnginesRaw" />
    </Tab>

    <Tab name="attachments" label="Attachments" :weight="80">
      <Attachments :value="value" />
    </Tab>

    <Tab name="snapshots-and-backups" label="Snapshots and Backups" :weight="70">
      <SnapshotsAndBackups :value="value" :data-source="combinedDataSource" :backup-volume="currentBackupVolume" />
    </Tab>

    <Tab name="recurring-jobs" label="Recurring Jobs" :weight="60">
      <RecurringJobs :value="value" :recurring-job-data="allRecurringJobsRaw" />
    </Tab>
  </Tabbed>
</template>
