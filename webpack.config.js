const path = require('path');

module.exports = {
  entry: './webvtkjs/src/index.js', // Entry file
  output: {
    filename: 'webvtkjs.js', // Output file
    path: path.resolve(__dirname, './webvtkjs/dist'), // Output directory
  },
  mode: 'development', // or 'production'
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg|css|html)$/, // Matches image files
        type: 'asset/resource', // Built-in in Webpack 5
        use: ['style-loader', 'css-loader'], // Loaders to process CSS
      },
    ],
  },
};
