const path = require('path')
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const Dotenv = require('dotenv-webpack')

const cssnano = require('cssnano')

const PLATFORM = process.env.PLATFORM ? process.env.PLATFORM.toLowerCase() : 'web';

const config = {
  devtool: 'eval-source-map',
  mode: process.env.ENV ? 'production' : 'development',
  entry: [
    path.join(__dirname, 'client/src/index.js')
  ],
  output: {
    path: path.join(__dirname, 'client/dist'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.svg'],
    modules: [
      'client/src/components',
      'client/src',
      'client/static',
      'node_modules'
    ],
    alias: {
      yop: path.resolve(__dirname, 'client/src/framework/yop.js'),
    }

  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.(otf)$/,
        loader: 'file-loader'
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          plugins: [
            'transform-decorators-legacy',
            'transform-class-properties',
            'transform-function-bind',
            'transform-object-rest-spread',
            'transform-export-extensions',
            'transform-react-pug',
            'transform-react-jsx'
          ]
        }
      },
      {
        test: /\.svg$/,
        loader: 'raw-loader'
      },
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      },
    ]
  },
  plugins: [
    // Move to prod/noprod section for hash injection
    // new BundleAnalyzerPlugin(),
    new HtmlWebpackPlugin({
      template: 'client/static/index.html',
      inject: false
    }),
    new Dotenv(),
  ],
  devServer: {
    watchContentBase: true,
    watchOptions: {
      ignored: /node_modules/
    },
    publicPath: '/',
    historyApiFallback: true,
    stats: {
      excludeModules: /webpack/
    },
    inline: true,
    contentBase: path.join(__dirname, 'client/'),
    port: 3000,
    proxy: {
      // '/api': { target: 'httpπ://localhost:3001', secure: false },
      // '/static': { target: 'http://localhost:3001', secure: false },
      // '/api': { target: 'http://localhost:3001', secure: false },
      // '/static': { target: 'http://localhost:3001', secure: false },
      // '/static': { target: 'ws://localhost:3001', ws: true }
    }
  }
}

if (config.mode === 'production' && PLATFORM === 'web') {
  console.log('Doing prod business.');
  // what the hell was *this* for?
  // config.entry.shift();
  config.plugins.push(
    new CopyWebpackPlugin([{
      from: path.join(__dirname, 'client/static'),
      to: path.join(__dirname, 'client/dist/static')
    },
    {
      from: path.join(__dirname, 'client/src/service-worker.js'),
      to: path.join(__dirname, 'client/dist')      ,
    }]),
    new CopyWebpackPlugin([{
      from: path.join(__dirname, 'client/mobile'),
      to: path.join(__dirname, 'client/dist')
    }]),
    // WARNING: deprecated in 4 and should use mini-css-extract-plugin instead
    new ExtractTextPlugin({
      filename: 'styles.css',
      disable: false,
      allChunks: true
    }),
    // WARNING: might be as deprecated as the above; look into it when refactoring
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.optimize\.css$/g,
      cssProcessor: cssnano,
      cssProcessorOptions: { discardComments: { removeAll: true } },
      canPrint: true
    })
  )
  config.module.rules.push(
    {
      test: /\.scss$/,
      loader: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: ['css-loader', 'sass-loader']
      })
    },
    {
      test: /\.css$/,
      loaders: ['style-loader', 'css-loader']
    }
    // {
    //   test: /\.css$/,
    //   loader: ExtractTextPlugin.extract({
    //     fallback: 'style-loader', use: 'css-loader'
    //   })
    // }
  )
} else if (config.mode === 'production' && PLATFORM === 'droid') {
  console.log('Doing droid business.');
  // what the hell was *this* for?
  // config.entry.shift();

  config.output = {
    path: path.join(__dirname, 'native/cordova/www/webpack'),
    filename: 'bundle.js'
  };

  config.plugins.push(
    new CopyWebpackPlugin([{
      from: path.join(__dirname, 'client/static'),
      to: path.join(__dirname, 'native/cordova/www/webpack/static')
    },
    {
      from: path.join(__dirname, 'client/src/service-worker.js'),
      to: path.join(__dirname, 'native/cordova/www/webpack')      ,
    }]),

    // The base folder has icon-related files, so this is deprecated; will handle later
    // new CopyWebpackPlugin([{
    //   from: path.join(__dirname, 'client/mobile'),
    //   to: path.join(__dirname, 'native/cordova/www/webpack')
    // }]),
    // WARNING: deprecated in 4 and should use mini-css-extract-plugin instead

    new ExtractTextPlugin({
      filename: 'styles.css',
      disable: false,
      allChunks: true
    }),
    // WARNING: might be as deprecated as the above; look into it when refactoring
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.optimize\.css$/g,
      cssProcessor: cssnano,
      cssProcessorOptions: { discardComments: { removeAll: true } },
      canPrint: true
    }),
  );
  config.module.rules.push(
    {
      test: /\.scss$/,
      loader: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: ['css-loader', 'sass-loader']
      })
    },
    {
      test: /\.css$/,
      loaders: ['style-loader', 'css-loader']
    },
  );
} else {
  // config.devServer.overlay = {
  //   errors: true
  // }
  config.module.rules.push(
    // {
    //   test: /\.scss$/,
    //   loaders: ['style-loader', 'css-loader', 'sass-loader']
    // },
    {
      test: /\.css$/,
      loaders: ['style-loader', 'css-loader']
    }
  )
}

module.exports = function (env) {
  if (env && env.analyze === true) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
    config.plugins.push(new BundleAnalyzerPlugin())
  }

  return config
}
