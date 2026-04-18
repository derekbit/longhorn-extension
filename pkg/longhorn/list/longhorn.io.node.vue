<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import Loading from '@shell/components/Loading';
import ResourceTable from '@shell/components/ResourceTable';
import SortableTable from '@shell/components/SortableTable';
import Banner from '@components/Banner/Banner';
import { allHash } from '@shell/utils/promise';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { DISKS_HEADERS } from '@longhorn/config/table-headers';

const props = defineProps({
  resource: {
    type: String,
    required: true,
  },
  schema: {
    type: Object,
    required: true,
  },
});

const store = useStore();
const MISSING_STORE_NAMESPACE_ERROR = 'Vuex store namespace not found.';

const isLoading = ref(true);
const loadError = ref(null);

const inStore = computed(() => store.getters['currentProduct'].inStore);
const getAll = (type) => {
  if (!inStore.value) {
    return [];
  }

  const getter = store.getters[`${inStore.value}/all`];

  return typeof getter === 'function' ? getter(type) || [] : [];
};

const dispatchInStore = (action, payload) => store.dispatch(`${inStore.value}/${action}`, payload);

const rows = computed(() => getAll(props.resource));

async function fetchData() {
  isLoading.value = true;
  loadError.value = null;

  if (!inStore.value) {
    loadError.value = new Error(MISSING_STORE_NAMESPACE_ERROR);
    isLoading.value = false;

    return;
  }

  try {
    const hash = {
      nodes: dispatchInStore('findAll', { type: props.resource }),
      volumes: dispatchInStore('findAll', { type: LONGHORN_RESOURCES.VOLUMES }),
      defaultStorageOverProvisioningPercentage: dispatchInStore('find', {
        type: LONGHORN_RESOURCES.SETTINGS,
        id: LONGHORN_SETTINGS.STORAGE_OVER_PROVISIONING_PERCENTAGE,
      }),
    };

    await allHash(hash);
  } catch (e) {
    // console.error(`Failed to fetch ${props.resource} data:`, e);
    loadError.value = e;
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchData);
defineExpose({ loadError, fetchData });
</script>

<template>
  <Loading v-if="isLoading" />
  <div v-else>
    <Banner v-if="loadError" color="error">
      {{
        t('error.fetchError', {
          message: loadError.message || String(loadError),
        })
      }}
    </Banner>
    <ResourceTable
      key-field="id"
      :sub-rows="true"
      :sub-expandable="true"
      :sub-expand-column="true"
      :rows="rows"
      :schema="props.schema"
    >
      <template #sub-row="{ row, fullColspan, onRowMouseEnter, onRowMouseLeave }">
        <tr class="sub-row" @mouseenter="onRowMouseEnter" @mouseleave="onRowMouseLeave">
          <td :colspan="fullColspan">
            <SortableTable
              key-field="id"
              :headers="DISKS_HEADERS"
              :rows="row.disks"
              :search="false"
              :table-actions="false"
              :row-actions="false"
              :paging="false"
            />
          </td>
        </tr>
      </template>
    </ResourceTable>
  </div>
</template>

<style lang="scss" scoped></style>
