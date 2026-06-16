<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import { Checkbox } from '@components/Form/Checkbox';
import { Banner } from '@components/Banner';
import { useI18n } from '@shell/composables/useI18n';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';

const props = defineProps({
  resources: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close']);

const store = useStore();
const { t } = useI18n(store);

const forceDetach = ref(false);
const errors = ref([]);

const volume = computed(() => props.resources?.[0]);

const volumeName = computed(() => volume.value?.metadata?.name || volume.value?.id || '');

const hasCsiAttachment = computed(() => {
  return (volume.value?.attachmentRows || []).some((row) => row.attachmentType === 'csi-attacher');
});

const hasPodWorkload = computed(() => {
  const ks = volume.value?.status?.kubernetesStatus;

  return !!(ks?.workloadsStatus?.length && !ks?.lastPodRefAt);
});

const showCsiWarning = computed(() => forceDetach.value && hasCsiAttachment.value);
const showPodWarning = computed(() => hasPodWorkload.value);

function close() {
  emit('close');
}

onMounted(async () => {
  try {
    await store.dispatch('cluster/findAll', { type: LONGHORN_RESOURCES.VOLUME_ATTACHMENTS });
  } catch {
    // VolumeAttachments are only used to decide whether to show the CSI warning;
    // failing to fetch them just means the warning may be skipped.
  }
});

async function submit(buttonDone) {
  errors.value = [];

  const target = volume.value;

  if (!target) {
    errors.value = ['Volume not found'];
    buttonDone(false);

    return;
  }

  try {
    await target.doAction('detach', {
      forceDetach: forceDetach.value,
      attachmentID: 'longhorn-ui',
      hostId: '',
    });

    buttonDone(true);
    close();
  } catch (err) {
    errors.value = exceptionToErrorsArray(err);
    buttonDone(false);
  }
}
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.volume.dialog.detach.title', { name: volumeName }) }}</h4>
    </template>

    <template #body>
      <div class="form-field">
        <Checkbox v-model:value="forceDetach" :label="t('longhorn.volume.dialog.detach.form.forceDetach')" />
      </div>

      <Banner
        v-if="showCsiWarning"
        color="warning"
        :label="t('longhorn.volume.dialog.detach.csiWarning')"
        class="mb-10"
      />

      <Banner
        v-if="showPodWarning"
        color="warning"
        :label="t('longhorn.volume.dialog.detach.podWarning')"
        class="mb-10"
      />

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton :action-label="t('longhorn.volume.dialog.detach.actions.detach')" @click="submit" />
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
