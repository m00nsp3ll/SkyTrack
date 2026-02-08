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

const WAIVER_TEXT = toAscii(`YAMAÇ PARAŞÜTÜ UÇUŞU RİSK VE SORUMLULUK BEYANI

Bu belgeyi imzalayarak aşağıdaki hususları kabul ve beyan ederim:

1. Yamaç paraşütü sporu, doğası gereği tehlikeli bir aktivitedir ve ciddi yaralanma veya ölüm riski taşımaktadır.

2. Uçuş sırasında hava koşulları, ekipman arızası veya diğer öngörülemeyen durumlar nedeniyle kaza meydana gelebileceğini biliyorum.

3. Herhangi bir sağlık problemim (kalp hastalığı, epilepsi, hamilelik, vb.) bulunmamaktadır veya varsa pilot ve yetkilere bildirdim.

4. Uçuş öncesi verilen tüm güvenlik talimatlarına uyacağımı taahhüt ederim.

5. Meydana gelebilecek herhangi bir kaza, yaralanma veya maddi hasar durumunda kooperatif ve pilotu sorumlu tutmayacağımı kabul ederim.

6. 18 yaşından büyük olduğumu veya yasal veli/vasi onayı aldığımı beyan ederim.`);

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
        margin: 50,
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('ALANYA PARAGLIDING', { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(16)
        .text(toAscii('RİSK VE SORUMLULUK BEYANI'), { align: 'center' });

      doc.moveDown(1.5);

      // Customer info box
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(toAscii('MÜŞTERİ BİLGİLERİ'), { underline: true });

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10);

      doc.text(toAscii(`Musteri No: ${customer.displayId}`));
      doc.text(toAscii(`Ad Soyad: ${customer.firstName} ${customer.lastName}`));
      doc.text(toAscii(`Telefon: ${customer.phone}`));
      doc.text(toAscii(`Tarih: ${customer.waiverSignedAt.toLocaleDateString('tr-TR')}`));
      doc.text(toAscii(`Saat: ${customer.waiverSignedAt.toLocaleTimeString('tr-TR')}`));

      doc.moveDown(1.5);

      // Waiver text
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(toAscii('BEYAN METNİ'), { underline: true });

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(WAIVER_TEXT, {
          align: 'justify',
          lineGap: 3,
        });

      doc.moveDown(2);

      // Signature section
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(toAscii('İMZA'), { underline: true });

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(toAscii('Yukarıdaki beyanı okudum, anladım ve kabul ediyorum.'));

      doc.moveDown(1);

      // Customer name
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(toAscii(`${customer.firstName} ${customer.lastName}`));

      doc.moveDown(0.5);

      // Add signature image
      if (customer.signatureData && customer.signatureData.includes('base64')) {
        try {
          const base64Data = customer.signatureData.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, {
            width: 200,
            height: 80,
          });
        } catch (imgError) {
          console.error('Error adding signature image to PDF:', imgError);
          doc.text('[Imza eklenemedi]');
        }
      } else {
        doc.text('[Dijital imza]');
      }

      doc.moveDown(2);

      // Footer
      doc
        .fontSize(8)
        .fillColor('gray')
        .text(
          toAscii(`Bu belge ${customer.waiverSignedAt.toLocaleDateString('tr-TR')} tarihinde dijital olarak imzalanmistir.`),
          { align: 'center' }
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
