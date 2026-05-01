export type Language = 'tr' | 'en' | 'ru' | 'de' | 'ar' | 'pl' | 'uk' | 'zh' | 'fr' | 'fa' | 'nl' | 'fi'

export const RTL_LANGUAGES: Language[] = ['ar', 'fa']

export const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
]

export interface Translations {
  // Form
  formTitle: string
  firstName: string
  lastName: string
  phone: string
  email: string
  emergencyContact: string
  weight: string
  weightHelper: string
  next: string
  back: string
  submit: string
  required: string
  personalInfo: string
  // Waiver
  waiverTitle: string
  waiverFullTitle: string
  waiverIntro: string
  waiverAccept: string
  waiverItem1: string
  waiverItem2: string
  waiverItem3: string
  waiverItem4: string
  waiverItem5: string
  waiverItem6: string
  waiverItem7: string
  waiverItem8: string
  waiverKvkkLine: string
  kvkkLinkText: string
  kvkkModalTitle: string
  signHere: string
  signClear: string
  signHelper: string
  signConfirm: string
  signCancel: string
  signViewAndSign: string
  signRequired: string
  signed: string
  resignLabel: string
  // KVKK
  kvkkText: string
  kvkkClose: string
  // Success
  registrationSuccess: string
  printQR: string
  newRegistration: string
  // Country picker
  countrySearchPlaceholder: string
  noResults: string
  // Validation
  fillNamePhone: string
  invalidPhone: string
  registrationFailed: string
  saving: string
}

const tr: Translations = {
  formTitle: 'Müşteri Kayıt Formu',
  firstName: 'Ad',
  lastName: 'Soyad',
  phone: 'Telefon',
  email: 'E-posta',
  emergencyContact: 'Otel Adı',
  weight: 'Kilo (kg)',
  weightHelper: 'Uçuş güvenliği için gereklidir (20-150 kg)',
  next: 'İleri',
  back: 'Geri',
  submit: 'Kaydı Tamamla ve QR Oluştur',
  required: 'Bu alan zorunludur',
  personalInfo: 'Kişisel Bilgiler',
  waiverTitle: 'Risk Kabul ve Sorumluluk Beyanı',
  waiverFullTitle: 'YAMAÇ PARAŞÜTÜ UÇUŞU RİSK KABUL VE SORUMLULUK BEYANI',
  waiverIntro: 'İşbu belge, Sınırlı Sorumlu Alanya Yamaç Paraşütü ve Spor Turizm Geliştirme Kooperatifi bünyesinde gerçekleştirilecek tandem yamaç paraşütü uçuşuna ilişkin olarak düzenlenmiştir.',
  waiverAccept: 'Bu belgeyi imzalayarak aşağıdaki hususları kabul ve beyan ederim:',
  waiverItem1: 'Yamaç paraşütü sporu doğası gereği tehlikeli bir aktivitedir ve kaza riski taşımaktadır.',
  waiverItem2: 'Ben yamaç paraşütü ile tandem uçuşu yapmak için gerekli ön eğitimi ve bilgilendirmeyi pilotumdan aldım, bu konuda tüm bilgilere sahibim ve tüm riskleri kabul ederek kendi isteğimle uçuşa hazırım.',
  waiverItem3: 'Uçuş sırasında hava koşulları, ekipman arızası veya diğer öngörülemeyen durumlar nedeniyle kaza meydana gelebileceğini biliyorum.',
  waiverItem4: 'Herhangi bir sağlık problemim (kalp hastalığı, epilepsi, hamilelik, vb.) bulunmamaktadır veya varsa pilot ve yetkilere bildirdim.',
  waiverItem5: 'Uçuş öncesi verilen tüm güvenlik talimatlarına uyacağımı taahhüt ederim.',
  waiverItem6: 'Tandem uçuşu RAY SİGORTA A.Ş. güvencesindedir. Meydana gelebilecek herhangi bir kazada Alanya İlçe Sportif Turizm Kurulu Uçuş Kontrol Heyeti, Kooperatif ve işletmesini yürüten şirketten/pilotundan ve diğer şahıslardan hiçbir hak ve talep etmeyeceğimi kabul ederim.',
  waiverItem7: 'Uçuş sırasında çekilen fotoğraf ve videoların Kooperatif tarafından kayıt altına alınabileceğini ve bu görsel/işitsel kayıtların hizmet sunumu amacıyla kullanılabileceğini kabul ederim.',
  waiverItem8: '18 yaşından büyük olduğumu veya yasal veli/vasi onayı aldığımı beyan ederim.',
  waiverKvkkLine: 'Bu formu imzalayarak {link} kapsamında kişisel verilerimin işlenmesine onay verdiğimi kabul ederim.',
  kvkkLinkText: 'Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni',
  kvkkModalTitle: 'KVKK Aydınlatma Metni',
  signHere: 'Aşağıya imzanızı atın:',
  signClear: 'Temizle',
  signHelper: 'Parmağınız veya mouse ile yukarıdaki alana imzanızı atın',
  signConfirm: 'İmzayı Onayla',
  signCancel: 'İptal',
  signViewAndSign: 'Risk Formunu Görüntüle ve İmzala',
  signRequired: 'Lütfen risk formunu imzalayın',
  signed: 'Risk Formu İmzalandı',
  resignLabel: 'Yeniden İmzala',
  kvkkText: `AYDINLATMA METNİ

Bu bilgilendirme metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu konumunda olan Sınırlı Sorumlu Alanya Yamaç Paraşütü ve Spor Turizm Geliştirme Kooperatifi bünyesinde yamaç paraşütü faaliyetlerine ilişkin işlemleriniz bakımından geçerli olmak üzere düzenlenmiştir.

Kişisel Verilerinizin İşlenme Amacı ve Yasal Dayanağı

Kişisel verileriniz (kimlik bilgileri, iletişim bilgileri, uçuş emniyetine ilişkin veriler, uçuş kayıtları, uçuşlara ait görsel ve işitsel kayıtlar — video, fotoğraf) alacağınız hizmet ve/veya gerçekleştireceğiniz paraşüt uçuşu kapsamında aşağıda belirtilen amaç ve koşullar çerçevesinde işlenebilecektir.

— Uçuş emniyeti ve güvenliğinin sağlanması, hizmet sunumu ve ilgili konularda bilgilendirilmeniz amacıyla toplanan kişisel veriler; KVKK m.5/2-c uyarınca, sözleşmenin kurulması ve yerine getirilmesiyle doğrudan bağlantılı olması koşuluyla işlenmektedir.

— Yürürlükteki kanunlar ve ilgili mevzuat kapsamındaki bilgi ve belge saklama yükümlülüklerinin karşılanması ile tüm işlemlerin kayıt altına alınması amacıyla işlenen kişisel veriler; KVKK m.5/2-ç uyarınca, sigorta poliçesi kapsamındaki yükümlülüklerin eksiksiz biçimde yerine getirilmesi hukuki gerekçesiyle işlenmektedir.

— Hizmet kalitesinin artırılması, veri analizi çalışmalarının yürütülmesi amacıyla işlenen kişisel veriler; KVKK m.5/2-f uyarınca, ilgili kişinin temel hak ve özgürlüklerine zarar vermeksizin, veri sorumlusunun meşru menfaatleri için işlemenin kaçınılmaz olması hukuki gerekçesiyle işlenebilecektir.

Kişisel Verilerinizin Toplanma Yöntemi

Kişisel verileriniz; uçuş kaydı için yaptığınız başvurular aracılığıyla tarafınızca iletilen bilgi ve belgelerden ve gerçekleştirilen uçuşların sesli-görüntülü kaydedilmesi yoluyla; yazılı ve elektronik ortamda, tamamen ya da kısmen otomatik biçimde elde edilerek işlenmekte ve güncellenmektedir.

Kişisel Verilerinizin Paylaşılması

Kişisel verileriniz; ilgili Bakanlıklar, sigorta şirketleri, yazılım desteği sağlayan kuruluşlar ve yasal zorunluluk durumunda yetkili kamu kurum ve kuruluşlarıyla mevzuatın izin verdiği ve zorunlu kıldığı ölçü ve koşullar dahilinde aktarılabilecektir.

Haklarınız

KVKK'nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme, silinmesini veya yok edilmesini isteme haklarınız bulunmaktadır.

KVKK kapsamındaki taleplerinizi Kooperatif'e yazılı olarak iletebilirsiniz.`,
  kvkkClose: 'Kapat',
  registrationSuccess: 'Kayıt Başarılı!',
  printQR: 'QR Yazdır',
  newRegistration: 'Yeni Kayıt',
  countrySearchPlaceholder: 'Ülke adı veya kod...',
  noResults: 'Sonuç bulunamadı',
  fillNamePhone: 'Lütfen önce Ad, Soyad ve Telefon bilgilerini doldurun',
  invalidPhone: 'Geçersiz telefon formatı',
  registrationFailed: 'Kayıt oluşturulamadı',
  saving: 'Kaydediliyor...',
}

