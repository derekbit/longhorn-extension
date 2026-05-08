<script setup>
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import { useI18n } from '@shell/composables/useI18n';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { formatSi } from '@shell/utils/units';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { getBackupTargetNameFromBackup, getBackupUrl, getBackupVolumeNameFromBackup } from '@longhorn/utils/backup';
import {
  collectNodeAndDiskTagOptions,
  getAccessModeOptions,
  getBackupBlockSizeOptions,
  getDefaultReplicaCount,
  getInitialDataEngine,
  getResourceName,
  mapToNameValueOptions,
  normalizeBackupBlockSize,
  parseBackupBlockSizeSetting,
  parseBooleanSetting,
} from '@longhorn/utils/volume';

const props = defineProps({
  resources: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const store = useStore();
const { t } = useI18n(store);

const formData = ref({
  name: '',
  size: '',
  dataEngine: 'v1',
  numberOfReplicas: 3,
  accessMode: 'rwo',
  backingImage: '',
  encrypted: false,
  nodeSelector: [],
  diskSelector: [],
  backupBlockSize: '0',
});

const nodeTags = ref([]);
const diskTags = ref([]);
const backingImages = ref([]);
const allBackupVolumes = ref([]);
const errors = ref([]);
const tagsLoading = ref(true);
const isSubmittingDisabled = ref(false);
const v1DataEngineEnabled = ref(true);
const v2DataEngineEnabled = ref(false);
const defaultReplicaSettings = ref({
  v1: 3,
  v2: 3,
});
const selectedBackup = ref(null);
const backupUrl = ref('');
const sourceSize = ref('');

const resource = computed(() => props.resources?.[0] || {});

const backupVolumeName = computed(() => {
  return resource.value?.metadata?.name || resource.value?.name || '';
});

const restoreVolumeName = computed(() => {
  return (
    resource.value?.volumeName ||
    resource.value?.spec?.volumeName ||
    resource.value?.status?.volumeName ||
    backupVolumeName.value.replace(/-[a-f0-9]{8}$/i, '')
  );
});

const backupTargetName = computed(() => {
  return (
    resource.value?.backupTargetName ||
    resource.value?.spec?.backupTargetName ||
    resource.value?.status?.backupTargetName ||
    resource.value?.metadata?.labels?.['backup-target'] ||
    ''
  );
});

const lastBackupName = computed(() => {
  return resource.value?.status?.lastBackupName || '';
});

const showWarning = computed(() => {
  return allBackupVolumes.value?.some((bv) => getBackupVolumeName(bv) === formData.value.name);
});

const warningMessage = computed(() => {
  return t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.warningMessage', {
    name: formData.value.name,
  });
});

const hasBackingImage = computed(() => {
  return !!String(formData.value.backingImage || '').trim();
});

const accessModeOptions = getAccessModeOptions(t);

const dataEngineOptions = computed(() => [
  {
    label: t('longhorn.backupVolume.dialog.restoreBackup.options.dataEngine.v1'),
    value: 'v1',
    disabled: !v1DataEngineEnabled.value,
  },
  {
    label: t('longhorn.backupVolume.dialog.restoreBackup.options.dataEngine.v2'),
    value: 'v2',
    disabled: !v2DataEngineEnabled.value,
  },
]);

const backupBlockSizeOptions = getBackupBlockSizeOptions(t);

watch(
  () => formData.value.dataEngine,
  (engine) => {
    formData.value.numberOfReplicas = getDefaultReplicaCount(defaultReplicaSettings.value, engine);
  }
);

watch(
  () => props.resources,
  () => {
    initDialog();
  },
  { immediate: true }
);

function getBackupVolumeName(backupVolume) {
  return getResourceName(backupVolume);
}

function formatBytesToDisplay(value) {
  const num = Number(value);

  if (!Number.isFinite(num) || num <= 0) {
    return '';
  }

  return formatSi(num, {
    suffix: 'iB',
    firstSpread: 1024,
    increment: 1024,
  });
}

async function loadSettingsDefaults(inStore) {
  const findSetting = (id) =>
    store.dispatch(`${inStore}/find`, {
      type: LONGHORN_RESOURCES.SETTINGS,
      id,
    });

  try {
    const [replicaSetting, v1EngineSetting, v2EngineSetting] = await Promise.all([
      findSetting(LONGHORN_SETTINGS.DEFAULT_REPLICA_COUNT),
      findSetting(LONGHORN_SETTINGS.V1_DATA_ENGINE),
      findSetting(LONGHORN_SETTINGS.V2_DATA_ENGINE),
    ]);

    v1DataEngineEnabled.value = parseBooleanSetting(v1EngineSetting?.value, true);
    v2DataEngineEnabled.value = parseBooleanSetting(v2EngineSetting?.value, false);

    if (replicaSetting?.value) {
      try {
        const parsedSettings = JSON.parse(replicaSetting.value);

        defaultReplicaSettings.value = {
          v1: Number.parseInt(parsedSettings?.v1, 10) || 3,
          v2: Number.parseInt(parsedSettings?.v2, 10) || 3,
        };
      } catch {
        const replicaCount = Number.parseInt(replicaSetting.value, 10) || 3;

        defaultReplicaSettings.value = {
          v1: replicaCount,
          v2: replicaCount,
        };
      }
    }
  } catch {
    v1DataEngineEnabled.value = true;
    v2DataEngineEnabled.value = false;
    defaultReplicaSettings.value = { v1: 3, v2: 3 };
  }
}

