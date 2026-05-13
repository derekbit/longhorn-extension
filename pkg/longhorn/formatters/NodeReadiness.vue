<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { EMPTY_DISPLAY } from '@longhorn/types/general';

const props = defineProps({
  value: {
    type: String,
    default: '',
  },
  row: {
    type: Object,
    default: () => ({}),
  },
});

const store = useStore();

const readinessText = computed(() => props.value || EMPTY_DISPLAY);
const canOpen = computed(() => !!(props.row?.metadata?.name || props.row?.id || props.row?.name));

function openReadinessModal() {
  if (!canOpen.value) {
    return;
  }

  store.dispatch('management/promptModal', {
    component: 'NodeReadinessDialog',
    resources: [props.row],
    modalWidth: '760px',
  });
}
</script>

<template>
  <div class="node-readiness-formatter">
    <button v-if="canOpen" type="button" class="btn role-link" @click="openReadinessModal">{{ readinessText }}</button>
    <span v-else>{{ readinessText }}</span>
  </div>
</template>
