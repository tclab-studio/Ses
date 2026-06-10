const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode"),
};

config.transformer.minifierConfig = {
  compress: {
    reduce_funcs: false,
  },
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, { input: "./src/global.css" });
