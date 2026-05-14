import { Client } from 'ssh2';
import fs from 'fs';

class QnapService {
  private get sshConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const keyPath = process.env.QNAP_SSH_KEY_PATH || '/root/.ssh/nas_key';
    const config: any = {
      host: process.env.QNAP_SSH_HOST || (isProduction
        ? (process.env.QNAP_SSH_HOST_EXTERNAL || 'skytrack.myqnapcloud.com')
        : (process.env.QNAP_SSH_HOST_LOCAL || '192.168.1.105')),
      port: parseInt(process.env.QNAP_SSH_PORT || (isProduction ? '2222' : '22')),
      username: process.env.QNAP_SSH_USER || 'admin',
    };
    // Production'da key varsa kullan, yoksa şifre ile bağlan
    if (isProduction && fs.existsSync(keyPath)) {
      config.privateKey = fs.readFileSync(keyPath);
    } else {
      config.password = process.env.QNAP_SSH_PASSWORD || '';
    }
    config.readyTimeout = 20000;
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
      }, 30000);

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
      // Türkçe karakterleri ASCII'ye çevir (Ömer → Omer, Şek → Sek)
      const safePilotName = pilotName
        .replace(/[şŞ]/g, c => c === 'ş' ? 's' : 'S')
        .replace(/[ğĞ]/g, c => c === 'ğ' ? 'g' : 'G')
        .replace(/[üÜ]/g, c => c === 'ü' ? 'u' : 'U')
        .replace(/[öÖ]/g, c => c === 'ö' ? 'o' : 'O')
        .replace(/[ıİ]/g, c => c === 'ı' ? 'i' : 'I')
        .replace(/[çÇ]/g, c => c === 'ç' ? 'c' : 'C')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '')
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

  // NAS'tan dosya indir — buffer döner
  async downloadFile(relativeFilePath: string): Promise<Buffer | null> {
    const remotePath = `${this.mediaPath}/${relativeFilePath}`;
    return new Promise((resolve) => {
      const conn = new Client();
      const timeout = setTimeout(() => {
        conn.end();
        resolve(null);
      }, 60000);

      conn.on('ready', () => {
        conn.exec(`cat "${remotePath}"`, (err, stream) => {
          if (err) { clearTimeout(timeout); conn.end(); return resolve(null); }
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('close', () => {
            clearTimeout(timeout);
            conn.end();
            resolve(chunks.length > 0 ? Buffer.concat(chunks) : null);
          });
          stream.stderr.on('data', () => {});
        });
      });
      conn.on('error', () => { clearTimeout(timeout); resolve(null); });
      conn.connect(this.sshConfig);
    });
  }

  // NAS'ta displayId klasörünü tüm tarih/pilot kombinasyonlarında ara
  // for loop: Türkçe karakterli dizinlerde find -name çalışmadığı için glob ile tarama
  async findCustomerFolder(displayId: string): Promise<string | null> {
    try {
      // Yeni format: tarih/pilot/N_sorti/displayId  — maxdepth 4
      // Eski format: tarih/pilot/displayId           — maxdepth 3
      const output = await this.execSSH(
        `result=""; for d in "${this.mediaPath}"/*/; do for s in "$d"*/; do if [ -d "$s${displayId}" ]; then result="$s${displayId}"; fi; for t in "$s"*/; do if [ -d "$t${displayId}" ]; then result="$t${displayId}"; fi; done; done; done; echo "$result"`
      );
      const fullPath = output.trim();
      if (!fullPath || !fullPath.startsWith('/')) return null;
      return fullPath.replace(`${this.mediaPath}/`, '');
    } catch {
      return null;
    }
  }

  // NAS'ta klasörü taşı ve eski klasörü sil
  async moveFolder(fromRelativePath: string, toRelativePath: string): Promise<boolean> {
    try {
      const fromFull = `${this.mediaPath}/${fromRelativePath}`;
      const toFull = `${this.mediaPath}/${toRelativePath}`;
      const toDir = toFull.substring(0, toFull.lastIndexOf('/'));
      // Hedef klasörü oluştur, kaynağı taşı (mv Türkçe karakterlerle çalışır çünkü tam path veriyoruz)
      await this.execSSH(`mkdir -p "${toDir}" && cp -r "${fromFull}" "${toFull}" && rm -rf "${fromFull}"`);
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

  // NAS-side ZIP oluşturma — VDS'i bypass eder, müşteri direkt NAS'tan indirir
  // Dönen path .zips/<customerId>/Alanya Paragliding.zip — NAS_PUBLIC_URL altında servis edilir
  async createCustomerZip(customerId: string, relPath: string): Promise<{ zipRelPath: string; size: number } | null> {
    try {
      const zipDir = `.zips/${customerId}`;
      const zipName = 'Alanya Paragliding.zip';
      const zipRelPath = `${zipDir}/${zipName}`;
      const zipFullPath = `${this.mediaPath}/${zipRelPath}`;

      // ZIP zaten varsa yeniden oluşturma (cache) — dosya sayısı değişmediyse mevcut ZIP'i kullan
      try {
        const existingSize = await this.execSSH(`stat -c '%s' "${zipFullPath}" 2>/dev/null || echo 0`);
        const size = parseInt(existingSize.trim()) || 0;
        if (size > 1000) {
          // ZIP var ve geçerli, kaynak dosya sayısını karşılaştır
          const srcCount = await this.execSSH(`find "${this.mediaPath}/${relPath}" -type f ! -name '.DS_Store' ! -name 'Thumbs.db' | wc -l`);
          const zipCount = await this.execSSH(`/usr/local/sbin/zip -sf "${zipFullPath}" 2>/dev/null | grep -c '.' || echo 0`);
          const srcN = parseInt(srcCount.trim()) || 0;
          const zipN = Math.max(0, (parseInt(zipCount.trim()) || 0) - 2); // zip -sf header/footer çıkar
          if (srcN > 0 && Math.abs(srcN - zipN) <= 1) {
            console.log(`[QNAP] ZIP cache kullanılıyor: ${zipRelPath} (${size} bytes, ${srcN} dosya)`);
            return { zipRelPath, size };
          }
        }
      } catch { /* cache kontrolü başarısız, yeniden oluştur */ }

      // ZIP yoksa veya güncel değilse oluştur
      await this.execSSH(
        `rm -rf "${this.mediaPath}/${zipDir}" && mkdir -p "${this.mediaPath}/${zipDir}"`
      );

      // Müşteri klasörünün İÇİNE gir, sadece içeriği zipley (tam path yapısı olmasın)
      const cmd = `cd "${this.mediaPath}/${relPath}" && /usr/local/sbin/zip -r -0 -q "${zipFullPath}" . -x "*.DS_Store" "*/Thumbs.db" "*/@*" && stat -c '%s' "${zipFullPath}"`;
      const output = await this.execSSH(cmd);
      const size = parseInt(output.trim()) || 0;
      if (!size) return null;
      console.log(`[QNAP] ZIP oluşturuldu: ${zipRelPath} (${size} bytes)`);
      return { zipRelPath, size };
    } catch (err: any) {
      console.error(`[QNAP] ZIP oluşturma hatası:`, err.message);
      return null;
    }
  }

  // 24 saatten eski zip klasörlerini sil — best-effort, hata fırlatmaz
  async cleanupOldZips(maxAgeHours = 24): Promise<void> {
    try {
      await this.execSSH(
        `find "${this.mediaPath}/.zips" -mindepth 1 -maxdepth 1 -type d -mmin +${maxAgeHours * 60} -exec rm -rf {} + 2>/dev/null || true`
      );
    } catch { /* ignore */ }
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
