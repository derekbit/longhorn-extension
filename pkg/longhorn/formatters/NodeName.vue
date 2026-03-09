<script>
export default {
  name: 'NodeName',

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
  },

  computed: {
    nodeId() {
      return this.value;
    },

    region() {
      return this.row?.status?.region || this.row?.region || '';
    },

    zone() {
      return this.row?.status?.zone || this.row?.zone || '';
    },

    tooltip() {
      const parts = [];

      if (this.region) parts.push(`Region: ${this.region}`);
      if (this.zone) parts.push(`Zone: ${this.zone}`);

      return {
        content: parts.join('<br />'),
        html: true,
      };
    },

    to() {
      if (!this.nodeId) return null;

      const clusterId = this.$route.params.cluster || 'local';

      return {
        name: 'c-cluster-product-resource-namespace-id',
        params: {
          cluster: clusterId,
          product: 'longhorn',
          resource: 'longhorn.io.node',
          namespace: 'longhorn-system',
          id: this.nodeId,
        },
        hash: '#basics',
      };
    },
  },
};
</script>

<template>
  <div class="node-name-formatter">
    <div class="node-header">
      <i class="icon icon-host icon-lg mr-5 text-muted" />

      <router-link v-if="to && nodeId" :to="to" class="node-link">
        {{ nodeId }}
      </router-link>

      <!-- <span v-else>
        {{ nodeId }}
        <template v-if="!nodeId && col.dashIfEmpty">
          <span class="text-muted">&mdash;</span>
        </template>
        <span v-else-if="!nodeId" class="text-muted">-</span>
      </span>

      <span v-if="region || zone" v-clean-tooltip="tooltip" class="ml-5">
        <i class="icon icon-globe" />
      </span> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.node-name-formatter {
  display: flex;
  align-items: center;

  .node-header {
    display: flex;
    align-items: center;

    .topo-icon {
      display: inline-flex;
    }
  }
}
</style>
