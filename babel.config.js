module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          // `esmodules: true` resolves (via Browserslist) to any browser
          // that supports native ES module loading. That's a broader
          // window than "browsers shipped after 2020"; it includes
          // older versions of Safari, Chrome, Edge, Firefox going back
          // several years (any release that supports <script type="module">).
          // The practical floor for us is whatever those browsers
          // happened to also support; React 19's own browser
          // requirements (the heavier constraint in practice) end up
          // being the real gating factor for SDK consumers.
          esmodules: true
        }
      }
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ]
};
