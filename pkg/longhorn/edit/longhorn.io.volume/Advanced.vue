<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { set } from '@shell/utils/object';
import { GiB_UNIT, MiB_UNIT } from '@longhorn/types/general';
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

    unitOptions() {
      return [
        { label: MiB_UNIT, value: MiB_UNIT },
        { label: GiB_UNIT, value: GiB_UNIT },
      ];
    },

    standardToggleOptions() {
      return [
        { label: this.t('longhorn.volume.options.global.ignored'), value: 'ignored' },
        { label: this.t('longhorn.volume.options.global.enabled'), value: 'enabled' },
        { label: this.t('longhorn.volume.options.global.disabled'), value: 'disabled' },
      ];
    },

    replicaAutoBalanceOptions() {
      return [
        { label: this.t('longhorn.volume.options.global.ignored'), value: 'ignored' },
        { label: this.t('longhorn.volume.options.global.disabled'), value: 'disabled' },
        { label: this.t('longhorn.volume.options.replicaAutoBalance.leastEffort'), value: 'least-effort' },
        { label: this.t('longhorn.volume.options.replicaAutoBalance.bestEffort'), value: 'best-effort' },
      ];
    },

    dataIntegrityOptions() {
      return [
        { label: this.t('longhorn.volume.options.global.ignored'), value: 'ignored' },
        { label: this.t('longhorn.volume.options.global.disabled'), value: 'disabled' },
        { label: this.t('longhorn.volume.options.global.enabled'), value: 'enabled' },
        { label: this.t('longhorn.volume.options.dataIntegrity.fastCheck'), value: 'fast-check' },
      ];
    },

    backupBlockSizeOptions() {
      return [
        { label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.ignored'), value: '0' },
        { label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.twoMi'), value: '2097152' },
        {
          label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.sixteenMi'),
          value: '16777216',
        },
      ];
    },
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
    <h3>{{ t('longhorn.volume.advanced.section.snapshotPolicy') }}</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.snapshotMaxCount"
          type="number"
          :label="t('longhorn.volume.advanced.fields.snapshotMaxCount')"
          :tooltip="t('longhorn.volume.advanced.tooltip.inheritGlobalWithZero')"
          :mode="mode"
          :rules="getRules('spec.snapshotMaxCount')"
          :disabled="fieldDisabledStatus.snapshotMaxCount"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.unmapMarkSnapChainRemoved"
          :label="t('longhorn.volume.advanced.fields.allowSnapshotRemovalDuringTrim')"
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
            :label="t('longhorn.volume.advanced.fields.snapshotMaxSize')"
            :tooltip="t('longhorn.volume.advanced.tooltip.unrestrictedWithZero')"
            :mode="mode"
            class="size-input"
          />
          <LabeledSelect
            v-model:value="snapshotMaxSizeUnit"
            :label="t('longhorn.volume.form.unit')"
            :options="unitOptions"
            :mode="mode"
            class="unit-select"
          />
        </div>
      </div>
    </div>

    <div class="spacer" />

    <h3>{{ t('longhorn.volume.advanced.section.dataIntegrityAndReliability') }}</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.snapshotDataIntegrity"
          :label="t('longhorn.volume.advanced.fields.snapshotDataIntegrity')"
          :options="dataIntegrityOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.freezeFilesystemForSnapshot"
          :label="t('longhorn.volume.advanced.fields.freezeFilesystemForSnapshot')"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6 pt-10">
        <Checkbox
          v-model:value="value.spec.revisionCounterDisabled"
          :label="t('longhorn.volume.advanced.fields.disableRevisionCounter')"
          :tooltip="t('longhorn.volume.advanced.tooltip.revisionCounterDisabled')"
          :mode="mode"
        />
      </div>
    </div>

    <div class="spacer" />

    <h3>{{ t('longhorn.volume.advanced.section.replicaSchedulingAndAffinity') }}</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaAutoBalance"
          :label="t('longhorn.volume.advanced.fields.replicasAutoBalance')"
          :options="replicaAutoBalanceOptions"
          :mode="mode"
          :disabled="fieldDisabledStatus.replicaAutoBalance"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.offlineRebuilding"
          :label="t('longhorn.volume.advanced.fields.offlineReplicaRebuilding')"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaSoftAntiAffinity"
          :label="t('longhorn.volume.advanced.fields.replicaSoftAntiAffinity')"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaZoneSoftAntiAffinity"
          :label="t('longhorn.volume.advanced.fields.replicaZoneSoftAntiAffinity')"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.replicaDiskSoftAntiAffinity"
          :label="t('longhorn.volume.advanced.fields.replicaDiskSoftAntiAffinity')"
          :options="standardToggleOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div class="spacer" />

    <h3>{{ t('longhorn.volume.advanced.section.engineOptimization') }}</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.backupBlockSize"
          :label="t('longhorn.volume.advanced.fields.backupBlockSize')"
          :options="backupBlockSizeOptions"
          :mode="mode"
          :disabled="mode !== _CREATE"
        />
      </div>

      <div v-if="isV2" class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.replicaRebuildingBandwidthLimit"
          type="number"
          :label="t('longhorn.volume.advanced.fields.replicaRebuildingBandwidthLimit')"
          :tooltip="t('longhorn.volume.advanced.tooltip.inheritGlobalWithZero')"
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
