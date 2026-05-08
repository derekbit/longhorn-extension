<script setup>
import { computed, onMounted, ref } from 'vue';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { Banner } from '@components/Banner';
import { Checkbox } from '@components/Form/Checkbox';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { useI18n } from '@shell/composables/useI18n';
import { useStore } from 'vuex';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { getBackupTargetNameFromBackup, getBackupUrl, getBackupVolumeNameFromBackup } from '@longhorn/utils/backup';

const props = defineProps({
  resources: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const store = useStore();
const { t } = useI18n(store);

const volume = computed(() => props.resources?.[0]);
const errors = ref([]);

const defaultPVName = computed(() => volume.value?.kubernetesStatus?.pvName || volume.value?.name || '');
const defaultPVCName = computed(() => volume.value?.kubernetesStatus?.pvcName || volume.value?.name || '');
const previousNamespace = computed(() =>
  volume.value?.kubernetesStatus?.lastPVCRefAt ? volume.value?.kubernetesStatus?.namespace || '' : ''
);

const pvNameDisabled = computed(() => !!volume.value?.kubernetesStatus?.pvName);
const hasPreviousPVC = computed(() => !!volume.value?.kubernetesStatus?.lastPVCRefAt);

const createPVC = ref(true);
const previousChecked = ref(hasPreviousPVC.value);
const pvName = ref(defaultPVName.value);
const pvcName = ref(defaultPVCName.value);
const namespace = ref(previousChecked.value ? previousNamespace.value : '');
const fsType = ref('ext4');
const storageClassName = ref('');
const secretNamespace = ref('');
const secretName = ref('');

const fsTypeOptions = [
  { label: 'Ext4', value: 'ext4' },
  { label: 'XFS', value: 'xfs' },
];

const isEncrypted = computed(() => !!volume.value?.spec?.encrypted);
const accessMode = computed(() => volume.value?.spec?.accessMode || 'rwo');
const createPVCDisabled = computed(() => !createPVC.value);

const accessModeOptions = [
  { label: 'ReadWriteOnce', value: 'rwo' },
  { label: 'ReadWriteOncePod', value: 'rwop' },
  { label: 'ReadWriteMany', value: 'rwx' },
];

async function loadDefaultStorageClassName() {
  if (storageClassName.value) {
    return;
  }

  const inStore = store.getters['currentProduct']?.inStore || 'cluster';
  const fromBackup = volume.value?.spec?.fromBackup || '';
  const volumeLabels = volume.value?.labels || volume.value?.metadata?.labels || {};
  const backupTargetName = volumeLabels['backup-target'] || '';

  try {
    if (fromBackup) {
      const [backups, backupVolumes] = await Promise.all([
        store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUPS }),
        store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUP_VOLUMES }),
      ]);

      const matchedBackup = (backups || []).find((backup) => getBackupUrl(backup) === fromBackup);
      const matchedBackupVolumeName = getBackupVolumeNameFromBackup(matchedBackup);
      const matchedBackupTargetName = getBackupTargetNameFromBackup(matchedBackup) || backupTargetName;

      const matchedBackupVolume = (backupVolumes || []).find((backupVolume) => {
        const sameVolume = backupVolume?.volumeName === matchedBackupVolumeName;
        const sameTarget = !matchedBackupTargetName || backupVolume?.backupTargetName === matchedBackupTargetName;

        return sameVolume && sameTarget;
      });

      const restoredStorageClassName =
        matchedBackupVolume?.status?.storageClassName || matchedBackupVolume?.spec?.storageClassName || '';

      if (restoredStorageClassName) {
        storageClassName.value = restoredStorageClassName;

        return;
      }
    }

    const setting = await store.dispatch(`${inStore}/find`, {
      type: LONGHORN_RESOURCES.SETTINGS,
      id: LONGHORN_SETTINGS.DEFAULT_LONGHORN_STATIC_STORAGE_CLASS,
    });

    storageClassName.value = setting?.value || '';
  } catch {
    // Leave the field empty and let the backend apply the same fallback chain.
  }
}

