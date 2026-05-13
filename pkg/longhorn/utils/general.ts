import { BADGE_COLOR } from '@longhorn/types/general';

export { BADGE_COLOR };

export function getBadgeColor(
  state: unknown,
  stateColorMap: Record<string, string>,
  fallbackColor = BADGE_COLOR.INFO
): string {
  const normalizedState = String(state || '').toLowerCase();

  return stateColorMap[normalizedState] || fallbackColor;
}

const GiB = 1024 * 1024 * 1024;

type AvailableAction = {
  divider?: boolean;
  enabled?: boolean;
  [key: string]: any;
};

export function sanitizeAvailableActions(actions: AvailableAction[] = []): AvailableAction[] {
  const out = actions.filter((item) => item && item.enabled !== false);

  while (out.length && out[0].divider) {
    out.shift();
  }

  while (out.length && out[out.length - 1].divider) {
    out.pop();
  }

  for (let i = 1; i < out.length; i++) {
    if (out[i].divider && out[i - 1].divider) {
      out.splice(i, 1);
      i--;
    }
  }

  return out;
}

export function parseJsonObject(value: unknown, fallback: Record<string, any> | null = {}): Record<string, any> | null {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

const KUBERNETES_STATUS_LABEL_KEYS = ['KubernetesStatus', 'kubernetesStatus'];

function parseFirstValidKubernetesStatusFromLabels(labels: Record<string, unknown> = {}): Record<string, any> | null {
  for (const labelKey of KUBERNETES_STATUS_LABEL_KEYS) {
    const parsedStatus = parseJsonObject(labels?.[labelKey], null);

    if (parsedStatus) {
      return parsedStatus;
    }
  }

  return null;
}

export function resolveKubernetesStatus({
  value,
  statusLabels = {},
  specLabels = {},
  metadataLabels = {},
}: {
  value?: unknown;
  statusLabels?: Record<string, unknown>;
  specLabels?: Record<string, unknown>;
  metadataLabels?: Record<string, unknown>;
} = {}): Record<string, any> {
  return (
    parseJsonObject(value, null) ||
    parseFirstValidKubernetesStatusFromLabels(statusLabels) ||
    parseFirstValidKubernetesStatusFromLabels(specLabels) ||
    parseFirstValidKubernetesStatusFromLabels(metadataLabels) ||
    {}
  );
}

/**
 * Formats bytes into GiB, applying minimum display threshold (0.01 GiB)
 * for small, non-zero values for better UX.
 * @param bytes - The raw number of bytes.
 * @returns The formatted GiB value as a number.
 */
export function bytesToGi(bytes: number | string): number {
  const value = Number(bytes) / GiB;

  if (value === 0) {
    return 0;
  }

  if (value < 1) {
    const formattedValue = parseFloat(value.toFixed(3));

    if (formattedValue > 0 && formattedValue < 0.01) {
      return 0.01;
    }

    return formattedValue;
  }

  return parseFloat(value.toFixed(2));
}
