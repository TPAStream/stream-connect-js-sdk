/**
 * Webpack config for the SDK CommonJS bundle (sdk.js).
 *
 * The bundle is consumed two ways:
 * 1. As an npm package (libraryTarget: 'commonjs2'). Stream wraps it
 *    per-version in assets/sdk_cdn/sdk-cdn-vXYZ.jsx for the CDN drop.
 * 2. Via the /sdk-test sandbox in stevedev — see
 *    stream/templates/sdk_test.html, which shims module.exports to
 *    load this file as a plain <script>.
 */

const webpack = require('webpack');

module.exports = {
  entry: './assets/sdk/entries/sdk.tsx',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  plugins: [new webpack.ProvidePlugin({})],
  output: {
    path: __dirname,
    filename: 'sdk.js',
    libraryTarget: 'commonjs2'
  },
  externals: {},
  node: {}
};
