// note:
// this is a no-frills webpack that just transpiles es6 and sass
// it has loaders for fonts, and is ready for pixi.js
// this is NOT a prod webpack

var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  entry: [
    './src/app'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: 'dist/'
  },
  plugins: [
    new ExtractTextPlugin('main.css', { 
      allChunks: true,
    })
  ],
  module: {
    loaders: [{
        test: /\.js$/,
        loaders: [
          'babel-loader'
        ],
        include: path.join(__dirname, 'src')
      }, {
        test: /\.html$/,
        loader: 'raw',
        exclude: /node_modules/
      },
      { test: /\.scss?$/,    loader: ExtractTextPlugin.extract('css-loader!sass-loader'),    }, {
        test: /\.(eot|svg|ttf|woff|woff2|otf)$/,
        loader: 'file?name=public/fonts/[name].[ext]'
      }, {
        test: /\.(png|jpg|gif|jpeg)$/,
        loader: 'file-loader'
      }
    ],
    postLoaders: [{
      include: path.resolve(__dirname, 'node_modules/pixi.js'),
      loader: 'transform?brfs'
    }]
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.json', '.scss', 'sass', 'css']
  }
};
