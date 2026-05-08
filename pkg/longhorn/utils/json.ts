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