const en: Translations = {
  formTitle: 'Customer Registration Form',
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone',
  email: 'Email',
  emergencyContact: 'Hotel Name',
  weight: 'Weight (kg)',
  weightHelper: 'Required for flight safety (20-150 kg)',
  next: 'Next',
  back: 'Back',
  submit: 'Complete Registration & Generate QR',
  required: 'This field is required',
  personalInfo: 'Personal Information',
  waiverTitle: 'Risk Acceptance and Liability Waiver',
  waiverFullTitle: 'PARAGLIDING FLIGHT RISK ACCEPTANCE AND LIABILITY WAIVER',
  waiverIntro: 'This document has been prepared in relation to the tandem paragliding flight to be carried out under the Alanya Paragliding and Sports Tourism Development Cooperative (Limited Liability).',
  waiverAccept: 'By signing this document, I accept and declare the following:',
  waiverItem1: 'Paragliding is inherently a dangerous activity and carries a risk of accidents.',
  waiverItem2: 'I have received the necessary pre-flight training and briefing from my pilot, I have full knowledge of the subject, and I am ready to fly of my own free will, accepting all risks.',
  waiverItem3: 'I am aware that accidents may occur during the flight due to weather conditions, equipment failure, or other unforeseen circumstances.',
  waiverItem4: 'I do not have any health problems (heart disease, epilepsy, pregnancy, etc.), or if I do, I have informed the pilot and authorities.',
  waiverItem5: 'I undertake to comply with all safety instructions given before the flight.',
  waiverItem6: 'The tandem flight is insured by RAY SİGORTA A.Ş. I accept that in the event of any accident, I shall not claim any rights or demands from the Alanya District Sports Tourism Committee Flight Control Board, the Cooperative and the company/pilot operating it, or any other persons.',
  waiverItem7: 'I accept that photographs and videos taken during the flight may be recorded by the Cooperative and that these visual/audio recordings may be used for service delivery purposes.',
  waiverItem8: 'I declare that I am over 18 years of age or that I have obtained the consent of my legal guardian.',
  waiverKvkkLine: 'By signing this form, I consent to the processing of my personal data within the scope of the {link}.',
  kvkkLinkText: 'Personal Data Protection Notice (KVKK)',
  kvkkModalTitle: 'Personal Data Protection Notice',
  signHere: 'Sign below:',
  signClear: 'Clear',
  signHelper: 'Use your finger or mouse to sign in the area above',
  signConfirm: 'Confirm Signature',
  signCancel: 'Cancel',
  signViewAndSign: 'View Risk Form & Sign',
  signRequired: 'Please sign the risk form',
  signed: 'Risk Form Signed',
  resignLabel: 'Sign Again',
  kvkkText: `INFORMATION NOTICE

This information notice has been prepared within the scope of the Law No. 6698 on the Protection of Personal Data (KVKK), regarding your transactions related to paragliding activities under the Alanya Paragliding and Sports Tourism Development Cooperative (Limited Liability), which is the data controller.

Purpose and Legal Basis for Processing Your Personal Data

Your personal data (identity information, contact information, flight safety-related data, flight records, visual and audio recordings of flights — video, photographs) may be processed within the framework of the purposes and conditions specified below in connection with the service you will receive and/or the paragliding flight you will undertake.

— Personal data collected for the purpose of ensuring flight safety and security, service delivery, and informing you on related matters are processed pursuant to KVKK Art.5/2-c, provided that it is directly related to the establishment and performance of a contract.

— Personal data processed for the purpose of meeting information and document retention obligations under applicable laws and regulations and recording all transactions are processed pursuant to KVKK Art.5/2-ç, on the legal basis of fulfilling obligations under the insurance policy.

— Personal data processed for the purpose of improving service quality and conducting data analysis are processed pursuant to KVKK Art.5/2-f, on the legal basis that processing is essential for the legitimate interests of the data controller, without harming the fundamental rights and freedoms of the data subject.

Method of Collecting Your Personal Data

Your personal data is obtained and updated through information and documents submitted by you via your applications for flight registration and through audio-visual recording of flights performed; in written and electronic form, wholly or partially by automatic means.

Sharing of Your Personal Data

Your personal data may be transferred to relevant Ministries, insurance companies, organizations providing software support, and authorized public institutions and organizations in cases of legal obligation, within the limits and conditions permitted and required by legislation.

Your Rights

Within the scope of Article 11 of KVKK, you have the right to learn whether your personal data is being processed, request information if it has been processed, learn the purpose of processing and whether it is used in accordance with its purpose, know the third parties to whom it is transferred domestically or abroad, request correction if it has been processed incompletely or incorrectly, and request its deletion or destruction.

You may submit your requests within the scope of KVKK to the Cooperative in writing.`,
  kvkkClose: 'Close',
  registrationSuccess: 'Registration Successful!',
  printQR: 'Print QR',
  newRegistration: 'New Registration',
  countrySearchPlaceholder: 'Country name or code...',
  noResults: 'No results found',
  fillNamePhone: 'Please fill in First Name, Last Name and Phone first',
  invalidPhone: 'Invalid phone format',
  registrationFailed: 'Registration failed',
  saving: 'Saving...',
}

