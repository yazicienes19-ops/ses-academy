import type { Sprache } from "@/i18n/typ";
import type { Database } from "@/lib/database.types";

type Anmeldestatus = Database["public"]["Enums"]["registration_status"];

/** Texte für Ticket-Seite und E-Mails an Teilnehmende, in der Sprache der Person. */
export type PortalTexte = {
  ticketTitel: string;
  ticketIntro: string;
  kurzcode: string;
  kurzcodeHilfe: string;
  lesezeichen: string;
  moduleTitel: string;
  ortOffen: string;
  status: Record<Anmeldestatus, string>;
  besucht: string;
  ohneTicket: string;
  abmelden: string;
  grund: string;
  abmeldenBestaetigen: string;
  abgemeldet: string;
  zuSpaet: string;
  unbekannt: string;
  mailTicketBetreff: string;
  mailAnrede: (name: string) => string;
  mailTicketText: string;
  mailWillkommenBetreff: string;
  mailWillkommenText: string;
  mailWillkommenLogin: string;
  mailTicketLink: string;
  mailAbmeldeHinweis: string;
  mailBewerbungBetreff: string;
  mailBewerbungText: string;
  mailGruss: string;
  anmeldungTitel: string;
  anmeldungIntro: string;
  anmeldungFrei: (n: number) => string;
  anmeldungVoll: string;
  anmeldungEinwilligung: string;
  anmeldungSenden: string;
  anmeldungOk: string;
  anmeldungWarteliste: string;
  anmeldungSchon: string;
  anmeldungFehler: string;
  verlorenTitel: string;
  verlorenText: string;
  verlorenSenden: string;
  verlorenOk: string;
  verlorenLink: string;
  abmeldenPerMail: string;
  abmeldeLinkSenden: string;
  abmeldeLinkGesendet: string;
  abgesagtSelbst: string;
  dochTeilnehmen: string;
  wiederAngemeldet: string;
  wiederWarteliste: string;
  nichtMehrMoeglich: string;
  walletHinzufuegen: string;
  walletName: string;
  walletNaechstes: string;
  walletOrt: string;
  walletKeinTermin: string;
  walletTicketSeite: string;
  walletHinweis: string;
  mailAbmeldungBetreff: (titel: string) => string;
  mailAbmeldungText: (titel: string) => string;
  mailAbmeldungZurueck: string;
};

