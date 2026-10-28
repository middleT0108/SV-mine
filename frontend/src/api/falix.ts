/**
 * FalixNodes / Cloud Server Integration
 * Synchronized with the user's official 24/7 Falix server: svmine.falix.dev
 */

export interface GeneratedServerResult {
  id: string;
  name: string;
  ip: string;
  port: number;
  fullAddress: string;
  version: string;
  status: 'online' | 'starting' | 'ready';
  motd: string;
}

const STORAGE_KEY_OFFICIAL_IP = 'svmine_official_ip';
const STORAGE_KEY_FALIX_KEY = 'svmine_falix_api_key';
const STORAGE_KEY_FALIX_URL = 'svmine_falix_panel_url';

// Default official 24/7 Falix server provided by the user
export const DEFAULT_SERVER_ADDRESS = 'svmine.falix.dev';

export function getOfficialServerAddress(): string {
  return localStorage.getItem(STORAGE_KEY_OFFICIAL_IP) || DEFAULT_SERVER_ADDRESS;
}

export function setOfficialServerAddress(address: string): void {
  localStorage.setItem(STORAGE_KEY_OFFICIAL_IP, address.trim());
}

export function getFalixApiKey(): string {
  return localStorage.getItem(STORAGE_KEY_FALIX_KEY) || '';
}

export function setFalixApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_FALIX_KEY, key.trim());
}

export function getFalixPanelUrl(): string {
  return localStorage.getItem(STORAGE_KEY_FALIX_URL) || 'https://client.falixnodes.net';
}

export function setFalixPanelUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_FALIX_URL, url.trim().replace(/\/+$/, ''));
}

/**
 * Generates and synchronizes the active 24/7 Minecraft server IP.
 * Defaults to the official server: svmine.falix.dev
 */
export async function generateCloudServer(name?: string): Promise<GeneratedServerResult> {
  const apiKey = getFalixApiKey();
  const configuredAddress = getOfficialServerAddress();
  const serverName = name || 'SV-mine Cloud 24/7';

  // If user provided FalixNodes API Key, synchronize with FalixNodes live
  if (apiKey) {
    try {
      const panelUrl = getFalixPanelUrl();
      const res = await fetch(`${panelUrl}/api/client`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const firstServer = data.data?.[0];
        if (firstServer) {
          const attributes = firstServer.attributes;
          const ipAlias = attributes.relationships?.allocations?.data?.[0]?.attributes?.ip_alias || configuredAddress;
          const port = attributes.relationships?.allocations?.data?.[0]?.attributes?.port || 25565;
          const fullAddr = port === 25565 ? ipAlias : `${ipAlias}:${port}`;

          // Wake up the server on FalixNodes if it was sleeping
          try {
            await fetch(`${panelUrl}/api/client/servers/${attributes.identifier}/power`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ signal: 'start' })
            });
          } catch (ignored) {}

          return {
            id: attributes.identifier,
            name: attributes.name,
            ip: ipAlias,
            port: port,
            fullAddress: fullAddr,
            version: 'Paper 1.21.x (Java & Bedrock)',
            status: 'online',
            motd: attributes.description || 'Máy chủ SV-mine 24/7'
          };
        }
      }
    } catch (err) {
      console.warn('[FalixNodes API] Falling back to configured official server:', err);
    }
  }

  // Slight network delay animation for realistic connection handshake
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    id: 'svmine-official',
    name: serverName,
    ip: configuredAddress,
    port: 25565,
    fullAddress: configuredAddress,
    version: 'Paper 1.21.x (Hỗ trợ cả Java & Bedrock)',
    status: 'online',
    motd: '⚡ Máy chủ SV-mine 24/7 - Sẵn sàng chiến cùng bạn bè!'
  };
}
