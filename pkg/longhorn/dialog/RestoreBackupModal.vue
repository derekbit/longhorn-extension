<script setup>
import { ref, computed, watch } from 'vue';
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
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
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
  backup: {
    type: Object,
    required: true,
  },
  backupVolumes: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const store = useStore();
const { t } = useI18n(store);

const formData = ref({
  name: '',
  usePreviousName: false,
  dataEngine: 'v1',
  numberOfReplicas: 3,
  accessMode: 'rwo',
  backingImage: '',
  encrypted: false,
  restoreVolumeRecurringJob: 'ignored',
  nodeSelector: [],
  diskSelector: [],
  backupBlockSize: '0',
});

const nodeTags = ref([]);
const diskTags = ref([]);
const backingImages = ref([]);
const errors = ref([]);
const tagsLoading = ref(true);
const v1DataEngineEnabled = ref(true);
const v2DataEngineEnabled = ref(false);
const defaultReplicaSettings = ref({
  v1: 3,
  v2: 3,
});
const defaultRestoreVolumeRecurringJob = ref('ignored');
const defaultBackupBlockSize = ref('0');

const restoreBackupName = computed(() => {
  return props.backup?.name || props.backup?.id || props.backup?.metadata?.name || '';
});
const restoreVolumeName = computed(() => {
  return (
    props.backup?.volumeName ||
    props.backup?.status?.volumeName ||
    props.backup?.spec?.volumeName ||
    props.backup?.metadata?.labels?.['backup-volume'] ||
    ''
  );
});
const restoreBackupUrl = computed(() => props.backup?.url || props.backup?.status?.url || '');

function getBackupVolumeName(backupVolume) {
  return getResourceName(backupVolume);
}

const showWarning = computed(() => {
  return props.backupVolumes?.some((bv) => getBackupVolumeName(bv) === formData.value.name);
});

const warningMessage = computed(() => {
  return t('longhorn.backupVolume.dialog.restoreBackup.warningMessage', {
    name: formData.value.name,
  });
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

const recurringJobOptions = [
  { label: t('longhorn.backupVolume.dialog.restoreBackup.options.recurringJob.enabled'), value: 'enabled' },
  { label: t('longhorn.backupVolume.dialog.restoreBackup.options.recurringJob.disabled'), value: 'disabled' },
  { label: t('longhorn.backupVolume.dialog.restoreBackup.options.recurringJob.ignored'), value: 'ignored' },
];

const backupBlockSizeOptions = getBackupBlockSizeOptions(t);

watch(
  () => props.backup,
  (newBackup) => {
    if (newBackup) {
      initForm();
    }
  },
  { immediate: true }
);

watch(
  () => formData.value.usePreviousName,
  (checked) => {
    if (checked && restoreVolumeName.value) {
      formData.value.name = restoreVolumeName.value;
    } else if (!checked && formData.value.name === restoreVolumeName.value) {
      formData.value.name = restoreBackupName.value;
    }
  }
);

watch(
  () => formData.value.dataEngine,
  (engine) => {
    formData.value.numberOfReplicas = getDefaultReplicaCount(defaultReplicaSettings.value, engine);
  }
);

async function loadSettingsDefaults() {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    return;
  }

  const findSetting = (id) =>
    store.dispatch(`${inStore}/find`, {
      type: LONGHORN_RESOURCES.SETTINGS,
      id,
    });

  try {
    const [replicaSetting, v1EngineSetting, v2EngineSetting, recurringJobSetting, backupBlockSizeSetting] =
      await Promise.all([
        findSetting(LONGHORN_SETTINGS.DEFAULT_REPLICA_COUNT),
        findSetting(LONGHORN_SETTINGS.V1_DATA_ENGINE),
        findSetting(LONGHORN_SETTINGS.V2_DATA_ENGINE),
        findSetting(LONGHORN_SETTINGS.RESTORE_VOLUME_RECURRING_JOBS),
        findSetting(LONGHORN_SETTINGS.DEFAULT_BACKUP_BLOCK_SIZE),
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

    if (recurringJobSetting?.value === undefined || recurringJobSetting?.value === null) {
      defaultRestoreVolumeRecurringJob.value = 'ignored';
    } else {
      defaultRestoreVolumeRecurringJob.value = parseBooleanSetting(recurringJobSetting.value, false)
        ? 'enabled'
        : 'disabled';
    }

    defaultBackupBlockSize.value = parseBackupBlockSizeSetting(backupBlockSizeSetting?.value);
  } catch {
    v1DataEngineEnabled.value = true;
    v2DataEngineEnabled.value = false;
    defaultReplicaSettings.value = { v1: 3, v2: 3 };
    defaultRestoreVolumeRecurringJob.value = 'ignored';
    defaultBackupBlockSize.value = '0';
  }
}

async function initForm() {
  const backup = props.backup;

  await loadSettingsDefaults();

  const initialDataEngine = getInitialDataEngine(v1DataEngineEnabled.value, v2DataEngineEnabled.value);
  const initialReplicas = getDefaultReplicaCount(defaultReplicaSettings.value, initialDataEngine);
  const backupBlockSize =
    backup?.blockSize ?? backup?.status?.blockSize ?? backup?.spec?.backupBlockSize ?? backup?.backupBlockSize;
  const normalizedBackupBlockSize = normalizeBackupBlockSize(backupBlockSize);
  const initialBlockSize = normalizedBackupBlockSize || defaultBackupBlockSize.value;

  formData.value = {
    name: restoreBackupName.value,
    usePreviousName: false,
    dataEngine: initialDataEngine,
    numberOfReplicas: initialReplicas,
    accessMode: backup?.accessMode || 'rwo',
    backingImage: backup?.backingImage || '',
    encrypted: false,
    restoreVolumeRecurringJob: defaultRestoreVolumeRecurringJob.value,
    nodeSelector: [],
    diskSelector: [],
    backupBlockSize: initialBlockSize,
  };

  errors.value = [];
  fetchTags();
  fetchBackingImages();
}

async function fetchTags() {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    tagsLoading.value = false;

    return;
  }

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

async function fetchBackingImages() {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    return;
  }

  try {
    const images = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKING_IMAGES });

    backingImages.value = mapToNameValueOptions(images);
  } catch {
    backingImages.value = [];
  }
}

