<script>
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import DashboardView from '@longhorn/components/Dashboard/DashboardView';
import InstallView from '@longhorn/components/Dashboard/InstallView';

export default {
  name: 'LonghornDashboard',

  components: {
    DashboardView,
    InstallView,
  },

  computed: {
    hasSchema() {
      return !!this.$store.getters['cluster/schemaFor'](LONGHORN_RESOURCES.SETTINGS, false, false);
    },
  },
};
</script>

<template>
  <div>
    <InstallView v-if="!hasSchema" />
    <DashboardView v-else />
  </div>
</template>
