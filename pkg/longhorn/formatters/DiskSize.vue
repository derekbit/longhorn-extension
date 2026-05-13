<script setup>
import { computed } from 'vue';
import { bytesToGi } from '@longhorn/utils/general';
import { GiB_UNIT } from '@longhorn/types/general';

const props = defineProps({
  value: {
    type: Object,
    required: true,
  },
});

const capacity = computed(() => bytesToGi(props.value?.capacity || 0));
const reserved = computed(() => bytesToGi(props.value?.reserved || 0));
</script>

<template>
  <div class="container">
    <div>{{ capacity < 0 ? 0 : capacity }} {{ GiB_UNIT }}</div>
    <div class="text-deemphasized reserved mt-5">
      <span v-if="reserved > 0">+{{ reserved }} {{ GiB_UNIT }} Reserved</span>
    </div>
  </div>
</template>

<style scoped>
.container {
  text-align: center;
}

.reserved {
  font-size: 12px;
}
</style>
