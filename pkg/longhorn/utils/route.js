import { PRODUCT_NAME } from '@longhorn/types/longhorn';

export function getBasePath(router, clusterId) {
  if (!router || !clusterId) {
    return '';
  }

  try {
    const routeName = `c-cluster-${PRODUCT_NAME}-resource`;
    const route = router.resolve({ name: routeName, params: { cluster: clusterId, resource: 'dummy' } });

    if (route && route.href) {
      const basePath = route.href.replace(/\/[^/]+$/, '');

      return basePath;
    }
  } catch (e) {
    // Route not found
  }

  return '';
}
