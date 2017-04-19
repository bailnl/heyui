module.exports = {
  root: "build",
  webpack: {
    umd: {
      entry: "./index.js",
      library: "HeyUI",
      filename: 'heyui.js'
    },
    global: {
      Vue: "vue"
    },
    externals: {
      Vue: "window.Vue"
    }
  }
};
