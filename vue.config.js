const path = require('path');
const config = require('@rancher/shell/vue.config');

module.exports = () => {
  const vendorConfig = config(__dirname, { excludes: [] });

  vendorConfig.parallel = false;

  const applyProjectOverrides = (webpackConfig) => {
    webpackConfig.resolve.alias.set('@longhorn', path.resolve(__dirname, 'pkg/longhorn'));
    webpackConfig.resolve.alias.set('vuex', path.resolve(__dirname, 'node_modules/vuex'));
    webpackConfig.resolve.alias.set('vue-i18n', path.resolve(__dirname, 'node_modules/vue-i18n'));

    if (webpackConfig.plugins.has('fork-ts-checker')) {
      webpackConfig.plugin('fork-ts-checker').tap((args) => {
        const [forkCheckerOptions = {}] = args;

        return [
          {
            ...forkCheckerOptions,
            typescript: {
              ...(forkCheckerOptions.typescript || {}),
              typescriptPath: require.resolve('typescript'),
            },
          },
        ];
      });
    }
  };

  if (typeof vendorConfig.chainWebpack === 'function') {
    const originalChainWebpack = vendorConfig.chainWebpack;

    vendorConfig.chainWebpack = (webpackConfig) => {
      originalChainWebpack(webpackConfig);
      applyProjectOverrides(webpackConfig);
    };
  } else {
    vendorConfig.chainWebpack = (webpackConfig) => {
      applyProjectOverrides(webpackConfig);
    };
  }

  return vendorConfig;
};
