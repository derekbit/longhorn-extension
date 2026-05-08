import { BADGE_COLOR } from '@longhorn/types/badge';

export const CONDITION_STATUS = Object.freeze({
  TRUE: 'True',
  FALSE: 'False',
});

export const NODE_BADGE = Object.freeze({
  ERROR: BADGE_COLOR.ERROR,
  WARNING: BADGE_COLOR.WARNING,
  SUCCESS: BADGE_COLOR.SUCCESS,
  INFO: BADGE_COLOR.INFO,
  DISABLED: BADGE_COLOR.DISABLED,
});

export const NODE_DETAIL_TAB = Object.freeze({
  BASICS: 'basics',
  DISKS: 'disks',
});

export { asNumber, countMapEntries, sumMapValues, displayOrDash } from '@longhorn/utils/node';
