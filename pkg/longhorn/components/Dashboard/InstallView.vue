<script>
import { mapGetters } from 'vuex';
import { REPO_TYPE, REPO, CHART, VERSION } from '@shell/config/query-params';
import Loading from '@shell/components/Loading';
import { Banner } from '@components/Banner';
import { PRODUCT_NAME } from '@longhorn/types/longhorn';

export default {
  name: 'LonghornInstallView',

  components: {
    Banner,
    Loading,
  },

  data() {
    return {
      error: null,
    };
  },

  computed: {
    ...mapGetters({
      charts: 'catalog/charts',
    }),

    longhornChart() {
      return this.charts?.find((chart) => chart.chartName === PRODUCT_NAME);
    },
  },

  methods: {
    async installLonghorn() {
      this.error = null;
      await this.$store.dispatch('catalog/load');

      const chart = this.longhornChart;

      if (!chart) {
        this.error = new Error(this.t('longhorn.install.chartNotFound'));

        return;
      }

      const repoType = chart.repoType;
      const repoName = chart.repoName;
      const chartName = chart.chartName;
      const version = chart.latestCompatibleVersion?.version || chart.versions?.[0]?.version;

      if (!version) {
        this.error = new Error(this.t('longhorn.install.versionNotFound'));

        return;
      }

      const cluster = this.$route?.params?.cluster || 'local';

      const { href } = this.$router.resolve({
        name: 'c-cluster-apps-charts-install',
        params: { cluster },
        query: {
          [REPO_TYPE]: repoType,
          [REPO]: repoName,
          [CHART]: chartName,
          [VERSION]: version,
        },
      });

      window.location.assign(href);
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else class="container">
    <div class="title p-10">
      <div class="logo mt-20 mb-10">
        <img src="../../assets/images/longhorn.svg" alt="Longhorn" />
      </div>
      <h1 class="mb-20">
        {{ t('longhorn.install.title') }}
      </h1>
      <div class="description">
        {{ t('longhorn.install.description') }}
      </div>

      <Banner v-if="error" color="error" class="mb-20 mt-20">
        {{ error.message || error }}
      </Banner>

      <button class="btn role-primary mt-20" @click="installLonghorn">
        {{ t('longhorn.install.button') }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  .title {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    margin: 100px 0;

    .logo {
      display: flex;
      justify-content: center;
      align-items: center;

      img {
        width: 80px;
        height: 80px;
      }
    }

    h1 {
      font-size: 2rem;
      font-weight: 300;
    }
  }

  .description {
    line-height: 20px;
  }
}
</style>
