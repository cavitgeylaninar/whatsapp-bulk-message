const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3500',
      changeOrigin: true,
      ws: false, // API calls için WebSocket'i devre dışı bırak
    })
  );

  // Socket.io proxy (eğer backend socket.io kullanıyorsa)
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:3500',
      changeOrigin: true,
      ws: true,
    })
  );

  // WebSocket proxy'yi kaldır - React dev server kendi WebSocket'ini kullanıyor
};