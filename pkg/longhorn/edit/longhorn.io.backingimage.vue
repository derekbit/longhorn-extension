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
import FormValidation from '@shell/mixins/form-validation';
import axios from 'axios';

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

    const [replicaSetting, allSecrets, allNodes, allVolumes, allBackingImages] = await Promise.all([
      this.$store
        .dispatch(`${store}/find`, {
          type: LONGHORN_RESOURCES.SETTINGS,
          id: LONGHORN_SETTINGS.DEFAULT_MIN_NUMBER_OF_BACKING_IMAGE_COPIES,
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
      this.initDefaultValues(replicaSetting);
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

      fvFormRuleSets: [
        { path: 'spec.sourceParameters.url', rules: ['requiredIfDownload'] },
        { path: 'spec.sourceParameters.volume-name', rules: ['requiredIfVolume'] },
        { path: 'spec.sourceParameters.backing-image', rules: ['requiredIfClone'] },
        { path: 'spec.sourceParameters.secret', rules: ['requiredIfClone'] },
        { path: 'spec.sourceParameters.secret-namespace', rules: ['requiredIfClone'] },
        { path: 'spec.minNumberOfCopies', rules: ['requiredNumber'] },
        { path: 'fileContainer', rules: ['requiredIfUpload', 'sectorAligned'], rootObject: this },
      ],

      sourceTypes: [
        { label: 'Download From URL', value: 'download' },
        { label: 'Upload From Local', value: 'upload' },
        { label: 'Export From a Longhorn Volume', value: 'export-from-volume' },
        { label: 'Clone From Existing Backing Image', value: 'clone' },
      ],
      exportTypes: [
        { label: 'raw', value: 'raw' },
        { label: 'qcow2', value: 'qcow2' },
      ],
      encryptionTypes: [
        { label: 'encrypt', value: 'encrypt' },
        { label: 'decrypt', value: 'decrypt' },
        { label: 'ignore', value: 'ignore' },
      ],
    };
  },

  computed: {
    fvExtraRules() {
      const requiredMsg = (key) => this.t('validation.required', { key });

      return {
        requiredIfDownload: (val) =>
          this.sourceType === 'download' && (!val || !val.toString().trim()) ? requiredMsg('URL') : undefined,
        requiredIfVolume: (val) =>
          this.sourceType === 'export-from-volume' && !val ? requiredMsg('Volume Name') : undefined,
        requiredIfClone: (val) => (this.sourceType === 'clone' && !val ? requiredMsg('Field') : undefined),
        requiredIfUpload: (val) => (this.sourceType === 'upload' && !val ? requiredMsg('File') : undefined),
        requiredNumber: (val) => {
          if (val === undefined || val === null || val === '') return requiredMsg('Min Copies');
          if (parseInt(val) < 1) return 'Value must be greater than or equal to 1';

          return undefined;
        },
        sectorAligned: (val) => {
          if (this.sourceType === 'upload' && val && val.size % 512 !== 0) {
            return 'File size must be a multiple of 512 bytes';
          }
        },
      };
    },

    sourceType() {
      return this.value?.spec?.sourceType;
    },

    sourceBackingImageOptions() {
      return (this.allBackingImages || [])
        .filter((image) => {
          const diskMap = image.status?.diskFileStatusMap || {};
          const isReady = Object.values(diskMap).some((disk) => disk?.state === 'ready');
          const parameters = image.spec?.sourceParameters || {};
          const isAlreadyEncrypted = parameters.encryption === 'encrypt' || !!parameters.secret;

          return isReady && !isAlreadyEncrypted;
        })
        .map((image) => image.metadata?.name)
        .sort();
    },

    fvFormIsValid() {
      const baseValid = this.fvValidationErrors.length === 0;

      if (this.sourceType === 'upload') {
        return baseValid && !!this.fileContainer && this.fileContainer.size % 512 === 0;
      }

      return baseValid;
    },
  },

  watch: {
    sourceType(neu) {
      if (neu !== 'upload') {
        this.fileContainer = null;
      }
    },
  },

  methods: {
    async save(buttonDone) {
      this.errors = this.fvValidationErrors;
      if (this.errors.length > 0) {
        buttonDone(false);

        return;
      }

      if (this.value?.spec?.minNumberOfCopies !== undefined) {
        this.value.spec.minNumberOfCopies = parseInt(this.value.spec.minNumberOfCopies, 10);
      }

      if (this.value.metadata?.finalizers) {
        this.value.metadata.finalizers = this.value.metadata.finalizers.filter((f) => f !== 'longhorn.io');
        if (this.value.metadata.finalizers.length === 0) delete this.value.metadata.finalizers;
      }

      try {
        if (this.sourceType === 'upload') {
          await this.handleUploadSave();
        } else {
          await this.value.save();
        }
        this.done();
      } catch (err) {
        this.errors = [err.message || err];
        buttonDone(false);
      }
    },

    async handleUploadSave() {
      const resource = await this.value.save();
      const name = resource.metadata.name;
      const namespace = resource.metadata.namespace;

      let uploadUrl = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 20;

      while (!uploadUrl && attempts < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const ds = await this.$store.dispatch('cluster/find', {
            type: 'longhorn.io.backingimagedatasource',
            id: `${namespace}/${name}`,
          });

          uploadUrl = ds?.status?.uploadURL;
        } catch (e) {}
        attempts++;
      }

      if (!uploadUrl) throw new Error('Timeout: uploadURL did not appear in DataSource.');
      await this.uploadFile(uploadUrl, this.fileContainer);
    },

    async uploadFile(url, file) {
      try {
        await axios.put(url, file, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      } catch (error) {
        const msg = error.response?.data || error.message || error;

        throw new Error(`Upload failed: ${msg}`);
      }
    },

    syncSecretNamespace(name) {
      const match = this.secretOptions.find((o) => o.value === name);

      if (match && match.namespace) {
        this.value.spec.sourceParameters['secret-namespace'] = match.namespace;
      }
    },

    onFileSelected(file) {
      this.fileContainer = file;
    },

    ensureResourceStructure() {
      if (!this.value.spec) this.value.spec = { sourceParameters: {} };
      if (!this.value.spec.sourceParameters) this.value.spec.sourceParameters = {};
      if (this.isCreate) {
        if (this.value.spec.sourceParameters.url === undefined) this.value.spec.sourceParameters.url = '';
        if (this.value.spec.minNumberOfCopies === undefined) this.value.spec.minNumberOfCopies = null;
      }
    },

    initDefaultValues(replicaSetting) {
      const defaultMinCopies = parseInt(replicaSetting?.value, 10) || 3;

      this.value.spec.sourceType = 'download';
      this.value.spec.dataEngine = 'v1';
      this.value.spec.minNumberOfCopies = defaultMinCopies;
      this.value.spec.sourceParameters['export-type'] = 'raw';
      this.value.spec.sourceParameters.encryption = this.encryptionTypes[0].value;
    },

    transformVolumeOptions(volumes) {
      return (volumes || [])
        .filter((v) => !v.metadata?.deletionTimestamp && v.status?.state !== 'faulty')
        .map((v) => ({ label: v.metadata.name, value: v.metadata.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },

    transformSecretOptions(secrets) {
      return (secrets || [])
        .filter((s) => {
          const data = s.data || s.stringData || {};

          return Object.keys(data).some((k) => k.toUpperCase().includes('CRYPTO'));
        })
        .map((s) => ({
          label: `${s.metadata.namespace} / ${s.metadata.name}`,
          value: s.metadata.name,
          namespace: s.metadata.namespace,
        }));
    },

    extractTagsFromNodes(nodes) {
      const nodeTags = new Set();
      const diskTags = new Set();

      (nodes || []).forEach((node) => {
        (node.spec?.tags || []).forEach((t) => nodeTags.add(t));
        Object.values(node.spec?.disks || {}).forEach((disk) => {
          (disk.tags || []).forEach((t) => diskTags.add(t));
        });
      });

      return {
        nodeTags: Array.from(nodeTags).map((t) => ({ label: t, value: t })),
        diskTags: Array.from(diskTags).map((t) => ({ label: t, value: t })),
      };
    },

    onError(e) {
      this.errors = Array.isArray(e) ? e : [e];
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
      <Tab name="basics" label="Basics">
        <div class="row mb-20">
          <div class="col span-12">
            <LabeledSelect
              v-model:value="value.spec.sourceType"
              label="Source Type"
              :options="sourceTypes"
              :mode="mode"
              :disabled="!isCreate"
              required
            />
          </div>
        </div>

        <template v-if="sourceType === 'export-from-volume'">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters['volume-name']"
                label="Volume Name"
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
                label="Exported Type"
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
                label="Encryption"
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
                label="Secret"
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
                label="Secret Namespace"
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
              label="URL"
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
              label="Select File"
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
                label="Source Image"
                :options="sourceBackingImageOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.backing-image')"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
          <div v-if="value?.spec?.sourceParameters?.encryption" class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                v-model:value="value.spec.sourceParameters.encryption"
                label="Encryption"
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
                label="Secret"
                :options="secretOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.secret')"
                :disabled="!isCreate"
                required
                searchable
                @update:value="syncSecretNamespace"
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-model:value="value.spec.sourceParameters['secret-namespace']"
                label="Secret Namespace"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.sourceParameters.secret-namespace')"
                :disabled="!isCreate"
                required
              />
            </div>
          </div>
        </template>

        <div v-if="['download', 'upload'].includes(sourceType)" class="row mb-20">
          <div class="col span-12">
            <LabeledInput
              v-model:value="value.spec.checksum"
              label="Expected Checksum"
              placeholder="SHA512 checksum"
              :mode="mode"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              v-model:value="value.spec.minNumberOfCopies"
              type="number"
              label="Min Copies"
              :mode="mode"
              :rules="fvGetAndReportPathRules('spec.minNumberOfCopies')"
              required
              min="1"
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              v-model:value="value.spec.dataEngine"
              label="Data Engine"
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

<style lang="scss" scoped></style>
