/*
 * The Webpack configuration file for the front end JavaScript using React.
 * For background on the concerns that led to this being a separate Webpack
 * config, see:
 * https://stackoverflow.com/questions/50805626/webpack-4-multiple-sets-of-entries-with-code-splitting-unique-to-each
 */
const webpack = require('webpack');

module.exports = {
    entry: '../assets/sdk-hook/entries/sdk-hook.js',
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
                        presets: ["@babel/preset-env", "@babel/preset-react", {'plugins': ['@babel/plugin-proposal-class-properties']}]
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({}),
    ],
    output: {
        path: __dirname,
        filename: 'sdk.js',
        libraryTarget: 'commonjs2',
    },
    externals: {},
    node: {}
};
