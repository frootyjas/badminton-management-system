const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

exports.loadCSS = () => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
});

exports.extractCSS = ({ include, exclude, use = [] }) => {
  // Output extracted CSS to a file
  const plugin = new MiniCssExtractPlugin({
    filename: '[name].[contenthash].css',
    chunkFilename: '[id].[contenthash].css'
  });

  return {
    module: {
      rules: [
        {
          test: /\.css$/,
          include,
          exclude,
          // use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader'].concat(use)
          use: [MiniCssExtractPlugin.loader].concat(use)
        }
      ]
    },
    plugins: [plugin],
    optimization: {
      minimizer: [
        '...', // keeps existing minimizers (example for JS TerserPlugin)
        new CssMinimizerPlugin() // minimizes CSS files for production
      ]
    }
  };
};