export const portalTexte: Record<Sprache, PortalTexte> = {
  de: {
    ticketTitel: "Dein Ticket",
    ticketIntro: "Zeig diesen QR-Code beim Einlass. Er gilt für alle deine Module und jeden Modultag.",
    kurzcode: "Kurzcode",
    kurzcodeHilfe: "Falls der Scan nicht klappt, nenne am Einlass diesen Code.",
    lesezeichen: "Speichere diese Seite als Lesezeichen. Den Link findest du auch in deiner E-Mail.",
    moduleTitel: "Deine Module",
    ortOffen: "Ort folgt",
    status: { confirmed: "Angemeldet", pending: "Wird geprüft", waitlist: "Warteliste", cancelled: "Abgemeldet", excused: "Entschuldigt", rejected: "Abgelehnt" },
    besucht: "Besucht",
    ohneTicket: "Für dieses Modul brauchst du kein Ticket.",
    abmelden: "Ich kann nicht teilnehmen",
    grund: "Grund (optional)",
    abmeldenBestaetigen: "Abmeldung bestätigen",
    abgemeldet: "Danke für Bescheid. Deine Abmeldung ist gespeichert.",
    zuSpaet: "Das Modul hat schon begonnen. Bitte melde dich direkt beim Team.",
    unbekannt: "Das hat leider nicht geklappt. Bitte versuch es noch einmal.",
    mailTicketBetreff: "Dein Ticket für die SES Academy",
    mailAnrede: (n) => `Hallo ${n},`,
    mailTicketText: "deine Teilnahme an der SES Academy ist bestätigt. Mit diesem QR-Code checkst du an jedem Modultag ein:",
    mailWillkommenBetreff: "Dein SES-Konto ist bereit",
    mailWillkommenText: "dein Konto für die SES Academy ist bereit. In „Mein Bereich“ findest du dein Ticket, die Termine, deine Hausaufgaben und dein Profil. Anmelden kannst du dich ohne Passwort mit deiner E-Mail-Adresse und einem Code, den wir dir dann schicken. Mit diesem QR-Code checkst du an jedem Modultag ein:",
    mailWillkommenLogin: "Zu „Mein Bereich“",
    mailTicketLink: "Ticket online öffnen",
    mailAbmeldeHinweis: "Falls du an einem Modul nicht teilnehmen kannst, melde dich bitte vorher über dein Ticket ab.",
    mailBewerbungBetreff: "Deine Bewerbung ist eingegangen",
    mailBewerbungText: "vielen Dank für deine Bewerbung für die SES Academy. Wir melden uns, sobald wir sie geprüft haben.",
    mailGruss: "Viele Grüße\nDein Team der SES Academy",
    anmeldungTitel: "Jetzt anmelden",
    anmeldungIntro: "Für diese Veranstaltung kannst du dich auch ohne Bewerbung anmelden. Dein Ticket kommt per E-Mail.",
    anmeldungFrei: (n) => (n === 1 ? "Noch 1 Platz frei" : `Noch ${n} Plätze frei`),
    anmeldungVoll: "Ausgebucht. Du kommst auf die Warteliste und wir schreiben dir, sobald ein Platz frei wird.",
    anmeldungEinwilligung: "Ich bin einverstanden, dass der Islamrat meine Angaben zur Organisation der Veranstaltung verarbeitet.",
    anmeldungSenden: "Anmelden",
    anmeldungOk: "Du bist angemeldet. Dein Ticket ist per E-Mail unterwegs.",
    anmeldungWarteliste: "Du stehst auf der Warteliste. Wir schreiben dir, sobald ein Platz frei wird.",
    anmeldungSchon: "Du bist schon angemeldet. Wir haben dir dein Ticket noch einmal geschickt.",
    anmeldungFehler: "Das hat leider nicht geklappt. Bitte prüfe deine Angaben oder schreib uns an ses@islamrat.de.",
    verlorenTitel: "Ticket verloren?",
    verlorenText: "Gib die E-Mail-Adresse ein, mit der du angemeldet bist. Wir schicken dir dein Ticket erneut.",
    verlorenSenden: "Ticket senden",
    verlorenOk: "Wenn es zu dieser Adresse eine Anmeldung gibt, ist dein Ticket jetzt unterwegs.",
    verlorenLink: "Ticket verloren? Hier erneut anfordern",
    abmeldenPerMail: "Abmelden kannst du über den Link aus deiner Ticket-Mail oder angemeldet in „Mein Bereich“. Wir schicken dir den Link gern noch einmal an deine E-Mail-Adresse.",
    abmeldeLinkSenden: "Link per Mail schicken",
    abmeldeLinkGesendet: "Wir haben dir den Link an deine E-Mail-Adresse geschickt. Darüber kannst du dich auch abmelden.",
    abgesagtSelbst: "Du hast für dieses Modul abgesagt.",
    dochTeilnehmen: "Doch teilnehmen",
    wiederAngemeldet: "Schön, dass du doch dabei bist. Deine Anmeldung gilt wieder.",
    wiederWarteliste: "Du stehst wieder auf der Warteliste. Wir melden uns, sobald ein Platz frei ist.",
    nichtMehrMoeglich: "Das geht hier leider nicht mehr. Bitte schreib uns an ses@islamrat.de.",
    walletHinzufuegen: "Zu Apple Wallet hinzufügen",
    walletName: "Name",
    walletNaechstes: "Nächstes Modul",
    walletOrt: "Ort",
    walletKeinTermin: "Kein Termin geplant",
    walletTicketSeite: "Ticket-Seite",
    walletHinweis: "Dieser Pass gilt für alle deine Module. Neue Termine siehst du auf der Ticket-Seite; dort kannst du den Pass auch neu laden.",
    mailAbmeldungBetreff: (t) => `Abmeldung gespeichert: ${t}`,
    mailAbmeldungText: (t) => `du hast dich von „${t}“ abgemeldet. Danke, dass du Bescheid gesagt hast.`,
    mailAbmeldungZurueck: "Falls das ein Versehen war oder du doch kommen kannst: Auf deiner Ticket-Seite kannst du die Abmeldung bis zum Beginn des Moduls zurücknehmen. Wenn du dich nicht selbst abgemeldet hast, antworte bitte auf diese Mail.",
  },
  tr: {
    ticketTitel: "Biletin",
    ticketIntro: "Girişte bu QR kodunu göster. Tüm modüllerin ve her modül günü için geçerlidir.",
    kurzcode: "Kısa kod",
    kurzcodeHilfe: "Tarama çalışmazsa girişte bu kodu söyle.",
    lesezeichen: "Bu sayfayı yer imlerine ekle. Bağlantıyı e-postanda da bulabilirsin.",
    moduleTitel: "Modüllerin",
    ortOffen: "Yer daha sonra bildirilecek",
    status: { confirmed: "Kayıtlı", pending: "İnceleniyor", waitlist: "Bekleme listesi", cancelled: "Kayıt iptal", excused: "Mazeretli", rejected: "Reddedildi" },
    besucht: "Katıldın",
    ohneTicket: "Bu modül için bilete gerek yok.",
    abmelden: "Katılamayacağım",
    grund: "Sebep (isteğe bağlı)",
    abmeldenBestaetigen: "Kaydı iptal et",
    abgemeldet: "Haber verdiğin için teşekkürler. İptalin kaydedildi.",
    zuSpaet: "Modül başladı. Lütfen doğrudan ekiple iletişime geç.",
    unbekannt: "Maalesef bir sorun oluştu. Lütfen tekrar dene.",
    mailTicketBetreff: "SES Academy biletin",
    mailAnrede: (n) => `Merhaba ${n},`,
    mailTicketText: "SES Academy'ye katılımın onaylandı. Her modül günü girişte bu QR kodu ile giriş yaparsın:",
    mailWillkommenBetreff: "SES hesabın hazır",
    mailWillkommenText: "SES Academy hesabın hazır. „Mein Bereich“ sayfasında biletini, tarihleri, ödevlerini ve profilini bulursun. Şifresiz giriş yaparsın: e-posta adresini yaz, sana bir kod gönderiyoruz. Her modül günü girişte bu QR kodu ile giriş yaparsın:",
    mailWillkommenLogin: "„Mein Bereich“e git",
    mailTicketLink: "Bileti çevrimiçi aç",
    mailAbmeldeHinweis: "Bir modüle katılamayacaksan lütfen önceden biletin üzerinden kaydını iptal et.",
    mailBewerbungBetreff: "Başvurun bize ulaştı",
    mailBewerbungText: "SES Academy'ye başvurduğun için çok teşekkürler. İnceledikten sonra sana dönüş yapacağız.",
    mailGruss: "Selamlar\nSES Academy ekibi",
    anmeldungTitel: "Hemen kaydol",
    anmeldungIntro: "Bu etkinliğe başvuru yapmadan da kaydolabilirsin. Biletin e-posta ile gelir.",
    anmeldungFrei: (n) => `${n} yer kaldı`,
    anmeldungVoll: "Yer kalmadı. Bekleme listesine alınırsın, yer açılınca sana yazarız.",
    anmeldungEinwilligung: "Bilgilerimin etkinliğin organizasyonu için İslam Konseyi tarafından işlenmesini kabul ediyorum.",
    anmeldungSenden: "Kaydol",
    anmeldungOk: "Kaydın tamam. Biletin e-posta ile yolda.",
    anmeldungWarteliste: "Bekleme listesindesin. Yer açılınca sana yazacağız.",
    anmeldungSchon: "Zaten kayıtlısın. Biletini sana tekrar gönderdik.",
    anmeldungFehler: "Maalesef bir sorun oluştu. Lütfen bilgilerini kontrol et veya ses@islamrat.de adresine yaz.",
    verlorenTitel: "Biletini mi kaybettin?",
    verlorenText: "Kayıt olduğun e-posta adresini gir. Biletini sana tekrar gönderelim.",
    verlorenSenden: "Bileti gönder",
    verlorenOk: "Bu adrese ait bir kayıt varsa biletin şimdi yolda.",
    verlorenLink: "Biletini mi kaybettin? Buradan tekrar iste",
    abmeldenPerMail: "Kaydını, bilet e-postandaki bağlantıdan veya „Mein Bereich“e giriş yaparak iptal edebilirsin. Bağlantıyı e-posta adresine tekrar gönderebiliriz.",
    abmeldeLinkSenden: "Bağlantıyı e-postayla gönder",
    abmeldeLinkGesendet: "Bağlantıyı e-posta adresine gönderdik. Kaydını oradan da iptal edebilirsin.",
    abgesagtSelbst: "Bu modüle katılamayacağını bildirdin.",
    dochTeilnehmen: "Yine de katılıyorum",
    wiederAngemeldet: "Aramızda olacağına sevindik. Kaydın tekrar geçerli.",
    wiederWarteliste: "Tekrar bekleme listesindesin. Yer açılınca sana haber vereceğiz.",
    nichtMehrMoeglich: "Maalesef bu artık buradan mümkün değil. Lütfen ses@islamrat.de adresine yaz.",
    walletHinzufuegen: "Apple Cüzdan’a ekle",
    walletName: "İsim",
    walletNaechstes: "Sıradaki modül",
    walletOrt: "Yer",
    walletKeinTermin: "Planlanmış tarih yok",
    walletTicketSeite: "Bilet sayfası",
    walletHinweis: "Bu kart tüm modüllerin için geçerlidir. Yeni tarihleri bilet sayfasında görürsün; kartı orada yeniden de yükleyebilirsin.",
    mailAbmeldungBetreff: (t) => `Kaydın iptal edildi: ${t}`,
    mailAbmeldungText: (t) => `„${t}“ programına katılamayacağını bildirdin. Haber verdiğin için teşekkürler.`,
    mailAbmeldungZurueck: "Yanlışlıkla olduysa ya da yine de gelebileceksen: Bilet sayfanda modül başlayana kadar iptali geri alabilirsin. Kaydını sen iptal etmediysen lütfen bu e-postayı yanıtla.",
  },
  en: {
    ticketTitel: "Your ticket",
    ticketIntro: "Show this QR code at the entrance. It is valid for all your modules and every module day.",
    kurzcode: "Short code",
    kurzcodeHilfe: "If scanning does not work, tell the team this code at the entrance.",
    lesezeichen: "Bookmark this page. You will also find the link in your email.",
    moduleTitel: "Your modules",
    ortOffen: "Venue to be announced",
    status: { confirmed: "Registered", pending: "Under review", waitlist: "Waiting list", cancelled: "Cancelled", excused: "Excused", rejected: "Declined" },
    besucht: "Attended",
    ohneTicket: "No ticket needed for this module.",
    abmelden: "I can’t attend",
    grund: "Reason (optional)",
    abmeldenBestaetigen: "Confirm cancellation",
    abgemeldet: "Thanks for letting us know. Your cancellation has been saved.",
    zuSpaet: "The module has already started. Please contact the team directly.",
    unbekannt: "Something went wrong. Please try again.",
    mailTicketBetreff: "Your ticket for the SES Academy",
    mailAnrede: (n) => `Hello ${n},`,
    mailTicketText: "your participation in the SES Academy is confirmed. Use this QR code to check in on every module day:",
    mailWillkommenBetreff: "Your SES account is ready",
    mailWillkommenText: "your SES Academy account is ready. In “Mein Bereich” you will find your ticket, the dates, your assignments and your profile. You sign in without a password: enter your email address and we send you a code. Use this QR code to check in on every module day:",
    mailWillkommenLogin: "Go to “Mein Bereich”",
    mailTicketLink: "Open ticket online",
    mailAbmeldeHinweis: "If you can’t attend a module, please cancel in advance via your ticket.",
    mailBewerbungBetreff: "We have received your application",
    mailBewerbungText: "thank you for applying to the SES Academy. We will get back to you once we have reviewed it.",
    mailGruss: "Best regards\nYour SES Academy team",
    anmeldungTitel: "Register now",
    anmeldungIntro: "You can register for this event without applying. Your ticket will arrive by email.",
    anmeldungFrei: (n) => (n === 1 ? "1 place left" : `${n} places left`),
    anmeldungVoll: "Fully booked. You will be put on the waiting list and we will write to you as soon as a place becomes free.",
    anmeldungEinwilligung: "I agree that the Islamrat processes my details to organise the event.",
    anmeldungSenden: "Register",
    anmeldungOk: "You are registered. Your ticket is on its way by email.",
    anmeldungWarteliste: "You are on the waiting list. We will write to you as soon as a place becomes free.",
    anmeldungSchon: "You are already registered. We have sent you your ticket again.",
    anmeldungFehler: "Something went wrong. Please check your details or write to us at ses@islamrat.de.",
    verlorenTitel: "Lost your ticket?",
    verlorenText: "Enter the email address you registered with. We will send you your ticket again.",
    verlorenSenden: "Send ticket",
    verlorenOk: "If there is a registration for this address, your ticket is on its way.",
    verlorenLink: "Lost your ticket? Request it again here",
    abmeldenPerMail: "You can cancel via the link in your ticket email or when signed in to “Mein Bereich”. We can send the link to your email address again.",
    abmeldeLinkSenden: "Email me the link",
    abmeldeLinkGesendet: "We have sent the link to your email address. You can also cancel there.",
    abgesagtSelbst: "You cancelled for this module.",
    dochTeilnehmen: "I can attend after all",
    wiederAngemeldet: "Great that you can make it after all. Your registration is valid again.",
    wiederWarteliste: "You are back on the waiting list. We will let you know as soon as a place is free.",
    nichtMehrMoeglich: "This is no longer possible here. Please write to ses@islamrat.de.",
    walletHinzufuegen: "Add to Apple Wallet",
    walletName: "Name",
    walletNaechstes: "Next module",
    walletOrt: "Location",
    walletKeinTermin: "No date scheduled",
    walletTicketSeite: "Ticket page",
    walletHinweis: "This pass is valid for all your modules. New dates appear on the ticket page, where you can also reload the pass.",
    mailAbmeldungBetreff: (t) => `Cancellation saved: ${t}`,
    mailAbmeldungText: (t) => `you cancelled your place for “${t}”. Thanks for letting us know.`,
    mailAbmeldungZurueck: "If this was a mistake or you can come after all, you can undo the cancellation on your ticket page until the module begins. If you did not cancel yourself, please reply to this email.",
  },
  fr: {
    ticketTitel: "Ton billet",
    ticketIntro: "Montre ce QR code à l’entrée. Il est valable pour tous tes modules et chaque journée.",
    kurzcode: "Code court",
    kurzcodeHilfe: "Si le scan ne fonctionne pas, donne ce code à l’entrée.",
    lesezeichen: "Ajoute cette page à tes favoris. Tu trouveras aussi le lien dans ton e-mail.",
    moduleTitel: "Tes modules",
    ortOffen: "Lieu à venir",
    status: { confirmed: "Inscrit·e", pending: "En cours d’examen", waitlist: "Liste d’attente", cancelled: "Désinscrit·e", excused: "Excusé·e", rejected: "Refusé" },
    besucht: "Présent·e",
    ohneTicket: "Pas besoin de billet pour ce module.",
    abmelden: "Je ne peux pas participer",
    grund: "Raison (facultatif)",
    abmeldenBestaetigen: "Confirmer la désinscription",
    abgemeldet: "Merci de nous avoir prévenus. Ta désinscription est enregistrée.",
    zuSpaet: "Le module a déjà commencé. Contacte directement l’équipe.",
    unbekannt: "Une erreur s’est produite. Réessaie, s’il te plaît.",
    mailTicketBetreff: "Ton billet pour la SES Academy",
    mailAnrede: (n) => `Bonjour ${n},`,
    mailTicketText: "ta participation à la SES Academy est confirmée. Avec ce QR code, tu t’enregistres à chaque journée de module :",
    mailWillkommenBetreff: "Ton compte SES est prêt",
    mailWillkommenText: "ton compte SES Academy est prêt. Dans « Mein Bereich », tu trouves ton billet, les dates, tes devoirs et ton profil. Tu te connectes sans mot de passe : saisis ton adresse e-mail et nous t’envoyons un code. Avec ce QR code, tu t’enregistres à chaque journée de module :",
    mailWillkommenLogin: "Vers « Mein Bereich »",
    mailTicketLink: "Ouvrir le billet en ligne",
    mailAbmeldeHinweis: "Si tu ne peux pas participer à un module, désinscris-toi à l’avance via ton billet.",
    mailBewerbungBetreff: "Nous avons bien reçu ta candidature",
    mailBewerbungText: "merci pour ta candidature à la SES Academy. Nous reviendrons vers toi après l’avoir examinée.",
    mailGruss: "Bien à toi\nL’équipe de la SES Academy",
    anmeldungTitel: "S’inscrire",
    anmeldungIntro: "Tu peux t’inscrire à cet événement sans candidature. Ton billet arrive par e-mail.",
    anmeldungFrei: (n) => (n === 1 ? "Plus qu’1 place" : `Plus que ${n} places`),
    anmeldungVoll: "Complet. Tu seras sur la liste d’attente et nous t’écrirons dès qu’une place se libère.",
    anmeldungEinwilligung: "J’accepte que l’Islamrat traite mes données pour l’organisation de l’événement.",
    anmeldungSenden: "S’inscrire",
    anmeldungOk: "Tu es inscrit·e. Ton billet arrive par e-mail.",
    anmeldungWarteliste: "Tu es sur la liste d’attente. Nous t’écrirons dès qu’une place se libère.",
    anmeldungSchon: "Tu es déjà inscrit·e. Nous t’avons renvoyé ton billet.",
    anmeldungFehler: "Une erreur s’est produite. Vérifie tes informations ou écris-nous à ses@islamrat.de.",
    verlorenTitel: "Billet perdu ?",
    verlorenText: "Indique l’adresse e-mail utilisée pour ton inscription. Nous te renverrons ton billet.",
    verlorenSenden: "Envoyer le billet",
    verlorenOk: "S’il existe une inscription pour cette adresse, ton billet est en route.",
    verlorenLink: "Billet perdu ? Le redemander ici",
    abmeldenPerMail: "Tu peux te désinscrire via le lien de ton e-mail de billet ou en te connectant à « Mein Bereich ». Nous pouvons t’envoyer le lien à nouveau.",
    abmeldeLinkSenden: "M’envoyer le lien",
    abmeldeLinkGesendet: "Nous t’avons envoyé le lien par e-mail. Tu peux aussi te désinscrire par ce lien.",
    abgesagtSelbst: "Tu t’es désinscrit·e de ce module.",
    dochTeilnehmen: "Finalement, je participe",
    wiederAngemeldet: "Super que tu puisses venir. Ton inscription est de nouveau valable.",
    wiederWarteliste: "Tu es de nouveau sur la liste d’attente. Nous te prévenons dès qu’une place se libère.",
    nichtMehrMoeglich: "Ce n’est plus possible ici. Écris-nous à ses@islamrat.de.",
    walletHinzufuegen: "Ajouter à Apple Wallet",
    walletName: "Nom",
    walletNaechstes: "Prochain module",
    walletOrt: "Lieu",
    walletKeinTermin: "Aucune date prévue",
    walletTicketSeite: "Page du billet",
    walletHinweis: "Ce pass est valable pour tous tes modules. Les nouvelles dates sont sur la page du billet, où tu peux aussi recharger le pass.",
    mailAbmeldungBetreff: (t) => `Désinscription enregistrée : ${t}`,
    mailAbmeldungText: (t) => `tu t’es désinscrit·e de « ${t} ». Merci de nous avoir prévenus.`,
    mailAbmeldungZurueck: "Si c’était une erreur ou si tu peux finalement venir, tu peux annuler la désinscription sur ta page de billet jusqu’au début du module. Si tu ne t’es pas désinscrit·e toi-même, réponds à cet e-mail.",
  },
  nl: {
    ticketTitel: "Je ticket",
    ticketIntro: "Laat deze QR-code zien bij de ingang. Hij geldt voor al je modules en elke moduledag.",
    kurzcode: "Korte code",
    kurzcodeHilfe: "Lukt het scannen niet, noem dan deze code bij de ingang.",
    lesezeichen: "Bewaar deze pagina als bladwijzer. De link staat ook in je e-mail.",
    moduleTitel: "Je modules",
    ortOffen: "Locatie volgt",
    status: { confirmed: "Aangemeld", pending: "Wordt beoordeeld", waitlist: "Wachtlijst", cancelled: "Afgemeld", excused: "Afgemeld met reden", rejected: "Afgewezen" },
    besucht: "Aanwezig",
    ohneTicket: "Voor deze module heb je geen ticket nodig.",
    abmelden: "Ik kan niet komen",
    grund: "Reden (optioneel)",
    abmeldenBestaetigen: "Afmelding bevestigen",
    abgemeldet: "Bedankt voor het laten weten. Je afmelding is opgeslagen.",
    zuSpaet: "De module is al begonnen. Neem direct contact op met het team.",
    unbekannt: "Er ging iets mis. Probeer het nog eens.",
    mailTicketBetreff: "Je ticket voor de SES Academy",
    mailAnrede: (n) => `Hoi ${n},`,
    mailTicketText: "je deelname aan de SES Academy is bevestigd. Met deze QR-code check je op elke moduledag in:",
    mailWillkommenBetreff: "Je SES-account is klaar",
    mailWillkommenText: "je account voor de SES Academy is klaar. In „Mein Bereich” vind je je ticket, de data, je opdrachten en je profiel. Inloggen gaat zonder wachtwoord: vul je e-mailadres in en we sturen je een code. Met deze QR-code check je op elke moduledag in:",
    mailWillkommenLogin: "Naar „Mein Bereich”",
    mailTicketLink: "Ticket online openen",
    mailAbmeldeHinweis: "Kun je niet bij een module zijn? Meld je dan vooraf af via je ticket.",
    mailBewerbungBetreff: "We hebben je aanmelding ontvangen",
    mailBewerbungText: "bedankt voor je aanmelding bij de SES Academy. We nemen contact met je op zodra we die hebben bekeken.",
    mailGruss: "Hartelijke groet\nJe team van de SES Academy",
    anmeldungTitel: "Nu aanmelden",
    anmeldungIntro: "Voor dit evenement kun je je ook zonder sollicitatie aanmelden. Je ticket komt per e-mail.",
    anmeldungFrei: (n) => (n === 1 ? "Nog 1 plek vrij" : `Nog ${n} plekken vrij`),
    anmeldungVoll: "Volgeboekt. Je komt op de wachtlijst en we schrijven je zodra er een plek vrijkomt.",
    anmeldungEinwilligung: "Ik ga ermee akkoord dat de Islamrat mijn gegevens verwerkt voor de organisatie van het evenement.",
    anmeldungSenden: "Aanmelden",
    anmeldungOk: "Je bent aangemeld. Je ticket is per e-mail onderweg.",
    anmeldungWarteliste: "Je staat op de wachtlijst. We schrijven je zodra er een plek vrijkomt.",
    anmeldungSchon: "Je bent al aangemeld. We hebben je ticket nog een keer gestuurd.",
    anmeldungFehler: "Er ging iets mis. Controleer je gegevens of schrijf ons op ses@islamrat.de.",
    verlorenTitel: "Ticket kwijt?",
    verlorenText: "Vul het e-mailadres in waarmee je bent aangemeld. We sturen je ticket opnieuw.",
    verlorenSenden: "Ticket sturen",
    verlorenOk: "Als er een aanmelding voor dit adres is, is je ticket nu onderweg.",
    verlorenLink: "Ticket kwijt? Vraag het hier opnieuw aan",
    abmeldenPerMail: "Afmelden kan via de link in je ticketmail of als je bent ingelogd in „Mein Bereich”. We kunnen je de link opnieuw mailen.",
    abmeldeLinkSenden: "Link mailen",
    abmeldeLinkGesendet: "We hebben je de link gemaild. Daarmee kun je je ook afmelden.",
    abgesagtSelbst: "Je hebt je voor deze module afgemeld.",
    dochTeilnehmen: "Ik kom toch",
    wiederAngemeldet: "Fijn dat je toch komt. Je aanmelding geldt weer.",
    wiederWarteliste: "Je staat weer op de wachtlijst. We laten het weten zodra er een plek vrij is.",
    nichtMehrMoeglich: "Dat kan hier helaas niet meer. Schrijf ons op ses@islamrat.de.",
    walletHinzufuegen: "Toevoegen aan Apple Wallet",
    walletName: "Naam",
    walletNaechstes: "Volgende module",
    walletOrt: "Locatie",
    walletKeinTermin: "Geen datum gepland",
    walletTicketSeite: "Ticketpagina",
    walletHinweis: "Deze pas geldt voor al je modules. Nieuwe data zie je op de ticketpagina; daar kun je de pas ook opnieuw laden.",
    mailAbmeldungBetreff: (t) => `Afmelding opgeslagen: ${t}`,
    mailAbmeldungText: (t) => `je hebt je afgemeld voor „${t}”. Bedankt voor het laten weten.`,
    mailAbmeldungZurueck: "Was dit een vergissing of kun je toch komen? Op je ticketpagina kun je de afmelding tot het begin van de module terugdraaien. Heb je je niet zelf afgemeld, beantwoord dan deze mail.",
  },
};

export function sprachOder(wert: string | null | undefined): Sprache {
  return wert === "tr" || wert === "en" || wert === "fr" || wert === "nl" ? wert : "de";
}
