import { Response } from 'express';
import { db } from '../models/db';
import { RequestWithUser } from '../middlewares/auth.middleware';
import { BackupService } from '../services/backup.service';

export class BackupController {
  public static async listBackups(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const userId = req.user!.id;

      // Check ownership
      const server = db.prepare('SELECT id FROM servers WHERE id = ? AND user_id = ?').get(serverId, userId);
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      const backups = db.prepare(`
        SELECT id, filename, file_size_bytes, storage_type, created_at 
        FROM backups 
        WHERE server_id = ?
        ORDER BY created_at DESC
      `).all(serverId);

      res.json({ success: true, backups });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createBackup(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT id, subdomain FROM servers WHERE id = ? AND user_id = ?').get(serverId, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      const result = await BackupService.createBackup(server.id, server.subdomain);
      res.status(201).json({ success: true, message: 'Backup created successfully.', backup: result });
    } catch (err: any) {
      console.error('[BackupController] Create backup failed:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async restoreBackup(req: RequestWithUser, res: Response): Promise<void> {
    try {
      const { serverId, backupId } = req.params;
      const userId = req.user!.id;

      const server = db.prepare('SELECT id, subdomain, container_id FROM servers WHERE id = ? AND user_id = ?').get(serverId, userId) as any;
      if (!server) {
        res.status(404).json({ success: false, message: 'Server not found.' });
        return;
      }

      const backup = db.prepare('SELECT filename FROM backups WHERE id = ? AND server_id = ?').get(backupId, serverId) as any;
      if (!backup) {
        res.status(404).json({ success: false, message: 'Backup archive record not found.' });
        return;
      }

      await BackupService.restoreBackup(server.subdomain, backup.filename);
      res.json({ success: true, message: 'Server data restored. Please restart the server.' });
    } catch (err: any) {
      console.error('[BackupController] Restore backup failed:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
