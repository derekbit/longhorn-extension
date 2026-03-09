<script>
import Loading from '@shell/components/Loading';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import { LabeledInput } from '@components/Form/LabeledInput';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import UnitInput from '@shell/components/form/UnitInput';
import { set } from '@shell/utils/object';

export default {
  name: 'EditBackupTarget',

  components: {
    Loading,
    CruResource,
    NameNsDescription,
    LabeledInput,
    Tabbed,
    Tab,
    UnitInput,
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: { type: String, default: _CREATE },
    value: { type: Object, required: true },
  },

  data() {
    return {
      LONGHORN_NAMESPACE,
      _VIEW,
      fvFormRuleSets: [
        {
          path: 'spec.backupTargetURL',
          rules: ['required'],
          translationKey: 'longhorn.backupTarget.table.header.backupTargetURL',
        },
        {
          path: 'spec.pollInterval',
          rules: ['min:0', 'isPositive'],
          translationKey: 'longhorn.backupTarget.table.header.pollInterval',
        },
      ],
    };
  },

  created() {
    this.initResource();
  },

  methods: {
    parseDurationToSeconds(d) {
      if (!d || typeof d !== 'string') return d;

      const durationRegex = /((?<h>\d+)h)?((?<m>\d+)m)?((?<s>\d+)s?)?/;
      const match = d.match(durationRegex);

      if (match && match.groups) {
        const { h, m, s } = match.groups;
        const totalSeconds = parseInt(h || 0, 10) * 3600 + parseInt(m || 0, 10) * 60 + parseInt(s || 0, 10);

        return totalSeconds;
      }

      return parseInt(d, 10) || 0;
    },

    initResource() {
      if (!this.value.spec) set(this.value, 'spec', {});

      if (this.value.spec.pollInterval !== undefined) {
        const seconds = this.parseDurationToSeconds(this.value.spec.pollInterval);

        set(this.value.spec, 'pollInterval', seconds);
      } else if (this.mode === _CREATE) {
        set(this.value.spec, 'pollInterval', 300);
      }
    },

    onError(errors) {
      this.errors = Array.isArray(errors) ? errors : [errors];
    },

    async save(buttonDone) {
      this.errors = [];

      try {
        const spec = this.value.spec;

        if (spec.pollInterval !== undefined && spec.pollInterval !== null && spec.pollInterval !== '') {
          const val = parseInt(spec.pollInterval, 10);
          const safeSeconds = isNaN(val) || val < 0 ? 0 : val;

          set(spec, 'pollInterval', `${safeSeconds}s`);
        }

        await this.actuallySave();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);

        this.initResource();
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
      :validation-passed="fvFormIsValid"
      :errors="fvUnreportedValidationErrors"
      @finish="save"
      @cancel="done"
      @error="onError"
    >
      <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />
      <Tabbed side-tabs :resource="value">
        <Tab name="basics" label-key="longhorn.backupTarget.tab.basics">
          <div class="row mb-20">
            <LabeledInput
              v-model:value="value.spec.backupTargetURL"
              label-key="longhorn.backupTarget.table.header.backupTargetURL"
              :mode="mode"
              :rules="fvGetAndReportPathRules('spec.backupTargetURL')"
              required
            />
          </div>
          <div class="row mb-20">
            <LabeledInput
              v-model:value="value.spec.credentialSecret"
              label-key="longhorn.backupTarget.table.header.credentialSecret"
              :mode="mode"
              placeholder="e.g. s3-secret"
            />
          </div>
          <div class="row">
            <UnitInput
              v-model:value="value.spec.pollInterval"
              :label="t('longhorn.backupTarget.table.header.pollInterval')"
              :mode="mode"
              :suffix="t('suffix.seconds', { count: value.spec.pollInterval || 0 })"
              :min="0"
              :rules="fvGetAndReportPathRules('spec.pollInterval')"
              tooltip-key="longhorn.backupTarget.form.pollInterval.tooltip"
            />
          </div>
        </Tab>
      </Tabbed>
    </CruResource>
  </div>
</template>

<style lang="scss" scoped></style>
