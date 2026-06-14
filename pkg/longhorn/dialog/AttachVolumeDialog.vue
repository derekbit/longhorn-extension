<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Checkbox } from '@components/Form/Checkbox';
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
import { useI18n } from '@shell/composables/useI18n';
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

const selectedNodeId = ref('');
const disableFrontend = ref(false);
const errors = ref([]);
const loading = ref(true);
const nodes = ref([]);

const volume = computed(() => props.resources?.[0]);

// RWX non-migratable volumes must be attached in maintenance mode
const isRwxNonMigratable = computed(() => {
  const selectedVolume = volume.value;

  return selectedVolume?.spec?.accessMode === 'rwx' && !selectedVolume?.spec?.migratable;
});

const maintenanceForced = computed(() => isRwxNonMigratable.value);

const nodeOptions = computed(() => {
  return nodes.value
    .filter((nodeResource) => nodeResource.isReady)
    .map((nodeResource) => ({ label: nodeResource.id, value: nodeResource.id }));
});

function close() {
  emit('close');
}

onMounted(async () => {
  if (isRwxNonMigratable.value) {
    disableFrontend.value = true;
  }

  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    loading.value = false;

    return;
  }

  try {
    nodes.value = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.NODES });
  } catch {
    nodes.value = [];
  } finally {
    loading.value = false;
  }
});

async function submit(buttonDone) {
  errors.value = [];

  if (!selectedNodeId.value) {
    errors.value = [t('longhorn.volume.dialog.attach.errors.nodeRequired')];
    buttonDone(false);

    return;
  }

  const target = volume.value;

  if (!target) {
    errors.value = ['Volume not found'];
    buttonDone(false);

    return;
  }

  try {
    await target.doAction('attach', {
      hostId:          selectedNodeId.value,
      disableFrontend: disableFrontend.value,
      attachedBy:      'longhorn-ui',
      attacherType:    'longhorn-api',
      attachmentID:    `longhorn-ui-${ target.metadata?.name || target.id }`,
    });

    buttonDone(true);
    close();
  } catch (e) {
    const message = e?._message || e?.message || (typeof e === 'string' ? e : JSON.stringify(e));

    errors.value = [message];
    buttonDone(false);
  }
}
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.volume.dialog.attach.title') }}</h4>
    </template>

    <template #body>
      <Loading v-if="loading" />
      <div v-else>
        <div class="form-field">
          <LabeledSelect
            v-model:value="selectedNodeId"
            :label="t('longhorn.volume.dialog.attach.form.node')"
            :options="nodeOptions"
            :placeholder="t('longhorn.volume.dialog.attach.form.nodePlaceholder')"
            :required="true"
          />
        </div>

        <div class="form-field">
          <Checkbox
            v-model:value="disableFrontend"
            :label="t('longhorn.volume.dialog.attach.form.maintenance')"
            :disabled="maintenanceForced"
          />
        </div>

        <Banner
          v-if="maintenanceForced"
          color="warning"
          :label="t('longhorn.volume.dialog.attach.rwxWarning')"
          class="mb-10"
        />

        <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
      </div>
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton :action-label="t('longhorn.volume.dialog.attach.actions.attach')" @click="submit" />
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