const ru: Translations = {
  formTitle: 'Форма регистрации клиента',
  firstName: 'Имя',
  lastName: 'Фамилия',
  phone: 'Телефон',
  email: 'Электронная почта',
  emergencyContact: 'Название отеля',
  weight: 'Вес (кг)',
  weightHelper: 'Необходимо для безопасности полёта (20-150 кг)',
  next: 'Далее',
  back: 'Назад',
  submit: 'Завершить регистрацию и создать QR-код',
  required: 'Обязательное поле',
  personalInfo: 'Личная информация',
  waiverTitle: 'Заявление о принятии рисков и ответственности',
  waiverFullTitle: 'ЗАЯВЛЕНИЕ О ПРИНЯТИИ РИСКОВ И ОТВЕТСТВЕННОСТИ ПРИ ПОЛЁТЕ НА ПАРАПЛАНЕ',
  waiverIntro: 'Настоящий документ составлен в связи с тандемным полётом на параплане, осуществляемым в рамках Кооператива по развитию парапланеризма и спортивного туризма Аланьи (с ограниченной ответственностью).',
  waiverAccept: 'Подписывая настоящий документ, я принимаю и заявляю следующее:',
  waiverItem1: 'Парапланеризм по своей природе является опасным видом деятельности и сопряжён с риском несчастных случаев.',
  waiverItem2: 'Я прошёл необходимую предполётную подготовку и инструктаж у моего пилота, обладаю полной информацией и готов к полёту по собственному желанию, принимая все риски.',
  waiverItem3: 'Я осведомлён о том, что во время полёта могут произойти аварии из-за погодных условий, неисправности оборудования или других непредвиденных обстоятельств.',
  waiverItem4: 'У меня отсутствуют проблемы со здоровьем (сердечные заболевания, эпилепсия, беременность и т.д.), а при их наличии я уведомил пилота и ответственных лиц.',
  waiverItem5: 'Я обязуюсь соблюдать все инструкции по безопасности, данные перед полётом.',
  waiverItem6: 'Тандемный полёт застрахован компанией RAY SİGORTA A.Ş. Я принимаю, что в случае любого несчастного случая я не буду предъявлять никаких прав и требований к Комиссии по контролю полётов районного комитета спортивного туризма Аланьи, Кооперативу и управляющей компании/пилоту, а также иным лицам.',
  waiverItem7: 'Я согласен с тем, что фотографии и видеозаписи, сделанные во время полёта, могут быть сохранены Кооперативом и что данные визуальные/аудиозаписи могут использоваться в целях предоставления услуг.',
  waiverItem8: 'Я заявляю, что мне исполнилось 18 лет или что я получил согласие законного представителя.',
  waiverKvkkLine: 'Подписывая эту форму, я даю согласие на обработку моих персональных данных в рамках {link}.',
  kvkkLinkText: 'Уведомление о защите персональных данных (KVKK)',
  kvkkModalTitle: 'Уведомление о защите персональных данных',
  signHere: 'Поставьте подпись ниже:',
  signClear: 'Очистить',
  signHelper: 'Используйте палец или мышь для подписи в области выше',
  signConfirm: 'Подтвердить подпись',
  signCancel: 'Отмена',
  signViewAndSign: 'Просмотреть и подписать форму',
  signRequired: 'Пожалуйста, подпишите форму',
  signed: 'Форма подписана',
  resignLabel: 'Подписать заново',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Закрыть',
  registrationSuccess: 'Регистрация успешна!',
  printQR: 'Печать QR',
  newRegistration: 'Новая регистрация',
  countrySearchPlaceholder: 'Название страны или код...',
  noResults: 'Ничего не найдено',
  fillNamePhone: 'Сначала заполните имя, фамилию и телефон',
  invalidPhone: 'Неверный формат телефона',
  registrationFailed: 'Ошибка регистрации',
  saving: 'Сохранение...',
}

const de: Translations = {
  formTitle: 'Kundenregistrierungsformular',
  firstName: 'Vorname',
  lastName: 'Nachname',
  phone: 'Telefon',
  email: 'E-Mail',
  emergencyContact: 'Hotelname',
  weight: 'Gewicht (kg)',
  weightHelper: 'Für die Flugsicherheit erforderlich (20-150 kg)',
  next: 'Weiter',
  back: 'Zurück',
  submit: 'Registrierung abschließen und QR erstellen',
  required: 'Pflichtfeld',
  personalInfo: 'Persönliche Daten',
  waiverTitle: 'Risikoakzeptanz- und Haftungserklärung',
  waiverFullTitle: 'RISIKOAKZEPTANZ- UND HAFTUNGSERKLÄRUNG FÜR GLEITSCHIRMFLÜGE',
  waiverIntro: 'Dieses Dokument wurde im Zusammenhang mit dem Tandem-Gleitschirmflug erstellt, der im Rahmen der Genossenschaft für Gleitschirm- und Sporttourismusentwicklung Alanya (mit beschränkter Haftung) durchgeführt wird.',
  waiverAccept: 'Mit der Unterzeichnung dieses Dokuments akzeptiere und erkläre ich Folgendes:',
  waiverItem1: 'Gleitschirmfliegen ist von Natur aus eine gefährliche Aktivität und birgt ein Unfallrisiko.',
  waiverItem2: 'Ich habe die erforderliche Vorflugschulung und Einweisung von meinem Piloten erhalten, bin umfassend informiert und bin aus eigenem Willen unter Akzeptanz aller Risiken flugbereit.',
  waiverItem3: 'Mir ist bewusst, dass während des Fluges Unfälle aufgrund von Wetterbedingungen, Geräteausfällen oder anderen unvorhersehbaren Umständen auftreten können.',
  waiverItem4: 'Ich habe keine gesundheitlichen Probleme (Herzerkrankungen, Epilepsie, Schwangerschaft usw.), oder ich habe den Piloten und die Behörden darüber informiert.',
  waiverItem5: 'Ich verpflichte mich, alle vor dem Flug erteilten Sicherheitsanweisungen zu befolgen.',
  waiverItem6: 'Der Tandemflug ist durch RAY SİGORTA A.Ş. versichert. Ich akzeptiere, dass ich im Falle eines Unfalls keinerlei Rechte oder Ansprüche gegen die Flugkontrollkommission des Bezirksausschusses für Sporttourismus Alanya, die Genossenschaft und das betreibende Unternehmen/den Piloten oder andere Personen geltend machen werde.',
  waiverItem7: 'Ich stimme zu, dass während des Fluges aufgenommene Fotos und Videos von der Genossenschaft aufgezeichnet werden können und diese visuellen/akustischen Aufnahmen für die Erbringung von Dienstleistungen verwendet werden dürfen.',
  waiverItem8: 'Ich erkläre, dass ich über 18 Jahre alt bin oder die Zustimmung meines gesetzlichen Vertreters eingeholt habe.',
  waiverKvkkLine: 'Mit der Unterzeichnung dieses Formulars stimme ich der Verarbeitung meiner personenbezogenen Daten im Rahmen der {link} zu.',
  kvkkLinkText: 'Datenschutzerklärung (KVKK)',
  kvkkModalTitle: 'Datenschutzerklärung',
  signHere: 'Unterschreiben Sie unten:',
  signClear: 'Löschen',
  signHelper: 'Unterschreiben Sie mit dem Finger oder der Maus im obigen Bereich',
  signConfirm: 'Unterschrift bestätigen',
  signCancel: 'Abbrechen',
  signViewAndSign: 'Risikoformular ansehen und unterschreiben',
  signRequired: 'Bitte unterschreiben Sie das Risikoformular',
  signed: 'Risikoformular unterschrieben',
  resignLabel: 'Erneut unterschreiben',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Schließen',
  registrationSuccess: 'Registrierung erfolgreich!',
  printQR: 'QR drucken',
  newRegistration: 'Neue Registrierung',
  countrySearchPlaceholder: 'Ländername oder Code...',
  noResults: 'Keine Ergebnisse gefunden',
  fillNamePhone: 'Bitte füllen Sie zuerst Vorname, Nachname und Telefon aus',
  invalidPhone: 'Ungültiges Telefonformat',
  registrationFailed: 'Registrierung fehlgeschlagen',
  saving: 'Wird gespeichert...',
}

