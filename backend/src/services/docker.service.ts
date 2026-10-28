import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import { Rcon } from 'rcon-client';
import { CONFIG } from '../config';

const docker = new Docker({ socketPath: CONFIG.DOCKER_SOCKET });

export interface CreateServerContainerOptions {
  subdomain: string;
  serverType: string;
  mcVersion: string;
  ramMb: number;
  maxPlayers: number;
  gamemode: string;
  seed?: string;
  enableWhitelist?: boolean;
  rconPassword: string;
  internalPort: number;
  rconPort: number;
}

export interface ContainerStatsSummary {
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  isOnline: boolean;
}

export class DockerService {
  /**
   * Finds an available port on the host starting from a baseline port.
   */
  public static async allocatePort(basePort = 25566): Promise<number> {
    const net = await import('net');
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(DockerService.allocatePort(basePort + 1));
        } else {
          reject(err);
        }
      });
      server.listen(basePort, () => {
        server.close(() => {
          resolve(basePort);
        });
      });
    });
  }

  /**
   * Creates and initializes a new itzg/minecraft-server container.
   */
  public static async createServerContainer(options: CreateServerContainerOptions): Promise<string> {
    const containerName = `svmine-${options.subdomain}`;
    const dataDir = path.join(CONFIG.MC_DATA_DIR, options.subdomain);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o775 });
    }

    // Limit JVM heap to leave headroom for OS and off-heap memory
    const jvmMemory = Math.floor(options.ramMb * 0.85);

    const env = [
      'EULA=TRUE',
      `TYPE=${options.serverType.toUpperCase()}`,
      `VERSION=${options.mcVersion || 'LATEST'}`,
      `MEMORY=${jvmMemory}M`,
      'USE_AIKAR_FLAGS=true',
      'VIEW_DISTANCE=6',
      'SIMULATION_DISTANCE=4',
      'NETWORK_COMPRESSION_THRESHOLD=256',
      'ENABLE_RCON=true',
      `RCON_PASSWORD=${options.rconPassword}`,
      'RCON_PORT=25575',
      `MAX_PLAYERS=${options.maxPlayers}`,
      `MODE=${options.gamemode}`,
      options.seed ? `SEED=${options.seed}` : 'SEED=',
      `ENABLE_WHITELIST=${options.enableWhitelist ? 'TRUE' : 'FALSE'}`,
      'ONLINE_MODE=FALSE', // Cracked/Offline mode friendly for VN players, toggleable in server.properties
      'OVERRIDE_SERVER_PROPERTIES=false'
    ];

    const hostConfig: Docker.HostConfig = {
      PortBindings: {
        '25565/tcp': [{ HostPort: options.internalPort.toString() }],
        '25575/tcp': [{ HostPort: options.rconPort.toString() }]
      },
      Binds: [`${dataDir}:/data`],
      RestartPolicy: { Name: 'unless-stopped' },
      Memory: options.ramMb * 1024 * 1024,
      NanoCPUs: 2 * 1000000000 // Limit to 2 CPU cores
    };

    const container = await docker.createContainer({
      Image: 'itzg/minecraft-server:latest',
      name: containerName,
      Env: env,
      HostConfig: hostConfig,
      ExposedPorts: {
        '25565/tcp': {},
        '25575/tcp': {}
      },
      Tty: true,
      OpenStdin: true
    });

    return container.id;
  }

  /**
   * Starts a Minecraft server container.
   */
  public static async startServer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.start();
  }

  /**
   * Gracefully stops a Minecraft server container via RCON 'stop' before stopping Docker container.
   */
  public static async stopServer(containerId: string, rconPort?: number, rconPassword?: string): Promise<void> {
    if (rconPort && rconPassword) {
      try {
        await this.sendRconCommand('127.0.0.1', rconPort, rconPassword, 'stop');
        await new Promise((res) => setTimeout(res, 3000));
      } catch (ignored) {
        // Fallback to container stop
      }
    }

    const container = docker.getContainer(containerId);
    await container.stop({ t: 15 });
  }

  /**
   * Restarts a Minecraft server container.
   */
  public static async restartServer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.restart({ t: 15 });
  }

  /**
   * Deletes and removes a Minecraft server container and its network mappings.
   */
  public static async removeServer(containerId: string, subdomain: string): Promise<void> {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 5 });
    } catch (ignored) {}

    await container.remove({ force: true });

    // Optional: Keep or purge files based on retention policy
    const dataDir = path.join(CONFIG.MC_DATA_DIR, subdomain);
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  }

  /**
   * Sends an in-game command via RCON protocol.
   */
  public static async sendRconCommand(
    host: string,
    port: number,
    password: string,
    command: string
  ): Promise<string> {
    const rcon = await Rcon.connect({
      host,
      port,
      password,
      timeout: 5000
    });

    try {
      const response = await rcon.send(command);
      return response;
    } finally {
      await rcon.end();
    }
  }

  /**
   * Fetches real-time CPU and Memory stats from Docker container daemon.
   */
  public static async getContainerStats(containerId: string): Promise<ContainerStatsSummary> {
    try {
      const container = docker.getContainer(containerId);
      const inspect = await container.inspect();

      if (!inspect.State.Running) {
        return { cpuPercent: 0, memoryUsageMb: 0, memoryLimitMb: 0, isOnline: false };
      }

      const statsStream: any = await container.stats({ stream: false });
      
      const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage - statsStream.precpu_stats.cpu_usage.total_usage;
      const systemDelta = statsStream.cpu_stats.system_cpu_usage - statsStream.precpu_stats.system_cpu_usage;
      const onlineCpus = statsStream.cpu_stats.online_cpus || 1;

      let cpuPercent = 0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = Math.round((cpuDelta / systemDelta) * onlineCpus * 100 * 10) / 10;
      }

      const memoryUsageMb = Math.round(statsStream.memory_stats.usage / (1024 * 1024));
      const memoryLimitMb = Math.round(statsStream.memory_stats.limit / (1024 * 1024));

      return {
        cpuPercent,
        memoryUsageMb,
        memoryLimitMb,
        isOnline: true
      };
    } catch (err) {
      return { cpuPercent: 0, memoryUsageMb: 0, memoryLimitMb: 0, isOnline: false };
    }
  }

  /**
   * Streams logs directly from container to a callback or WebSocket.
   */
  public static async getLogStream(containerId: string, tailLines = 100): Promise<NodeJS.ReadableStream> {
    const container = docker.getContainer(containerId);
    return await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: tailLines,
      timestamps: true
    });
  }

  /**
   * Reads server.properties file from the container volume.
   */
  public static readPropertiesFile(subdomain: string): Record<string, string> {
    const filePath = path.join(CONFIG.MC_DATA_DIR, subdomain, 'server.properties');
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const result: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        const key = parts[0]?.trim();
        const val = parts.slice(1).join('=').trim();
        if (key) {
          result[key] = val;
        }
      }
    });

    return result;
  }

  /**
   * Updates server.properties file on disk.
   */
  public static writePropertiesFile(subdomain: string, properties: Record<string, string>): void {
    const filePath = path.join(CONFIG.MC_DATA_DIR, subdomain, 'server.properties');
    let output = '# Minecraft server properties generated by SV-mine\n';
    for (const [key, val] of Object.entries(properties)) {
      output += `${key}=${val}\n`;
    }
    fs.writeFileSync(filePath, output, 'utf-8');
  }
}
