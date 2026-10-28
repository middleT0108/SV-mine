import { CONFIG } from '../config';

const RESERVED_SUBDOMAINS = new Set([
  'admin', 'administrator', 'api', 'root', 'minecraft', 'mc', 'router',
  'svmine', 'dashboard', 'mail', 'test', 'dev', 'status', 'auth', 'login',
  'public', 'ns1', 'ns2', 'proxy', 'gateway', 'backend', 'frontend', 'app'
]);

export interface DuckDnsResponse {
  success: boolean;
  message: string;
}

export class DuckDnsService {
  /**
   * Validates subdomain format and checks against reserved keywords.
   */
  public static validateSubdomain(subdomain: string): { isValid: boolean; error?: string } {
    const cleanName = subdomain.trim().toLowerCase();

    if (cleanName.length < 3 || cleanName.length > 20) {
      return { isValid: false, error: 'Subdomain must be between 3 and 20 characters long.' };
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(cleanName)) {
      return { 
        isValid: false, 
        error: 'Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).' 
      };
    }

    if (RESERVED_SUBDOMAINS.has(cleanName)) {
      return { isValid: false, error: `The subdomain "${cleanName}" is reserved for system use.` };
    }

    return { isValid: true };
  }

  /**
   * Updates DuckDNS record with the provided or current host IP.
   */
  public static async updateRecord(subdomain: string, ip?: string): Promise<DuckDnsResponse> {
    if (!CONFIG.DUCKDNS_TOKEN) {
      console.warn('[DuckDNS] Token is not configured. Skipping DNS update.');
      return { success: true, message: 'DuckDNS token not configured. Skipping API call.' };
    }

    const cleanDomain = subdomain.trim().toLowerCase();
    const targetIp = ip || CONFIG.HOST_PUBLIC_IP;
    
    let url = `https://www.duckdns.org/update?domains=${cleanDomain}&token=${CONFIG.DUCKDNS_TOKEN}`;
    if (targetIp) {
      url += `&ip=${encodeURIComponent(targetIp)}`;
    }

    try {
      const response = await fetch(url);
      const text = (await response.text()).trim();

      if (text === 'OK') {
        console.log(`[DuckDNS] Successfully mapped ${cleanDomain}.${CONFIG.DUCKDNS_BASE_DOMAIN} -> ${targetIp || 'auto-detected IP'}`);
        return { success: true, message: `Subdomain ${cleanDomain} successfully linked.` };
      } else {
        console.error(`[DuckDNS] API response failure: ${text}`);
        return { success: false, message: `DuckDNS responded with: ${text}` };
      }
    } catch (error: any) {
      console.error(`[DuckDNS] Network error updating record:`, error.message);
      return { success: false, message: `Connection error to DuckDNS: ${error.message}` };
    }
  }

  /**
   * Resets the IP record to loopback (127.0.0.1) when a server is deleted.
   */
  public static async releaseRecord(subdomain: string): Promise<DuckDnsResponse> {
    if (!CONFIG.DUCKDNS_TOKEN) {
      return { success: true, message: 'DuckDNS token not configured. Skipping release.' };
    }

    const cleanDomain = subdomain.trim().toLowerCase();
    const loopbackIp = '127.0.0.1';
    const url = `https://www.duckdns.org/update?domains=${cleanDomain}&token=${CONFIG.DUCKDNS_TOKEN}&ip=${loopbackIp}`;

    try {
      const response = await fetch(url);
      const text = (await response.text()).trim();
      return { 
        success: text === 'OK', 
        message: text === 'OK' ? `Subdomain ${cleanDomain} released.` : text 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Auto-detects current public IP via ipify service.
   */
  public static async detectPublicIp(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json() as { ip: string };
        return data.ip;
      }
    } catch (err: any) {
      console.error('[DuckDNS] Failed to detect public IP:', err.message);
    }
    return null;
  }
}
