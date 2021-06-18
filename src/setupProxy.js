const createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware

module.exports = function (app) {
  const socketProxy = createProxyMiddleware('/ws', {
    target: 'ws://127.0.0.1:8546',
    ws: true,
    changeOrigin: true,
  })
  app.listen().on('upgrade', socketProxy.upgrade)

  app.use('/ws', socketProxy)
}
