<script>
import Loading from '@shell/components/Loading';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import formRulesGenerator from '@shell/utils/validators/formRules/index';
import { _CREATE } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { VOLUME_CREATE_SPEC_DEFAULTS, VOLUME_DEFAULT_SNAPSHOT_MAX_COUNT } from '@longhorn/types/volume';
import { set } from '@shell/utils/object';
import Basics from './Basics';
import Advanced from './Advanced';

export default {
  name: 'EditVolume',

  components: {
    Loading,
    CruResource,
    NameNsDescription,
    Tabbed,
    Tab,
    Basics,
    Advanced,
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type: String,
      default: _CREATE,
    },
    value: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      LONGHORN_NAMESPACE,
      fvFormRuleSets: [
        { path: 'spec.size', rules: ['required', 'isInteger', 'minValue:1'] },
        { path: 'spec.numberOfReplicas', rules: ['required', 'isInteger', 'minValue:1', 'maxValue:10'] },
        {
          path: 'spec.snapshotMaxCount',
          rules: ['strictRequired', 'isInteger', 'minValue:0', `maxValue:${VOLUME_DEFAULT_SNAPSHOT_MAX_COUNT}`],
        },
        { path: 'spec.replicaRebuildingBandwidthLimit', rules: ['strictRequired', 'isInteger', 'minValue:0'] },
      ],
    };
  },

  computed: {
    fvExtraRules() {
      const translate = this.$store.getters['i18n/t'];
      const rulesGenerator = formRulesGenerator(translate, { displayKey: 'Value' });
      const extra = {};

      const strictRequired = (val) =>
        val === undefined || val === null || val === ''
          ? translate('validation.required', { key: 'Value' })
          : undefined;

      this.fvFormRuleSets.forEach((set) => {
        set.rules.forEach((rule) => {
          if (typeof rule === 'string' && rule.includes(':')) {
            const [ruleName, param] = rule.split(':');

            if (typeof rulesGenerator[ruleName] === 'function') {
              extra[rule] = rulesGenerator[ruleName](Number(param));
            }
          }
        });
      });

      return { ...extra, strictRequired };
    },

    isFormCurrentlyValid() {
      return this.fvValidationErrors.length === 0;
    },

    hasBasicsErrors() {
      return this.fvGetPathErrors(['spec.size', 'spec.numberOfReplicas']).length > 0;
    },

    hasAdvancedErrors() {
      const isV2 = this.value.spec?.dataEngine === 'v2';
      const paths = ['spec.snapshotMaxCount'];

      if (isV2) {
        paths.push('spec.replicaRebuildingBandwidthLimit');
      }

      return this.fvGetPathErrors(paths).length > 0;
    },

    // Filter errors: only validate bandwidth limit if Data Engine is V2
    fvValidationErrors() {
      const isV2 = this.value.spec?.dataEngine === 'v2';
      const activePaths = ['spec.size', 'spec.numberOfReplicas', 'spec.snapshotMaxCount'];

      if (isV2) {
        activePaths.push('spec.replicaRebuildingBandwidthLimit');
      }

      return this.fvGetPathErrors(activePaths);
    },

    isRestoring() {
      return this.value.isRestoring;
    },
    upgradingEngine() {
      return this.value.status?.currentImage !== this.value.spec?.image;
    },
    isStandby() {
      return this.value.isStandby;
    },
    isAttached() {
      return this.value.isAttached;
    },
    isDetached() {
      return this.value.status?.state === 'detached';
    },
    fieldDisabledStatus() {
      return {
        numberOfReplicas: !this.isAttached || this.isRestoring || this.isStandby || this.upgradingEngine,
        dataLocality: !this.value.actions?.updateDataLocality || this.upgradingEngine,
        accessMode: this.value.kubernetesStatus?.pvStatus || !this.value.actions?.updateAccessMode,
        ublkParams: !this.isDetached,
        replicaAutoBalance: !this.value.actions?.updateReplicaAutoBalance,
        snapshotMaxCount: false,
        snapshotMaxSize: false,
        replicaRebuildingBandwidthLimit: false,
      };
    },
  },

  watch: {
    'value.spec.dataEngine'(newEngine) {
      if (newEngine === 'v1') {
        set(this.value.spec, 'replicaRebuildingBandwidthLimit', 0);
      }

      this.$nextTick(() => {
        if (typeof this.fvValidate === 'function') {
          this.fvValidate();
        }
      });
    },
  },

  created() {
    this.initResource();
  },

  methods: {
    initResource() {
      if (!this.value.spec) {
        set(this.value, 'spec', {});
      }

      const spec = this.value.spec;

      if (this.mode === _CREATE) {
        Object.entries(VOLUME_CREATE_SPEC_DEFAULTS).forEach(([key, val]) => {
          if (spec[key] === undefined) {
            set(spec, key, val);
          }
        });
      }
    },

    async save(buttonDone) {
      this.errors = [];

      if (!this.isFormCurrentlyValid) {
        this.fvFormRuleSets.forEach((ruleSet) => this.fvGetAndReportPathRules(ruleSet.path));
        buttonDone(false);

        return;
      }

      try {
        await this.actuallySave();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <CruResource
      :done-route="doneRoute"
      :mode="mode"
      :resource="value"
      :validation-passed="isFormCurrentlyValid"
      :errors="fvUnreportedValidationErrors"
      @finish="save"
      @cancel="done"
    >
      <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

      <Tabbed side-tabs :resource="value">
        <Tab name="basics" label-key="longhorn.volume.tab.basics" :weight="10" :error="hasBasicsErrors">
          <Basics
            :value="value"
            :mode="mode"
            :get-rules="fvGetAndReportPathRules"
            :field-disabled-status="fieldDisabledStatus"
          />
        </Tab>

        <Tab name="advanced" label-key="longhorn.volume.tab.advanced" :weight="5" :error="hasAdvancedErrors">
          <Advanced
            :value="value"
            :mode="mode"
            :get-rules="fvGetAndReportPathRules"
            :field-disabled-status="fieldDisabledStatus"
          />
        </Tab>
      </Tabbed>
    </CruResource>
  </div>
</template>
