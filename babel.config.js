module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          // Match the SDK's claimed support window. esmodules:true gives
          // us a modern baseline (ES2018-ish) which is fine for any
          // browser shipped after 2020. Anyone older than that won't be
          // running React 19 on the host page anyway.
          esmodules: true
        }
      }
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ]
};
