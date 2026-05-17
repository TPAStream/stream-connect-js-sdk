/**
 * Webpack config for the SDK CommonJS bundles. Emits TWO files:
 *
 *   sdk.js          - default (styled) bundle. Bundles tailwind.css
 *                     so the built-in widgets render with their full
 *                     Plaid-Link chrome out of the box.
 *   sdk-headless.js - headless bundle. Same StreamConnect function,
 *                     no stylesheet. For customers driving every
 *                     step themselves via the renderXxx callbacks
 *                     who don't want the ~50 KB of Tailwind output.
 *
 * Both are consumed two ways:
 * 1. As an npm package (libraryTarget: 'commonjs2'). Stream wraps
 *    them per-version in assets/sdk_cdn/sdk-cdn-vXYZ.jsx for the
 *    CDN drop. The package.json `exports` field maps "." -> sdk.js
 *    and "./headless" -> sdk-headless.js so customers pick by
 *    import path.
 * 2. Via the /sdk-test sandbox in stevedev — see
 *    stream/templates/sdk_test.html, which shims module.exports to
 *    load sdk.js as a plain <script>.
 *
 * See docs/headless.md for the trade-off and integration recipe.
 */

const webpack = require('webpack');

module.exports = {
  entry: {
    sdk: './assets/sdk/entries/sdk.tsx',
    'sdk-headless': './assets/sdk/entries/sdk-headless.tsx'
  },
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
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  externals: {},
  node: {}
};
