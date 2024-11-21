const path = require('path');

module.exports = {
  entry: './webvtkjs/src/index.js', // Entry file
  output: {
    filename: 'webvtkjs.js', // Output file
    path: path.resolve(__dirname, './webvtkjs/dist'), // Output directory
  },
  mode: 'development', // or 'production'
};
