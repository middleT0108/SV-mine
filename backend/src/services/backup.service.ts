import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { CONFIG } from '../config';
import { db } from '../models/db';

const execAsync = promisify(exec);

export class BackupService {
  /**
   * Creates a compressed tar.gz archive of the server's data directory.
   */
  public static async createBackup(serverId: string, subdomain: string): Promise<{ id: string; filename: string; size: number }> {
    const backupDir = path.join(CONFIG.MC_BACKUP_DIR, subdomain);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${subdomain}-${timestamp}.tar.gz`;
    const targetPath = path.join(backupDir, filename);
    const sourceDir = path.join(CONFIG.MC_DATA_DIR, subdomain);

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Server data directory does not exist: ${sourceDir}`);
    }

    // Create tar.gz excluding temporary cache files
    const tarCmd = `tar -czf "${targetPath}" -C "${CONFIG.MC_DATA_DIR}" --exclude="${subdomain}/cache" --exclude="${subdomain}/*.log" "${subdomain}"`;
    await execAsync(tarCmd);

    const stats = fs.statSync(targetPath);
    const backupId = crypto.randomUUID();

    // Store record in SQLite database
    db.prepare(`
      INSERT INTO backups (id, server_id, filename, file_size_bytes, storage_type, created_at)
      VALUES (?, ?, ?, ?, 'local', CURRENT_TIMESTAMP)
    `).run(backupId, serverId, filename, stats.size);

    // Prune old backups to respect zero-cost storage boundaries
    await this.pruneOldBackups(serverId, subdomain);

    return {
      id: backupId,
      filename,
      size: stats.size
    };
  }

  /**
   * Prunes oldest backups beyond the retention limit MAX_BACKUP_COPIES.
   */
  public static async pruneOldBackups(serverId: string, subdomain: string): Promise<void> {
    const backups = db.prepare(`
      SELECT id, filename 
      FROM backups 
      WHERE server_id = ? 
      ORDER BY created_at DESC
    `).all(serverId) as Array<{ id: string; filename: string }>;

    if (backups.length > CONFIG.MAX_BACKUP_COPIES) {
      const toDelete = backups.slice(CONFIG.MAX_BACKUP_COPIES);
      for (const item of toDelete) {
        const filePath = path.join(CONFIG.MC_BACKUP_DIR, subdomain, item.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        db.prepare('DELETE FROM backups WHERE id = ?').run(item.id);
        console.log(`[Backup] Pruned old backup archive: ${item.filename}`);
      }
    }
  }

  /**
   * Restores a server from a backup tar.gz archive.
   */
  public static async restoreBackup(subdomain: string, filename: string): Promise<void> {
    const backupPath = path.join(CONFIG.MC_BACKUP_DIR, subdomain, filename);
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup archive file not found on disk.');
    }

    const targetDir = path.join(CONFIG.MC_DATA_DIR, subdomain);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const extractCmd = `tar -xzf "${backupPath}" -C "${CONFIG.MC_DATA_DIR}"`;
    await execAsync(extractCmd);
    console.log(`[Backup] Server ${subdomain} restored successfully from ${filename}`);
  }
}
