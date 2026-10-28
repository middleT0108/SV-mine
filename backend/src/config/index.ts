import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_key_change_in_prod',
  ALLOWED_ORIGIN: (process.env.ALLOWED_ORIGIN || 'http://localhost:5173').split(','),
  
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/sv_mine.sqlite'),
  MC_DATA_DIR: process.env.MC_DATA_DIR || '/var/minecraft/servers',
  MC_BACKUP_DIR: process.env.MC_BACKUP_DIR || '/var/minecraft/backups',
  MC_ROUTER_ROUTES_FILE: process.env.MC_ROUTER_ROUTES_FILE || '/var/minecraft/router/routes.json',
  
  MAX_BACKUP_COPIES: parseInt(process.env.MAX_BACKUP_COPIES || '3', 10),
  
  HOST_PUBLIC_IP: process.env.HOST_PUBLIC_IP || '',
  DUCKDNS_TOKEN: process.env.DUCKDNS_TOKEN || '',
  DUCKDNS_BASE_DOMAIN: process.env.DUCKDNS_BASE_DOMAIN || 'duckdns.org',
  
  MAX_SERVERS_PER_USER: parseInt(process.env.MAX_SERVERS_PER_USER || '2', 10),
  MAX_RAM_MB_PER_SERVER: parseInt(process.env.MAX_RAM_MB_PER_SERVER || '6144', 10),
  DEFAULT_RAM_MB: parseInt(process.env.DEFAULT_RAM_MB || '3072', 10),
  
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
};
