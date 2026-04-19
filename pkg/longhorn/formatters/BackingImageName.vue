<script>
import { get } from '@shell/utils/object';

export default {
  name: 'BackingImageName',

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

    isEncrypted() {
      return !!(this.row.spec?.secret || this.row.spec?.secretNamespace);
    },

    isUnavailable() {
      const diskFileStatusMap = this.row.status?.diskFileStatusMap;

      if (!diskFileStatusMap || Object.keys(diskFileStatusMap).length === 0) {
        return true;
      }

      const statusList = Object.values(diskFileStatusMap);

      return statusList.every((diskStatus) => (diskStatus.state || '').toLowerCase().includes('failed'));
    },
  },

  methods: {
    showDetail() {
      this.$emit('show-detail', this.row);
    },
  },
};
</script>

<template>
  <div class="backing-image-name-container" @click="showDetail">
    <router-link v-if="to" :to="to" class="backing-image-link">
      {{ value }}
    </router-link>
    <span v-else>
      {{ value }}
      <template v-if="!value && col.dashIfEmpty">
        <span class="text-muted">&mdash;</span>
      </template>
    </span>
    <i v-if="isEncrypted" v-clean-tooltip="'Encrypted Backing Image'" class="icon icon-lock text-muted" />
  </div>
</template>

<style lang="scss" scoped>
.backing-image-name-container {
  display: flex;
  align-items: center;
  gap: 3px;
}
</style>