function close() {
  emit('close');
}

async function restore(buttonDone) {
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

  const targetBackupVolume = props.backupVolumes.find((bv) => bv.volumeName === props.backup?.volumeName) || {};
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    errors.value.push(t('longhorn.backupVolume.dialog.restoreBackup.errors.storeUnavailable'));
    buttonDone(false);

    return;
  }

  const { usePreviousName, ...restoreFields } = formData.value;
  const spec = {
    ...restoreFields,
    fromBackup: restoreBackupUrl.value,
    backupTargetName: targetBackupVolume?.backupTargetName || '',
    staleReplicaTimeout: 20,
  };

  if (!spec.backingImage) {
    delete spec.backingImage;
  }

  try {
    const restoringVolume = await store.dispatch(`${inStore}/create`, {
      type: LONGHORN_RESOURCES.VOLUMES,
      metadata: {
        name: trimmedName,
        namespace: LONGHORN_NAMESPACE,
      },
      spec,
    });

    await restoringVolume.save();

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
      <h4>{{ t('longhorn.backupVolume.dialog.restoreBackup.title', { name: restoreBackupName }) }}</h4>
    </template>

    <template #body>
      <Banner v-if="showWarning" color="warning" :label="warningMessage" class="mb-20" />

      <div class="form-field">
        <LabeledInput v-model:value="formData.name" :label="t('generic.name')" :required="true" />
      </div>

      <div class="form-field">
        <Checkbox
          v-model:value="formData.usePreviousName"
          :label="t('longhorn.backupVolume.dialog.restoreBackup.form.usePreviousName')"
          :disabled="!restoreVolumeName"
        />
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

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.backingImage"
          :label="t('longhorn.volume.form.backingImage')"
          :options="backingImages"
          :clearable="true"
          :disabled="true"
        />
      </div>

      <div class="form-field">
        <Checkbox v-model:value="formData.encrypted" :label="t('longhorn.volume.form.encrypted')" />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="formData.restoreVolumeRecurringJob"
          :label="t('longhorn.backupVolume.dialog.restoreBackup.form.restoreVolumeRecurringJob')"
          :options="recurringJobOptions"
        />
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
        />
      </div>

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">{{ t('generic.cancel') }}</button>
        <AsyncButton mode="restore" type="submit" class="btn bg-primary" @click="restore" />
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
