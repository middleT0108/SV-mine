export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface ServerStats {
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  isOnline: boolean;
}

export interface MinecraftServer {
  id: string;
  name: string;
  subdomain: string;
  server_type: 'PAPER' | 'FABRIC' | 'FORGE' | 'VANILLA' | 'PURPUR';
  mc_version: string;
  ram_mb: number;
  max_players: number;
  gamemode: string;
  internal_port: number;
  status: 'running' | 'stopped' | 'starting' | 'error';
  created_at: string;
  fullDomain?: string;
  directAddress?: string;
  stats?: ServerStats;
}

export interface ServerBackup {
  id: string;
  filename: string;
  file_size_bytes: number;
  storage_type: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  servers?: MinecraftServer[];
  server?: MinecraftServer;
  backups?: ServerBackup[];
  backup?: ServerBackup;
  token?: string;
  user?: User;
  properties?: Record<string, string>;
  output?: string;
}
