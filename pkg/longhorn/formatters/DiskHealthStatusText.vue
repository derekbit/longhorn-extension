<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: [Object, String],
    default: null,
  },
});

const displayText = computed(() => {
  if (!props.value) {
    return '';
  }

  if (typeof props.value === 'string') {
    return props.value;
  }

  return props.value.stateDisplay || '';
});

const tooltipMessage = computed(() => {
  if (!props.value || typeof props.value === 'string') {
    return '';
  }

  return props.value.message || '';
});
</script>

<template>
  <span v-clean-tooltip="tooltipMessage">
    <span v-if="displayText">{{ displayText }}</span>
    <span v-else class="text-muted">&mdash;</span>
  </span>
</template>

<style lang="scss" scoped></style>
