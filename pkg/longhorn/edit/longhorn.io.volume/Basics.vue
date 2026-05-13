<script>
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { set } from '@shell/utils/object';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { VOLUME_SOURCE_TYPE, DATA_ENGINE_V1, DATA_ENGINE_V2 } from '@longhorn/types/volume';
import { buildVolumeDataSource, parseVolumeDataSource, getFrontendOptions } from '@longhorn/utils/volume';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { GiB_UNIT, MiB_UNIT } from '@longhorn/types/general';
import { _CREATE } from '@shell/config/query-params';

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
      const isCloning = [VOLUME_SOURCE_TYPE.VOLUME, VOLUME_SOURCE_TYPE.SNAPSHOT].includes(this.localSourceType);

      return isCloning && !!this.value.spec.dataSourceVolume;
    },

    unitOptions() {
      return [
        { label: MiB_UNIT, value: MiB_UNIT },
        { label: GiB_UNIT, value: GiB_UNIT },
      ];
    },

    backupTargetOptions() {
      const availableTargets = this.allBackupTargetsRaw.filter(
        (backupTargetResource) => backupTargetResource.status?.available !== false
      );

      return this.mapToOptions(availableTargets, true);
    },

    dataEngineOptions() {
      const options = [];

      if (this.v1EngineEnabled) {
        options.push({ label: this.t('longhorn.volume.options.dataEngine.v1'), value: DATA_ENGINE_V1 });
      }
      if (this.v2EngineEnabled) {
        options.push({ label: this.t('longhorn.volume.options.dataEngine.v2'), value: DATA_ENGINE_V2 });
      }

      return options;
    },

    dataSourceOptions() {
      return [
        { label: this.t('longhorn.volume.options.dataSource.none'), value: '' },
        { label: this.t('longhorn.volume.options.dataSource.volume'), value: VOLUME_SOURCE_TYPE.VOLUME },
        { label: this.t('longhorn.volume.options.dataSource.volumeSnapshot'), value: VOLUME_SOURCE_TYPE.SNAPSHOT },
      ];
    },

    filteredVolumeOptions() {
      const engine = this.value?.spec?.dataEngine;
      const volumes = engine
        ? this.allVolumesRaw.filter((volumeResource) => volumeResource.spec?.dataEngine === engine)
        : this.allVolumesRaw;

      return this.mapToOptions(volumes, true);
    },

    filteredBackingImageOptions() {
      const engine = this.value?.spec?.dataEngine;
      const backingImageResources = engine
        ? this.allBackingImagesRaw.filter(
            (backingImageResource) =>
              !backingImageResource.spec?.dataEngine || backingImageResource.spec?.dataEngine === engine
          )
        : this.allBackingImagesRaw;

      return this.mapToOptions(backingImageResources, true);
    },

    filteredSnapshotOptions() {
      const selectedVol = this.value.spec.dataSourceVolume;

      if (!selectedVol) return [{ label: this.t('longhorn.volume.options.dataSource.none'), value: '' }];

      return this.allSnapshotsRaw
        .filter((snapshotResource) =>
          [snapshotResource.spec?.volume, snapshotResource.status?.volume, snapshotResource.volume].includes(
            selectedVol
          )
        )
        .map((snapshotResource) => {
          const time =
            snapshotResource.status?.creationTime ||
            snapshotResource.creationTime ||
            snapshotResource.metadata?.creationTimestamp;
          const formattedDate = time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '';

          return {
            label: this.t('longhorn.volume.options.snapshot.createdLabel', {
              name: snapshotResource.name || snapshotResource.id,
              createdAt: formattedDate,
            }),
            value: snapshotResource.name || snapshotResource.id,
            time: dayjs(time || 0).valueOf(),
          };
        })
        .sort((firstSnapshot, secondSnapshot) => secondSnapshot.time - firstSnapshot.time)
        .concat([{ label: this.t('longhorn.volume.options.dataSource.none'), value: '' }])
        .reverse();
    },

    frontendOptions() {
      const selectedDataEngine = this.value.spec?.dataEngine;
      const frontendOptions = getFrontendOptions(this.t);

      return frontendOptions
        .filter((frontend) => frontend.dataEngine.includes(selectedDataEngine))
        .map((frontend) => ({
          label: frontend.label,
          value: frontend.value,
        }));
    },

    nodeTagOptions() {
      const tags = [...new Set(this.allNodesRaw.flatMap((nodeResource) => nodeResource.spec?.tags || []))];

      return tags.map((tag) => ({ label: tag, value: tag }));
    },

    diskTagOptions() {
      const tags = [
        ...new Set(
          this.allNodesRaw.flatMap((nodeResource) =>
            Object.values(nodeResource.spec?.disks || {}).flatMap((disk) => disk.tags || [])
          )
        ),
      ];

      return tags.map((tag) => ({ label: tag, value: tag }));
    },

    dataLocalityOptions() {
      return [
        { label: this.t('longhorn.volume.options.dataLocality.disabled'), value: 'disabled' },
        { label: this.t('longhorn.volume.options.dataLocality.bestEffort'), value: 'best-effort' },
        { label: this.t('longhorn.volume.options.dataLocality.strictLocal'), value: 'strict-local' },
      ];
    },

    accessModeOptions() {
      return [
        { label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwo'), value: 'rwo' },
        { label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwop'), value: 'rwop' },
        { label: this.t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwx'), value: 'rwx' },
      ];
    },
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

    async 'value.spec.dataSourceVolume'(newVolumeName) {
      set(this.value.spec, 'dataSourceSnapshot', '');
      this.syncDataSourceString();
      if (!newVolumeName) {
        this.allSnapshotsRaw = [];

        return;
      }
      if (this.localSourceType === VOLUME_SOURCE_TYPE.SNAPSHOT) await this.loadSnapshots();

      const selectedVolumeResource = this.allVolumesRaw.find(
        (volumeResource) => (volumeResource.name || volumeResource.metadata?.name) === newVolumeName
      );

      if (selectedVolumeResource) this.setSizeFromResource(selectedVolumeResource);
    },

    'value.spec.dataSourceSnapshot': 'syncDataSourceString',

    'value.spec.dataEngine'(newEngine) {
      if (this.mode === 'create') this.updateDefaultReplicaCount(newEngine);

      if (!this.frontendOptions.some((frontendOption) => frontendOption.value === this.value.spec.frontend)) {
        set(this.value.spec, 'frontend', this.frontendOptions[0]?.value || 'blockdev');
      }

      if (
        this.value.spec.dataSourceVolume &&
        !this.filteredVolumeOptions.some((volumeOption) => volumeOption.value === this.value.spec.dataSourceVolume)
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
      const { sourceType } = parseVolumeDataSource(this.value.spec.dataSource || '');

      this.localSourceType = sourceType;
    },

    async loadOptions() {
      if (!this.inStore) return;

      const findAll = (type) => this.$store.dispatch(`${this.inStore}/findAll`, { type });
      const findSetting = (id) =>
        this.$store.dispatch(`${this.inStore}/find`, { type: LONGHORN_RESOURCES.SETTINGS, id });

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
          findAll(LONGHORN_RESOURCES.VOLUMES),
          findAll(LONGHORN_RESOURCES.BACKING_IMAGES),
          findAll(LONGHORN_RESOURCES.BACKUP_TARGETS),
          findAll(LONGHORN_RESOURCES.NODES),
          findSetting(LONGHORN_SETTINGS.DEFAULT_REPLICA_COUNT),
          findSetting(LONGHORN_SETTINGS.DEFAULT_DATA_LOCALITY),
          findSetting(LONGHORN_SETTINGS.DEFAULT_UBLK_QUEUE_DEPTH),
          findSetting(LONGHORN_SETTINGS.DEFAULT_UBLK_NUMBER_OF_QUEUE),
          findSetting(LONGHORN_SETTINGS.V1_DATA_ENGINE),
          findSetting(LONGHORN_SETTINGS.V2_DATA_ENGINE),
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
              (backupTargetResource) =>
                (backupTargetResource.name || backupTargetResource.metadata?.name || backupTargetResource.id) ===
                'default'
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
      } catch (initializationError) {
        // eslint-disable-next-line no-console
        console.error('Error initializing Longhorn Basics', initializationError);
      }
    },

    updateDefaultReplicaCount(engine) {
      const count = this.defaultReplicaSettings[engine];

      if (count) set(this.value.spec, 'numberOfReplicas', Number(count));
    },

    syncDataSourceString() {
      const { spec } = this.value;
      const sourceVolumeName = spec.dataSourceVolume;
      const sourceSnapshotName = spec.dataSourceSnapshot;

      if (!this.localSourceType || !sourceVolumeName) {
        set(spec, 'dataSource', '');

        return;
      }
      const dataSourceValue = buildVolumeDataSource(this.localSourceType, sourceVolumeName, sourceSnapshotName);

      if (spec.dataSource !== dataSourceValue) set(spec, 'dataSource', dataSourceValue);
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
      const options = (items || []).map((resourceItem) => ({
        label: resourceItem.name || resourceItem.metadata?.name || resourceItem.id,
        value: resourceItem.name || resourceItem.metadata?.name || resourceItem.id,
      }));

      return addNone ? [{ label: this.t('longhorn.volume.options.dataSource.none'), value: '' }, ...options] : options;
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

    setSizeFromResource(resource) {
      const rawBytes = resource?.spec?.size || resource?.status?.actualSize || 0;

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
            :label="t('longhorn.volume.form.unit')"
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
          :label="t('longhorn.volume.form.ublkNumberOfQueue')"
          required
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value.number="value.spec.ublkQueueDepth"
          type="number"
          :label="t('longhorn.volume.form.ublkQueueDepth')"
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
          :label="t('longhorn.volume.form.backupTarget')"
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
          :multiple="true"
          :mode="mode"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model:value="value.spec.diskSelector"
          :label="t('longhorn.volume.form.diskTag')"
          :options="diskTagOptions"
          :multiple="true"
          :mode="mode"
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
