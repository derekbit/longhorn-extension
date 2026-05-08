const path = require('path');
const vendorConfigFactory = require('./.shell/pkg/vue.config');

module.exports = () => {
  const vendorConfig = typeof vendorConfigFactory === 'function' ? vendorConfigFactory(__dirname) : vendorConfigFactory;

  const vendorConfigureWebpack = vendorConfig.configureWebpack;
  const customConfigureWebpack = (config) => {
    if (typeof vendorConfigureWebpack === 'function') {
      vendorConfigureWebpack(config);
    }
    config.resolve.alias['@longhorn'] = path.resolve(__dirname);
  };

  const vendorChainWebpack = vendorConfig.chainWebpack;
  const customChainWebpack = (webpackConfig) => {
    if (typeof vendorChainWebpack === 'function') {
      vendorChainWebpack(webpackConfig);
    }

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

  return Object.assign({}, vendorConfig, {
    configureWebpack: customConfigureWebpack,
    chainWebpack: customChainWebpack,
  });
};
