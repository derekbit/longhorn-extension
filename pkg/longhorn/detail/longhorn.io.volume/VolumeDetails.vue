<script>
import LabelValue from '@shell/components/LabelValue';
import { BadgeState } from '@components/BadgeState';
import { formatSi } from '@shell/utils/units';
import { DATE_FORMAT, TIME_FORMAT } from '@shell/store/prefs';
import { escapeHtml } from '@shell/utils/string';
import { diffFrom } from '@shell/utils/time';
import dayjs from 'dayjs';

export default {
  name: 'VolumeDetails',

  components: {
    LabelValue,
    BadgeState,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    allBackingImagesRaw: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    isV2() {
      return this.value.spec?.dataEngine === 'v2';
    },
    displayState() {
      return this.value.displayState;
    },
    readyStatus() {
      return this.value.readyStatus;
    },

    conditions() {
      const orderedTypes = ['Restore', 'Scheduled', 'TooManySnapshots'];
      const rawConditions = this.value?.status?.conditions || [];

      return orderedTypes
        .map((type) => {
          const c = rawConditions.find((item) => item.type === type);

          if (!c) return null;
          const isError = c.error || c.status === 'False';
          const isSuccess = c.status === 'True' && !isError;

          return {
            key: c.type,
            value: {
              stateBackground: isError
                ? 'bg-error'
                : c.transitioning
                  ? 'bg-warning'
                  : isSuccess
                    ? 'bg-success'
                    : 'bg-info',
              stateDisplay: c.type.replace(/([A-Z])/g, ' $1').trim(),
            },
            icon: isError
              ? 'icon-error'
              : c.transitioning
                ? 'icon-warning'
                : isSuccess
                  ? 'icon-checkmark'
                  : 'icon-info',
            tooltip: {
              content: `<div><b>${c.reason || c.type}</b></div><div>${c.message || '—'}</div>`,
              html: true,
            },
          };
        })
        .filter(Boolean);
    },

    localSourceType() {
      const ds = this.value.spec?.dataSource || '';

      if (ds.startsWith('snap://')) return 'snapshot';
      if (ds.startsWith('vol://')) return 'volume';

      return '';
    },

    dataSourceDetails() {
      const ds = this.value.spec?.dataSource || '';
      let volume = '—';
      let snapshot = '—';

      if (this.localSourceType === 'snapshot') {
        const path = ds.replace('snap://', '');
        const parts = path.split('/');

        volume = parts[0] || '—';
        snapshot = parts[1] || '—';
      } else if (this.localSourceType === 'volume') {
        volume = ds.replace('vol://', '');
      }

      return { volume, snapshot };
    },

    backingImageInfo() {
      const name = this.value.spec?.backingImage;
      const bi = this.allBackingImagesRaw.find((i) => (i.name || i.metadata?.name) === name);

      return {
        name: name || 'None',
        size: bi?.spec?.size ? this.formatBinary(bi.spec.size) : '—',
      };
    },

    accessModeDisplay() {
      const map = {
        rwo: 'ReadWriteOnce',
        rwop: 'ReadWriteOncePod',
        rwx: 'ReadWriteMany',
      };

      return map[(this.value.spec?.accessMode || '').toLowerCase()] || this.value.spec?.accessMode;
    },

    healthColorClass() {
      if (!this.readyStatus.ready || this.value.isFaulted) return 'text-error';
      if (this.value.state === 'detached') return 'text-muted';
      const map = {
        healthy: 'text-success',
        degraded: 'text-warning',
        faulted: 'text-error',
      };

      return map[this.value.robustness] || 'text-info';
    },

    engine() {
      return this.value.currentEngine;
    },
    engineImage() {
      return this.engine?.status?.currentImage || this.value.status?.currentImage || '—';
    },
    nodeTags() {
      return (this.value.spec?.nodeSelector || []).join(', ') || '—';
    },
    diskTags() {
      return (this.value.spec?.diskSelector || []).join(', ') || '—';
    },
    k8sStatus() {
      return this.value.status?.kubernetesStatus || {};
    },
    formattedSize() {
      return this.formatBinary(this.value.spec?.size);
    },
    formattedActualSize() {
      return this.formatBinary(this.value?.status?.actualSize || 0);
    },

    lastWorkload() {
      const workloads = this.k8sStatus?.workloadsStatus || [];

      return workloads.length > 0 ? workloads[0] : { podName: '—', workloadName: '—', workloadType: '—' };
    },
    hasLastRef() {
      return !!this.k8sStatus?.lastPodRefAt || !!this.k8sStatus?.lastPVCRefAt;
    },

    frontendDisplay() {
      const map = {
        blockdev: 'Block Device',
        iscsi: 'ISCSI',
        nvmf: 'NVMf',
        ublk: 'UBLK',
      };

      return map[(this.value.spec?.frontend || '').toLowerCase()] || this.value.spec?.frontend || '—';
    },

    dataLocalityDisplay() {
      const map = {
        disabled: 'Disabled',
        'best-effort': 'Best Effort',
        'strict-local': 'Strict Local',
      };

      return map[(this.value.spec?.dataLocality || '').toLowerCase()] || this.value.spec?.dataLocality;
    },
  },

  methods: {
    getFullTimestamp(date) {
      if (!date) return '';
      const dateFormat = escapeHtml(this.$store.getters['prefs/get'](DATE_FORMAT));
      const timeFormat = escapeHtml(this.$store.getters['prefs/get'](TIME_FORMAT));

      return dayjs(date).format(`${dateFormat} ${timeFormat}`);
    },
    getLiveDateLabel(date) {
      if (!date) return '—';
      const diff = diffFrom(dayjs(date), dayjs());

      return `${diff.label} ${this.t(diff.unitsKey, { count: diff.label })} ago`;
    },
    formatBinary(bytes) {
      if (!bytes || bytes === '0') return '0 Bi';

      return formatSi(bytes, {
        suffix: 'iB',
        firstSpread: 1024,
        increment: 1024,
      });
    },
    capitalize(val) {
      if (!val) return '—';

      return val === 'ignored' ? 'Ignored (Global Setting)' : val.charAt(0).toUpperCase() + val.slice(1);
    },
  },
};
</script>

