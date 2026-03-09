<script>
import TabTitle from '@shell/components/TabTitle';
import ResourceChart from '@longhorn/components/Dashboard/ResourceChart';
import AppTooltip from '@longhorn/components/Dashboard/Tooltip';
import Events from '@longhorn/components/Dashboard/Events';
import LiveDate from '@shell/components/formatter/LiveDate';
import { allHash } from '@shell/utils/promise';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { bytesToGi } from '@longhorn/utils/formatter';
import { GiB_UNIT } from '@longhorn/types/units';

const NODE_STATUS = {
  DOWN: 'Down',
  DISABLED: 'Disabled',
  UNSCHEDULABLE: 'Unschedulable',
  SCHEDULABLE: 'Schedulable',
};
const LONGHORN_COLORS = {
  SUCCESS: '#27AE5F',
  WARNING: '#F1C40F',
  DANGER: '#EF494A',
  INFO: '#78C8CF',
  MUTED: '#D9DDDF',
};

export default {
  name: 'LonghornDashboard',
  components: {
    TabTitle,
    ResourceChart,
    AppTooltip,
    Events,
    LiveDate,
  },

  async fetch() {
    const inStore = this.inStore;

    await allHash({
      volumes: this.$store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.VOLUMES }),
      nodes: this.$store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.NODES }),
      serverVersion: this.$store.dispatch(`${inStore}/find`, {
        type: LONGHORN_RESOURCES.SETTINGS,
        id: LONGHORN_SETTINGS.CURRENT_LONGHORN_VERSION,
      }),
    });
  },

  methods: {
    getNodeStatus(node) {
      if (!node.status) return NODE_STATUS.DOWN;

      const cond = (t) => node.status?.conditions?.find((c) => c.type === t)?.status;

      const ready = cond('Ready');
      const sched = cond('Schedulable');

      if (ready === 'False') return NODE_STATUS.DOWN;
      if (node.spec?.allowScheduling === false) return NODE_STATUS.DISABLED;
      if (sched === 'False') return NODE_STATUS.UNSCHEDULABLE;
      if (ready === 'True' && sched === 'True') return NODE_STATUS.SCHEDULABLE;

      return NODE_STATUS.DOWN;
    },

    hasData(chart) {
      if (!chart?.datasets?.length) return false;
      const sum = chart.datasets[0].data.reduce((a, b) => a + b, 0);

      return sum > 0.01;
    },

    processDisks() {
      const totals = {
        fs: {
          sched: 0,
          reserved: 0,
          used: 0,
          disabled: 0,
        },
        block: {
          sched: 0,
          reserved: 0,
          used: 0,
          disabled: 0,
        },
      };

      this.nodes.forEach((node) => {
        const diskStatus = node.status?.diskStatus || {};

        const disksSpec = node.spec?.disks || {};

        for (const [diskName, st] of Object.entries(diskStatus)) {
          const spec = disksSpec[diskName] || {};
          const type = st.diskType || spec.diskType;

          if (!type || !['filesystem', 'block'].includes(type)) continue;

          const max = st.storageMaximum || 0;
          const avail = st.storageAvailable || 0;
          const reserved = spec.storageReserved || 0;
          const schedulable = st.conditions?.find((c) => c.type === 'Schedulable')?.status === 'True';

          const group = type === 'filesystem' ? totals.fs : totals.block;

          group.used += max - avail;
          group.reserved += reserved;

          const net = avail - reserved;

          if (schedulable && net > 0) group.sched += net;
          if (!schedulable && max > 0) group.disabled += max;
        }
      });

      return totals;
    },

    getVolumeChartData() {
      const counts = {
        Healthy: 0,
        Degraded: 0,
        InProgress: 0,
        Faulty: 0,
        Detached: 0,
      };

      this.volumes.forEach((v) => {
        const s = v.status;
        const state = s?.state;
        const robust = s?.robustness;

        if (state === 'detached' && robust === 'faulted') counts.Faulty++;
        else if (state === 'attached' && robust === 'degraded') counts.Degraded++;
        else if (state === 'attached' && robust === 'healthy') counts.Healthy++;
        else if (state === 'detached') counts.Detached++;
        else counts.InProgress++;
      });

      const volumeLabels = [
        this.t('longhorn.volume.state.healthy'),
        this.t('longhorn.volume.state.degraded'),
        this.t('longhorn.volume.state.inProgress'),
        this.t('longhorn.volume.state.faulty'),
        this.t('longhorn.volume.state.detached'),
      ];

      return {
        title: this.t('longhorn.dashboard.volume.title'),
        labels: volumeLabels,
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: [
              LONGHORN_COLORS.SUCCESS,
              LONGHORN_COLORS.WARNING,
              LONGHORN_COLORS.INFO,
              LONGHORN_COLORS.DANGER,
              LONGHORN_COLORS.MUTED,
            ],
          },
        ],
        resourceNameKey: 'longhorn.dashboard.volume.title',
      };
    },

    getFilesystemStorageChartData() {
      const t = this.processDisks().fs;

      const storageLabels = [
        this.t('longhorn.storage.schedulable'),
        this.t('longhorn.storage.reserved'),
        this.t('longhorn.storage.used'),
        this.t('longhorn.storage.disabled'),
      ];

      return {
        title: this.t('longhorn.dashboard.filesystemStorage.title'),
        labels: storageLabels,
        datasets: [
          {
            data: [bytesToGi(t.sched), bytesToGi(t.reserved), bytesToGi(t.used), bytesToGi(t.disabled)],
            backgroundColor: [
              LONGHORN_COLORS.SUCCESS,
              LONGHORN_COLORS.WARNING,
              LONGHORN_COLORS.INFO,
              LONGHORN_COLORS.MUTED,
            ],
          },
        ],
        suffix: GiB_UNIT,
        resourceNameKey: 'longhorn.storage.title',
      };
    },

    getNodesChartData() {
      const counts = {
        [NODE_STATUS.SCHEDULABLE]: 0,
        [NODE_STATUS.UNSCHEDULABLE]: 0,
        [NODE_STATUS.DOWN]: 0,
        [NODE_STATUS.DISABLED]: 0,
      };

      this.nodes.forEach((n) => counts[this.getNodeStatus(n)]++);

      const nodeLabels = [
        this.t('longhorn.node.schedulable'),
        this.t('longhorn.node.unschedulable'),
        this.t('longhorn.node.down'),
        this.t('longhorn.node.disabled'),
      ];

      return {
        title: this.t('longhorn.dashboard.node.title'),
        labels: nodeLabels,
        datasets: [
          {
            data: [
              counts[NODE_STATUS.SCHEDULABLE],
              counts[NODE_STATUS.UNSCHEDULABLE],
              counts[NODE_STATUS.DOWN],
              counts[NODE_STATUS.DISABLED],
            ],
            backgroundColor: [
              LONGHORN_COLORS.SUCCESS,
              LONGHORN_COLORS.WARNING,
              LONGHORN_COLORS.DANGER,
              LONGHORN_COLORS.MUTED,
            ],
          },
        ],
        resourceNameKey: 'longhorn.dashboard.node.title',
      };
    },

    getBlockStorageChartData() {
      const blocks = this.processDisks().block;

      const blockLabels = [
        this.t('longhorn.storage.schedulable'),
        this.t('longhorn.storage.reserved'),
        this.t('longhorn.storage.used'),
        this.t('longhorn.storage.disabled'),
      ];

      return {
        title: this.t('longhorn.dashboard.blockStorage.title'),
        labels: blockLabels,
        datasets: [
          {
            data: [
              bytesToGi(blocks.sched),
              bytesToGi(blocks.reserved),
              bytesToGi(blocks.used),
              bytesToGi(blocks.disabled),
            ],
            backgroundColor: [
              LONGHORN_COLORS.SUCCESS,
              LONGHORN_COLORS.WARNING,
              LONGHORN_COLORS.INFO,
              LONGHORN_COLORS.MUTED,
            ],
          },
        ],
        suffix: GiB_UNIT,
        resourceNameKey: 'longhorn.storage.title',
      };
    },
  },

  computed: {
    inStore() {
      return this.$store.getters['currentProduct'].inStore;
    },

    volumes() {
      return this.$store.getters[`${this.inStore}/all`](LONGHORN_RESOURCES.VOLUMES);
    },

    nodes() {
      return this.$store.getters[`${this.inStore}/all`](LONGHORN_RESOURCES.NODES);
    },

    volumeChart() {
      return this.getVolumeChartData();
    },

    filesystemStorageChart() {
      return this.getFilesystemStorageChartData();
    },

    blockStorageChart() {
      return this.getBlockStorageChartData();
    },

    nodesChart() {
      return this.getNodesChartData();
    },

    charts() {
      const result = [this.volumeChart, this.filesystemStorageChart];

      if (this.hasData(this.blockStorageChart)) {
        result.push(this.blockStorageChart);
      }

      result.push(this.nodesChart);

      return result;
    },

    nodeCreatedAt() {
      if (!this.nodes.length) {
        return new Date().toISOString();
      }

      const timestamps = this.nodes
        .map((n) => n?.metadata?.creationTimestamp)
        .filter((ts) => !!ts)
        .map((ts) => new Date(ts))
        .filter((d) => !isNaN(d.getTime()));

      if (!timestamps.length) {
        return new Date().toISOString();
      }

      const earliest = new Date(Math.min(...timestamps.map((d) => d.getTime())));

      return earliest.toISOString();
    },

    currentVersion() {
      return (
        this.$store.getters[`${this.inStore}/byId`](
          LONGHORN_RESOURCES.SETTINGS,
          LONGHORN_SETTINGS.CURRENT_LONGHORN_VERSION
        )?.value || ''
      );
    },
  },
};
</script>

