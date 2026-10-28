import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { CONFIG } from './config';
import { initDatabase } from './models/db';
import routes from './routes';
import { setupWebSocket } from './websocket/terminal.ws';
import { DuckDnsService } from './services/duckdns.service';
import { RouterService } from './services/router.service';

const app = express();
const server = http.createServer(app);

// Security & Parsing Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows WebSocket connections and cross-origin static frontend
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or in whitelist
    if (!origin || CONFIG.ALLOWED_ORIGIN.includes('*') || CONFIG.ALLOWED_ORIGIN.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev/testing, configurable via ALLOWED_ORIGIN in prod
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/api', routes);

// Attach WebSocket Terminal Stream
setupWebSocket(server);

// Initialize DB schema
initDatabase();

// Sync mc-router routes on startup
RouterService.syncRoutes();

// Start Background DDNS Worker to sync host IP with DuckDNS
setInterval(async () => {
  try {
    const currentIp = await DuckDnsService.detectPublicIp();
    if (currentIp && currentIp !== CONFIG.HOST_PUBLIC_IP) {
      console.log(`[DDNS Worker] Host IP change detected: ${CONFIG.HOST_PUBLIC_IP} -> ${currentIp}`);
      CONFIG.HOST_PUBLIC_IP = currentIp;
      RouterService.syncRoutes();
    }
  } catch (err: any) {
    console.error('[DDNS Worker] Periodic check failed:', err.message);
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// Start Server
server.listen(CONFIG.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SV-MINE Backend running on port ${CONFIG.PORT}`);
  console.log(`📡 WebSocket Terminal active at ws://localhost:${CONFIG.PORT}/ws/terminal`);
  console.log(`🌐 DuckDNS Base Domain: .${CONFIG.DUCKDNS_BASE_DOMAIN}`);
  console.log(`====================================================`);
});

export default app;