async function fetchTags(inStore) {
  try {
    const nodes = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.NODES });
    const { nodeTags: nodeTagOptions, diskTags: diskTagOptions } = collectNodeAndDiskTagOptions(nodes);

    nodeTags.value = nodeTagOptions;
    diskTags.value = diskTagOptions;
  } catch {
    nodeTags.value = [];
    diskTags.value = [];
  } finally {
    tagsLoading.value = false;
  }
}

async function fetchBackingImages(inStore) {
  try {
    const images = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKING_IMAGES });

    backingImages.value = mapToNameValueOptions(images);
  } catch {
    backingImages.value = [];
  }
}

async function fetchBackupVolumes(inStore) {
  try {
    const volumes = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUP_VOLUMES });

    allBackupVolumes.value = Array.isArray(volumes) ? volumes : [];
  } catch {
    allBackupVolumes.value = [];
  }
}

async function fetchLatestBackup(inStore) {
  selectedBackup.value = null;
  backupUrl.value = '';

  if (!lastBackupName.value) {
    errors.value = [t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.errors.noLatestBackup')];
    isSubmittingDisabled.value = true;

    return;
  }

  try {
    const backup = await store.dispatch(`${inStore}/find`, {
      type: LONGHORN_RESOURCES.BACKUPS,
      id: lastBackupName.value,
    });

    selectedBackup.value = backup || null;
  } catch {
    selectedBackup.value = null;
  }

  if (!selectedBackup.value) {
    try {
      const backups = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUPS });
      const fallback = (backups || []).find((backup) => {
        const backupName = backup?.metadata?.name || backup?.name || backup?.id;

        if (backupName !== lastBackupName.value) {
          return false;
        }

        const sameVolume = getBackupVolumeNameFromBackup(backup) === restoreVolumeName.value;
        const sameTarget = !backupTargetName.value || getBackupTargetNameFromBackup(backup) === backupTargetName.value;

        return sameVolume && sameTarget;
      });

      selectedBackup.value = fallback || null;
    } catch {
      selectedBackup.value = null;
    }
  }

  backupUrl.value = getBackupUrl(selectedBackup.value);

  if (!backupUrl.value) {
    errors.value = [t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.errors.noLatestBackupUrl')];
    isSubmittingDisabled.value = true;

    return;
  }

  isSubmittingDisabled.value = false;
}

async function initDialog() {
  errors.value = [];
  tagsLoading.value = true;
  isSubmittingDisabled.value = false;

  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    errors.value = [t('longhorn.backupVolume.dialog.restoreBackup.errors.storeUnavailable')];
    tagsLoading.value = false;
    isSubmittingDisabled.value = true;

    return;
  }

  await loadSettingsDefaults(inStore);
  await Promise.all([
    fetchTags(inStore),
    fetchBackingImages(inStore),
    fetchBackupVolumes(inStore),
    fetchLatestBackup(inStore),
  ]);

  const initialDataEngine = getInitialDataEngine(v1DataEngineEnabled.value, v2DataEngineEnabled.value);
  const initialReplicas = getDefaultReplicaCount(defaultReplicaSettings.value, initialDataEngine);

  const sizeInBytes =
    selectedBackup.value?.status?.volumeSize ||
    selectedBackup.value?.status?.size ||
    resource.value?.status?.size ||
    resource.value?.spec?.size ||
    '';
  const backingImageName =
    selectedBackup.value?.status?.volumeBackingImageName ||
    selectedBackup.value?.backingImage ||
    resource.value?.status?.backingImageName ||
    '';
  const blockSize =
    selectedBackup.value?.status?.blockSize ??
    selectedBackup.value?.spec?.backupBlockSize ??
    selectedBackup.value?.backupBlockSize;
  const initialBlockSize = normalizeBackupBlockSize(blockSize) || parseBackupBlockSizeSetting(blockSize);

  sourceSize.value = String(sizeInBytes || '').trim();

  if (!sourceSize.value) {
    errors.value = [t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.errors.noLatestBackupSize')];
    isSubmittingDisabled.value = true;
  }

  formData.value = {
    name: backupVolumeName.value || restoreVolumeName.value,
    size: formatBytesToDisplay(sizeInBytes),
    dataEngine: initialDataEngine,
    numberOfReplicas: initialReplicas,
    accessMode: selectedBackup.value?.status?.volumeAccessMode || selectedBackup.value?.accessMode || 'rwo',
    backingImage: backingImageName,
    encrypted: false,
    nodeSelector: [],
    diskSelector: [],
    backupBlockSize: initialBlockSize,
  };
}