<template>
  <div class="volume-details">
    <div v-if="conditions.length" class="row mb-10">
      <div class="col span-12">
        <BadgeState
          v-for="c in conditions"
          :key="c.key"
          v-clean-tooltip="c.tooltip"
          class="mr-10 mb-10"
          :value="c.value"
          :icon="c.icon"
        />
      </div>
    </div>

    <h3 class="mb-10">Basic</h3>
    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Size">
          <template #name>
            <span
              >Size
              <i v-clean-tooltip="'Amount of space specified during creation.'" class="icon icon-info ml-5 text-muted"
            /></span>
          </template>
          <template #value
            ><span v-clean-tooltip="value.spec.size">{{ formattedSize }}</span></template
          >
        </LabelValue>
      </div>
      <div class="col span-4"><LabelValue name="Number of Replicas" :value="value.spec.numberOfReplicas" /></div>
      <div class="col span-4"><LabelValue name="Data Engine" :value="value.spec.dataEngine?.toUpperCase()" /></div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Frontend">
          <template #value>
            <span v-if="value.spec.disableFrontend">
              <i v-clean-tooltip="'Frontend disabled'" class="icon icon-disconnect text-success mr-5" /> Disabled
            </span>
            <span v-else>{{ frontendDisplay }}</span>
          </template>
        </LabelValue>
      </div>
      <template v-if="value.spec.frontend === 'ublk'">
        <div class="col span-4"><LabelValue name="UBLK Number of Queue" :value="value.spec.ublkNumberOfQueue" /></div>
        <div class="col span-4"><LabelValue name="UBLK Queue Depth" :value="value.spec.ublkQueueDepth" /></div>
      </template>
      <div v-else class="col span-4">
        <LabelValue name="Encrypted" :value="value.spec.encrypted ? 'True' : 'False'" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4"><LabelValue name="Data Locality" :value="dataLocalityDisplay" /></div>
      <div class="col span-4"><LabelValue name="Access Mode" :value="accessModeDisplay" /></div>
      <div v-if="value.spec.frontend === 'ublk'" class="col span-4">
        <LabelValue name="Encrypted" :value="value.spec.encrypted ? 'True' : 'False'" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Data Source" :value="localSourceType ? capitalize(localSourceType) : 'None'" />
      </div>
      <template v-if="localSourceType">
        <div class="col span-4"><LabelValue name="Source Volume" :value="dataSourceDetails.volume" /></div>
        <div v-if="localSourceType === 'snapshot'" class="col span-4">
          <LabelValue name="Source Snapshot" :value="dataSourceDetails.snapshot" />
        </div>
      </template>
    </div>

    <div class="row mb-20">
      <div class="col span-4"><LabelValue name="Backing Image" :value="backingImageInfo.name" /></div>
      <div v-if="value.spec.backingImage" class="col span-4">
        <LabelValue name="Backing Image Size" :value="backingImageInfo.size" />
      </div>
      <div class="col span-4">
        <LabelValue name="Backup Target" :value="value.spec.backupTargetName || 'Default'" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4"><LabelValue name="Node Tags" :value="nodeTags" /></div>
      <div class="col span-4"><LabelValue name="Disk Tags" :value="diskTags" /></div>
    </div>

    <div class="spacer" />

    <h3 class="mb-10">Runtime & Kubernetes</h3>
    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Health">
          <template #value>
            <div class="health-display">
              <i
                v-if="value.state === 'attached' && value.robustness === 'unknown'"
                v-clean-tooltip="'Node is down'"
                class="icon icon-api text-error mr-5"
                style="transform: rotate(45deg)"
              />
              <span :class="healthColorClass">{{ displayState }}</span>
              <i
                v-if="
                  value.spec.dataLocality === 'best-effort' &&
                  value.status.state === 'attached' &&
                  value.isDataLocalityNotMet
                "
                v-clean-tooltip="'No data locality!'"
                class="icon icon-warning text-warning ml-5"
              />
            </div>
          </template>
        </LabelValue>
      </div>
      <div class="col span-4">
        <LabelValue name="Ready for Workload">
          <template #value>
            <span v-if="readyStatus.ready" class="text-success">Ready</span>
            <span
              v-else
              v-clean-tooltip="
                `Not ready for workload. ${value.robustness === 'faulted' ? 'Volume Faulted' : 'Volume under maintenance.'}`
              "
              class="text-error"
              >Not Ready <i class="icon icon-error text-error ml-5"
            /></span>
          </template>
        </LabelValue>
      </div>
      <div class="col span-4">
        <LabelValue name="Actual Size">
          <template #name>
            <span
              >Actual Size
              <i
                v-clean-tooltip="'Amount of space used by the volume head and snapshots.'"
                class="icon icon-info text-muted ml-5"
            /></span>
          </template>
          <template #value
            ><span v-clean-tooltip="value?.status?.actualSize || 0">{{ formattedActualSize }}</span></template
          >
        </LabelValue>
      </div>
    </div>

    <div v-if="value.status.kubernetesStatus">
      <div class="row mb-20">
        <div v-if="k8sStatus.lastPVCRefAt" class="col span-4">
          <LabelValue name="Last time bound with PVC"
            ><template #value>{{ getLiveDateLabel(k8sStatus.lastPVCRefAt) }}</template></LabelValue
          >
        </div>
        <div v-if="k8sStatus.lastPodRefAt" class="col span-4">
          <LabelValue name="Last time used by Pod"
            ><template #value>{{ getLiveDateLabel(k8sStatus.lastPodRefAt) }}</template></LabelValue
          >
        </div>
        <div class="col span-4">
          <LabelValue name="Created At">
            <template #value
              ><span v-clean-tooltip="getFullTimestamp(value.metadata.creationTimestamp)">{{
                getLiveDateLabel(value.metadata.creationTimestamp)
              }}</span></template
            >
          </LabelValue>
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-4">
          <LabelValue
            :name="(k8sStatus.lastPVCRefAt ? 'Last ' : '') + 'Namespace'"
            :value="k8sStatus.namespace || '—'"
          />
        </div>
        <div class="col span-4">
          <LabelValue
            :name="(k8sStatus.lastPVCRefAt ? 'Last Bounded ' : '') + 'PVC Name'"
            :value="k8sStatus.pvcName || '—'"
          />
        </div>
        <div class="col span-4"><LabelValue name="PV Name" :value="k8sStatus.pvName || '—'" /></div>
      </div>

      <div class="row mb-20">
        <div class="col span-4"><LabelValue name="PV Status" :value="k8sStatus.pvStatus || '—'" /></div>
        <div class="col span-4"><LabelValue name="Last Backup" :value="value.status.lastBackup || '—'" /></div>
        <div class="col span-4">
          <LabelValue name="Last Backup At"
            ><template #value>{{
              value.status.lastBackupAt ? getLiveDateLabel(value.status.lastBackupAt) : '—'
            }}</template></LabelValue
          >
        </div>
      </div>

      <div v-for="(workload, index) in k8sStatus.workloadsStatus" :key="index" class="mb-20">
        <div class="row">
          <div class="col span-4">
            <LabelValue :name="(k8sStatus.lastPodRefAt ? 'Last ' : '') + 'Pod Name'" :value="workload.podName || '—'" />
          </div>
          <div class="col span-4">
            <LabelValue
              :name="(k8sStatus.lastPodRefAt ? 'Last ' : '') + 'Workload Name'"
              :value="workload.workloadName || '—'"
            />
          </div>
          <div class="col span-4">
            <LabelValue
              :name="(k8sStatus.lastPodRefAt ? 'Last ' : '') + 'Workload Type'"
              :value="workload.workloadType || '—'"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6"><LabelValue name="Attached Node" :value="engine?.spec?.nodeID || '—'" /></div>
      <div class="col span-6">
        <LabelValue name="Endpoint"
          ><template #value
            ><span v-if="engine?.status?.endpoint">{{ engine.status.endpoint }}</span
            ><span v-else>—</span></template
          ></LabelValue
        >
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabelValue name="Instance Manager">
          <template #name
            ><span
              >Instance Manager
              <i v-clean-tooltip="'Manages engine/replica life cycle.'" class="icon icon-info text-muted ml-5" /></span
          ></template>
          <template #value>{{ engine?.status?.instanceManagerName || '—' }}</template>
        </LabelValue>
      </div>
      <div class="col span-6">
        <LabelValue name="Engine Image">
          <template #name
            ><span
              >Engine Image
              <i
                v-clean-tooltip="'Provides binary for the volume engine/replicas.'"
                class="icon icon-info text-muted ml-5" /></span
          ></template>
          <template #value>{{ engineImage }}</template>
        </LabelValue>
      </div>
    </div>

    <div class="spacer" />

    <h3 class="mb-10">Advanced</h3>
    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          name="Backup Block Size"
          :value="value.spec.backupBlockSize === '0' ? 'Ignored' : formatBinary(value.spec.backupBlockSize)"
        />
      </div>
      <div class="col span-4">
        <LabelValue name="Snapshot Data Integrity" :value="capitalize(value.spec.snapshotDataIntegrity)" />
      </div>
      <div class="col span-4">
        <LabelValue name="Snapshot Max Count" :value="value.spec.snapshotMaxCount || '250'" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Snapshot Max Size"
          ><template #value>{{ formatBinary(value.spec.snapshotMaxSize) }}</template></LabelValue
        >
      </div>
      <div class="col span-4">
        <LabelValue name="Replicas Auto Balance" :value="capitalize(value.spec.replicaAutoBalance)" />
      </div>
      <div class="col span-4">
        <LabelValue name="Snapshot Removal During Trim" :value="capitalize(value.spec.unmapMarkSnapChainRemoved)" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Replica Soft Anti Affinity" :value="capitalize(value.spec.replicaSoftAntiAffinity)" />
      </div>
      <div class="col span-4">
        <LabelValue
          name="Replica Zone Soft Anti Affinity"
          :value="capitalize(value.spec.replicaZoneSoftAntiAffinity)"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          name="Replica Disk Soft Anti Affinity"
          :value="capitalize(value.spec.replicaDiskSoftAntiAffinity)"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Freeze Filesystem For Snapshot" :value="capitalize(value.spec.freezeFilesystemForSnapshot)" />
      </div>
      <div class="col span-4">
        <LabelValue name="Offline Replica Rebuilding" :value="capitalize(value.spec.offlineRebuilding)" />
      </div>
      <div v-if="isV2" class="col span-4">
        <LabelValue name="Rebuilding Bandwidth Limit"
          ><template #value>{{ formatBinary(value.spec.replicaRebuildingBandwidthLimit) }}</template></LabelValue
        >
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue name="Revision Counter Disabled" :value="value.spec.revisionCounterDisabled ? 'True' : 'False'" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.health-display {
  display: flex;
  align-items: center;
}
</style>
