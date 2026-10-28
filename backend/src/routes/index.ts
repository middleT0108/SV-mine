import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { ServerController } from '../controllers/server.controller';
import { BackupController } from '../controllers/backup.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { authRateLimiter, apiRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Health check endpoint for Uptime Kuma / monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
router.post('/auth/register', authRateLimiter, AuthController.register);
router.post('/auth/login', authRateLimiter, AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.getProfile);

// Server management routes (Protected)
router.get('/servers', authenticateToken, apiRateLimiter, ServerController.listServers);
router.post('/servers', authenticateToken, apiRateLimiter, ServerController.createServer);
router.get('/servers/:id', authenticateToken, ServerController.getServer);
router.delete('/servers/:id', authenticateToken, ServerController.deleteServer);

router.post('/servers/:id/start', authenticateToken, ServerController.startServer);
router.post('/servers/:id/stop', authenticateToken, ServerController.stopServer);
router.post('/servers/:id/restart', authenticateToken, ServerController.restartServer);
router.post('/servers/:id/command', authenticateToken, ServerController.sendCommand);

router.get('/servers/:id/properties', authenticateToken, ServerController.getProperties);
router.put('/servers/:id/properties', authenticateToken, ServerController.updateProperties);

// Backup routes
router.get('/servers/:serverId/backups', authenticateToken, BackupController.listBackups);
router.post('/servers/:serverId/backups', authenticateToken, BackupController.createBackup);
router.post('/servers/:serverId/backups/:backupId/restore', authenticateToken, BackupController.restoreBackup);

export default router;
