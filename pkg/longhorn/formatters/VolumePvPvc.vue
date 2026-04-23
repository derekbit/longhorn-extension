<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import { parseJsonObject } from '@longhorn/utils/json';

const props = defineProps({
  value: {
    type: [Object, String],
    default: () => ({}),
  },
});

const statusSource = computed(() => {
  return parseJsonObject(props.value);
});

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '';
};

const statusText = computed(() => {
  const { pvName, pvcName, namespace, lastPVCRefAt } = statusSource.value;

  if (!pvName) return '';
  if (!pvcName && !namespace) return 'Available';
  if (pvcName && namespace && !lastPVCRefAt) return 'Bound';
  if (pvcName && namespace && lastPVCRefAt) return 'Released';

  return '';
});

const tooltipContent = computed(() => {
  const { pvName, pvStatus, pvcName, lastPVCRefAt } = statusSource.value;

  if (!pvName) return '';

  const row = (label, val) => (val ? `<div style="margin-bottom:4px">${label}: ${val}</div>` : '');

  return [
    row('PV Name', pvName),
    row('PV Status', pvStatus || '—'),
    lastPVCRefAt ? row('Last time bound with PVC', formatDate(lastPVCRefAt)) : '',
    pvcName ? row(`${lastPVCRefAt ? 'Last Bounded ' : ''}PVC Name`, pvcName) : '',
  ].join('');
});
</script>

<template>
  <span v-if="statusText" v-clean-tooltip="{ content: tooltipContent, html: true }">
    {{ statusText }}
  </span>
  <span v-else class="text-muted">&mdash;</span>
</template>

<style lang="scss" scoped></style>
