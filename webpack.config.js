var path = require('path');

var entry = path.join(__dirname, './src/index.js');
const sourcePath = path.join(__dirname, './src');
const outputPath = path.join(__dirname, './dist');

module.exports = {
  cache: false,

  mode: 'development', // 设置为开发模式
  entry: './src/index.js', // 入口文件
  output: {
    filename: 'webvtk.js', // 输出文件名
    path: path.resolve(__dirname, './dist'), // 输出路径
    library: "pian",
    path: outputPath,
  },
  devServer: {
    port: 8888,
    static: './dist', // 指定静态资源路径
    open: true,       // 自动打开浏览器
  },
  devtool: 'source-map', // 开启调试模式，生成 source map
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg|css|html|glsl)$/, // Matches image files
        type: 'asset/resource', // Built-in in Webpack 5
        use: ['html-loader', 'style-loader', 'css-loader', 'webpack-glsl-loader', '@babel/preset-env'], // Loaders to process CSS
      },
      {
        test: /\.js$/, // 处理项目中的 JS 文件
        exclude: /node_modules/, // 排除 node_modules
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      sourcePath,
    ],
  },
};
