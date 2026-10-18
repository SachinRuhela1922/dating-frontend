import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, serve the React app for /dashboard.html (it is a protected route, not a static file).
const dashboardHtml = () => ({
  name: 'dashboard-html',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => { if (req.url?.split('?')[0] === '/dashboard.html') req.url = '/index.html'; next(); });
  },
});

export default defineConfig({
  plugins: [react(), dashboardHtml()],
  server: { port: 5173, proxy: { '/api': 'https://dating-backend-59ur.onrender.com' ,
    '/socket.io': { target: 'https://dating-backend-59ur.onrender.com', ws: true }
  } }, // same-origin cookies in dev
});