function close() {
  emit('close');
}

async function create(buttonDone) {
  errors.value = [];

  const trimmedName = (formData.value.name || '').trim();

  if (!trimmedName) {
    errors.value.push(t('longhorn.backupVolume.dialog.restoreBackup.errors.volumeNameRequired'));
    buttonDone(false);

    return;
  }

  if (formData.value.dataEngine === 'v1' && !v1DataEngineEnabled.value) {
    errors.value.push(t('longhorn.backupVolume.dialog.restoreBackup.errors.v1DataEngineDisabled'));
    buttonDone(false);

    return;
  }

  if (formData.value.dataEngine === 'v2' && !v2DataEngineEnabled.value) {
    errors.value.push(t('longhorn.backupVolume.dialog.restoreBackup.errors.v2DataEngineDisabled'));
    buttonDone(false);

    return;
  }

  if (!backupUrl.value) {
    errors.value.push(t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.errors.noLatestBackupUrl'));
    buttonDone(false);

    return;
  }

  if (!sourceSize.value) {
    errors.value.push(t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.errors.noLatestBackupSize'));
    buttonDone(false);

    return;
  }

  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    errors.value.push(t('longhorn.backupVolume.dialog.restoreBackup.errors.storeUnavailable'));
    buttonDone(false);

    return;
  }

  const spec = {
    size: String(
      sourceSize.value ||
        selectedBackup.value?.status?.volumeSize ||
        selectedBackup.value?.status?.size ||
        resource.value?.status?.size ||
        resource.value?.spec?.size ||
        ''
    ),
    fromBackup: backupUrl.value,
    backupTargetName: backupTargetName.value || 'default',
    Standby: true,
    frontend: '',
    dataEngine: formData.value.dataEngine,
    numberOfReplicas: formData.value.numberOfReplicas,
    accessMode: formData.value.accessMode,
    encrypted: formData.value.encrypted,
    nodeSelector: formData.value.nodeSelector,
    diskSelector: formData.value.diskSelector,
    backupBlockSize: formData.value.backupBlockSize,
  };

  if (formData.value.backingImage) {
    spec.backingImage = formData.value.backingImage;
  }

  try {
    const drVolume = await store.dispatch(`${inStore}/create`, {
      type: LONGHORN_RESOURCES.VOLUMES,
      metadata: {
        name: trimmedName,
        namespace: LONGHORN_NAMESPACE,
      },
      spec,
    });

    await drVolume.save();

    buttonDone(true);
    close();
  } catch (error) {
    errors.value = exceptionToErrorsArray(error);
    buttonDone(false);
  }
}
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.backupVolume.dialog.createDisasterRecoveryVolume.title') }}</h4>
    </template>

    <template #body>
      <Banner v-if="showWarning" color="info" :label="warningMessage" class="mb-20" />

      <div class="form-field">
        <LabeledInput v-model:value="formData.name" :label="t('generic.name')" :required="true" />
      </div>

      <div class="form-field">
        <LabeledInput :value="formData.size" :label="t('longhorn.volume.table.header.size')" disabled />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.dataEngine"
          :label="t('longhorn.volume.table.header.dataEngine')"
          :options="dataEngineOptions"
          :required="true"
        />
      </div>

      <div class="form-field">
        <LabeledInput
          v-model:value.number="formData.numberOfReplicas"
          type="number"
          :label="t('longhorn.volume.form.numberOfReplicas')"
          :min="1"
          :required="true"
        />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.accessMode"
          :label="t('longhorn.volume.form.accessMode')"
          :options="accessModeOptions"
        />
      </div>

      <div v-if="hasBackingImage" class="form-field">
        <LabeledSelect
          v-model:value="formData.backingImage"
          :label="t('longhorn.volume.form.backingImage')"
          :options="backingImages"
          :clearable="true"
          disabled
        />
      </div>

      <div class="form-field">
        <Checkbox v-model:value="formData.encrypted" :label="t('longhorn.volume.form.encrypted')" />
      </div>

      <div class="form-field">
        <Loading v-if="tagsLoading" class="mb-10" />
        <LabeledSelect
          v-model:value="formData.nodeSelector"
          :label="t('longhorn.volume.form.nodeTag')"
          :options="nodeTags"
          :multiple="true"
          :taggable="true"
          :disabled="tagsLoading"
        />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.diskSelector"
          :label="t('longhorn.volume.form.diskTag')"
          :options="diskTags"
          :multiple="true"
          :taggable="true"
          :disabled="tagsLoading"
        />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.backupBlockSize"
          :label="t('longhorn.backupVolume.dialog.restoreBackup.form.backupBlockSize')"
          :options="backupBlockSizeOptions"
          disabled
        />
      </div>

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">{{ t('generic.cancel') }}</button>
        <AsyncButton
          mode="create"
          type="submit"
          class="btn bg-primary"
          :disabled="isSubmittingDisabled"
          @click="create"
        />
      </div>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.form-field {
  margin-bottom: 20px;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
