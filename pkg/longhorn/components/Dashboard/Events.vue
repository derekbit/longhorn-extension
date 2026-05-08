<script>
import { MESSAGE, NAME, OBJECT, REASON, EVENT_TYPE } from '@shell/config/table-headers';
import { EVENT } from '@shell/config/types';
import PaginatedResourceTable from '@shell/components/PaginatedResourceTable';
import { STEVE_NAME_COL } from '@shell/config/pagination-table-headers';
import { headerFromSchemaColString } from '@shell/store/type-map.utils';

export default {
  name: 'Events',
  components: {
    PaginatedResourceTable,
  },
  data() {
    return {
      schema: null,
      paginationHeaders: null,
      dismissRouteHandler: null,
      reason: {
        ...REASON,
        ...{ canBeVariable: true },
      },
      eventHeaders: [
        REASON,
        OBJECT,
        MESSAGE,
        NAME,
        {
          name: 'date',
          label: 'Date',
          labelKey: 'clusterIndexPage.sections.events.date.label',
          value: 'timestamp',
          sort: 'timestamp:desc',
          formatter: 'Date',
          width: 220,
          defaultSort: true,
        },
      ],
    };
  },
  mounted() {
    const schemaObj = this.$store.getters['cluster/schemaFor'](EVENT);

    const paginationHeadersObj = schemaObj
      ? [
          {
            ...headerFromSchemaColString('Last Seen', schemaObj, this.$store.getters, true),
            defaultSort: true,
          },
          headerFromSchemaColString('First Seen', schemaObj, this.$store.getters, true),
          headerFromSchemaColString('Count', schemaObj, this.$store.getters, true),
          {
            ...STEVE_NAME_COL,
            defaultSort: false,
          },
          OBJECT,
          EVENT_TYPE,
          this.reason,
          headerFromSchemaColString('Source', schemaObj, this.$store.getters, true),
          MESSAGE,
        ]
      : [];

    this.schema = schemaObj;
    this.paginationHeaders = paginationHeadersObj;

    this.dismissRouteHandler = this.$router.beforeEach((to, from, next) => this.onRouteChange(to, from, next));
  },
  beforeUnmount() {
    if (this.dismissRouteHandler) {
      this.dismissRouteHandler();
    }
  },
  methods: {
    async onRouteChange(to, from, next) {
      if (this.$route.name !== to.name) {
        await this.$store.dispatch('cluster/forgetType', EVENT);
      }
      next();
    },
    onApiFilter(pagination) {
      if (!pagination.projectsOrNamespaces || !pagination.projectsOrNamespaces[0]) {
        pagination.projectsOrNamespaces = [{ fields: [] }];
      }

      pagination.projectsOrNamespaces[0].fields = [
        {
          equals: true,
          exact: true,
          exists: false,
          field: undefined,
          value: 'longhorn-system',
        },
      ];

      return pagination;
    },
  },
};
</script>

<template>
  <h3 class="title">
    {{ t('longhorn.dashboard.events') }}
  </h3>
  <PaginatedResourceTable
    v-if="!!schema"
    :schema="schema"
    :headers="eventHeaders"
    :pagination-headers="paginationHeaders"
    :api-filter="onApiFilter"
    key-field="id"
    :search="false"
    :table-actions="false"
    :row-actions="false"
    :groupable="false"
    :rows-per-page="10"
  />
</template>

<style lang="scss" scoped>
.title {
  margin: 24px 0;
}
.events-link {
  align-self: center;
  padding-right: 20px;
  white-space: nowrap;
}
</style>
