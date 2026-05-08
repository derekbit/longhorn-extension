<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useFetch } from '@shell/components/Resource/Detail/FetchLoader/composables';
import Loading from '@shell/components/Loading';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabelValue from '@shell/components/LabelValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LiveDate from '@shell/components/formatter/LiveDate';
import { _VIEW } from '@shell/config/query-params';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';

const props = defineProps({
  mode: {
    type: String,
    default: _VIEW,
  },
  value: {
    type: Object,
    required: false,
    default: () => ({}),
  },
});

const store = useStore();

const { pending: fetchStatePending } = useFetch(async () => {
  const inStore = store.getters['currentProduct'].inStore;

  await store.dispatch(`${inStore}/find`, {
    type: LONGHORN_RESOURCES.SETTINGS,
    id: LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE,
  });
});

const nodeDeploymentMap = computed(() => {
  const map = props.value?.status?.nodeDeploymentMap;

  if (!map) return '—';

  const result = Object.entries(map)
    .filter(([, val]) => val === true)
    .map(([key]) => key)
    .join(', ');

  return displayValue(result);
});

function displayValue(val) {
  return val === null || val === undefined || String(val).trim() === '' ? '—' : val;
}
</script>

<template>
  <Loading v-if="fetchStatePending" />
  <div v-else>
    <NameNsDescription
      :value="value"
      :mode="mode"
      :namespace-disabled="true"
      :name-hidden="mode !== _VIEW"
      :description-hidden="true"
    />
    <Tabbed side-tabs :resource="value">
      <Tab name="basics" label-key="longhorn.engineImage.tab.basics">
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.image')"
          :value="displayValue(value?.spec?.image)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.status')"
          :value="displayValue(value?.status?.state)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.default')"
          :value="displayValue(`${value?.isDefault}`)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.refCount')"
          :value="displayValue(value?.status?.refCount)"
        />
        <LabelValue class="mb-20" :name="t('longhorn.engineImage.form.buildDate')">
          <template #value>
            <LiveDate v-if="value?.status?.buildDate" :value="value.status.buildDate" :add-suffix="true" />
            <span v-else>—</span>
          </template>
        </LabelValue>
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.cliAPIVersion')"
          :value="displayValue(value?.status?.cliAPIVersion)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.controllerAPIVersion')"
          :value="displayValue(value?.status?.controllerAPIVersion)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.engineImage.form.noRefSince')"
          :value="displayValue(value?.status?.noRefSince)"
        />
        <LabelValue class="mb-20" :name="t('longhorn.engineImage.form.nodeDeploymentMap')" :value="nodeDeploymentMap" />
      </Tab>
    </Tabbed>
  </div>
</template>
