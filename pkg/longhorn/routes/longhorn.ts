import { PRODUCT_NAME } from '@longhorn/types/longhorn';
import Dashboard from '@longhorn/pages/c/_cluster/index.vue';
import ListLonghornResource from '@longhorn/pages/c/_cluster/_resource/index.vue';
import CreateLonghornResource from '@longhorn/pages/c/_cluster/_resource/create.vue';
import ViewLonghornResourced from '@longhorn/pages/c/_cluster/_resource/_id.vue';
import ViewLonghornNamespacedResource from '@longhorn/pages/c/_cluster/_resource/_namespace/_id.vue';

const routes = [
  {
    name: `c-cluster-${PRODUCT_NAME}-dashboard`,
    path: `/c/:cluster/${PRODUCT_NAME}`,
    component: Dashboard,
    meta: { product: PRODUCT_NAME, pkg: PRODUCT_NAME },
  },
  // registering routes for list/edit/create views
  {
    name: `c-cluster-${PRODUCT_NAME}-resource`,
    path: `/c/:cluster/${PRODUCT_NAME}/:resource`,
    component: ListLonghornResource,
    meta: { product: PRODUCT_NAME, pkg: PRODUCT_NAME },
  },
  {
    name: `c-cluster-${PRODUCT_NAME}-resource-create`,
    path: `/c/:cluster/${PRODUCT_NAME}/:resource/create`,
    component: CreateLonghornResource,
    meta: { product: PRODUCT_NAME, pkg: PRODUCT_NAME },
  },
  {
    name: `c-cluster-${PRODUCT_NAME}-resource-id`,
    path: `/c/:cluster/${PRODUCT_NAME}/:resource/:id`,
    component: ViewLonghornResourced,
    meta: { product: PRODUCT_NAME, pkg: PRODUCT_NAME },
  },
  {
    name: `c-cluster-${PRODUCT_NAME}-resource-namespace-id`,
    path: `/:cluster/${PRODUCT_NAME}/:resource/:namespace/:id`,
    component: ViewLonghornNamespacedResource,
    meta: { product: PRODUCT_NAME, pkg: PRODUCT_NAME },
  },
];

export default routes;
