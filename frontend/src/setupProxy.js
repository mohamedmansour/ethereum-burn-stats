const {createProxyMiddleware} = require('http-proxy-middleware');
let price = 1900.12

module.exports = function(app) {
  app.use('/ws', createProxyMiddleware('/', {
    target: process.env.REACT_APP_WEB3_URL,
    ws: true,
    logLevel: 'debug'
  }));
};