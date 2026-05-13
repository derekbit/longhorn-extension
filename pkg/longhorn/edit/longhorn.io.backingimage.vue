<script>
import CreateEditView from '@shell/mixins/create-edit-view';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import Loading from '@shell/components/Loading';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import FileSelector from '@shell/components/form/FileSelector';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import {
  BACKING_IMAGE_CREATE_SOURCE_TYPE_OPTIONS,
  BACKING_IMAGE_ENCRYPTION_TYPE,
  BACKING_IMAGE_ENCRYPTION_TYPE_OPTIONS,
  BACKING_IMAGE_EXPORT_TYPE_OPTIONS,
  BACKING_IMAGE_SOURCE_TYPE,
  BACKING_IMAGE_SOURCE_TYPE_OPTIONS,
} from '@longhorn/types/backingimage';
import { _CLONE } from '@shell/config/query-params';
import FormValidation from '@shell/mixins/form-validation';

export default {
  name: 'BackingImageEdit',

  components: {
    CruResource,
    NameNsDescription,
    Tabbed,
    Tab,
    LabeledInput,
    LabeledSelect,
    FileSelector,
    Loading,
  },

  mixins: [CreateEditView, FormValidation],

  async fetch() {
    this.ensureResourceStructure();
    const store = this.inStore || 'cluster';

    const [
      backingImageReplicaSetting,
      defaultReplicaCountSetting,
      v1DataEngineSetting,
      v2DataEngineSetting,
      allSecrets,
      allNodes,
      allVolumes,
      allBackingImages,
    ] = await Promise.all([
      this.$store
        .dispatch(`${store}/find`, {
          type: LONGHORN_RESOURCES.SETTINGS,
          id: LONGHORN_SETTINGS.DEFAULT_MIN_NUMBER_OF_BACKING_IMAGE_COPIES,
        })
        .catch(() => null),
      this.$store
        .dispatch(`${store}/find`, {
          type: LONGHORN_RESOURCES.SETTINGS,
          id: LONGHORN_SETTINGS.DEFAULT_REPLICA_COUNT,
        })
        .catch(() => null),
      this.$store
        .dispatch(`${store}/find`, {
          type: LONGHORN_RESOURCES.SETTINGS,
          id: LONGHORN_SETTINGS.V1_DATA_ENGINE,
        })
        .catch(() => null),
      this.$store
        .dispatch(`${store}/find`, {
          type: LONGHORN_RESOURCES.SETTINGS,
          id: LONGHORN_SETTINGS.V2_DATA_ENGINE,
        })
        .catch(() => null),
      this.$store.dispatch(`${store}/findAll`, { type: 'secret' }).catch(() => []),
      this.$store.dispatch(`${store}/findAll`, { type: LONGHORN_RESOURCES.NODES }).catch(() => []),
      this.$store.dispatch(`${store}/findAll`, { type: LONGHORN_RESOURCES.VOLUMES }).catch(() => []),
      this.$store.dispatch(`${store}/findAll`, { type: LONGHORN_RESOURCES.BACKING_IMAGES }).catch(() => []),
    ]);

    this.allBackingImages = allBackingImages || [];
    this.volumeNameOptions = this.transformVolumeOptions(allVolumes);
    this.secretOptions = this.transformSecretOptions(allSecrets);

    const tags = this.extractTagsFromNodes(allNodes);

    this.nodeTagOptions = tags.nodeTags;
    this.diskTagOptions = tags.diskTags;

    if (this.isCreate) {
      this.initDefaultValues({
        backingImageReplicaSetting,
        defaultReplicaCountSetting,
        v1DataEngineSetting,
        v2DataEngineSetting,
      });
    }

    if (this.isActionCloneMode) {
      this.initCloneModeDefaults();
    }
  },

  data() {
    return {
      LONGHORN_NAMESPACE,
      fileContainer: null,
      volumeNameOptions: [],
      allBackingImages: [],
      secretOptions: [],
      nodeTagOptions: [],
      diskTagOptions: [],
      defaultReplicaCountMap: null,
      defaultBackingImageMinCopies: 3,
      v1DataEngineEnabled: true,
      v2DataEngineEnabled: false,

      fvFormRuleSets: [
        { path: 'spec.sourceParameters.url', rules: ['requiredIfDownload'] },
        { path: 'spec.sourceParameters.volume-name', rules: ['requiredIfVolume'] },
        { path: 'spec.sourceParameters.backing-image', rules: ['requiredIfClone'] },
        { path: 'spec.sourceParameters.secret', rules: ['requiredIfCloneWithSecret'] },
        { path: 'spec.sourceParameters.secret-namespace', rules: ['requiredIfCloneWithSecret'] },
        { path: 'spec.dataEngine', rules: ['dataEngineEnabled'] },
        { path: 'spec.minNumberOfCopies', rules: ['requiredNumber'] },
        { path: 'fileContainer', rules: ['requiredIfUpload'], rootObject: this },
      ],
    };
  },

  computed: {
    isActionCloneMode() {
      return this.realMode === _CLONE;
    },

    sourceTypeOptions() {
      const options = [...(this.value?.sourceTypeOptions || BACKING_IMAGE_CREATE_SOURCE_TYPE_OPTIONS)];

      if (this.isActionCloneMode && !options.some((option) => option.value === BACKING_IMAGE_SOURCE_TYPE.CLONE)) {
        const cloneOption = BACKING_IMAGE_SOURCE_TYPE_OPTIONS.find(
          (option) => option.value === BACKING_IMAGE_SOURCE_TYPE.CLONE
        );

        if (cloneOption) {
          options.push({ ...cloneOption, disabled: true });
        }
      }

      return this.translateOptionLabels(options);
    },

    isCloneSecretRequired() {
      return (
        this.sourceType === BACKING_IMAGE_SOURCE_TYPE.CLONE &&
        [BACKING_IMAGE_ENCRYPTION_TYPE.ENCRYPT, BACKING_IMAGE_ENCRYPTION_TYPE.DECRYPT].includes(
          this.value?.spec?.sourceParameters?.encryption
        )
      );
    },

    fvExtraRules() {
      const requiredMsg = (key) => this.t('validation.required', { key });

      return {
        requiredIfDownload: (val) =>
          this.sourceType === BACKING_IMAGE_SOURCE_TYPE.DOWNLOAD && (!val || !val.toString().trim())
            ? requiredMsg('URL')
            : undefined,
        requiredIfVolume: (val) =>
          this.sourceType === BACKING_IMAGE_SOURCE_TYPE.EXPORT_FROM_VOLUME && !val
            ? requiredMsg('Volume Name')
            : undefined,
        requiredIfClone: (val) =>
          this.sourceType === BACKING_IMAGE_SOURCE_TYPE.CLONE && !val ? requiredMsg('Field') : undefined,
        requiredIfCloneWithSecret: (val) =>
          this.isCloneSecretRequired && (!val || !val.toString().trim()) ? requiredMsg('Field') : undefined,
        requiredIfUpload: (val) =>
          this.sourceType === BACKING_IMAGE_SOURCE_TYPE.UPLOAD && !val ? requiredMsg('File') : undefined,
        dataEngineEnabled: (val) => {
          if (val === 'v1' && !this.v1DataEngineEnabled) return 'v1 data engine is not enabled';
          if (val === 'v2' && !this.v2DataEngineEnabled) return 'v2 data engine is not enabled';

          return undefined;
        },
        requiredNumber: (val) => {
          if (val === undefined || val === null || val === '') return requiredMsg('Min Copies');
          if (Number.parseInt(val, 10) < 1) return 'Value must be greater than or equal to 1';

          return undefined;
        },
      };
    },

    sourceType() {
      return this.value?.spec?.sourceType;
    },

    exportTypes() {
      return this.translateOptionLabels(BACKING_IMAGE_EXPORT_TYPE_OPTIONS);
    },

    encryptionTypes() {
      return this.translateOptionLabels(BACKING_IMAGE_ENCRYPTION_TYPE_OPTIONS);
    },

    sourceBackingImageOptions() {
      const options = (this.allBackingImages || [])
        .filter((image) => {
          const diskMap = image.status?.diskFileStatusMap || {};
          const isReady = Object.values(diskMap).some((disk) => disk?.state === 'ready');

          return isReady;
        })
        .map((image) => image.metadata?.name)
        .filter(Boolean)
        .sort();

      const currentCloneSourceImage = this.value?.spec?.sourceParameters?.['backing-image'];

      if (currentCloneSourceImage && !options.includes(currentCloneSourceImage)) {
        options.unshift(currentCloneSourceImage);
      }

      return options;
    },

    fvFormIsValid() {
      return this.fvValidationErrors.length === 0;
    },
  },

  watch: {
    sourceType(neu) {
      if (neu === BACKING_IMAGE_SOURCE_TYPE.CLONE) {
        this.ensureCloneEncryptionDefault();
      }

      if (neu !== BACKING_IMAGE_SOURCE_TYPE.CLONE) {
        this.resetCloneSecretFields();
      }
    },

    'value.spec.sourceParameters.encryption'(neu) {
      if (this.sourceType === BACKING_IMAGE_SOURCE_TYPE.CLONE && neu === BACKING_IMAGE_ENCRYPTION_TYPE.IGNORE) {
        this.resetCloneSecretFields();
      }
    },

    'value.spec.dataEngine'(neu, old) {
      if (!this.isCreate || !neu || neu === old) {
        return;
      }

      const nextMinCopies = this.getDefaultMinCopiesByEngine(neu);

      this.value.spec.minNumberOfCopies = nextMinCopies;
    },
  },

  methods: {
    translateOptionLabels(options = []) {
      return options.map((option) => {
        const label = option.label || (option.labelKey ? this.t(option.labelKey) : option.value);

        return {
          ...option,
          label,
        };
      });
    },

    async save(buttonDone) {
      this.errors = this.fvValidationErrors;
      if (this.errors.length > 0) {
        buttonDone(false);

        return;
      }

      if (this.value?.spec?.minNumberOfCopies !== undefined) {
        this.value.spec.minNumberOfCopies = Number.parseInt(this.value.spec.minNumberOfCopies, 10);
      }

      this.sanitizeFinalizers();

      if (this.sourceType === BACKING_IMAGE_SOURCE_TYPE.UPLOAD) {
        try {
          await this.handleUploadSave();
          buttonDone(true);
          this.done();
        } catch (err) {
          this.errors = [err.message || err];
          buttonDone(false);
        }

        return;
      }

      try {
        await this.value.save();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = [err.message || err];
        buttonDone(false);
      }
    },

    async handleUploadSave() {
      // TODO: Implement Upload from local backend integration when extension supports backing image actions.
      // Expected flow:
      // 1) Create backing image resource
      // 2) Resolve upload action endpoint
      // 3) Upload selected file via chunk form data
      // 4) Handle rollback and progress states
      throw new Error('Upload from local is not implemented in this extension yet.');
    },

    syncSecretNamespace(name) {
      const match = this.secretOptions.find((secretOption) => secretOption.value === name);

      if (match && match.namespace) {
        this.value.spec.sourceParameters['secret-namespace'] = match.namespace;
      }
    },

    onFileSelected(file) {
      this.fileContainer = file;
    },

    sanitizeFinalizers() {
      const finalizers = this.value.metadata?.finalizers;

      if (!Array.isArray(finalizers) || finalizers.length === 0) {
        return;
      }

      this.value.metadata.finalizers = finalizers.filter((finalizer) => finalizer?.includes('/'));

      if (this.value.metadata.finalizers.length === 0) {
        delete this.value.metadata.finalizers;
      }
    },

    ensureCloneEncryptionDefault() {
      if (!this.value?.spec?.sourceParameters?.encryption) {
        this.value.spec.sourceParameters.encryption = this.encryptionTypes[0].value;
      }
    },

    resetCloneSecretFields() {
      this.value.spec.sourceParameters.secret = '';
      this.value.spec.sourceParameters['secret-namespace'] = '';
    },

    ensureResourceStructure() {
      if (!this.value.spec) this.value.spec = { sourceParameters: {} };
      if (!this.value.spec.sourceParameters) this.value.spec.sourceParameters = {};
      if (this.isCreate) {
        if (this.value.spec.sourceParameters.url === undefined) this.value.spec.sourceParameters.url = '';
        if (this.value.spec.minNumberOfCopies === undefined) this.value.spec.minNumberOfCopies = null;
      }
    },

    parseDefaultReplicaCount(value) {
      if (!value || typeof value !== 'string') {
        return null;
      }

      try {
        const parsed = JSON.parse(value);

        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {}

      return null;
    },

    getDefaultMinCopiesByEngine(engine) {
      const fromReplicaMap = Number.parseInt(this.defaultReplicaCountMap?.[engine], 10);

      if (!Number.isNaN(fromReplicaMap) && fromReplicaMap > 0) {
        return fromReplicaMap;
      }

      return this.defaultBackingImageMinCopies;
    },

    initDefaultValues({
      backingImageReplicaSetting,
      defaultReplicaCountSetting,
      v1DataEngineSetting,
      v2DataEngineSetting,
    }) {
      const defaultMinCopies = Number.parseInt(backingImageReplicaSetting?.value, 10) || 3;
      const defaultReplicaCountMap = this.parseDefaultReplicaCount(defaultReplicaCountSetting?.value);
      const v1Enabled = v1DataEngineSetting?.value === 'true';
      const v2Enabled = v2DataEngineSetting?.value === 'true';
      const initialEngine = v1Enabled ? 'v1' : v2Enabled ? 'v2' : 'v1';

      this.defaultBackingImageMinCopies = defaultMinCopies;
      this.defaultReplicaCountMap = defaultReplicaCountMap;
      this.v1DataEngineEnabled = v1Enabled;
      this.v2DataEngineEnabled = v2Enabled;

      this.value.spec.sourceType = BACKING_IMAGE_SOURCE_TYPE.DOWNLOAD;
      this.value.spec.dataEngine = initialEngine;
      this.value.spec.minNumberOfCopies = this.getDefaultMinCopiesByEngine(initialEngine);
      this.value.spec.sourceParameters['export-type'] = 'raw';
      this.value.spec.sourceParameters.encryption = this.encryptionTypes[0].value;
    },

    initCloneModeDefaults() {
      const currentCloneSourceImage =
        this.liveValue?.metadata?.name || this.initialValue?.metadata?.name || this.value?.metadata?.name;

      this.value.spec.sourceType = BACKING_IMAGE_SOURCE_TYPE.CLONE;
      this.value.spec.sourceParameters['backing-image'] =
        this.value.spec.sourceParameters['backing-image'] || currentCloneSourceImage || '';
      this.value.spec.sourceParameters.encryption =
        this.value.spec.sourceParameters.encryption || this.encryptionTypes[0].value;
      this.value.spec.sourceParameters.secret = this.value.spec.sourceParameters.secret || '';
      this.value.spec.sourceParameters['secret-namespace'] = this.value.spec.sourceParameters['secret-namespace'] || '';
    },

    transformVolumeOptions(volumes) {
      return (volumes || [])
        .filter(
          (volumeResource) => !volumeResource.metadata?.deletionTimestamp && volumeResource.status?.state !== 'faulty'
        )
        .map((volumeResource) => ({ label: volumeResource.metadata.name, value: volumeResource.metadata.name }))
        .sort((firstOption, secondOption) => firstOption.label.localeCompare(secondOption.label));
    },

    transformSecretOptions(secrets) {
      return (secrets || [])
        .filter((secretResource) => {
          const data = secretResource.data || secretResource.stringData || {};

          return Object.keys(data).some((keyName) => keyName.toUpperCase().includes('CRYPTO'));
        })
        .map((secretResource) => ({
          label: `${secretResource.metadata.namespace} / ${secretResource.metadata.name}`,
          value: secretResource.metadata.name,
          namespace: secretResource.metadata.namespace,
        }));
    },

    extractTagsFromNodes(nodes) {
      const nodeTags = new Set();
      const diskTags = new Set();

      (nodes || []).forEach((node) => {
        (node.spec?.tags || []).forEach((tag) => nodeTags.add(tag));
        Object.values(node.spec?.disks || {}).forEach((disk) => {
          (disk.tags || []).forEach((tag) => diskTags.add(tag));
        });
      });

      return {
        nodeTags: Array.from(nodeTags).map((tag) => ({ label: tag, value: tag })),
        diskTags: Array.from(diskTags).map((tag) => ({ label: tag, value: tag })),
      };
    },

    onError(error) {
      this.errors = Array.isArray(error) ? error : [error];
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <CruResource
    v-else
    :done-route="doneRoute"
    :mode="mode"
    :resource="value"
    :validation-passed="fvFormIsValid"
    :errors="fvUnreportedValidationErrors"
    @finish="save"
    @cancel="done"
    @error="onError"
  >
    <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

    <Tabbed side-tabs class="mt-20">
      <Tab name="basics" :label="t('longhorn.backingImage.tab.basics')">
        <div class="row mb-20">
          <div class="col span-12">
            <LabeledSelect
              v-model:value="value.spec.sourceType"
              :label="t('longhorn.backingImage.form.sourceType')"
              :options="sourceTypeOptions"
              :mode="mode"
              :disabled="!isCreate || isActionCloneMode"
              required
            />
          </div>
        </div>

        <template v-if="sourceType === 'export-from-volume'">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters['volume-name']"
                :label="t('longhorn.backingImage.form.volumeName')"
                :options="volumeNameOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.volume-name')"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters['export-type']"
                :label="t('longhorn.backingImage.form.exportedType')"
                :options="exportTypes"
                :mode="mode"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
          <div v-if="value?.spec?.sourceParameters?.encryption" class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters.encryption"
                :label="t('longhorn.backingImage.form.encryption')"
                :options="encryptionTypes"
                :mode="mode"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters.secret"
                :label="t('longhorn.backingImage.form.secret')"
                :options="secretOptions"
                :mode="mode"
                :disabled="!isCreate"
                searchable
                @update:value="syncSecretNamespace"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model:value="value.spec.sourceParameters['secret-namespace']"
                :label="t('longhorn.backingImage.form.secretNamespace')"
                :mode="mode"
                :disabled="!isCreate"
              />
            </div>
          </div>
        </template>

        <div v-else-if="sourceType === 'download'" class="row mb-20">
          <div class="col span-12">
            <LabeledInput
              v-model:value="value.spec.sourceParameters.url"
              :label="t('longhorn.backingImage.form.url')"
              placeholder="https://example.com/image.raw"
              :mode="mode"
              :rules="fvGetAndReportPathRules('spec.sourceParameters.url')"
              :disabled="!isCreate"
              required
            />
          </div>
        </div>

        <div v-else-if="sourceType === 'upload'" class="row mb-20">
          <div class="col span-12">
            <p class="mb-10">Upload File <span class="text-error">*</span></p>
            <FileSelector
              :label="t('longhorn.backingImage.form.selectFile')"
              :raw-data="true"
              accept=".raw,.img,.qcow2,.iso"
              class="btn role-secondary"
              :mode="mode"
              :disabled="!isCreate"
              @selected="onFileSelected"
            />
            <span v-if="fileContainer" class="ml-10 text-muted">{{ fileContainer.name }}</span>
            <div v-if="fvGetPathErrors(['fileContainer']).length" class="text-error mt-5">
              {{ fvGetPathErrors(['fileContainer'])[0] }}
            </div>
          </div>
        </div>

        <template v-else-if="sourceType === 'clone'">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters['backing-image']"
                :label="t('longhorn.backingImage.form.sourceImage')"
                :options="sourceBackingImageOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.backing-image')"
                :disabled="!isCreate || isActionCloneMode"
                required
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters.encryption"
                :label="t('longhorn.backingImage.form.encryption')"
                :options="encryptionTypes"
                :mode="mode"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters.secret"
                :label="t('longhorn.backingImage.form.secret')"
                :options="secretOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.secret')"
                :disabled="!isCreate"
                :required="isCloneSecretRequired"
                searchable
                @update:value="syncSecretNamespace"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model:value="value.spec.sourceParameters['secret-namespace']"
                :label="t('longhorn.backingImage.form.secretNamespace')"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.secret-namespace')"
                :disabled="!isCreate"
                :required="isCloneSecretRequired"
              />
            </div>
          </div>
        </template>

        <div v-if="['download', 'upload'].includes(sourceType)" class="row mb-20">
          <div class="col span-12">
            <LabeledInput
              v-model:value="value.spec.checksum"
              :label="t('longhorn.backingImage.form.expectedChecksum')"
              placeholder="SHA512 checksum"
              :mode="mode"
              :disabled="!isCreate"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              v-model:value="value.spec.minNumberOfCopies"
              type="number"
              :label="t('longhorn.backingImage.table.header.minNumberOfCopies')"
              :mode="mode"
              :rules="fvGetAndReportPathRules('spec.minNumberOfCopies')"
              required
              min="1"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="value.spec.dataEngine"
              :label="t('longhorn.volume.table.header.dataEngine')"
              :options="['v1', 'v2']"
              :mode="mode"
              required
              :disabled="!isCreate"
            />
          </div>
        </div>

        <div class="row">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="value.spec.nodeSelector"
              :label="t('longhorn.volume.form.nodeTag')"
              :options="nodeTagOptions"
              :mode="mode"
              multiple
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="value.spec.diskSelector"
              :label="t('longhorn.volume.form.diskTag')"
              :options="diskTagOptions"
              :mode="mode"
              multiple
            />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </CruResource>
</template>