const ar: Translations = {
  formTitle: 'نموذج تسجيل العميل',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  emergencyContact: 'اسم الفندق',
  weight: 'الوزن (كغ)',
  weightHelper: 'مطلوب لسلامة الطيران (20-150 كغ)',
  next: 'التالي',
  back: 'رجوع',
  submit: 'إتمام التسجيل وإنشاء رمز QR',
  required: 'هذا الحقل مطلوب',
  personalInfo: 'المعلومات الشخصية',
  waiverTitle: 'إقرار قبول المخاطر والمسؤولية',
  waiverFullTitle: 'إقرار قبول المخاطر والمسؤولية لرحلة الباراشوت الانزلاقي',
  waiverIntro: 'تم إعداد هذه الوثيقة فيما يتعلق برحلة المظلات الشراعية الترادفية التي ستُنفذ في إطار تعاونية ألانيا للمظلات الشراعية وتطوير السياحة الرياضية (ذات المسؤولية المحدودة).',
  waiverAccept: 'بتوقيعي على هذه الوثيقة، أقبل وأصرّح بما يلي:',
  waiverItem1: 'الطيران بالمظلات بطبيعته نشاط خطير وينطوي على خطر وقوع حوادث.',
  waiverItem2: 'لقد تلقيت التدريب والإحاطة اللازمين قبل الطيران من طياري، وأملك المعلومات الكاملة، وأنا مستعد للطيران بإرادتي الحرة مع قبول جميع المخاطر.',
  waiverItem3: 'أنا على علم بأنه قد تقع حوادث أثناء الطيران بسبب الظروف الجوية أو أعطال المعدات أو ظروف أخرى غير متوقعة.',
  waiverItem4: 'لا أعاني من أي مشاكل صحية (أمراض القلب، الصرع، الحمل، إلخ)، أو إن وُجدت فقد أبلغت الطيار والجهات المعنية.',
  waiverItem5: 'أتعهد بالالتزام بجميع تعليمات السلامة المقدمة قبل الطيران.',
  waiverItem6: 'الرحلة الترادفية مؤمّنة من قبل شركة RAY SİGORTA A.Ş. أقبل بأنه في حالة وقوع أي حادث، لن أطالب بأي حقوق أو مطالبات تجاه لجنة مراقبة الطيران بلجنة السياحة الرياضية في منطقة ألانيا والتعاونية والشركة/الطيار المشغل أو أي أشخاص آخرين.',
  waiverItem7: 'أوافق على أنه يجوز للتعاونية تسجيل الصور ومقاطع الفيديو الملتقطة أثناء الرحلة وأن هذه التسجيلات المرئية/السمعية قد تُستخدم لأغراض تقديم الخدمة.',
  waiverItem8: 'أصرّح بأنني فوق 18 عاماً أو أنني حصلت على موافقة الولي القانوني.',
  waiverKvkkLine: 'بتوقيعي على هذا النموذج، أوافق على معالجة بياناتي الشخصية ضمن نطاق {link}.',
  kvkkLinkText: 'إشعار حماية البيانات الشخصية (KVKK)',
  kvkkModalTitle: 'إشعار حماية البيانات الشخصية',
  signHere: 'وقّع أدناه:',
  signClear: 'مسح',
  signHelper: 'استخدم إصبعك أو الماوس للتوقيع في المنطقة أعلاه',
  signConfirm: 'تأكيد التوقيع',
  signCancel: 'إلغاء',
  signViewAndSign: 'عرض نموذج المخاطر والتوقيع',
  signRequired: 'يرجى توقيع نموذج المخاطر',
  signed: 'تم توقيع نموذج المخاطر',
  resignLabel: 'إعادة التوقيع',
  kvkkText: tr.kvkkText,
  kvkkClose: 'إغلاق',
  registrationSuccess: 'تم التسجيل بنجاح!',
  printQR: 'طباعة QR',
  newRegistration: 'تسجيل جديد',
  countrySearchPlaceholder: 'اسم الدولة أو الرمز...',
  noResults: 'لم يتم العثور على نتائج',
  fillNamePhone: 'يرجى ملء الاسم الأول واسم العائلة والهاتف أولاً',
  invalidPhone: 'تنسيق الهاتف غير صالح',
  registrationFailed: 'فشل التسجيل',
  saving: 'جارٍ الحفظ...',
}

