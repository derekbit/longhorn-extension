export function parseJsonObject(value, fallback = {}) {
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

export function resolveKubernetesStatus({ value, statusLabels = {}, specLabels = {}, metadataLabels = {} } = {}) {
  return (
    parseJsonObject(value, null) ||
    parseJsonObject(statusLabels?.KubernetesStatus, null) ||
    parseJsonObject(statusLabels?.kubernetesStatus, null) ||
    parseJsonObject(specLabels?.KubernetesStatus, null) ||
    parseJsonObject(specLabels?.kubernetesStatus, null) ||
    parseJsonObject(metadataLabels?.KubernetesStatus, null) ||
    parseJsonObject(metadataLabels?.kubernetesStatus, null) ||
    {}
  );
}
