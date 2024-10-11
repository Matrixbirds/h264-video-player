const path = require("path");

const env = process.env;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const babelLoader = {
  test: /\.js?$/,
  use: {
    loader: "babel-loader",
    options: {
      presets: ['@babel/preset-env'],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
      ]
    }
  },
  exclude: /node_modules/,
};

const styleLoader = env.NODE_ENV !== 'production' ? "style-loader" : MiniCssExtractPlugin.loader;

const cssLoader = {
  test: /\.css$/,
  use: [
    styleLoader,
    "css-loader",
  ],
};

const scssLoader = {
  test: /\.scss$/,
  use: [
    styleLoader,
    "css-loader",
    "sass-loader"
  ]
}

const fileLoader = {
  test: /\.(png|svg|jpg|gif)$/,
  use: "file-loader",
};

const fontLoader = {
  test: /\.(woff|woff2|eot|ttf|otf)$/,
  use: "file-loader",
};

const mediaLoader = {
  test: /\.(mp4|mp3)$/,
  use: [
    {
      loader: "file-loader",
      options: {
        name: '[path][name].[ext]'
      }
    }
  ]
}

const wasmLoader = {
  test: /\.wasm$/,
  type: "webassembly/experimental"
}

module.exports = {
  rules: [
    babelLoader,
    cssLoader,
    scssLoader,
    fileLoader,
    fontLoader,
    mediaLoader,
    wasmLoader
  ],
};
