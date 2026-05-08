import { BADGE_COLOR } from '@longhorn/types/badge';

export { BADGE_COLOR };

export function getBadgeColor(
  state: unknown,
  stateColorMap: Record<string, string>,
  fallbackColor = BADGE_COLOR.INFO
): string {
  const normalizedState = String(state || '').toLowerCase();

  return stateColorMap[normalizedState] || fallbackColor;
}
