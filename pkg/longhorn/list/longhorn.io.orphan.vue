<script>
import ResourceTable from '@shell/components/ResourceTable';
import { LONGHORN_PAGES } from '@longhorn/types/longhorn';
import { ORPHANS_HEADER, ORPHANS_INSTANCE_HEADER, ORPHANS_REPLICA_HEADER } from '@longhorn/config/table-headers';

const ORPHAN_PAGE_CONFIG = Object.freeze({
  replica: {
    headers: ORPHANS_REPLICA_HEADER,
    typeDisplay: LONGHORN_PAGES.ORPHANS_REPLICA,
  },
  instance: {
    headers: ORPHANS_INSTANCE_HEADER,
    typeDisplay: LONGHORN_PAGES.ORPHANS_INSTANCE,
  },
});

function normalizeType(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

export default {
  name: 'LonghornOrphanList',

  components: { ResourceTable },

  props: {
    schema: {
      type: Object,
      required: true,
    },
    rows: {
      type: Array,
      required: true,
    },
  },

  computed: {
    activeFilterType() {
      const filterFromMeta = normalizeType(this.$route?.meta?.orphanFilterType);

      if (ORPHAN_PAGE_CONFIG[filterFromMeta]) {
        return filterFromMeta;
      }

      const filterFromQuery = normalizeType(this.$route?.query?.orphanType);

      if (ORPHAN_PAGE_CONFIG[filterFromQuery]) {
        return filterFromQuery;
      }

      return '';
    },

    activeFilterConfig() {
      return ORPHAN_PAGE_CONFIG[this.activeFilterType] || null;
    },

    filteredRows() {
      if (!this.activeFilterConfig) {
        return this.rows;
      }
      const activeFilterType = this.activeFilterType;

      return this.rows.filter((row) => {
        const orphanType = normalizeType(row?.spec?.orphanType);

        return orphanType.includes(activeFilterType);
      });
    },

    tableHeaders() {
      return this.activeFilterConfig?.headers || ORPHANS_HEADER;
    },
  },

  typeDisplay() {
    return this.$route?.meta?.orphanTypeDisplay || this.activeFilterConfig?.typeDisplay || LONGHORN_PAGES.ORPHANS;
  },
};
</script>

<template>
  <div class="orphan-table">
    <ResourceTable v-bind="$attrs" :schema="schema" :rows="filteredRows" :headers="tableHeaders" />
  </div>
</template>

<style lang="scss">
.orphan-table .sortable-table td.col-link-detail,
.orphan-table .sortable-table td.col-link-detail > span,
.orphan-table .sortable-table td.col-link-detail a {
  white-space: normal !important;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.orphan-table .sortable-table td.col-link-detail a {
  display: block;
  max-width: 100%;
}
</style>
