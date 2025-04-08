require('dotenv').config();
const path = require('path');
const config = require('config');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { loadCSS, extractCSS } = require('./webpack.parts');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');

const pageTitles = {
  index: 'Welcome',
  signin: 'Sign In',
  signup: 'Sign Up',
  verification: 'Email Verification',
  resetpassword: 'Reset Password',
  userdash: 'Welcome',
  userprofile: 'Edit Profile',
  courtregistration: 'Court Registration',
  admindash: 'Welcome',
  usercourtlist: 'Reserve Court',
  usercourtreservation: 'Create Reservation',
  usercourtviewing: 'View Available Courts',
  userviewannouncement: 'View Announcement',
  userschedulereservation: 'Reservation Schedule',
  viewusercourtreservationsched: 'Reservation Schedule',
  adminschedulereservation: 'Schedule',
  adminviewuserpayment: 'User Payments',
  adminviewuserpaymentet: 'User Payments',
  adminviewuserpaymentproduct: 'User Payments',
  viewadminpost: 'View Posts',
  vieweventtournalist: 'Events and Tournaments',
  viewevent: 'View Event',
  ownerprofile: 'Owner Profile',
  businessprofile: 'Business Profile',
  pinpointprofile: 'Pin Point Profile',
  adminsettings: 'Settings',
  viewproduct: 'Product',
  userviewproducts: 'Products',
  community: 'Community',
  userviewmembership: 'View Membership',
  adminviewmembership: 'Membership',
  superadmindashboard: 'Admin',
  adminviewproduct: 'Manage Product',
  usercheckout: 'Place your Order',
  help: 'Help',
  userorderlist: 'My Orders'
};

// Page-specific stylesheets and scripts
const pageAssets = {
  index: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: false,
    hasSidebar: false
  },
  signin: {
    styles: [
      'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
    ],
    scripts: [
      'https://code.jquery.com/jquery-3.5.1.slim.min.js',
      'https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js',
      'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js'
    ],
    hasNavbar: false,
    hasSidebar: false
  },
  signup: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: false,
    hasSidebar: false
  },
  verification: {
    styles: [],
    scripts: [],
    hasNavbar: false,
    hasSidebar: false
  },
  resetpassword: {
    styles: [],
    scripts: [],
    hasNavbar: false,
    hasSidebar: false
  },
  userdash: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  userprofile: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  courtregistration: {
    styles: [],
    scripts: ['https://unpkg.com/@mapbox/leaflet-pip@1.1.0/leaflet-pip.js'],
    hasNavbar: false,
    hasSidebar: false
  },
  admindash: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  ownerprofile: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  businessprofile: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  pinpointprofile: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  viewproduct: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  adminschedulereservation: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  adminviewuserpayment: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  adminsettings: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  adminviewuserpaymentet: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  adminviewuserpaymentproduct: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  viewadminpost: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },

  usercourtlist: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasFooter: true,
    hasSidebar: false
  },
  usercourtviewing: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasFooter: true,
    hasSidebar: false
  },
  usercourtreservation: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css'
    ],
    scripts: ['https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js'],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  userviewannouncement: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  userviewmembership: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasFooter: true,
    hasSidebar: false
  },
  userschedulereservation: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasFooter: true,
    hasSidebar: false
  },
  viewusercourtreservationsched: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false
  },
  vieweventtournalist: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  viewevent: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  community: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  userviewmembership: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasFooter: true,
    hasSidebar: false
  },
  adminviewmembership: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  superadmindashboard: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: ['https://kit.fontawesome.com/a076d05399.js'],
    hasNavbar: false,
    hasSidebar: false
  },
  adminviewproduct: {
    styles: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
      'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
    ],
    scripts: [],
    hasNavbar: false,
    hasSidebar: true
  },
  userviewproducts: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false,
    hasFooter: true
  },
  usercheckout: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasFooter: true,
    hasNavbar: true,
    hasSidebar: false
  },
  help: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasNavbar: true,
    hasSidebar: false
  },
  userorderlist: {
    styles: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'],
    scripts: [],
    hasFooter: true,
    hasNavbar: true,
    hasSidebar: false
  }
};

const pages = Object.keys(pageTitles);

// Create an array to store HtmlWebpackPlugin instances
const htmlPlugins = pages.map((page) => {
  // Construct the file path
  const filePath = path.resolve(__dirname, 'client/views/partials', `${page}-body-content.html`);
  // Read the content of each file
  const bodyContent = fs.readFileSync(filePath, 'utf-8');

  // Get styles, scripts, and navbar flag for the page
  const {
    styles = [],
    scripts = [],
    hasNavbar = false,
    hasSidebar = false,
    hasFooter = false
  } = pageAssets[page] || {};

  const chunks = [page];

  return new HtmlWebpackPlugin({
    template: './client/views/template.ejs', // Template for all HTML pages
    filename: `./${page}.html`, // Output file for each page
    domain: config.get('frontendUrl'),
    bodyContent, // Inject the body content dynamically
    inject: 'body',
    title: pageTitles[page], // Inject title
    styles, // Pass styles to inject into the template
    scripts, // Pass scripts to inject into the template
    hasNavbar, // Enable the navbar
    hasSidebar, // Enable the sidenavadmin
    hasFooter,
    chunks, // Specify the chunk for this page
    minify: {
      collapseWhitespace: true,
      removeComments: true
    }
  });
});

