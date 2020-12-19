module.exports = {
  productionSourceMap: false,
  css: {
    loaderOptions: {
      sass: {
        additionalData: '@import "@/sass/_variables.sass"',
      },
    },
  },
};
