require('source-map-support/register');
require('babel-polyfill');
require('babel-register')({
  presets: ['./config/babel/node-dev'],
});
require('./config/gulp');