module.exports = () => {
  const mode = process.env.NODE_ENV || 'development';
  const commonConfig = {
    mode: mode,
    devtool: mode === 'production' ? false : 'source-map',
    entry: {
      index: './client/js/pages/index/index.js',
      signin: './client/js/pages/signIn/signIn.js',
      signup: './client/js/pages/signUp/signUp.js',
      verification: './client/js/pages/verification/verification.js',
      resetpassword: './client/js/pages/resetpassword/resetPassword.js',
      userdash: './client/js/pages/userdash/userdash.js',
      userprofile: './client/js/pages/userprofile/userprofile.js',
      courtregistration: './client/js/pages/courtregistration/courtRegistration.js',
      admindash: './client/js/pages/admindash/admindash.js',
      adminschedulereservation: './client/js/pages/adminschedulereservation/adminScheduleReservation.js',
      adminviewuserpayment: './client/js/pages/adminviewuserpayment/adminViewUserPayment.js',
      adminviewuserpaymentet: './client/js/pages/adminviewuserpaymentet/adminViewUserPaymentET.js',
      adminviewuserpaymentproduct: './client/js/pages/adminviewuserpaymentproduct/adminViewUserPaymentProduct.js',
      viewadminpost: './client/js/pages/createpostadmin/createPostAdmin.js',
      usercourtlist: './client/js/pages/usercourtlist/userCourtList.js',
      usercourtviewing: './client/js/pages/usercourtviewing/userCourtViewing.js',
      usercourtreservation: './client/js/pages/usercourtreservation/userCourtReservation.js',
      userviewannouncement: './client/js/pages/userviewannouncement/userViewAnnouncement.js',
      userschedulereservation: './client/js/pages/userschedulereservation/userScheduleReservation.js',
      viewusercourtreservationsched: './client/js/pages/viewusercourtreservationsched/viewUserReservationSched.js',
      vieweventtournalist: './client/js/pages/vieweventtournalist/viewEventTournaList.js',
      viewevent: './client/js/pages/vieweventparticipants/viewEventParticipants.js',
      ownerprofile: './client/js/pages/ownerprofile/ownerProfile.js',
      pinpointprofile: './client/js/pages/pinpointprofile/pinpointProfile.js',
      businessprofile: './client/js/pages/businessprofile/businessProfile.js',
      adminsettings: './client/js/pages/adminsettings/adminSettings.js',
      community: './client/js/pages/community/community.js',
      adminviewmembership: './client/js/pages/adminviewmembership/adminMembership.js',
      userviewmembership: './client/js/pages/userviewmembership/userViewMembership.js',
      superadmindashboard: './client/js/pages/superadmindashboard/superAdminDashboard.js',
      adminviewproduct: './client/js/pages/adminviewproduct/adminViewProduct.js',
      userviewproducts: './client/js/pages/userviewproducts/userViewProducts.js',
      usercheckout: './client/js/pages/usercheckout/userCheckout.js',
      help: './client/js/pages/help/help.js',
      userorderlist: './client/js/pages/userorderlist/userOrderList.js'
    },
    output: {
      filename: '[name].[contenthash].js',
      path: path.resolve(__dirname, 'build'),
      publicPath: '/',
      assetModuleFilename: '[path][name][ext]',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ejs$/i,
          use: [{ loader: 'ejs-easy-loader' }]
        },
        {
          test: /\.(png|jpg|gif|svg|ico)$/, // Images
          type: 'asset/resource' // Asset modules for images
        },
        {
          test: /\.json$/,
          type: 'asset/resource'
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },
    plugins: [
      new FileManagerPlugin({
        events: {
          onStart: {
            delete: [
              {
                source: path.join(__dirname, 'build/').replaceAll('\\', '/'),
                options: {
                  force: true,
                  recursive: true
                }
              }
            ]
          },
          onEnd: {
            copy: [
              // Copy all JavaScript files
              { source: path.join(__dirname, 'build/*.js'), destination: path.join(__dirname, 'public') },
              // Copy all CSS files
              { source: path.join(__dirname, 'build/*.css'), destination: path.join(__dirname, 'public') },
              ...(mode === 'development'
                ? [{ source: path.join(__dirname, 'build/*.map'), destination: path.join(__dirname, 'public') }]
                : [])
            ]
          }
        },
        runTasksInSeries: false, // Run tasks in parallel
        runOnceInWatchMode: false // Run tasks only once in watch mode
      }),
      new CleanWebpackPlugin({
        protectWebpackAssets: false,
        cleanAfterEveryBuildPatterns: ['*.LICENSE.txt']
      }),

      new NodePolyfillPlugin(),
      ...htmlPlugins
    ],
    resolve: {
      roots: [path.resolve(__dirname, 'public'), path.resolve(__dirname, 'public/assets/images')],
      extensions: ['.json', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@css': path.resolve(__dirname, 'client/css')
      }
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: true
        })
      ],
      splitChunks: {
        chunks: 'all'
      }
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      compress: true,
      port: 3000,
      hot: true,
      proxy: [
        {
          context: ['/signin', '/api'],
          target: 'http://localhost:5000'
        }
      ]
    }
  };
  if (mode === 'production') {
    return merge(commonConfig, extractCSS({ use: 'css-loader' }));
  } else {
    return merge(commonConfig, loadCSS());
  }
};
