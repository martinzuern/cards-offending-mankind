module.exports = {
  productionSourceMap: true,
  css: {
    loaderOptions: {
      sass: {
        additionalData: '@import "@/sass/_variables.sass"',
      },
    },
  },
};
