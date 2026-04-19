<script>
import { BadgeState } from '@components/BadgeState';

export default {
  components: { BadgeState },
  props: {
    row: {
      type: Object,
      required: true,
    },
    value: {
      type: [String, Object],
      default: 'nodeStatus',
    },
  },
  computed: {
    statusInfo() {
      if (this.value && typeof this.value === 'object') {
        return this.value;
      }

      if (typeof this.value === 'string' && this.row?.[this.value]) {
        return this.row[this.value];
      }

      if (this.row?.nodeStatus) {
        return this.row.nodeStatus;
      }

      return null;
    },
  },
};
</script>

<template>
  <div v-if="row && statusInfo" class="node-status-badge-wrapper">
    <BadgeState :value="statusInfo" />
  </div>
</template>

<style lang="scss" scoped></style>
