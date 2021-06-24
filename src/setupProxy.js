const createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware;

let price = 900.12

module.exports = function(app) {
  const socketProxy = createProxyMiddleware('/ws', {
    target: 'ws://127.0.0.1:8546',
    ws: true,
    changeOrigin: true,
  });
  app.listen().on('upgrade', socketProxy.upgrade)

  app.use(
    '/ws',
    socketProxy
  )

  app.get('/price.json',(req, res) => {
    price = price + 5
    res.json({"data":{"base":"ETH","currency":"USD","amount": price.toString() }})
  });
};