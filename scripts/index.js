const path = require("path");
const loaders = require("./loaders");
const plugins = require("./plugins");

const resolve = path.resolve;

const NODE_ENV = process.env.NODE_ENV
const distPath = NODE_ENV == 'development' ? '../dist' : '../build'

module.exports = {
  entry: {
    index: "./src/main.js",
  },
  devtool: "source-map",
  module: loaders,
  plugins,
  resolve: {
    extensions: [ ".js", ".wasm" ],
  },
  output: {
    webassemblyModuleFilename: "[modulehash].wasm",
    filename: "[name].js",
    path: path.resolve(__dirname, distPath),
  },
  optimization: {
    minimize: false,
  },
  devServer: {
    // host: 'localhost.specialurl.com',
    // https: true,
    overlay: {
      warnings: true,
      errors: true,
    },
    // hot: true,
    contentBase: path.join(__dirname, "./"),
    compress: true,
    progress: true,
    open: true
  },
};
