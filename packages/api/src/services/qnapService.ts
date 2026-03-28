import { Client } from 'ssh2';

class QnapService {
  private sshConfig = {
    host: process.env.QNAP_SSH_HOST || '192.168.1.111',
    port: parseInt(process.env.QNAP_SSH_PORT || '22'),
    username: process.env.QNAP_SSH_USER || 'admin',
    password: process.env.QNAP_SSH_PASSWORD || '',
  };

  private mediaPath = process.env.QNAP_MEDIA_PATH || '/share/skytrack-media';

  private async execSSH(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';
      let errorOutput = '';

      const timeout = setTimeout(() => {
        conn.end();
        reject(new Error('SSH connection timeout'));
      }, 10000);

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            return reject(err);
          }
          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });
          stream.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });
          stream.on('close', (code: number) => {
            clearTimeout(timeout);
            conn.end();
            if (code === 0) {
              resolve(output.trim());
            } else {
              reject(new Error(`SSH command failed (code ${code}): ${errorOutput}`));
            }
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      conn.connect(this.sshConfig);
    });
  }

  async createFolder(relativePath: string): Promise<boolean> {
    try {
      const fullPath = `${this.mediaPath}/${relativePath}`;
      await this.execSSH(`mkdir -p "${fullPath}" && chmod -R 777 "${fullPath}"`);
      console.log(`[QNAP] Klasör oluşturuldu: ${fullPath}`);
      return true;
    } catch (err) {
      console.error(`[QNAP] Klasör oluşturma hatası:`, err);
      return false;
    }
  }

  async createCustomerFolder(date: string, pilotName: string, customerCode: string): Promise<string | null> {
    try {
      const safePilotName = pilotName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_çÇğĞıİöÖşŞüÜ-]/g, '')
        .trim();

      const basePath = `${date}/${safePilotName}/${customerCode}`;
      await this.createFolder(basePath);

      const fullPath = `${this.mediaPath}/${basePath}`;
      console.log(`[QNAP] Müşteri klasörü oluşturuldu: ${fullPath}`);
      return fullPath;
    } catch (err) {
      console.error(`[QNAP] Müşteri klasörü oluşturma hatası:`, err);
      return null;
    }
  }

  async listFiles(relativePath: string): Promise<string[]> {
    try {
      const fullPath = `${this.mediaPath}/${relativePath}`;
      const output = await this.execSSH(`ls -1 "${fullPath}" 2>/dev/null`);
      if (!output) return [];
      return output.split('\n').filter(f => f && !f.startsWith('@') && !f.startsWith('.'));
    } catch (err) {
      console.error(`[QNAP] Dosya listeleme hatası:`, err);
      return [];
    }
  }

  async folderExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = `${this.mediaPath}/${relativePath}`;
      const result = await this.execSSH(`test -d "${fullPath}" && echo "exists"`);
      return result === 'exists';
    } catch {
      return false;
    }
  }

  async getFileSize(relativePath: string): Promise<number> {
    try {
      const fullPath = `${this.mediaPath}/${relativePath}`;
      const output = await this.execSSH(`du -sb "${fullPath}" | cut -f1`);
      return parseInt(output) || 0;
    } catch {
      return 0;
    }
  }

  async listFilesDetailed(relativePath: string): Promise<Array<{ name: string; size: number; isFolder: boolean; modified: string }>> {
    try {
      const fullPath = `${this.mediaPath}/${relativePath}`;
      const output = await this.execSSH(`ls -la --time-style=full-iso "${fullPath}" 2>/dev/null`);
      if (!output) return [];

      return output.split('\n')
        .filter(line => !line.startsWith('total') && line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          if (parts.length < 9) return null;
          const name = parts.slice(8).join(' ');
          if (name === '.' || name === '..' || name.startsWith('@') || name.startsWith('.')) return null;
          return {
            name,
            size: parseInt(parts[4]) || 0,
            isFolder: parts[0].startsWith('d'),
            modified: `${parts[5]} ${parts[6]}`,
          };
        })
        .filter(Boolean) as any[];
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const output = await this.execSSH('echo "connected" && hostname');
      return { connected: true, message: `NAS bağlantısı başarılı: ${output}` };
    } catch (err: any) {
      return { connected: false, message: `NAS bağlantı hatası: ${err.message}` };
    }
  }

  async getDiskUsage(): Promise<{ total: string; used: string; available: string; percent: string } | null> {
    try {
      const output = await this.execSSH(`df -h "${this.mediaPath}" | tail -1`);
      const parts = output.split(/\s+/);
      return {
        total: parts[1] || '0',
        used: parts[2] || '0',
        available: parts[3] || '0',
        percent: parts[4] || '0%',
      };
    } catch {
      return null;
    }
  }
}

export const qnap = new QnapService();
