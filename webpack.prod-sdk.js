const merge = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common-sdk.js');

module.exports = merge(common, {
    mode: 'production',
    optimization: {
        minimize: true
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
});
