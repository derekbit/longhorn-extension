<script>
import { proxyUrlFromParts } from '@shell/models/service';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import Loading from '@shell/components/Loading.vue';
import AsyncButton from '@shell/components/AsyncButton.vue';
import { Banner } from '@components/Banner';
import SettingsForm from '@longhorn/components/Settings/SettingsForm.vue';

const CATEGORY_ORDER = ['general', 'snapshot', 'system info', 'orphan', 'backup', 'scheduling', 'danger zone'];

export default {
  name: 'LonghornSettings',

  components: {
    Loading,
    AsyncButton,
    Banner,
    SettingsForm,
  },

  props: {
    resource: {
      type: String,
      required: true,
    },
    schema: {
      type: Object,
      required: true,
    },
  },

  async fetch() {
    const clusterId = this.$route.params.cluster;
    const proxyUrl = proxyUrlFromParts(
      clusterId,
      LONGHORN_NAMESPACE,
      'longhorn-frontend',
      'http',
      '80',
      '/v1/settings'
    );

    try {
      const [settingsApi] = await Promise.all([
        this.$store.dispatch(`${this.inStore}/request`, { url: proxyUrl }),
        this.$store.dispatch(`${this.inStore}/findAll`, { type: LONGHORN_RESOURCES.SETTINGS }),
      ]);

      if (settingsApi?.data) {
        this.settingsApiData = settingsApi.data;
        this.processSettings();
      }
    } catch (e) {
      this.loadError = e;
    }
  },

  data() {
    return {
      settings: {},
      groups: [],
      values: {},
      loadError: null,
      errors: [],
      settingsApiData: [],
      originalValues: {},
      resourceMap: new Map(),
      searchQuery: '',
      settingsContentHeight: null,
    };
  },

  computed: {
    inStore() {
      return this.$store.getters['currentProduct'].inStore;
    },

    rows() {
      return this.$store.getters[`${this.inStore}/all`](this.resource) || [];
    },

    canEdit() {
      return !this.$fetchState.pending && !this.loadError;
    },

    settingsFormStyle() {
      if (this.settingsContentHeight === null) {
        return {};
      }

      return {
        '--settings-tab-content-max-height': `${this.settingsContentHeight}px`,
      };
    },

    filteredGroups() {
      if (!this.searchQuery.trim()) {
        return this.groups;
      }

      const query = this.searchQuery.toLowerCase();
      const filtered = [];

      this.groups.forEach((group) => {
        const matchingChildren = group.children.filter((settingId) => {
          const setting = this.settings[settingId];

          if (!setting) return false;

          // Search in label, description, and setting ID
          return (
            setting.label?.toLowerCase().includes(query) ||
            setting.description?.toLowerCase().includes(query) ||
            settingId.toLowerCase().includes(query)
          );
        });

        if (matchingChildren.length > 0) {
          filtered.push({
            ...group,
            children: matchingChildren,
          });
        }
      });

      return filtered;
    },
  },

  watch: {
    rows: 'processSettings',
  },

  methods: {
    processSettings() {
      if (!this.settingsApiData.length || !this.rows.length) return;

      const categoryMap = {};
      const settings = {};
      const values = {};
      const groups = [];

      const settingsResourceMap = new Map();

      this.rows.forEach((r) => {
        settingsResourceMap.set(r.id, r);
        if (r.metadata?.name) settingsResourceMap.set(r.metadata.name, r);
      });

      this.settingsApiData.forEach((setting) => {
        const { id, definition } = setting;
        const resource = settingsResourceMap.get(id);

        if (resource) this.resourceMap.set(id, resource);

        const value = resource?.value || setting.value;
        const { category, type, displayName, description, readOnly, required, options } = definition;

        // Normalize category name to lowercase
        const normalizedCategory = category.toLowerCase();

        if (!categoryMap[normalizedCategory]) categoryMap[normalizedCategory] = [];
        categoryMap[normalizedCategory].push(id);

        settings[id] = {
          type,
          label: displayName || id,
          description: description || '',
          readOnly: !!readOnly,
          required: !!required,
          options: Array.isArray(options) ? options : null,
        };

        let parsedValue = value;

        if (typeof value === 'string' && value.trim().startsWith('{')) {
          try {
            const jsonValue = JSON.parse(value.trim());

            if (jsonValue && typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
              settings[id].isJsonObject = true;
              settings[id].jsonKeys = Object.keys(jsonValue);
              parsedValue = jsonValue;
            }
          } catch {}
        }

        values[id] = this.parseValue(parsedValue, type);
      });

      Object.keys(categoryMap)
        .sort((a, b) => {
          // a and b are already lowercase after normalization
          const aIdx = CATEGORY_ORDER.indexOf(a);
          const bIdx = CATEGORY_ORDER.indexOf(b);

          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;

          return a.localeCompare(b);
        })
        .forEach((category) => {
          const categoryIndex = CATEGORY_ORDER.indexOf(category);
          // Calculate weight so that first category has highest weight
          const weight = CATEGORY_ORDER.length - categoryIndex;

          groups.push({
            name: category,
            weight,
            label: category
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            children: categoryMap[category],
          });
        });

      this.settings = settings;
      this.groups = groups;
      this.values = values;
      this.originalValues = JSON.parse(JSON.stringify(values));
    },

    parseValue(value, type) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
      }

      if (type === 'bool') return String(value) === 'true';
      if (type === 'int') return parseInt(value, 10) || 0;

      return value || '';
    },

    handleUpdate(newValues) {
      Object.entries(newValues).forEach(([id, val]) => {
        const resource = this.resourceMap.get(id);

        if (resource) {
          resource.value = this.stringifyValue(val, this.settings[id]?.type);
        }
      });
      this.values = newValues;
    },

    async save(btnCB) {
      this.errors = [];
      const form = this.$refs.settingsForm;

      if (form && !form.fvFormIsValid) {
        this.errors = form.fvValidationErrors;

        return btnCB(false);
      }

      try {
        const updates = Object.keys(this.values)
          .filter((id) => {
            const resource = this.resourceMap.get(id);
            const changed = JSON.stringify(this.values[id]) !== JSON.stringify(this.originalValues[id]);

            return resource && changed;
          })
          .map((id) => this.resourceMap.get(id).save());

        if (updates.length) {
          await Promise.all(updates);
          this.originalValues = JSON.parse(JSON.stringify(this.values));
        }
        btnCB(true);
      } catch (err) {
        this.errors = [err?.message || 'Failed to save settings'];
        btnCB(false);
      }
    },

    stringifyValue(value, type) {
      if (type === 'bool' || type === 'int') return String(value);
      if (value && typeof value === 'object') return JSON.stringify(value);

      return value;
    },

    updateSettingsFormScrollHeight() {
      const settingsFormEl = this.$refs.settingsForm?.$el || this.$refs.settingsForm;

      if (!settingsFormEl) {
        return;
      }

      const scrollRect = settingsFormEl.getBoundingClientRect();
      const applyEl = this.$refs.applyBtn?.$el || this.$refs.applyBtn;
      const applyRect = applyEl?.getBoundingClientRect?.();
      const applyStyle = applyEl ? window.getComputedStyle(applyEl) : null;
      const applyMarginTop = applyStyle ? parseFloat(applyStyle.marginTop) || 0 : 0;
      const applyMarginBottom = applyStyle ? parseFloat(applyStyle.marginBottom) || 0 : 0;
      const applyBtnTotalHeight = (applyRect?.height || 0) + applyMarginTop + applyMarginBottom;
      const outletEl = settingsFormEl.closest('.outlet');
      const outletStyle = outletEl ? window.getComputedStyle(outletEl) : null;
      const outletPaddingBottom = outletStyle ? parseFloat(outletStyle.paddingBottom) || 0 : 0;
      const availableHeight = Math.max(
        0,
        window.innerHeight - scrollRect.top - applyBtnTotalHeight - outletPaddingBottom
      );

      this.settingsContentHeight = availableHeight;
    },
  },

  mounted() {
    window.addEventListener('resize', this.updateSettingsFormScrollHeight);
    this.$nextTick(this.updateSettingsFormScrollHeight);
  },

  updated() {
    this.$nextTick(this.updateSettingsFormScrollHeight);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.updateSettingsFormScrollHeight);
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else class="longhorn-settings">
    <div class="header">
      <h1>{{ t('longhorn.settings.title') }}</h1>
      <div class="search row">
        <input
          v-model="searchQuery"
          type="search"
          class="input-sm search-box"
          :aria-label="t('sortableTable.searchLabel')"
          :placeholder="t('sortableTable.search')"
        />
      </div>
    </div>

    <Banner v-if="loadError" color="error">
      {{ t('longhorn.settings.fetchError', { error: loadError.message }) }}
    </Banner>

    <Banner v-for="(err, idx) in errors" :key="idx" color="error">
      {{ err }}
    </Banner>

    <SettingsForm
      v-if="!loadError && Object.keys(settings).length > 0"
      ref="settingsForm"
      :style="settingsFormStyle"
      :settings="settings"
      :groups="filteredGroups"
      :show-no-matches="!!(searchQuery && filteredGroups.length === 0)"
      :no-matches-message="t('longhorn.settings.noResults')"
      :values="values"
      mode="edit"
      @update:value="handleUpdate"
    />

    <AsyncButton
      v-if="canEdit && !(searchQuery && filteredGroups.length === 0)"
      ref="applyBtn"
      class="apply-btn pull-right"
      :action-label="t('longhorn.settings.apply')"
      @click="save"
    />
  </div>
</template>

<style scoped lang="scss">
.longhorn-settings {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    h1 {
      margin-bottom: 0;
    }

    .search-box {
      max-width: 500px;
    }
  }

  .apply-btn {
    margin-top: 20px;
  }
}
</style>
