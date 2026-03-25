<script>
import { get } from '@shell/utils/object';

export default {
  name: 'OrphanName',

  props: {
    value: {
      type: String,
      default: '',
    },
    row: {
      type: Object,
      required: true,
    },
    col: {
      type: Object,
      default: () => ({}),
    },
    reference: {
      type: String,
      default: null,
    },
    getCustomDetailLink: {
      type: Function,
      default: null,
    },
  },

  computed: {
    to() {
      if (this.getCustomDetailLink) {
        return this.getCustomDetailLink(this.row);
      }
      if (this.row && this.reference) {
        return get(this.row, this.reference);
      }

      return this.row?.detailLocation;
    },
  },
};
</script>

<template>
  <span class="detail-link">
    <router-link v-if="to" :to="to" class="break-all">
      {{ value }}
    </router-link>
    <span v-else class="break-all">
      {{ value }}
      <template v-if="!value && col.dashIfEmpty">
        <span class="text-muted">&mdash;</span>
      </template>
    </span>
  </span>
</template>

<style lang="scss" scoped>
.detail-link {
  display: block;
  white-space: normal !important;
  word-break: break-all;

  .break-all {
    display: block;
    white-space: normal !important;
    word-break: break-all;
  }
}
</style>