const pl: Translations = {
  formTitle: 'Formularz rejestracji klienta',
  firstName: 'Imię',
  lastName: 'Nazwisko',
  phone: 'Telefon',
  email: 'E-mail',
  emergencyContact: 'Nazwa hotelu',
  weight: 'Waga (kg)',
  weightHelper: 'Wymagane dla bezpieczeństwa lotu (20-150 kg)',
  next: 'Dalej',
  back: 'Wstecz',
  submit: 'Zakończ rejestrację i wygeneruj QR',
  required: 'Pole wymagane',
  personalInfo: 'Dane osobowe',
  waiverTitle: 'Oświadczenie o akceptacji ryzyka i odpowiedzialności',
  waiverFullTitle: 'OŚWIADCZENIE O AKCEPTACJI RYZYKA I ODPOWIEDZIALNOŚCI PODCZAS LOTU PARALOTNIĄ',
  waiverIntro: 'Niniejszy dokument został sporządzony w związku z lotem tandemowym na paralotni realizowanym w ramach Spółdzielni Rozwoju Paralotniarstwa i Turystyki Sportowej Alanya (z ograniczoną odpowiedzialnością).',
  waiverAccept: 'Podpisując niniejszy dokument, akceptuję i oświadczam, co następuje:',
  waiverItem1: 'Paralotniarstwo jest z natury niebezpieczną aktywnością i wiąże się z ryzykiem wypadków.',
  waiverItem2: 'Otrzymałem/am niezbędne szkolenie przedlotowe i instruktaż od mojego pilota, posiadam pełną wiedzę na ten temat i jestem gotowy/a do lotu z własnej woli, akceptując wszelkie ryzyko.',
  waiverItem3: 'Jestem świadomy/a, że podczas lotu mogą wystąpić wypadki spowodowane warunkami pogodowymi, awarią sprzętu lub innymi nieprzewidzianymi okolicznościami.',
  waiverItem4: 'Nie mam żadnych problemów zdrowotnych (choroby serca, epilepsja, ciąża itp.) lub w przypadku ich wystąpienia poinformowałem/am pilota i władze.',
  waiverItem5: 'Zobowiązuję się do przestrzegania wszystkich instrukcji bezpieczeństwa wydanych przed lotem.',
  waiverItem6: 'Lot tandemowy jest ubezpieczony przez RAY SİGORTA A.Ş. Akceptuję, że w przypadku jakiegokolwiek wypadku nie będę wnosić żadnych roszczeń wobec Komisji Kontroli Lotów Okręgowego Komitetu Turystyki Sportowej Alanya, Spółdzielni i firmy/pilota ją prowadzącego ani żadnych innych osób.',
  waiverItem7: 'Wyrażam zgodę, aby zdjęcia i filmy wykonane podczas lotu mogły być rejestrowane przez Spółdzielnię oraz aby te materiały wizualne/dźwiękowe mogły być wykorzystywane w celu świadczenia usług.',
  waiverItem8: 'Oświadczam, że mam ukończone 18 lat lub uzyskałem/am zgodę opiekuna prawnego.',
  waiverKvkkLine: 'Podpisując ten formularz, wyrażam zgodę na przetwarzanie moich danych osobowych w ramach {link}.',
  kvkkLinkText: 'Informacji o ochronie danych osobowych (KVKK)',
  kvkkModalTitle: 'Informacja o ochronie danych osobowych',
  signHere: 'Podpisz poniżej:',
  signClear: 'Wyczyść',
  signHelper: 'Użyj palca lub myszy, aby złożyć podpis w powyższym polu',
  signConfirm: 'Potwierdź podpis',
  signCancel: 'Anuluj',
  signViewAndSign: 'Zobacz formularz ryzyka i podpisz',
  signRequired: 'Proszę podpisać formularz ryzyka',
  signed: 'Formularz ryzyka podpisany',
  resignLabel: 'Podpisz ponownie',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Zamknij',
  registrationSuccess: 'Rejestracja zakończona pomyślnie!',
  printQR: 'Drukuj QR',
  newRegistration: 'Nowa rejestracja',
  countrySearchPlaceholder: 'Nazwa kraju lub kod...',
  noResults: 'Brak wyników',
  fillNamePhone: 'Proszę najpierw wypełnić imię, nazwisko i telefon',
  invalidPhone: 'Nieprawidłowy format telefonu',
  registrationFailed: 'Rejestracja nie powiodła się',
  saving: 'Zapisywanie...',
}

const uk: Translations = {
  formTitle: 'Форма реєстрації клієнта',
  firstName: "Ім'я",
  lastName: 'Прізвище',
  phone: 'Телефон',
  email: 'Електронна пошта',
  emergencyContact: 'Назва готелю',
  weight: 'Вага (кг)',
  weightHelper: 'Необхідно для безпеки польоту (20-150 кг)',
  next: 'Далі',
  back: 'Назад',
  submit: 'Завершити реєстрацію та створити QR',
  required: "Обов'язкове поле",
  personalInfo: 'Особиста інформація',
  waiverTitle: 'Заява про прийняття ризиків та відповідальності',
  waiverFullTitle: 'ЗАЯВА ПРО ПРИЙНЯТТЯ РИЗИКІВ ТА ВІДПОВІДАЛЬНОСТІ ПРИ ПОЛЬОТІ НА ПАРАПЛАНІ',
  waiverIntro: 'Цей документ складено у зв\'язку з тандемним польотом на параплані, що здійснюється в рамках Кооперативу розвитку парапланеризму та спортивного туризму Аланії (з обмеженою відповідальністю).',
  waiverAccept: 'Підписуючи цей документ, я приймаю та заявляю наступне:',
  waiverItem1: 'Парапланеризм за своєю природою є небезпечним видом діяльності та пов\'язаний з ризиком нещасних випадків.',
  waiverItem2: 'Я пройшов необхідну передпольотну підготовку та інструктаж від мого пілота, маю повну інформацію і готовий до польоту за власним бажанням, приймаючи всі ризики.',
  waiverItem3: 'Я усвідомлюю, що під час польоту можуть статися аварії через погодні умови, несправність обладнання або інші непередбачені обставини.',
  waiverItem4: 'У мене відсутні проблеми зі здоров\'ям (серцеві захворювання, епілепсія, вагітність тощо), або за їх наявності я повідомив пілота та відповідальних осіб.',
  waiverItem5: 'Я зобов\'язуюсь дотримуватися всіх інструкцій з безпеки, наданих перед польотом.',
  waiverItem6: 'Тандемний політ застрахований компанією RAY SİGORTA A.Ş. Я приймаю, що у разі будь-якого нещасного випадку я не висуватиму жодних прав та вимог до Комісії з контролю польотів районного комітету спортивного туризму Аланії, Кооперативу та компанії/пілота, що ним керує, або інших осіб.',
  waiverItem7: 'Я погоджуюся з тим, що фотографії та відеозаписи, зроблені під час польоту, можуть бути збережені Кооперативом і що ці візуальні/аудіозаписи можуть використовуватися для надання послуг.',
  waiverItem8: 'Я заявляю, що мені виповнилося 18 років або що я отримав згоду законного представника.',
  waiverKvkkLine: 'Підписуючи цю форму, я даю згоду на обробку моїх персональних даних у межах {link}.',
  kvkkLinkText: 'Повідомлення про захист персональних даних (KVKK)',
  kvkkModalTitle: 'Повідомлення про захист персональних даних',
  signHere: 'Підпишіть нижче:',
  signClear: 'Очистити',
  signHelper: 'Використовуйте палець або мишу для підпису в області вище',
  signConfirm: 'Підтвердити підпис',
  signCancel: 'Скасувати',
  signViewAndSign: 'Переглянути та підписати форму',
  signRequired: 'Будь ласка, підпишіть форму ризиків',
  signed: 'Форму ризиків підписано',
  resignLabel: 'Підписати знову',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Закрити',
  registrationSuccess: 'Реєстрацію завершено успішно!',
  printQR: 'Друк QR',
  newRegistration: 'Нова реєстрація',
  countrySearchPlaceholder: 'Назва країни або код...',
  noResults: 'Нічого не знайдено',
  fillNamePhone: "Спочатку заповніть ім'я, прізвище та телефон",
  invalidPhone: 'Невірний формат телефону',
  registrationFailed: 'Помилка реєстрації',
  saving: 'Збереження...',
}

