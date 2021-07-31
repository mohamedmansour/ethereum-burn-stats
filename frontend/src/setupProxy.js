const {createProxyMiddleware} = require('http-proxy-middleware');
let price = 1900.12

module.exports = function(app) {
  app.use(createProxyMiddleware('/ws', {
    target: 'http://localhost:8080',
    ws: true,
    logLevel: 'debug'
  }));
  app.get('/price.json',(req, res) => {
    price = price + 5
    res.json({"data":{"base":"ETH","currency":"USD","amount": price.toString() }})
  });
};