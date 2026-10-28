import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../models/db';
import { CONFIG } from '../config';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { DockerService } from '../services/docker.service';
import { DuckDnsService } from '../services/duckdns.service';
import { RouterService } from '../services/router.service';

const createServerSchema = z.object({
  name: z.string().min(2).max(50),
  subdomain: z.string().min(3).max(20),
  serverType: z.enum(['PAPER', 'FABRIC', 'FORGE', 'VANILLA', 'PURPUR']).default('PAPER'),
  mcVersion: z.string().default('LATEST'),
  ramMb: z.number().min(1024).max(CONFIG.MAX_RAM_MB_PER_SERVER).default(CONFIG.DEFAULT_RAM_MB),
  maxPlayers: z.number().min(1).max(50).default(20),
  gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).default('survival'),
  seed: z.string().optional().default(''),
  enableWhitelist: z.boolean().default(false)
});

export class ServerController {
  public static async listServers(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const servers = db.prepare(`
        SELECT id, name, subdomain, server_type, mc_version, ram_mb, max_players, 
               gamemode, internal_port, status, created_at 
        FROM servers 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId) as any[];

      // Enhance server list with full connection addresses
      const enhanced = servers.map((srv) => ({
        ...srv,
        fullDomain: `${srv.subdomain}.${CONFIG.DUCKDNS_BASE_DOMAIN}`,
        routerAddress: `${srv.subdomain}.${CONFIG.DUCKDNS_BASE_DOMAIN}`,
        directAddress: `${CONFIG.HOST_PUBLIC_IP || '127.0.0.1'}:${srv.internal_port}`
      }));

      res.json({ success: true, servers: enhanced });
    } catch (err: any) {
      console.error('[ServerController] List error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare(`
        SELECT * FROM servers WHERE id = ? AND user_id = ?
      `).get(id, userId) as any;

      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      let liveStats = { cpuPercent: 0, memoryUsageMb: 0, memoryLimitMb: 0, isOnline: false };
      if (server.container_id) {
        liveStats = await DockerService.getContainerStats(server.container_id);
      }

      res.json({
        success: true,
        server: {
          ...server,
          fullDomain: `${server.subdomain}.${CONFIG.DUCKDNS_BASE_DOMAIN}`,
          directAddress: `${CONFIG.HOST_PUBLIC_IP || '127.0.0.1'}:${server.internal_port}`,
          stats: liveStats
        }
      });
    } catch (err: any) {
      console.error('[ServerController] Get server error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Check current user server quota
      const userServerCount = db.prepare(`
        SELECT COUNT(*) as count FROM servers WHERE user_id = ?
      `).get(userId) as { count: number };

      if (userServerCount.count >= CONFIG.MAX_SERVERS_PER_USER) {
        res.status(403).json({
          success: false,
          message: `Zero-cost quota exceeded. Maximum ${CONFIG.MAX_SERVERS_PER_USER} servers allowed per account.`
        });
        return;
      }

      const parsed = createServerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Invalid server options.', errors: parsed.error.issues });
        return;
      }

      const { name, subdomain, serverType, mcVersion, ramMb, maxPlayers, gamemode, seed, enableWhitelist } = parsed.data;

      // Validate subdomain format and system blacklists
      const domainValidation = DuckDnsService.validateSubdomain(subdomain);
      if (!domainValidation.isValid) {
        res.status(400).json({ success: false, message: domainValidation.error });
        return;
      }

      // Check duplicate subdomain in database
      const existing = db.prepare('SELECT id FROM servers WHERE subdomain = ?').get(subdomain.toLowerCase());
      if (existing) {
        res.status(409).json({ success: false, message: `Subdomain "${subdomain}" is already taken.` });
        return;
      }

      // Allocate unique host ports for Minecraft and RCON
      const internalPort = await DockerService.allocatePort(25566);
      const rconPort = await DockerService.allocatePort(internalPort + 100);
      const rconPassword = crypto.randomBytes(12).toString('hex');
      const serverId = crypto.randomUUID();

      // Create Docker Container
      const containerId = await DockerService.createServerContainer({
        subdomain: subdomain.toLowerCase(),
        serverType,
        mcVersion,
        ramMb,
        maxPlayers,
        gamemode,
        seed,
        enableWhitelist,
        rconPassword,
        internalPort,
        rconPort
      });

      // Save to SQLite
      db.prepare(`
        INSERT INTO servers (
          id, user_id, name, subdomain, server_type, mc_version, ram_mb, max_players,
          gamemode, seed, enable_whitelist, rcon_password, container_id, internal_port, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'starting')
      `).run(
        serverId, userId, name, subdomain.toLowerCase(), serverType, mcVersion, ramMb,
        maxPlayers, gamemode, seed, enableWhitelist ? 1 : 0, rconPassword, containerId, internalPort
      );

      // Register or update DNS record via DuckDNS API
      await DuckDnsService.updateRecord(subdomain.toLowerCase());

      // Update mc-router dynamic routing configuration
      RouterService.syncRoutes();

      // Start container
      await DockerService.startServer(containerId);

      // Update status to running
      db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('running', serverId);

      res.status(201).json({
        success: true,
        message: 'Minecraft server created and deployed successfully.',
        server: {
          id: serverId,
          name,
          subdomain: subdomain.toLowerCase(),
          fullDomain: `${subdomain.toLowerCase()}.${CONFIG.DUCKDNS_BASE_DOMAIN}`,
          directPort: internalPort,
          status: 'running'
        }
      });
    } catch (err: any) {
      console.error('[ServerController] Create error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async startServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT container_id FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server || !server.container_id) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      await DockerService.startServer(server.container_id);
      db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('running', id);

      res.json({ success: true, message: 'Server started successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async stopServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server || !server.container_id) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      await DockerService.stopServer(server.container_id, server.internal_port + 100, server.rcon_password);
      db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('stopped', id);

      res.json({ success: true, message: 'Server stopped successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async restartServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT container_id FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server || !server.container_id) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      await DockerService.restartServer(server.container_id);
      db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('running', id);

      res.json({ success: true, message: 'Server restarted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async sendCommand(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { command } = req.body;
      const userId = req.user!.id;

      if (!command || typeof command !== 'string') {
        res.status(400).json({ success: false, message: 'Command is required.' });
        return;
      }

      const server = db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      const rconPort = server.internal_port + 100;
      const response = await DockerService.sendRconCommand('127.0.0.1', rconPort, server.rcon_password, command);

      res.json({ success: true, output: response || 'Command executed.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `RCON Error: ${err.message}` });
    }
  }

  public static async getProperties(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT subdomain FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      const props = DockerService.readPropertiesFile(server.subdomain);
      res.json({ success: true, properties: props });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateProperties(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { properties } = req.body;
      const userId = req.user!.id;

      if (!properties || typeof properties !== 'object') {
        res.status(400).json({ success: false, message: 'Properties object is required.' });
        return;
      }

      const server = db.prepare('SELECT subdomain FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      DockerService.writePropertiesFile(server.subdomain, properties);
      res.json({ success: true, message: 'Configuration saved. Restart server to apply changes.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteServer(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      // Remove Docker container & local files
      if (server.container_id) {
        await DockerService.removeServer(server.container_id, server.subdomain);
      }

      // Reset DuckDNS subdomain mapping
      await DuckDnsService.releaseRecord(server.subdomain);

      // Remove from DB
      db.prepare('DELETE FROM servers WHERE id = ?').run(id);

      // Sync routing table
      RouterService.syncRoutes();

      res.json({ success: true, message: 'Server deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