<template>
  <div class="outlet">
    <header>
      <div class="title">
        <h1><TabTitle>Dashboard</TabTitle></h1>
      </div>
    </header>

    <div class="glance-container">
      <div>
        <label> {{ t('longhorn.dashboard.version') }}: </label>
        <span>
          <span v-clean-tooltip="{ content: currentVersion }">
            {{ currentVersion }}
          </span>
        </span>
      </div>
      <div>
        <label> {{ t('longhorn.dashboard.created') }}: </label>
        <span>
          <LiveDate :value="nodeCreatedAt" :add-suffix="true" :show-tooltip="true" />
        </span>
      </div>
    </div>

    <div
      :key="charts.length"
      class="resource-gauges"
      :class="{
        'grid-3': charts.length === 3,
        'grid-4': charts.length >= 4,
      }"
    >
      <ResourceChart
        v-for="(chartData, index) in charts"
        :key="'group-' + index"
        :title="chartData.title"
        :chart-data="chartData"
        :horizontal="charts.length < 4"
      />
    </div>
    <AppTooltip />
    <Events />
  </div>
</template>

<style lang="scss" scoped>
@media (max-width: map-get($breakpoints, '--viewport-9')) {
  .outlet {
    display: flex;
    flex-direction: column;
    width: max-content;
    min-width: 100%;
  }
}

.glance-container {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 10px 0;
  display: flex;

  & > * {
    margin-right: 40px;

    & SPAN {
      font-weight: bold;
    }
  }
}

.resource-gauges {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  padding-bottom: 24px;

  @media (min-width: map-get($breakpoints, '--viewport-9')) {
    &.grid-3,
    &.grid-4 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: map-get($breakpoints, '--viewport-12')) {
    &.grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    &.grid-4 {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}
</style>
