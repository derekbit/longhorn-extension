<script>
import { BadgeState } from '@components/BadgeState';

export default {
  components: { BadgeState },
  props: {
    row: {
      type: Object,
      required: true,
    },
  },
  computed: {
    statusInfo() {
      if (!this.row?.nodeStatus) return {};

      return this.row.nodeStatus;
    },
  },
};
</script>

<template>
  <div v-if="row && statusInfo" class="node-status-badge-wrapper">
    <BadgeState v-clean-tooltip="statusInfo.message" :value="statusInfo" />
  </div>
</template>

<style lang="scss" scoped></style>