const zh: Translations = {
  formTitle: '客户登记表',
  firstName: '名',
  lastName: '姓',
  phone: '电话',
  email: '电子邮箱',
  emergencyContact: '酒店名称',
  weight: '体重（公斤）',
  weightHelper: '飞行安全需要（20-150公斤）',
  next: '下一步',
  back: '返回',
  submit: '完成注册并生成二维码',
  required: '此字段为必填项',
  personalInfo: '个人信息',
  waiverTitle: '风险接受和责任声明',
  waiverFullTitle: '滑翔伞飞行风险接受和责任声明',
  waiverIntro: '本文件就在阿兰亚滑翔伞及体育旅游发展合作社（有限责任）框架下进行的双人滑翔伞飞行而编制。',
  waiverAccept: '本人签署本文件，接受并声明如下：',
  waiverItem1: '滑翔伞运动本身具有危险性，存在事故风险。',
  waiverItem2: '本人已从飞行员处接受了必要的飞行前培训和说明，充分了解相关信息，自愿接受所有风险并准备飞行。',
  waiverItem3: '本人了解飞行期间可能因天气条件、设备故障或其他不可预见的情况而发生事故。',
  waiverItem4: '本人没有任何健康问题（心脏病、癫痫、怀孕等），如有，已告知飞行员和相关负责人。',
  waiverItem5: '本人承诺遵守飞行前给出的所有安全指示。',
  waiverItem6: '双人飞行由RAY SİGORTA A.Ş.保险公司承保。本人接受，在发生任何事故的情况下，不会向阿兰亚地区体育旅游委员会飞行控制委员会、合作社及其运营公司/飞行员或其他任何人提出任何权利和索赔。',
  waiverItem7: '本人同意飞行期间拍摄的照片和视频可由合作社记录，且这些视听资料可用于服务提供目的。',
  waiverItem8: '本人声明已年满18岁或已获得法定监护人的同意。',
  waiverKvkkLine: '本人签署此表格，同意在{link}范围内处理本人的个人数据。',
  kvkkLinkText: '个人数据保护通知（KVKK）',
  kvkkModalTitle: '个人数据保护通知',
  signHere: '请在下方签名：',
  signClear: '清除',
  signHelper: '请用手指或鼠标在上方区域签名',
  signConfirm: '确认签名',
  signCancel: '取消',
  signViewAndSign: '查看风险表格并签名',
  signRequired: '请签署风险表格',
  signed: '风险表格已签署',
  resignLabel: '重新签名',
  kvkkText: tr.kvkkText,
  kvkkClose: '关闭',
  registrationSuccess: '注册成功！',
  printQR: '打印二维码',
  newRegistration: '新注册',
  countrySearchPlaceholder: '国家名称或代码...',
  noResults: '未找到结果',
  fillNamePhone: '请先填写姓名和电话',
  invalidPhone: '电话格式无效',
  registrationFailed: '注册失败',
  saving: '保存中...',
}

const fr: Translations = {
  formTitle: "Formulaire d'inscription client",
  firstName: 'Prénom',
  lastName: 'Nom',
  phone: 'Téléphone',
  email: 'E-mail',
  emergencyContact: "Nom de l'hôtel",
  weight: 'Poids (kg)',
  weightHelper: 'Requis pour la sécurité du vol (20-150 kg)',
  next: 'Suivant',
  back: 'Retour',
  submit: "Terminer l'inscription et générer le QR",
  required: 'Champ obligatoire',
  personalInfo: 'Informations personnelles',
  waiverTitle: "Déclaration d'acceptation des risques et de responsabilité",
  waiverFullTitle: "DÉCLARATION D'ACCEPTATION DES RISQUES ET DE RESPONSABILITÉ POUR LE VOL EN PARAPENTE",
  waiverIntro: "Ce document a été établi dans le cadre du vol en parapente biplace qui sera effectué au sein de la Coopérative de développement du parapente et du tourisme sportif d'Alanya (à responsabilité limitée).",
  waiverAccept: 'En signant ce document, j\'accepte et déclare ce qui suit :',
  waiverItem1: "Le parapente est par nature une activité dangereuse comportant un risque d'accident.",
  waiverItem2: "J'ai reçu la formation et le briefing pré-vol nécessaires de mon pilote, je dispose de toutes les informations et je suis prêt(e) à voler de mon plein gré, en acceptant tous les risques.",
  waiverItem3: "Je suis conscient(e) que des accidents peuvent survenir pendant le vol en raison des conditions météorologiques, d'une défaillance de l'équipement ou d'autres circonstances imprévisibles.",
  waiverItem4: "Je n'ai aucun problème de santé (maladie cardiaque, épilepsie, grossesse, etc.), ou j'en ai informé le pilote et les autorités.",
  waiverItem5: "Je m'engage à respecter toutes les consignes de sécurité données avant le vol.",
  waiverItem6: "Le vol biplace est assuré par RAY SİGORTA A.Ş. J'accepte qu'en cas d'accident, je ne formulerai aucune revendication ni demande envers la Commission de contrôle des vols du Comité de tourisme sportif du district d'Alanya, la Coopérative et la société/le pilote qui l'exploite, ni envers toute autre personne.",
  waiverItem7: "J'accepte que les photographies et vidéos prises pendant le vol puissent être enregistrées par la Coopérative et que ces enregistrements visuels/sonores puissent être utilisés à des fins de prestation de services.",
  waiverItem8: "Je déclare avoir plus de 18 ans ou avoir obtenu le consentement de mon représentant légal.",
  waiverKvkkLine: 'En signant ce formulaire, je consens au traitement de mes données personnelles dans le cadre de la {link}.',
  kvkkLinkText: 'Notice de protection des données personnelles (KVKK)',
  kvkkModalTitle: 'Notice de protection des données personnelles',
  signHere: 'Signez ci-dessous :',
  signClear: 'Effacer',
  signHelper: 'Utilisez votre doigt ou la souris pour signer dans la zone ci-dessus',
  signConfirm: 'Confirmer la signature',
  signCancel: 'Annuler',
  signViewAndSign: 'Voir le formulaire de risque et signer',
  signRequired: 'Veuillez signer le formulaire de risque',
  signed: 'Formulaire de risque signé',
  resignLabel: 'Signer à nouveau',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Fermer',
  registrationSuccess: 'Inscription réussie !',
  printQR: 'Imprimer QR',
  newRegistration: 'Nouvelle inscription',
  countrySearchPlaceholder: 'Nom du pays ou code...',
  noResults: 'Aucun résultat trouvé',
  fillNamePhone: "Veuillez d'abord remplir le prénom, le nom et le téléphone",
  invalidPhone: 'Format de téléphone invalide',
  registrationFailed: "L'inscription a échoué",
  saving: 'Enregistrement...',
}

