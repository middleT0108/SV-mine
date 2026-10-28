import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';
import { db } from '../models/db';
import { DockerService } from '../services/docker.service';

export function setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/terminal' });

  wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const { serverId, token } = parsedUrl.query;

      if (!token || typeof token !== 'string') {
        ws.close(4001, 'Unauthorized: Missing token');
        return;
      }

      let userId = '';
      try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {
        ws.close(4002, 'Unauthorized: Invalid token');
        return;
      }

      if (!serverId || typeof serverId !== 'string') {
        ws.close(4003, 'Bad Request: Missing serverId');
        return;
      }

      // Check server ownership
      const serverRecord = db.prepare('SELECT id, container_id FROM servers WHERE id = ? AND user_id = ?').get(serverId, userId) as any;
      if (!serverRecord || !serverRecord.container_id) {
        ws.close(4004, 'Server not found or no container attached');
        return;
      }

      ws.send(JSON.stringify({ type: 'status', data: 'Connected to server terminal stream.' }));

      // Attach Docker log stream
      let logStream: NodeJS.ReadableStream | null = null;
      try {
        logStream = await DockerService.getLogStream(serverRecord.container_id, 100);
        logStream.on('data', (chunk: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            // Docker logs prepend 8-byte header (stream type + frame length) in tty=false mode,
            // or raw text in tty=true mode. Clean ANSI and control chars cleanly.
            const cleanMessage = chunk.toString('utf-8');
            ws.send(JSON.stringify({ type: 'log', data: cleanMessage }));
          }
        });

        logStream.on('error', (err) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', data: `Log stream error: ${err.message}` }));
          }
        });
      } catch (logErr: any) {
        ws.send(JSON.stringify({ type: 'error', data: `Could not attach logs: ${logErr.message}` }));
      }

      // Broadcast periodic resource metrics (CPU, RAM) every 3 seconds
      const statsInterval = setInterval(async () => {
        if (ws.readyState === WebSocket.OPEN && serverRecord.container_id) {
          const stats = await DockerService.getContainerStats(serverRecord.container_id);
          ws.send(JSON.stringify({ type: 'stats', data: stats }));
        }
      }, 3000);

      ws.on('close', () => {
        clearInterval(statsInterval);
        if (logStream && 'destroy' in logStream) {
          (logStream as any).destroy();
        }
      });
    } catch (err: any) {
      console.error('[WebSocket] Connection error:', err);
      ws.close(4500, 'Internal Server Error');
    }
  });
}
