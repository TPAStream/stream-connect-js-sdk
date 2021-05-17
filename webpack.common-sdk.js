/*
 * The Webpack configuration file for the front end JavaScript using React.
 * For background on the concerns that led to this being a separate Webpack
 * config, see:
 * https://stackoverflow.com/questions/50805626/webpack-4-multiple-sets-of-entries-with-code-splitting-unique-to-each
 */

const webpack = require('webpack');
var WebpackAutoInject = require('webpack-auto-inject-version');

module.exports = {
    entry: './assets/sdk/entries/sdk.jsx',
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /.jsx?$/,
                exclude: /node_modules\/(?!(query-string|split-on-first|strict-uri-encode)\/).*/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"]
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({}),
        new WebpackAutoInject()
    ],
    output: {
        path: __dirname,
        filename: 'sdk.js',
        libraryTarget: 'commonjs2',
    },
    externals: {},
    node: {
        fs: 'empty'
    }
};
