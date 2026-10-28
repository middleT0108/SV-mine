import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { db } from '../models/db';

export class RouterService {
  /**
   * Synchronizes active servers from the database into the mc-router routes file.
   */
  public static syncRoutes(): void {
    try {
      const routesDir = path.dirname(CONFIG.MC_ROUTER_ROUTES_FILE);
      if (!fs.existsSync(routesDir)) {
        fs.mkdirSync(routesDir, { recursive: true });
      }

      // Query all running and active servers from DB
      const servers = db.prepare(`
        SELECT subdomain, internal_port 
        FROM servers 
        WHERE status != 'deleted'
      `).all() as Array<{ subdomain: string; internal_port: number }>;

      const routesMap: Record<string, string> = {};

      for (const server of servers) {
        const fullHost = `${server.subdomain}.${CONFIG.DUCKDNS_BASE_DOMAIN}`;
        // Route to the backend host internal port (or container name:25565 on shared docker network)
        routesMap[fullHost] = `host.docker.internal:${server.internal_port}`;
        // Also support raw subdomain without suffix if connecting locally
        routesMap[server.subdomain] = `host.docker.internal:${server.internal_port}`;
      }

      const tempFile = `${CONFIG.MC_ROUTER_ROUTES_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(routesMap, null, 2), 'utf-8');
      fs.renameSync(tempFile, CONFIG.MC_ROUTER_ROUTES_FILE);

      console.log(`[mc-router] Updated ${Object.keys(routesMap).length / 2} server route mappings.`);
    } catch (error: any) {
      console.error('[mc-router] Failed to sync routing configuration:', error.message);
    }
  }
}
