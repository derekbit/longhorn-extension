<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { set } from '@shell/utils/object';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { GiB_UNIT, MiB_UNIT } from '@longhorn/types/units';
import { _CREATE } from '@shell/config/query-params';

const DATA_ENGINE_V1 = 'v1';
const DATA_ENGINE_V2 = 'v2';
const SOURCE_TYPE_VOLUME = 'volume';
const SOURCE_TYPE_SNAPSHOT = 'snapshot';

export default {
  name: 'VolumeBasics',

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
  },

  data() {
    return {
      _CREATE,
      sizeRaw: 20,
      sizeUnit: GiB_UNIT,
      localSourceType: '',
      allBackingImagesRaw: [],
      allBackupTargetsRaw: [],
      allVolumesRaw: [],
      allSnapshotsRaw: [],
      allNodesRaw: [],
      v1EngineEnabled: true,
      v2EngineEnabled: false,
      defaultReplicaSettings: { [DATA_ENGINE_V1]: 3, [DATA_ENGINE_V2]: 3 },
    };
  },

  computed: {
    inStore() {
      return this.$store.getters['currentProduct']?.inStore;
    },

    isSizeDisabled() {
      const isCloning = [SOURCE_TYPE_VOLUME, SOURCE_TYPE_SNAPSHOT].includes(this.localSourceType);

      return isCloning && !!this.value.spec.dataSourceVolume;
    },

    unitOptions: () => [
      { label: MiB_UNIT, value: MiB_UNIT },
      { label: GiB_UNIT, value: GiB_UNIT },
    ],

    backupTargetOptions() {
      const availableTargets = this.allBackupTargetsRaw.filter((t) => t.status?.available !== false);

      return this.mapToOptions(availableTargets, true);
    },

    dataEngineOptions() {
      const options = [];

      if (this.v1EngineEnabled) options.push({ label: 'V1', value: DATA_ENGINE_V1 });
      if (this.v2EngineEnabled) options.push({ label: 'V2', value: DATA_ENGINE_V2 });

      return options;
    },

    dataSourceOptions: () => [
      { label: 'None', value: '' },
      { label: 'Volume', value: SOURCE_TYPE_VOLUME },
      { label: 'Volume Snapshot', value: SOURCE_TYPE_SNAPSHOT },
    ],

    filteredVolumeOptions() {
      const engine = this.value?.spec?.dataEngine;
      const volumes = engine ? this.allVolumesRaw.filter((v) => v.spec?.dataEngine === engine) : this.allVolumesRaw;

      return this.mapToOptions(volumes, true);
    },

    filteredBackingImageOptions() {
      const engine = this.value?.spec?.dataEngine;
      const bis = engine
        ? this.allBackingImagesRaw.filter((bi) => !bi.spec?.dataEngine || bi.spec?.dataEngine === engine)
        : this.allBackingImagesRaw;

      return this.mapToOptions(bis, true);
    },

    filteredSnapshotOptions() {
      const selectedVol = this.value.spec.dataSourceVolume;

      if (!selectedVol) return [{ label: 'None', value: '' }];

      return this.allSnapshotsRaw
        .filter((s) => [s.spec?.volume, s.status?.volume, s.volume].includes(selectedVol))
        .map((s) => {
          const time = s.status?.creationTime || s.creationTime || s.metadata?.creationTimestamp;
          const formattedDate = time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '';

          return {
            label: `${s.name || s.id} (created ${formattedDate})`,
            value: s.name || s.id,
            time: dayjs(time || 0).valueOf(),
          };
        })
        .sort((a, b) => b.time - a.time)
        .concat([{ label: 'None', value: '' }])
        .reverse();
    },

    frontendOptions() {
      return this.value.spec?.dataEngine === DATA_ENGINE_V2
        ? [
            { label: 'Block Device', value: 'blockdev' },
            { label: 'NVMf', value: 'nvmf' },
            { label: 'UBLK', value: 'ublk' },
          ]
        : [
            { label: 'Block Device', value: 'blockdev' },
            { label: 'ISCSI', value: 'iscsi' },
          ];
    },

    nodeTagOptions() {
      const tags = [...new Set(this.allNodesRaw.flatMap((n) => n.spec?.tags || []))];

      return tags.map((t) => ({ label: t, value: t }));
    },

    diskTagOptions() {
      const tags = [
        ...new Set(this.allNodesRaw.flatMap((n) => Object.values(n.spec?.disks || {}).flatMap((d) => d.tags || []))),
      ];

      return tags.map((t) => ({ label: t, value: t }));
    },

    dataLocalityOptions: () => [
      { label: 'Disabled', value: 'disabled' },
      { label: 'Best Effort', value: 'best-effort' },
      { label: 'Strict Local', value: 'strict-local' },
    ],

    accessModeOptions: () => [
      { label: 'ReadWriteOnce', value: 'rwo' },
      { label: 'ReadWriteOncePod', value: 'rwop' },
      { label: 'ReadWriteMany', value: 'rwx' },
    ],
  },

  watch: {
    sizeRaw: 'syncToBytes',
    sizeUnit: 'syncToBytes',

    localSourceType(newType) {
      if (!newType) {
        set(this.value.spec, 'dataSource', '');
        set(this.value.spec, 'dataSourceVolume', '');
        set(this.value.spec, 'dataSourceSnapshot', '');
      }
      this.syncDataSourceString();
    },

    async 'value.spec.dataSourceVolume'(newVol) {
      set(this.value.spec, 'dataSourceSnapshot', '');
      this.syncDataSourceString();
      if (!newVol) {
        this.allSnapshotsRaw = [];

        return;
      }
      if (this.localSourceType === SOURCE_TYPE_SNAPSHOT) await this.loadSnapshots();

      const volRes = this.allVolumesRaw.find((v) => (v.name || v.metadata?.name) === newVol);

      if (volRes) this.setSizeFromResource(volRes);
    },

    'value.spec.dataSourceSnapshot': 'syncDataSourceString',

    'value.spec.dataEngine'(newEngine) {
      if (this.mode === 'create') this.updateDefaultReplicaCount(newEngine);

      if (!this.frontendOptions.some((o) => o.value === this.value.spec.frontend)) {
        set(this.value.spec, 'frontend', 'blockdev');
      }

      if (
        this.value.spec.dataSourceVolume &&
        !this.filteredVolumeOptions.some((o) => o.value === this.value.spec.dataSourceVolume)
      ) {
        set(this.value.spec, 'dataSourceVolume', '');
        set(this.value.spec, 'dataSourceSnapshot', '');
      }
    },
  },

  created() {
    dayjs.extend(relativeTime);
    this.initDataSourceType();
    this.syncSizeFromSpec();
    this.loadOptions();
  },

  methods: {
    initDataSourceType() {
      const ds = this.value.spec.dataSource || '';

      if (ds.startsWith('snap://')) {
        this.localSourceType = SOURCE_TYPE_SNAPSHOT;
      } else if (ds.startsWith('vol://')) {
        this.localSourceType = SOURCE_TYPE_VOLUME;
      }
    },

    async loadOptions() {
      if (!this.inStore) return;

      try {
        const [
          volumes,
          backingImages,
          backupTargets,
          nodes,
          replicaSetting,
          localitySetting,
          ublkDepthSetting,
          ublkNumSetting,
          v1EngSetting,
          v2EngSetting,
        ] = await Promise.all([
          this.$store.dispatch(`${this.inStore}/findAll`, { type: LONGHORN_RESOURCES.VOLUMES }),
          this.$store.dispatch(`${this.inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKING_IMAGES }),
          this.$store.dispatch(`${this.inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUP_TARGETS }),
          this.$store.dispatch(`${this.inStore}/findAll`, { type: LONGHORN_RESOURCES.NODES }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.DEFAULT_REPLICA_COUNT,
          }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.DEFAULT_DATA_LOCALITY,
          }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.DEFAULT_UBLK_QUEUE_DEPTH,
          }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.DEFAULT_UBLK_NUMBER_OF_QUEUE,
          }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.V1_DATA_ENGINE,
          }),
          this.$store.dispatch(`${this.inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.V2_DATA_ENGINE,
          }),
        ]);

        this.allVolumesRaw = volumes || [];
        this.allBackingImagesRaw = backingImages || [];
        this.allBackupTargetsRaw = backupTargets || [];
        this.allNodesRaw = nodes || [];

        this.v1EngineEnabled = v1EngSetting?.value !== 'false';
        this.v2EngineEnabled = v2EngSetting?.value === 'true';

        if (replicaSetting?.value) {
          try {
            this.defaultReplicaSettings = JSON.parse(replicaSetting.value);
          } catch {
            this.defaultReplicaSettings = {
              [DATA_ENGINE_V1]: replicaSetting.value,
              [DATA_ENGINE_V2]: replicaSetting.value,
            };
          }
        }

        if (this.mode === 'create') {
          const spec = this.value.spec;

          if (!spec.dataEngine) set(spec, 'dataEngine', this.v1EngineEnabled ? DATA_ENGINE_V1 : DATA_ENGINE_V2);

          this.updateDefaultReplicaCount(spec.dataEngine);

          if (localitySetting?.value && !spec.dataLocality) set(spec, 'dataLocality', localitySetting.value);

          if (spec.backupTargetName === undefined || spec.backupTargetName === '') {
            const defaultTarget = this.allBackupTargetsRaw.find(
              (bt) => (bt.name || bt.metadata?.name || bt.id) === 'default'
            );

            if (defaultTarget && defaultTarget.status?.available !== false) {
              set(spec, 'backupTargetName', 'default');
            } else {
              set(spec, 'backupTargetName', '');
            }
          }

          if (ublkDepthSetting?.value && !spec.ublkQueueDepth) {
            set(spec, 'ublkQueueDepth', Number(ublkDepthSetting.value));
          }
          if (ublkNumSetting?.value && !spec.ublkNumberOfQueue) {
            set(spec, 'ublkNumberOfQueue', Number(ublkNumSetting.value));
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error initializing Longhorn Basics', e);
      }
    },

    updateDefaultReplicaCount(engine) {
      const count = this.defaultReplicaSettings[engine];

      if (count) set(this.value.spec, 'numberOfReplicas', Number(count));
    },

    syncDataSourceString() {
      const { spec } = this.value;
      const vol = spec.dataSourceVolume;
      const snap = spec.dataSourceSnapshot;

      if (!this.localSourceType || !vol) {
        set(spec, 'dataSource', '');

        return;
      }
      const final = this.localSourceType === SOURCE_TYPE_SNAPSHOT ? `snap://${vol}/${snap || ''}` : `vol://${vol}`;

      if (spec.dataSource !== final) set(spec, 'dataSource', final);
    },

    async loadSnapshots() {
      if (!this.inStore) return;
      this.allSnapshotsRaw =
        (await this.$store.dispatch(`${this.inStore}/findAll`, {
          type: LONGHORN_RESOURCES.SNAPSHOTS,
          opt: { force: true },
        })) || [];
    },

    mapToOptions(items, addNone = false) {
      const options = (items || []).map((i) => ({
        label: i.name || i.metadata?.name || i.id,
        value: i.name || i.metadata?.name || i.id,
      }));

      return addNone ? [{ label: 'None', value: '' }, ...options] : options;
    },

    syncSizeFromSpec() {
      const bytes = Number(this.value?.spec?.size || 0);

      if (!bytes) return;

      if (bytes >= 1024 ** 3 && bytes % 1024 ** 3 === 0) {
        this.sizeRaw = bytes / 1024 ** 3;
        this.sizeUnit = GiB_UNIT;
      } else {
        this.sizeRaw = Math.round(bytes / 1024 ** 2);
        this.sizeUnit = MiB_UNIT;
      }
    },

    syncToBytes() {
      const multiplier = this.sizeUnit === GiB_UNIT ? 1024 ** 3 : 1024 ** 2;
      const bytes = Math.round(this.sizeRaw * multiplier);

      set(this.value.spec, 'size', String(bytes));
    },

    setSizeFromResource(res) {
      const rawBytes = res?.spec?.size || res?.status?.actualSize || 0;

      set(this.value.spec, 'size', String(rawBytes));
      this.syncSizeFromSpec();
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-6">
        <div class="size-container">
          <LabeledInput
            v-model:value.number="sizeRaw"
            type="number"
            :label="t('longhorn.volume.table.header.size')"
            :mode="mode"
            :disabled="isSizeDisabled"
            :rules="getRules('spec.size')"
            required
            class="size-input"
          />
          <LabeledSelect
            v-model:value="sizeUnit"
            label="Unit"
            :options="unitOptions"
            :mode="mode"
            :disabled="isSizeDisabled"
            class="unit-select"
          />
        </div>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.numberOfReplicas"
          type="number"
          :label="t('longhorn.volume.form.numberOfReplicas')"
          :rules="getRules('spec.numberOfReplicas')"
          min="1"
          max="10"
          required
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.dataEngine"
          :label="t('longhorn.volume.table.header.dataEngine')"
          :options="dataEngineOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.frontend"
          :label="t('longhorn.volume.form.frontend')"
          :options="frontendOptions"
          required
          :mode="mode"
        />
      </div>
    </div>

    <div v-if="value.spec.frontend === 'ublk'" class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.ublkNumberOfQueue"
          type="number"
          label="UBLK Number of Queue"
          required
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.ublkQueueDepth"
          type="number"
          label="UBLK Queue Depth"
          required
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.dataLocality"
          :label="t('longhorn.volume.form.dataLocality')"
          :options="dataLocalityOptions"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.accessMode"
          :label="t('longhorn.volume.form.accessMode')"
          :options="accessModeOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="localSourceType"
          :label="t('longhorn.volume.form.dataSource.label')"
          :options="dataSourceOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div v-if="localSourceType" class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.dataSourceVolume"
          :label="t('longhorn.volume.form.sourceVolume')"
          :options="filteredVolumeOptions"
          :mode="mode"
          :searchable="true"
        />
      </div>
      <div v-if="localSourceType === 'snapshot'" class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.dataSourceSnapshot"
          :label="t('longhorn.volume.form.sourceSnapshot')"
          :options="filteredSnapshotOptions"
          :mode="mode"
          :searchable="true"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.backupTargetName"
          label="Backup Target"
          :options="backupTargetOptions"
          :mode="mode"
          :searchable="true"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.backingImage"
          :label="t('longhorn.volume.form.backingImage')"
          :options="filteredBackingImageOptions"
          :mode="mode"
          :searchable="true"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.nodeSelector"
          :label="t('longhorn.volume.form.nodeTag')"
          :options="nodeTagOptions"
          multiple
          :mode="mode"
          :searchable="true"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.diskSelector"
          :label="t('longhorn.volume.form.diskTag')"
          :options="diskTagOptions"
          multiple
          :mode="mode"
          :searchable="true"
        />
      </div>
    </div>
  </div>
  <div class="row mb-20">
    <div class="col span-6 pt-10">
      <Checkbox
        v-model:value="value.spec.encrypted"
        :label="t('longhorn.volume.form.encrypted')"
        :mode="mode"
        :disabled="mode !== _CREATE"
      />
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