const fa: Translations = {
  formTitle: 'فرم ثبت نام مشتری',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  phone: 'تلفن',
  email: 'ایمیل',
  emergencyContact: 'نام هتل',
  weight: 'وزن (کیلوگرم)',
  weightHelper: 'برای ایمنی پرواز ضروری است (20-150 کیلوگرم)',
  next: 'بعدی',
  back: 'بازگشت',
  submit: 'تکمیل ثبت نام و ایجاد QR',
  required: 'این فیلد الزامی است',
  personalInfo: 'اطلاعات شخصی',
  waiverTitle: 'بیانیه پذیرش ریسک و مسئولیت',
  waiverFullTitle: 'بیانیه پذیرش ریسک و مسئولیت پرواز پاراگلایدر',
  waiverIntro: 'این سند در ارتباط با پرواز تاندم پاراگلایدر که در چارچوب تعاونی توسعه پاراگلایدر و گردشگری ورزشی آلانیا (با مسئولیت محدود) انجام می‌شود، تنظیم شده است.',
  waiverAccept: 'با امضای این سند، موارد زیر را می‌پذیرم و اعلام می‌کنم:',
  waiverItem1: 'پاراگلایدر ذاتاً یک فعالیت خطرناک است و خطر حوادث را در بر دارد.',
  waiverItem2: 'آموزش و توجیهات لازم قبل از پرواز را از خلبانم دریافت کرده‌ام، اطلاعات کاملی دارم و با پذیرش تمام خطرات، با اراده آزاد خود آماده پرواز هستم.',
  waiverItem3: 'آگاهم که ممکن است در طول پرواز به دلیل شرایط آب و هوایی، خرابی تجهیزات یا سایر شرایط پیش‌بینی نشده حوادثی رخ دهد.',
  waiverItem4: 'هیچ مشکل سلامتی (بیماری قلبی، صرع، بارداری و غیره) ندارم، یا در صورت وجود، خلبان و مسئولان را مطلع کرده‌ام.',
  waiverItem5: 'متعهد می‌شوم تمام دستورالعمل‌های ایمنی ارائه شده قبل از پرواز را رعایت کنم.',
  waiverItem6: 'پرواز تاندم توسط شرکت بیمه RAY SİGORTA A.Ş بیمه شده است. می‌پذیرم که در صورت بروز هرگونه حادثه، هیچ حق و ادعایی نسبت به کمیته کنترل پرواز کمیته گردشگری ورزشی منطقه آلانیا، تعاونی و شرکت/خلبان اداره‌کننده آن یا هر شخص دیگری نخواهم داشت.',
  waiverItem7: 'موافقم که عکس‌ها و ویدیوهای گرفته شده در طول پرواز ممکن است توسط تعاونی ضبط شود و این ضبط‌های تصویری/صوتی ممکن است برای اهداف ارائه خدمات استفاده شود.',
  waiverItem8: 'اعلام می‌کنم که بالای 18 سال سن دارم یا رضایت قیم قانونی خود را دریافت کرده‌ام.',
  waiverKvkkLine: 'با امضای این فرم، با پردازش داده‌های شخصی‌ام در چارچوب {link} موافقت می‌کنم.',
  kvkkLinkText: 'اطلاعیه حفاظت از داده‌های شخصی (KVKK)',
  kvkkModalTitle: 'اطلاعیه حفاظت از داده‌های شخصی',
  signHere: 'در زیر امضا کنید:',
  signClear: 'پاک کردن',
  signHelper: 'با انگشت یا ماوس در ناحیه بالا امضا کنید',
  signConfirm: 'تأیید امضا',
  signCancel: 'لغو',
  signViewAndSign: 'مشاهده فرم ریسک و امضا',
  signRequired: 'لطفاً فرم ریسک را امضا کنید',
  signed: 'فرم ریسک امضا شد',
  resignLabel: 'امضای مجدد',
  kvkkText: tr.kvkkText,
  kvkkClose: 'بستن',
  registrationSuccess: 'ثبت نام با موفقیت انجام شد!',
  printQR: 'چاپ QR',
  newRegistration: 'ثبت نام جدید',
  countrySearchPlaceholder: 'نام کشور یا کد...',
  noResults: 'نتیجه‌ای یافت نشد',
  fillNamePhone: 'لطفاً ابتدا نام، نام خانوادگی و تلفن را پر کنید',
  invalidPhone: 'فرمت تلفن نامعتبر',
  registrationFailed: 'ثبت نام ناموفق بود',
  saving: 'در حال ذخیره...',
}

