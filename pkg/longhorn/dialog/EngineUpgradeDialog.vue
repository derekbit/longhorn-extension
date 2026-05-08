<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { Card } from '@components/Card';
import AsyncButton from '@shell/components/AsyncButton';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Banner } from '@components/Banner';
import Loading from '@shell/components/Loading';
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

const selectedImage = ref('');
const errors = ref([]);
const loading = ref(true);
const engineImages = ref([]);

const volume = computed(() => props.resources?.[0]);

const options = computed(() => {
  const currentImage = volume.value?.image || volume.value?.spec?.image || '';

  return engineImages.value
    .map((engineImage) => engineImage?.image || engineImage?.spec?.image)
    .filter((image) => image && image !== currentImage)
    .map((image) => ({
      label: image,
      value: image,
    }));
});

function close() {
  emit('close');
}

onMounted(async () => {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    loading.value = false;

    return;
  }

  try {
    engineImages.value = await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.ENGINE_IMAGES });
  } catch {
    engineImages.value = [];
  } finally {
    loading.value = false;
  }
});

async function submit(buttonDone) {
  errors.value = [];

  if (!selectedImage.value) {
    errors.value = [t('longhorn.volume.dialog.engineUpgrade.errors.engineImageRequired')];
    buttonDone(false);

    return;
  }

  try {
    await volume.value.doAction('engineUpgrade', { image: selectedImage.value });
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
      <h4>{{ t('longhorn.volume.dialog.engineUpgrade.title') }}</h4>
    </template>

    <template #body>
      <Loading v-if="loading" />
      <div v-else>
        <div class="form-field">
          <LabeledSelect
            v-model:value="selectedImage"
            :label="t('longhorn.volume.dialog.engineUpgrade.form.image')"
            :placeholder="t('longhorn.volume.dialog.engineUpgrade.form.imagePlaceholder')"
            :required="true"
            :options="options"
          />
        </div>

        <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
      </div>
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton :action-label="t('longhorn.volume.dialog.engineUpgrade.actions.upgrade')" @click="submit" />
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
