const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const TSLintPlugin = require("tslint-webpack-plugin");
const FriendlyErrorsPlugin = require("friendly-errors-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const path = require("path")
const NODE_ENV = process.env.NODE_ENV
const resolve = path.resolve
const copyPath = NODE_ENV == 'development' ? '../dist' : '../build'

const webpack = require('webpack')

const plugins = [
  new HtmlWebpackPlugin({
    filename: "index.html",
    template: path.resolve(__dirname, "../index.html"),
  }),
  new CleanWebpackPlugin(),
  new FriendlyErrorsPlugin({
    compilationSuccessInfo: {
      messages: ["You application is running here http://localhost:3000"],
      notes: ["Some additionnal notes to be displayed upon successful compilation"],
    },
    onErrors: function(severity, errors) {},
    clearConsole: true,
    additionalFormatters: [],
    additionalTransformers: [],
  }),
  new MiniCssExtractPlugin({
    filename: "[name].[hash].scss",
    chunkFilename: "[id].css"
  }),
  new CopyPlugin([
    { from: resolve(__dirname, '../assets'), to: resolve(__dirname, copyPath) },
  ]),
  new webpack.DefinePlugin({
      // simple nalu websocket gateway 
      $WEBSOCKET_URL: NODE_ENV === 'production' ? `'wss://your-production-domain?uid=$uid&cmd=subscribe'` : `'ws://your-test-domain?uid=$uid&cmd=subscribe'`
  })
];

module.exports = plugins;