const nl: Translations = {
  formTitle: 'Klantregistratieformulier',
  firstName: 'Voornaam',
  lastName: 'Achternaam',
  phone: 'Telefoon',
  email: 'E-mail',
  emergencyContact: 'Hotelnaam',
  weight: 'Gewicht (kg)',
  weightHelper: 'Vereist voor vliegveiligheid (20-150 kg)',
  next: 'Volgende',
  back: 'Terug',
  submit: 'Registratie voltooien & QR genereren',
  required: 'Dit veld is verplicht',
  personalInfo: 'Persoonlijke gegevens',
  waiverTitle: 'Risicoacceptatie en aansprakelijkheidsvrijwaring',
  waiverFullTitle: 'PARAGLIDING VLUCHT RISICOACCEPTATIE EN AANSPRAKELIJKHEIDSVRIJWARING',
  waiverIntro: 'Dit document is opgesteld met betrekking tot de tandem paraglidingvlucht die wordt uitgevoerd onder de Alanya Paragliding en Sporttoerisme Ontwikkelingscoöperatie.',
  waiverAccept: 'Door dit document te ondertekenen, aanvaard en verklaar ik het volgende:',
  waiverItem1: 'Paragliding is van nature een gevaarlijke activiteit en brengt risico op ongevallen met zich mee.',
  waiverItem2: 'Ik heb de noodzakelijke pre-vluchttraining en briefing van mijn piloot ontvangen, ik ben volledig op de hoogte en ik ben bereid om uit vrije wil te vliegen, waarbij ik alle risico\'s aanvaard.',
  waiverItem3: 'Ik ben me ervan bewust dat er tijdens de vlucht ongevallen kunnen optreden als gevolg van weersomstandigheden, materiaaldefecten of andere onvoorziene omstandigheden.',
  waiverItem4: 'Ik heb geen gezondheidsproblemen (hartziekte, epilepsie, zwangerschap, enz.), of als dat wel het geval is, heb ik de piloot en de autoriteiten geïnformeerd.',
  waiverItem5: 'Ik verplicht me om alle veiligheidsinstructies die vóór de vlucht worden gegeven op te volgen.',
  waiverItem6: 'De tandemvlucht is verzekerd door RAY SİGORTA A.Ş. Ik aanvaard dat ik in geval van een ongeval geen rechten of eisen zal indienen bij de Alanya District Sporttoerisme Commissie, de Coöperatie en het bedrijf/de piloot die het exploiteert, of andere personen.',
  waiverItem7: 'Ik aanvaard dat foto\'s en video\'s die tijdens de vlucht worden gemaakt door de Coöperatie kunnen worden opgenomen en dat deze visuele/audio-opnamen kunnen worden gebruikt voor dienstverlening.',
  waiverItem8: 'Ik verklaar dat ik ouder ben dan 18 jaar of dat ik de toestemming van mijn wettelijke voogd heb verkregen.',
  waiverKvkkLine: 'Door dit formulier te ondertekenen, geef ik toestemming voor de verwerking van mijn persoonlijke gegevens binnen het kader van de {link}.',
  kvkkLinkText: 'Privacyverklaring (KVKK)',
  kvkkModalTitle: 'Privacyverklaring',
  signHere: 'Hieronder ondertekenen:',
  signClear: 'Wissen',
  signHelper: 'Gebruik uw vinger of muis om te ondertekenen in het bovenstaande gebied',
  signConfirm: 'Handtekening bevestigen',
  signCancel: 'Annuleren',
  signViewAndSign: 'Risicoformulier bekijken & ondertekenen',
  signRequired: 'Onderteken alstublieft het risicoformulier',
  signed: 'Risicoformulier ondertekend',
  resignLabel: 'Opnieuw ondertekenen',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Sluiten',
  registrationSuccess: 'Registratie geslaagd!',
  printQR: 'QR afdrukken',
  newRegistration: 'Nieuwe registratie',
  countrySearchPlaceholder: 'Landnaam of code...',
  noResults: 'Geen resultaten gevonden',
  fillNamePhone: 'Vul eerst voornaam, achternaam en telefoon in',
  invalidPhone: 'Ongeldig telefoonformaat',
  registrationFailed: 'Registratie mislukt',
  saving: 'Opslaan...',
}

const fi: Translations = {
  formTitle: 'Asiakasrekisteröintilomake',
  firstName: 'Etunimi',
  lastName: 'Sukunimi',
  phone: 'Puhelin',
  email: 'Sähköposti',
  emergencyContact: 'Hotellin nimi',
  weight: 'Paino (kg)',
  weightHelper: 'Vaaditaan lentoturvallisuutta varten (20-150 kg)',
  next: 'Seuraava',
  back: 'Takaisin',
  submit: 'Viimeistele rekisteröinti ja luo QR',
  required: 'Tämä kenttä on pakollinen',
  personalInfo: 'Henkilötiedot',
  waiverTitle: 'Riskin hyväksyminen ja vastuuvapautuslauseke',
  waiverFullTitle: 'VARJOLIITOLENNON RISKIN HYVÄKSYMINEN JA VASTUUVAPAUTUSLAUSEKE',
  waiverIntro: 'Tämä asiakirja on laadittu Alanyan varjoliito- ja urheilumatkailun kehittämisosuuskunnan alaisuudessa suoritettavaa tandem-varjoliitolentoa varten.',
  waiverAccept: 'Allekirjoittamalla tämän asiakirjan hyväksyn ja vakuutan seuraavaa:',
  waiverItem1: 'Varjoliito on luonteeltaan vaarallinen toiminta ja siihen liittyy onnettomuusriski.',
  waiverItem2: 'Olen saanut tarvittavan lentoa edeltävän koulutuksen ja ohjeistuksen pilotiltani, minulla on täysi tietoisuus aiheesta ja olen valmis lentämään omasta vapaasta tahdostani hyväksyen kaikki riskit.',
  waiverItem3: 'Olen tietoinen, että lennon aikana voi tapahtua onnettomuuksia sääolosuhteiden, laitevian tai muiden ennakoimattomien olosuhteiden vuoksi.',
  waiverItem4: 'Minulla ei ole terveysongelmia (sydänsairaus, epilepsia, raskaus jne.), tai jos on, olen ilmoittanut siitä pilotille ja viranomaisille.',
  waiverItem5: 'Sitoudun noudattamaan kaikkia ennen lentoa annettuja turvallisuusohjeita.',
  waiverItem6: 'Tandemlento on vakuutettu RAY SİGORTA A.Ş.:n toimesta. Hyväksyn, että mahdollisen onnettomuuden sattuessa en esitä vaatimuksia osuuskunnalle, yritykselle/pilotille tai muille henkilöille.',
  waiverItem7: 'Hyväksyn, että lennon aikana otettuja valokuvia ja videoita voidaan tallentaa osuuskunnan toimesta ja näitä visuaalisia/äänitallentamia voidaan käyttää palvelun tarjoamiseen.',
  waiverItem8: 'Vakuutan olevani yli 18-vuotias tai saaneeni laillisen huoltajani suostumuksen.',
  waiverKvkkLine: 'Allekirjoittamalla tämän lomakkeen suostun henkilötietojeni käsittelyyn {link} puitteissa.',
  kvkkLinkText: 'Tietosuojaseloste (KVKK)',
  kvkkModalTitle: 'Tietosuojaseloste',
  signHere: 'Allekirjoita alle:',
  signClear: 'Tyhjennä',
  signHelper: 'Käytä sormeasi tai hiirtä allekirjoittaaksesi yllä olevaan alueeseen',
  signConfirm: 'Vahvista allekirjoitus',
  signCancel: 'Peruuta',
  signViewAndSign: 'Näytä riskilomake ja allekirjoita',
  signRequired: 'Allekirjoita riskilomake',
  signed: 'Riskilomake allekirjoitettu',
  resignLabel: 'Allekirjoita uudelleen',
  kvkkText: tr.kvkkText,
  kvkkClose: 'Sulje',
  registrationSuccess: 'Rekisteröinti onnistui!',
  printQR: 'Tulosta QR',
  newRegistration: 'Uusi rekisteröinti',
  countrySearchPlaceholder: 'Maan nimi tai koodi...',
  noResults: 'Tuloksia ei löytynyt',
  fillNamePhone: 'Täytä ensin etunimi, sukunimi ja puhelin',
  invalidPhone: 'Virheellinen puhelinnumero',
  registrationFailed: 'Rekisteröinti epäonnistui',
  saving: 'Tallennetaan...',
}

export const translations: Record<Language, Translations> = {
  tr, en, ru, de, ar, pl, uk, zh, fr, fa, nl, fi,
}

export function t(lang: Language): Translations {
  return translations[lang] || translations.tr
}

export function isRtl(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang)
}
