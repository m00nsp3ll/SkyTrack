import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';
const WAIVER_FOLDER_NAME = 'Risk Formlari';

// Convert Turkish characters to ASCII for PDF compatibility
function toAscii(text: string): string {
  const turkishMap: Record<string, string> = {
    'ş': 's', 'Ş': 'S',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C',
  };
  return text.replace(/[şŞğĞıİüÜöÖçÇ]/g, char => turkishMap[char] || char);
}

// Sanitize filename (remove only invalid filesystem characters)
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();
}

const WAIVER_TEXT = toAscii(`YAMAÇ PARAŞÜTÜ UÇUŞU RİSK KABUL VE SORUMLULUK BEYANI

İşbu belge, Sınırlı Sorumlu Alanya Yamaç Paraşütü ve Spor Turizm Geliştirme Kooperatifi bünyesinde gerçekleştirilecek tandem yamaç paraşütü uçuşuna ilişkin olarak düzenlenmiştir.

Bu belgeyi imzalayarak aşağıdaki hususları kabul ve beyan ederim:

1. Yamaç paraşütü sporu doğası gereği tehlikeli bir aktivitedir ve kaza riski taşımaktadır.

2. Ben yamaç paraşütü ile tandem uçuşu yapmak için gerekli ön eğitimi ve bilgilendirmeyi pilotumdan aldım, bu konuda tüm bilgilere sahibim ve tüm riskleri kabul ederek kendi isteğimle uçuşa hazırım.

3. Uçuş sırasında hava koşulları, ekipman arızası veya diğer öngörülemeyen durumlar nedeniyle kaza meydana gelebileceğini biliyorum.

4. Herhangi bir sağlık problemim (kalp hastalığı, epilepsi, hamilelik, vb.) bulunmamaktadır veya varsa pilot ve yetkilere bildirdim.

5. Uçuş öncesi verilen tüm güvenlik talimatlarına uyacağımı taahhüt ederim.

6. Tandem uçuşu RAY SİGORTA A.Ş. güvencesindedir. Meydana gelebilecek herhangi bir kazada Alanya İlçe Sportif Turizm Kurulu Uçuş Kontrol Heyeti, Kooperatif ve işletmesini yürüten şirketten/pilotundan ve diğer şahıslardan hiçbir hak ve talep etmeyeceğimi kabul ederim.

7. Uçuş sırasında çekilen fotoğraf ve videoların Kooperatif tarafından kayıt altına alınabileceğini ve bu görsel/işitsel kayıtların hizmet sunumu amacıyla kullanılabileceğini kabul ederim.

8. 18 yaşından büyük olduğumu veya yasal veli/vasi onayı aldığımı beyan ederim.`);

interface CustomerData {
  displayId: string;
  firstName: string;
  lastName: string;
  phone: string;
  signatureData: string;
  waiverSignedAt: Date;
}

export async function generateWaiverPdf(customer: CustomerData): Promise<string> {
  // Create folder: ./media/Risk Formlari/A0112/
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, customer.displayId);
  if (!fs.existsSync(customerFolder)) {
    fs.mkdirSync(customerFolder, { recursive: true });
  }

  // Filename: Musteri_Adi_Soyadi_risk_formu.pdf
  const safeName = sanitizeFilename(`${customer.firstName} ${customer.lastName}`);
  const pdfFilename = `${safeName} risk_formu.pdf`;
  const pdfPath = path.join(customerFolder, pdfFilename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 30, left: 50, right: 50 },
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Header
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('S.S. Alanya Yamac Parasutu ve Spor Turizm Gelistirme Kooperatifi', { align: 'center' });

      doc.moveDown(0.3);

      doc
        .fontSize(12)
        .text(toAscii('RİSK KABUL VE SORUMLULUK BEYANI'), { align: 'center' });

      doc.moveDown(0.8);

      // Customer info box
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii('MÜŞTERİ BİLGİLERİ'), { underline: true });

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fontSize(9);

      doc.text(toAscii(`Musteri No: ${customer.displayId}  |  Ad Soyad: ${customer.firstName} ${customer.lastName}  |  Telefon: ${customer.phone}`));
      doc.text(toAscii(`Tarih: ${customer.waiverSignedAt.toLocaleDateString('tr-TR')}  |  Saat: ${customer.waiverSignedAt.toLocaleTimeString('tr-TR')}`));

      doc.moveDown(0.8);

      // Waiver text
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii('BEYAN METNİ'), { underline: true });

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fontSize(9)
        .text(WAIVER_TEXT, {
          align: 'justify',
          lineGap: 2,
        });

      doc.moveDown(0.5);

      // KVKK line
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#333')
        .text(toAscii('Bu formu imzalayarak Kisisel Verilerin Korunmasi Kanunu (KVKK) Aydinlatma Metni kapsaminda kisisel verilerimin islenmesine onay verdigimi kabul ederim.'));

      doc.moveDown(0.8);

      // Signature section
      doc
        .fillColor('black')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii('İMZA'), { underline: true });

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fontSize(9)
        .text(toAscii('Yukaridaki beyani okudum, anladim ve kabul ediyorum.'));

      doc.moveDown(0.3);

      // Customer name
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(toAscii(`${customer.firstName} ${customer.lastName}`));

      doc.moveDown(0.3);

      // Add signature image
      if (customer.signatureData && customer.signatureData.includes('base64')) {
        try {
          const base64Data = customer.signatureData.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, {
            width: 150,
            height: 60,
          });
        } catch (imgError) {
          console.error('Error adding signature image to PDF:', imgError);
          doc.text('[Imza eklenemedi]');
        }
      } else {
        doc.text('[Dijital imza]');
      }

      // Footer - small, right-aligned, at page bottom
      const pageWidth = doc.page.width;
      const bottomMargin = doc.page.margins.bottom;
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('gray')
        .text(
          toAscii(`Bu belge ${customer.waiverSignedAt.toLocaleDateString('tr-TR')} tarihinde dijital olarak imzalanmistir.`),
          doc.page.margins.left,
          doc.page.height - bottomMargin - 10,
          { align: 'right', width: pageWidth - doc.page.margins.left - doc.page.margins.right }
        );

      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getWaiverPdfPath(displayId: string, firstName?: string, lastName?: string): string {
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, displayId);

  // If we have name info, return exact path
  if (firstName && lastName) {
    const safeName = sanitizeFilename(`${firstName} ${lastName}`);
    return path.join(customerFolder, `${safeName} risk_formu.pdf`);
  }

  // Otherwise, try to find the PDF in the folder
  if (fs.existsSync(customerFolder)) {
    const files = fs.readdirSync(customerFolder);
    const pdfFile = files.find(f => f.endsWith('risk_formu.pdf'));
    if (pdfFile) {
      return path.join(customerFolder, pdfFile);
    }
  }

  // Fallback path
  return path.join(customerFolder, 'risk_formu.pdf');
}

export function waiverPdfExists(displayId: string): boolean {
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, displayId);

  if (!fs.existsSync(customerFolder)) {
    return false;
  }

  const files = fs.readdirSync(customerFolder);
  return files.some(f => f.endsWith('risk_formu.pdf'));
}
