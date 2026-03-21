import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const MEDIA_BASE_PATH = process.env.MEDIA_STORAGE_PATH || './media';
const WAIVER_FOLDER_NAME = 'Risk Formlari';

// Convert non-ASCII characters for PDF compatibility (Helvetica only supports ASCII)
function toAscii(text: string): string {
  const map: Record<string, string> = {
    'ş': 's', 'Ş': 'S', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
    'ü': 'u', 'Ü': 'U', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a',
    'ô': 'o', 'û': 'u', 'ù': 'u', 'î': 'i', 'ï': 'i',
    'ä': 'a', 'ß': 'ss', 'ń': 'n', 'ó': 'o', 'ą': 'a', 'ę': 'e',
    'ć': 'c', 'ł': 'l', 'ź': 'z', 'ż': 'z', 'ś': 's',
    'є': 'e', 'і': 'i', 'ї': 'i', 'ґ': 'g',
  };
  // For non-Latin scripts (Arabic, Chinese, Farsi, Russian, Ukrainian), transliterate to English
  return text.replace(/[^\x00-\x7F]/g, char => map[char] || char);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

type WaiverLang = 'tr' | 'en' | 'ru' | 'de' | 'ar' | 'pl' | 'uk' | 'zh' | 'fr' | 'fa';

interface WaiverTexts {
  orgName: string;
  title: string;
  customerInfo: string;
  customerNo: string;
  fullName: string;
  phoneLabel: string;
  dateLabel: string;
  timeLabel: string;
  declarationTitle: string;
  declaration: string;
  kvkkLine: string;
  signatureTitle: string;
  signatureAccept: string;
  footerText: (date: string) => string;
}

const waiverTranslations: Record<WaiverLang, WaiverTexts> = {
  tr: {
    orgName: 'S.S. Alanya Yamac Parasutu ve Spor Turizm Gelistirme Kooperatifi',
    title: 'RISK KABUL VE SORUMLULUK BEYANI',
    customerInfo: 'MUSTERI BILGILERI',
    customerNo: 'Musteri No',
    fullName: 'Ad Soyad',
    phoneLabel: 'Telefon',
    dateLabel: 'Tarih',
    timeLabel: 'Saat',
    declarationTitle: 'BEYAN METNI',
    declaration: `YAMAC PARASUTU UCUSU RISK KABUL VE SORUMLULUK BEYANI

Isbu belge, Sinirli Sorumlu Alanya Yamac Parasutu ve Spor Turizm Gelistirme Kooperatifi bunyesinde gerceklestirilecek tandem yamac parasutu ucusuna iliskin olarak duzenlenmistir.

Bu belgeyi imzalayarak asagidaki hususlari kabul ve beyan ederim:

1. Yamac parasutu sporu dogasi geregi tehlikeli bir aktivitedir ve kaza riski tasimaktadir.

2. Ben yamac parasutu ile tandem ucusu yapmak icin gerekli on egitimi ve bilgilendirmeyi pilotumdan aldim, bu konuda tum bilgilere sahibim ve tum riskleri kabul ederek kendi istegimle ucusa hazirim.

3. Ucus sirasinda hava kosullari, ekipman arizasi veya diger ongorulemeyen durumlar nedeniyle kaza meydana gelebilecegini biliyorum.

4. Herhangi bir saglik problemim (kalp hastaligi, epilepsi, hamilelik, vb.) bulunmamaktadir veya varsa pilot ve yetkilere bildirdim.

5. Ucus oncesi verilen tum guvenlik talimatlarina uyacagimi taahhut ederim.

6. Tandem ucusu RAY SIGORTA A.S. guvencesindedir. Meydana gelebilecek herhangi bir kazada Alanya Ilce Sportif Turizm Kurulu Ucus Kontrol Heyeti, Kooperatif ve isletmesini yuruten sirketten/pilotundan ve diger sahislardan hicbir hak ve talep etmeyecegimi kabul ederim.

7. Ucus sirasinda cekilen fotograf ve videolarin Kooperatif tarafindan kayit altina alinabilecegini ve bu gorsel/isitsel kayitlarin hizmet sunumu amaciyla kullanilabilecegini kabul ederim.

8. 18 yasindan buyuk oldugumu veya yasal veli/vasi onayi aldigimi beyan ederim.`,
    kvkkLine: 'Bu formu imzalayarak Kisisel Verilerin Korunmasi Kanunu (KVKK) Aydinlatma Metni kapsaminda kisisel verilerimin islenmesine onay verdigimi kabul ederim.',
    signatureTitle: 'IMZA',
    signatureAccept: 'Yukaridaki beyani okudum, anladim ve kabul ediyorum.',
    footerText: (date) => `Bu belge ${date} tarihinde dijital olarak imzalanmistir.`,
  },
  en: {
    orgName: 'S.S. Alanya Paragliding and Sports Tourism Development Cooperative',
    title: 'RISK ACCEPTANCE AND LIABILITY WAIVER',
    customerInfo: 'CUSTOMER INFORMATION',
    customerNo: 'Customer No',
    fullName: 'Full Name',
    phoneLabel: 'Phone',
    dateLabel: 'Date',
    timeLabel: 'Time',
    declarationTitle: 'DECLARATION',
    declaration: `PARAGLIDING FLIGHT RISK ACCEPTANCE AND LIABILITY WAIVER

This document has been prepared regarding the tandem paragliding flight to be carried out under the Alanya Paragliding and Sports Tourism Development Cooperative.

By signing this document, I accept and declare the following:

1. Paragliding is inherently a dangerous activity and carries the risk of accidents.

2. I have received the necessary preliminary training and information from my pilot for tandem paragliding flight, I have all the information on this subject, and I am ready to fly of my own free will, accepting all risks.

3. I am aware that accidents may occur during the flight due to weather conditions, equipment failure, or other unforeseen circumstances.

4. I have no health problems (heart disease, epilepsy, pregnancy, etc.) or have informed the pilot and authorities if any exist.

5. I undertake to comply with all safety instructions given before the flight.

6. The tandem flight is insured by RAY SIGORTA A.S. I accept that I will not claim any rights or demands from the Alanya District Sports Tourism Board Flight Control Committee, the Cooperative, the company/pilot operating it, or other persons in the event of any accident.

7. I accept that photographs and videos taken during the flight may be recorded by the Cooperative and that these visual/audio recordings may be used for service delivery purposes.

8. I declare that I am over 18 years of age or have obtained legal guardian/custodian consent.`,
    kvkkLine: 'By signing this form, I consent to the processing of my personal data within the scope of the Personal Data Protection Law (KVKK) Information Notice.',
    signatureTitle: 'SIGNATURE',
    signatureAccept: 'I have read, understood, and accept the above declaration.',
    footerText: (date) => `This document was digitally signed on ${date}.`,
  },
  ru: {
    orgName: 'S.S. Alanya Paragliding and Sports Tourism Development Cooperative',
    title: 'PRINYATIE RISKA I OTKAZ OT OTVETSTVENNOSTI',
    customerInfo: 'INFORMACIYA O KLIENTE',
    customerNo: 'Nomer klienta',
    fullName: 'Imya Familiya',
    phoneLabel: 'Telefon',
    dateLabel: 'Data',
    timeLabel: 'Vremya',
    declarationTitle: 'ZAYAVLENIE',
    declaration: `PRINYATIE RISKA I OTKAZ OT OTVETSTVENNOSTI PRI POLETE NA PARAPLANE

Etot dokument podgotovlen v svyazi s tandemnym poletom na paraplane v ramkah Kooperativa razvitiya paraglaydinga i sportivnogo turizma Alanya.

Podpisyvaya etot dokument, ya prinimayu i zayavlyayu sleduyushchee:

1. Paraglaydying po svoey prirode yavlyaetsya opasnym vidom deyatel'nosti i neset risk neschastnykh sluchayev.

2. Ya poluchil neobkhodimuyu predvaritel'nuyu podgotovku i informatsiyu ot moego pilota i gotov k poletu dobrovol'no, prinimaya vse riski.

3. Ya osoznayu, chto vo vremya poleta mogut proizoyti neschastnye sluchai iz-za pogodnykh usloviy, neispravnosti oborudovaniya ili drugikh nepredvidennykh obstoyatel'stv.

4. U menya net problem so zdorov'yem (bolezni serdtsa, epilepsiya, beremennost' i t.d.) ili ya soobshchil ob etom pilotu.

5. Ya obyazuyus' soblyudat' vse instruktsii po bezopasnosti.

6. Tandemnyy polet zastrakhovan RAY SIGORTA A.S. Ya prinimayu, chto ne budu pred"yavlyat' nikakikh pretenziy v sluchae avarii.

7. Ya soglashayas' s tem, chto fotografii i video, sdelannye vo vremya poleta, mogut byt' ispol'zovany Kooperativom.

8. Ya zayavlyayu, chto mne bol'she 18 let ili ya poluchil soglasie zakonno.`,
    kvkkLine: 'Podpisyvaya etu formu, ya daya soglasie na obrabotku moikh lichnykh dannykh.',
    signatureTitle: 'PODPIS',
    signatureAccept: 'Ya prochital, ponyal i prinimayu vysheizlozhennoe zayavlenie.',
    footerText: (date) => `Etot dokument byl podpisan v tsifrovom vide ${date}.`,
  },
  de: {
    orgName: 'S.S. Alanya Gleitschirm- und Sporttourismus-Entwicklungskooperative',
    title: 'RISIKOAKZEPTANZ UND HAFTUNGSVERZICHT',
    customerInfo: 'KUNDENINFORMATIONEN',
    customerNo: 'Kundennr',
    fullName: 'Vollstandiger Name',
    phoneLabel: 'Telefon',
    dateLabel: 'Datum',
    timeLabel: 'Uhrzeit',
    declarationTitle: 'ERKLARUNG',
    declaration: `GLEITSCHIRMFLUG RISIKOAKZEPTANZ UND HAFTUNGSVERZICHT

Dieses Dokument wurde im Zusammenhang mit dem Tandem-Gleitschirmflug erstellt, der im Rahmen der Alanya Gleitschirm- und Sporttourismus-Entwicklungskooperative durchgefuhrt wird.

Mit der Unterzeichnung dieses Dokuments akzeptiere und erklare ich Folgendes:

1. Gleitschirmfliegen ist von Natur aus eine gefahrliche Aktivitat und birgt Unfallrisiken.

2. Ich habe die erforderliche Vorabschulung und Information von meinem Piloten erhalten und bin freiwillig zum Flug bereit, wobei ich alle Risiken akzeptiere.

3. Mir ist bewusst, dass wahrend des Fluges Unfalle aufgrund von Wetterbedingungen, Gerateausfall oder anderen unvorhergesehenen Umstanden auftreten konnen.

4. Ich habe keine gesundheitlichen Probleme oder habe den Piloten daruber informiert.

5. Ich verpflichte mich, alle Sicherheitsanweisungen zu befolgen.

6. Der Tandemflug ist durch RAY SIGORTA A.S. versichert.

7. Ich stimme zu, dass Fotos und Videos wahrend des Fluges von der Kooperative verwendet werden durfen.

8. Ich erklare, dass ich uber 18 Jahre alt bin oder die Zustimmung eines Erziehungsberechtigten habe.`,
    kvkkLine: 'Mit der Unterzeichnung dieses Formulars stimme ich der Verarbeitung meiner personenbezogenen Daten zu.',
    signatureTitle: 'UNTERSCHRIFT',
    signatureAccept: 'Ich habe die obige Erklarung gelesen, verstanden und akzeptiere sie.',
    footerText: (date) => `Dieses Dokument wurde am ${date} digital unterzeichnet.`,
  },
  // Arabic, Polish, Ukrainian, Chinese, French, Farsi — use English text (Helvetica can't render non-Latin)
  ar: {} as WaiverTexts,
  pl: {} as WaiverTexts,
  uk: {} as WaiverTexts,
  zh: {} as WaiverTexts,
  fr: {
    orgName: 'S.S. Alanya Cooperative de Developpement du Parapente et du Tourisme Sportif',
    title: 'ACCEPTATION DES RISQUES ET DECHARGE DE RESPONSABILITE',
    customerInfo: 'INFORMATIONS CLIENT',
    customerNo: 'No Client',
    fullName: 'Nom Complet',
    phoneLabel: 'Telephone',
    dateLabel: 'Date',
    timeLabel: 'Heure',
    declarationTitle: 'DECLARATION',
    declaration: `VOL EN PARAPENTE - ACCEPTATION DES RISQUES ET DECHARGE DE RESPONSABILITE

Ce document a ete prepare concernant le vol en parapente biplace effectue dans le cadre de la Cooperative de Developpement du Parapente et du Tourisme Sportif d'Alanya.

En signant ce document, j'accepte et declare ce qui suit:

1. Le parapente est par nature une activite dangereuse et comporte des risques d'accidents.

2. J'ai recu la formation et les informations necessaires de mon pilote et je suis pret a voler volontairement en acceptant tous les risques.

3. Je suis conscient que des accidents peuvent survenir pendant le vol en raison des conditions meteorologiques ou d'autres circonstances imprevues.

4. Je n'ai aucun probleme de sante ou j'en ai informe le pilote.

5. Je m'engage a respecter toutes les consignes de securite.

6. Le vol biplace est assure par RAY SIGORTA A.S.

7. J'accepte que les photos et videos prises pendant le vol puissent etre utilisees par la Cooperative.

8. Je declare avoir plus de 18 ans ou avoir obtenu le consentement de mon tuteur legal.`,
    kvkkLine: 'En signant ce formulaire, je consens au traitement de mes donnees personnelles.',
    signatureTitle: 'SIGNATURE',
    signatureAccept: 'J\'ai lu, compris et accepte la declaration ci-dessus.',
    footerText: (date) => `Ce document a ete signe numeriquement le ${date}.`,
  },
  fa: {} as WaiverTexts,
};

// Fill non-Latin languages with English fallback
(['ar', 'pl', 'uk', 'zh', 'fa'] as WaiverLang[]).forEach(lang => {
  if (!waiverTranslations[lang].orgName) {
    waiverTranslations[lang] = { ...waiverTranslations.en };
  }
});

function getWaiverTexts(lang: string): WaiverTexts {
  return waiverTranslations[lang as WaiverLang] || waiverTranslations.en;
}

interface CustomerData {
  displayId: string;
  firstName: string;
  lastName: string;
  phone: string;
  signatureData: string;
  waiverSignedAt: Date;
  language?: string;
}

export async function generateWaiverPdf(customer: CustomerData): Promise<string> {
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, customer.displayId);
  if (!fs.existsSync(customerFolder)) {
    fs.mkdirSync(customerFolder, { recursive: true });
  }

  const safeName = sanitizeFilename(`${customer.firstName} ${customer.lastName}`);
  const pdfFilename = `${safeName} risk_formu.pdf`;
  const pdfPath = path.join(customerFolder, pdfFilename);

  const lang = customer.language || 'tr';
  const txt = getWaiverTexts(lang);

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
        .text(toAscii(txt.orgName), { align: 'center' });

      doc.moveDown(0.3);

      doc
        .fontSize(12)
        .text(toAscii(txt.title), { align: 'center' });

      doc.moveDown(0.8);

      // Customer info
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii(txt.customerInfo), { underline: true });

      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(9);
      doc.text(toAscii(`${txt.customerNo}: ${customer.displayId}  |  ${txt.fullName}: ${customer.firstName} ${customer.lastName}  |  ${txt.phoneLabel}: ${customer.phone}`));
      doc.text(toAscii(`${txt.dateLabel}: ${customer.waiverSignedAt.toLocaleDateString('tr-TR')}  |  ${txt.timeLabel}: ${customer.waiverSignedAt.toLocaleTimeString('tr-TR')}`));

      doc.moveDown(0.8);

      // Declaration
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii(txt.declarationTitle), { underline: true });

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fontSize(9)
        .text(toAscii(txt.declaration), { align: 'justify', lineGap: 2 });

      doc.moveDown(0.5);

      // KVKK
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#333')
        .text(toAscii(txt.kvkkLine));

      doc.moveDown(0.8);

      // Signature
      doc
        .fillColor('black')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(toAscii(txt.signatureTitle), { underline: true });

      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(9)
        .text(toAscii(txt.signatureAccept));

      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').fontSize(9)
        .text(toAscii(`${customer.firstName} ${customer.lastName}`));

      doc.moveDown(0.3);

      // Signature image
      if (customer.signatureData && customer.signatureData.includes('base64')) {
        try {
          const base64Data = customer.signatureData.split(',')[1];
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, { width: 150, height: 60 });
        } catch {
          doc.text('[Signature could not be added]');
        }
      } else {
        doc.text('[Digital signature]');
      }

      // Footer
      const pageWidth = doc.page.width;
      const bottomMargin = doc.page.margins.bottom;
      const dateStr = customer.waiverSignedAt.toLocaleDateString('tr-TR');
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('gray')
        .text(
          toAscii(txt.footerText(dateStr)),
          doc.page.margins.left,
          doc.page.height - bottomMargin - 10,
          { align: 'right', width: pageWidth - doc.page.margins.left - doc.page.margins.right }
        );

      doc.end();

      writeStream.on('finish', () => resolve(pdfPath));
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

export function getWaiverPdfPath(displayId: string, firstName?: string, lastName?: string): string {
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, displayId);

  if (firstName && lastName) {
    const safeName = sanitizeFilename(`${firstName} ${lastName}`);
    return path.join(customerFolder, `${safeName} risk_formu.pdf`);
  }

  if (fs.existsSync(customerFolder)) {
    const files = fs.readdirSync(customerFolder);
    const pdfFile = files.find(f => f.endsWith('risk_formu.pdf'));
    if (pdfFile) return path.join(customerFolder, pdfFile);
  }

  return path.join(customerFolder, 'risk_formu.pdf');
}

export function waiverPdfExists(displayId: string): boolean {
  const customerFolder = path.join(MEDIA_BASE_PATH, WAIVER_FOLDER_NAME, displayId);
  if (!fs.existsSync(customerFolder)) return false;
  const files = fs.readdirSync(customerFolder);
  return files.some(f => f.endsWith('risk_formu.pdf'));
}
