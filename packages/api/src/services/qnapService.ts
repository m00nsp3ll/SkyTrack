import { Client } from 'ssh2';
import fs from 'fs';

class QnapService {
  private get sshConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const keyPath = process.env.QNAP_SSH_KEY_PATH || '/root/.ssh/nas_key';
    const config: any = {
      host: isProduction
        ? (process.env.QNAP_SSH_HOST_EXTERNAL || 'skytrack.myqnapcloud.com')
        : (process.env.QNAP_SSH_HOST_LOCAL || '192.168.1.105'),
      port: isProduction
        ? parseInt(process.env.QNAP_SSH_PORT_EXTERNAL || '2222')
        : parseInt(process.env.QNAP_SSH_PORT_LOCAL || '22'),
      username: process.env.QNAP_SSH_USER || 'admin',
    };
    // Production'da key varsa kullan, yoksa şifre ile bağlan
    if (isProduction && fs.existsSync(keyPath)) {
      config.privateKey = fs.readFileSync(keyPath);
    } else {
      config.password = process.env.QNAP_SSH_PASSWORD || '';
    }
    return config;
  }

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

  getConnectionInfo(): { mode: 'LAN' | 'External'; host: string; port: number } {
    const cfg = this.sshConfig;
    const mode = process.env.NODE_ENV === 'production' ? 'External' : 'LAN';
    return { mode, host: cfg.host, port: cfg.port };
  }

  async testConnection(): Promise<{ connected: boolean; message: string; mode: 'LAN' | 'External'; host: string }> {
    const { mode, host } = this.getConnectionInfo();
    try {
      const output = await this.execSSH('echo "connected" && hostname');
      return { connected: true, message: `NAS bağlantısı başarılı: ${output}`, mode, host };
    } catch (err: any) {
      return { connected: false, message: `NAS bağlantı hatası: ${err.message}`, mode, host };
    }
  }

  // Buffer'ı doğrudan NAS'a yükle (web upload için)
  async uploadBuffer(buffer: Buffer, remoteRelativePath: string): Promise<boolean> {
    const remotePath = `${this.mediaPath}/${remoteRelativePath}`;
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));

    try {
      await this.execSSH(`mkdir -p "${remoteDir}" && chmod -R 777 "${remoteDir}"`);
    } catch (err: any) {
      console.error(`[QNAP] Klasör oluşturma hatası: ${err.message}`);
      return false;
    }

    return new Promise((resolve) => {
      const conn = new Client();

      const timeout = setTimeout(() => {
        conn.end();
        console.error('[QNAP] Dosya yükleme timeout');
        resolve(false);
      }, 60000);

      conn.on('ready', () => {
        conn.exec(`cat > "${remotePath}"`, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            console.error(`[QNAP] exec hatası: ${err.message}`);
            return resolve(false);
          }
          stream.on('close', (code: number) => {
            clearTimeout(timeout);
            conn.end();
            if (code === 0 || code === null) {
              console.log(`[QNAP] Dosya yüklendi: ${remotePath}`);
              resolve(true);
            } else {
              console.error(`[QNAP] Yükleme başarısız, kod: ${code}`);
              resolve(false);
            }
          });
          stream.stdin.on('finish', () => {
            setTimeout(() => {
              clearTimeout(timeout);
              conn.end();
              console.log(`[QNAP] Dosya yüklendi: ${remotePath}`);
              resolve(true);
            }, 500);
          });
          stream.stdin.end(buffer);
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`[QNAP] Bağlantı hatası: ${err.message}`);
        resolve(false);
      });

      conn.connect(this.sshConfig);
    });
  }

  // NAS'ta displayId klasörünü tüm tarih/pilot kombinasyonlarında ara
  async findCustomerFolder(displayId: string): Promise<string | null> {
    try {
      const sorted = await this.execSSH(
        `find "${this.mediaPath}" -maxdepth 4 -type d -name "${displayId}" 2>/dev/null | xargs ls -dt 2>/dev/null | head -1`
      );
      if (!sorted.trim()) return null;
      return sorted.trim().replace(`${this.mediaPath}/`, '');
    } catch {
      return null;
    }
  }

  // NAS'ta klasörü taşı
  async moveFolder(fromRelativePath: string, toRelativePath: string): Promise<boolean> {
    try {
      const fromFull = `${this.mediaPath}/${fromRelativePath}`;
      const toFull = `${this.mediaPath}/${toRelativePath}`;
      const toDir = toFull.substring(0, toFull.lastIndexOf('/'));
      await this.execSSH(`mkdir -p "${toDir}" && mv "${fromFull}" "${toFull}"`);
      console.log(`[QNAP] Klasör taşındı: ${fromFull} → ${toFull}`);
      return true;
    } catch (err: any) {
      console.error(`[QNAP] Klasör taşıma hatası: ${err.message}`);
      return false;
    }
  }

  // Lokal dosyadan NAS'a yükle (PDF backup için)
  async uploadFile(localPath: string, remoteRelativePath: string): Promise<boolean> {
    const buffer = fs.readFileSync(localPath);
    return this.uploadBuffer(buffer, remoteRelativePath);
  }

  async backupWaiverPdf(localPdfPath: string, date: string, displayId: string, filename: string): Promise<boolean> {
    const remoteRelativePath = `Risk_Formlari/${date}/${displayId}/${filename}`;
    return this.uploadFile(localPdfPath, remoteRelativePath);
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