function onCreatePVCChange(checked) {
  createPVC.value = checked;

  if (!checked) {
    previousChecked.value = false;
    namespace.value = '';
    pvcName.value = '';

    return;
  }

  pvcName.value = defaultPVCName.value;
  namespace.value = '';
}

function onPreviousPVCChange(checked) {
  previousChecked.value = checked;

  if (checked && !createPVCDisabled.value) {
    namespace.value = previousNamespace.value;
    pvcName.value = volume.value?.kubernetesStatus?.pvcName || defaultPVCName.value;

    return;
  }

  namespace.value = '';
  pvcName.value = '';
}

function close() {
  emit('close');
}

onMounted(() => {
  loadDefaultStorageClassName();
});

function submit(buttonDone) {
  errors.value = [];

  if (!pvNameDisabled.value && !pvName.value.trim()) {
    errors.value = [t('longhorn.volume.dialog.pvAndpvcCreate.errors.pvNameRequired')];
    buttonDone(false);

    return;
  }

  if (createPVC.value && (!pvcName.value.trim() || !namespace.value.trim())) {
    errors.value = [t('longhorn.volume.dialog.pvAndpvcCreate.errors.pvcRequired')];
    buttonDone(false);

    return;
  }

  // TODO: Create PV/PVC cannot be implemented by mutating the Longhorn Volume CRD.
  // This flow must call the Longhorn API actions (`pvCreate` and `pvcCreate`) so the
  // manager can create Kubernetes PV/PVC objects and handle PVC reuse behavior safely.
  buttonDone(false);
}
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.volume.dialog.pvAndpvcCreate.title') }}</h4>
    </template>

    <template #body>
      <div class="form-field">
        <LabeledInput
          v-model:value="pvName"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.pvName')"
          :required="true"
          :disabled="pvNameDisabled"
        />
      </div>

      <div class="form-field">
        <LabeledSelect
          :value="accessMode"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.accessMode')"
          :options="accessModeOptions"
          :disabled="true"
        />
      </div>

      <div class="form-field">
        <LabeledSelect
          v-model:value="fsType"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.fsType')"
          :options="fsTypeOptions"
        />
      </div>

      <div class="form-field">
        <LabeledInput
          v-model:value="storageClassName"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.storageClassName')"
          :disabled="pvNameDisabled"
          tooltip-key="longhorn.volume.dialog.pvAndpvcCreate.form.storageClassNameHelp"
        />
      </div>

      <div v-if="isEncrypted && !pvNameDisabled" class="form-field">
        <LabeledInput
          v-model:value="secretNamespace"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.secretNamespace')"
        />
      </div>

      <div v-if="isEncrypted && !pvNameDisabled" class="form-field">
        <LabeledInput v-model:value="secretName" :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.secretName')" />
      </div>

      <div class="form-field">
        <Checkbox
          :value="createPVC"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.createPvc')"
          @update:value="onCreatePVCChange"
        />
      </div>

      <div class="form-field">
        <Checkbox
          :value="previousChecked"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.usePreviousPvc')"
          :disabled="!hasPreviousPVC || createPVCDisabled"
          @update:value="onPreviousPVCChange"
        />
      </div>

      <div v-if="createPVC" class="form-field">
        <LabeledInput
          v-model:value="pvcName"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.pvcName')"
          :required="true"
          :disabled="createPVCDisabled"
        />
      </div>

      <div v-if="createPVC" class="form-field">
        <LabeledInput
          v-model:value="namespace"
          :label="t('longhorn.volume.dialog.pvAndpvcCreate.form.namespace')"
          :required="true"
          :disabled="createPVCDisabled"
        />
      </div>

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton :action-label="t('longhorn.volume.dialog.pvAndpvcCreate.actions.create')" @click="submit" />
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
