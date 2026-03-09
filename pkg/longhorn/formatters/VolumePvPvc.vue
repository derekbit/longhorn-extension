<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  value: {
    type: Object,
    default: () => ({}),
  },
});

const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '';
};

const statusText = computed(() => {
  const { pvName, pvcName, namespace, lastPVCRefAt } = props.value;

  if (!pvName) return '';
  if (!pvcName && !namespace) return 'Available';
  if (pvcName && namespace && !lastPVCRefAt) return 'Bound';
  if (pvcName && namespace && lastPVCRefAt) return 'Released';

  return '';
});

const tooltipContent = computed(() => {
  const { pvName, pvStatus, pvcName, lastPVCRefAt } = props.value;

  if (!pvName) return null;

  let html = `<div class="text-left">`;

  html += `<div><b>PV Name:</b> ${pvName}</div>`;
  html += `<div><b>PV Status:</b> ${pvStatus || '—'}</div>`;

  if (lastPVCRefAt) {
    html += `<div><b>Last time bound with PVC:</b> ${formatDate(lastPVCRefAt)}</div>`;
  }

  if (pvcName) {
    const prefix = lastPVCRefAt ? 'Last Bounded ' : '';

    html += `<div><b>${prefix}PVC Name:</b> ${pvcName}</div>`;
  }

  html += `</div>`;

  return html;
});
</script>

<template>
  <span
    v-if="statusText"
    v-clean-tooltip="{ content: tooltipContent, html: true, placement: 'top' }"
    class="status-label"
  >
    {{ statusText }}
  </span>
  <span v-else class="text-muted">&mdash;</span>
</template>

<style lang="scss" scoped>
.status-label {
  cursor: help;
  text-decoration: underline dotted var(--muted);
}
</style>
