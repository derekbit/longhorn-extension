<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { set } from '@shell/utils/object';
import { GiB_UNIT, MiB_UNIT } from '@longhorn/types/units';
import { _CREATE } from '@shell/config/query-params';

export default {
  name: 'VolumeAdvanced',

  components: {
    LabeledInput,
    LabeledSelect,
    Checkbox,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    getRules: {
      type: Function,
      default: () => [],
    },
    fieldDisabledStatus: {
      type: Object,
      default: () => ({}),
    },
  },

  data() {
    return {
      _CREATE,
      snapshotMaxSizeRaw: 0,
      snapshotMaxSizeUnit: GiB_UNIT,
    };
  },

  computed: {
    isV1() {
      return this.value.spec?.dataEngine === 'v1';
    },

    isV2() {
      return this.value.spec?.dataEngine === 'v2';
    },

    unitOptions: () => [
      { label: MiB_UNIT, value: MiB_UNIT },
      { label: GiB_UNIT, value: GiB_UNIT },
    ],

    standardToggleOptions: () => [
      { label: 'ignored (follow the global setting)', value: 'ignored' },
      { label: 'enabled', value: 'enabled' },
      { label: 'disabled', value: 'disabled' },
    ],

    replicaAutoBalanceOptions: () => [
      { label: 'ignored (follow the global setting)', value: 'ignored' },
      { label: 'disabled', value: 'disabled' },
      { label: 'least-effort', value: 'least-effort' },
      { label: 'best-effort', value: 'best-effort' },
    ],

    dataIntegrityOptions: () => [
      { label: 'ignored (follow the global setting)', value: 'ignored' },
      { label: 'disabled', value: 'disabled' },
      { label: 'enabled', value: 'enabled' },
      { label: 'fast-check', value: 'fast-check' },
    ],

    backupBlockSizeOptions: () => [
      { label: 'ignored (follow the global setting)', value: '0' },
      { label: '2 Mi', value: '2097152' },
      { label: '16 Mi', value: '16777216' },
    ],
  },

  watch: {
    snapshotMaxSizeRaw: 'syncToBytes',
    snapshotMaxSizeUnit: 'syncToBytes',
  },

  created() {
    this.initSnapshotMaxSize();
  },

  methods: {
    initSnapshotMaxSize() {
      const bytes = Number(this.value.spec?.snapshotMaxSize || 0);

      if (bytes === 0) {
        this.snapshotMaxSizeRaw = 0;
        this.snapshotMaxSizeUnit = GiB_UNIT;

        return;
      }

      if (bytes >= 1024 ** 3 && bytes % 1024 ** 3 === 0) {
        this.snapshotMaxSizeRaw = bytes / 1024 ** 3;
        this.snapshotMaxSizeUnit = GiB_UNIT;
      } else {
        this.snapshotMaxSizeRaw = Math.round(bytes / 1024 ** 2);
        this.snapshotMaxSizeUnit = MiB_UNIT;
      }
    },

    syncToBytes() {
      const numericValue = Number(this.snapshotMaxSizeRaw);

      if (!numericValue || numericValue <= 0) {
        set(this.value.spec, 'snapshotMaxSize', '0');

        return;
      }

      const multiplier = this.snapshotMaxSizeUnit === GiB_UNIT ? 1024 ** 3 : 1024 ** 2;
      const bytes = Math.round(numericValue * multiplier);

      set(this.value.spec, 'snapshotMaxSize', String(bytes));
    },
  },
};
</script>

<template>
  <div>
    <h3>Snapshot Policy</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.snapshotMaxCount"
          type="number"
          label="Snapshot Max Count"
          tooltip="Set '0' to inherit global settings"
          :mode="mode"
          :rules="getRules('spec.snapshotMaxCount')"
          :disabled="fieldDisabledStatus.snapshotMaxCount"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.unmapMarkSnapChainRemoved"
          label="Allow Snapshot Removal During Trim"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <div class="size-container">
          <LabeledInput
            v-model:value.number="snapshotMaxSizeRaw"
            type="number"
            label="Snapshot Max Size"
            tooltip="Set '0' for unrestricted size"
            :mode="mode"
            class="size-input"
          />
          <LabeledSelect
            v-model:value="snapshotMaxSizeUnit"
            label="Unit"
            :options="unitOptions"
            :mode="mode"
            class="unit-select"
          />
        </div>
      </div>
    </div>

    <div class="spacer" />

    <h3>Data Integrity & Reliability</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.snapshotDataIntegrity"
          label="Snapshot Data Integrity"
          :options="dataIntegrityOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.freezeFilesystemForSnapshot"
          label="Freeze Filesystem For Snapshot"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6 pt-10">
        <Checkbox
          v-model:value="value.spec.revisionCounterDisabled"
          label="Disable Revision Counter"
          tooltip="Disabling may improve performance but increases risk of data inconsistency after crashes"
          :mode="mode"
        />
      </div>
    </div>

    <div class="spacer" />

    <h3>Replica Scheduling & Affinity</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaAutoBalance"
          label="Replicas Auto Balance"
          :options="replicaAutoBalanceOptions"
          :mode="mode"
          :disabled="fieldDisabledStatus.replicaAutoBalance"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.offlineRebuilding"
          label="Offline Replica Rebuilding"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaSoftAntiAffinity"
          label="Replica Soft Anti Affinity"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaZoneSoftAntiAffinity"
          label="Replica Zone Soft Anti Affinity"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaDiskSoftAntiAffinity"
          label="Replica Disk Soft Anti Affinity"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div class="spacer" />

    <h3>Engine Optimization</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.backupBlockSize"
          label="Backup Block Size"
          :options="backupBlockSizeOptions"
          :mode="mode"
          :disabled="mode !== _CREATE"
        />
      </div>

      <div v-if="isV2" class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.replicaRebuildingBandwidthLimit"
          type="number"
          label="Replica Rebuilding Bandwidth Limit"
          tooltip="Set '0' to inherit global settings"
          :mode="mode"
          :rules="getRules('spec.replicaRebuildingBandwidthLimit')"
          :disabled="fieldDisabledStatus.replicaRebuildingBandwidthLimit"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.size-container {
  display: flex;
  align-items: flex-end;

  .size-input {
    flex: 3;
    margin-right: 10px;
  }

  .unit-select {
    flex: 1;
  }
}
</style>
