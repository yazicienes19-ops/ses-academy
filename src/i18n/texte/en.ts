import type { Texte } from "../typ";

// Official texts from ses.islamrat.de/en/; duration aligned with the German original (2–2.5 years instead of "two to three").
export const en: Texte = {
  meta: {
    titel: "SES Academy – Political Education for Young Muslims in Europe",
    beschreibung:
      "The SES Academy is an educational programme by the Islamrat for young Muslims aged 18 to 30 in Europe: lectures, workshops and country groups – from April 2026 to June 2028.",
  },
  nav: { programm: "Programme", kompetenzen: "What you learn", rueckblick: "Look back", faq: "FAQ", kontakt: "Contact", menue: "Open menu", schliessen: "Close menu" },
  hero: {
    kicker: "Seminar for social and political education",
    zeilen: ["Your", "voice.", "Your Europe."],
    claim: "Political Education for Young Muslims in Europe.",
    intro:
      "The SES Academy (abbr. of „Sosyal ve Siyasal Eğitim Semineri“ – seminar for social and political education) is a two-year educational programme that helps young Muslims in Europe to develop political awareness, engage socially and take responsibility.",
    ctaProgramm: "See the programme",
    ctaFaq: "FAQ",
    laufzeitLabel: "Programme duration",
    laufzeit: "April 2026 – June 2028 (est.)",
    ortLabel: "Location",
    ort: "Cologne & other cities across Europe",
    alterLabel: "Who",
    alter: "Ages 18–30",
    kostenLabel: "Participation",
    kosten: "free of charge",
    fotoAlt: "Panel at the SES Academy launch: a participant speaking into the microphone",
    fotoText: "Launch · April 2026 · Cologne",
  },
  laufband: ["Democracy", "Constitution", "Participation", "Europe", "Religious freedom", "Critical thinking", "Media", "Responsibility", "Community"],
  bewerbung: {
    titel: "The current cohort is underway.",
    text: "Applications closed on 15 January 2026. Want to hear about future cohorts? Write to us.",
    cta: "ses@islamrat.de",
  },
  naechstes: { kicker: "Up next", mehr: "Learn more", inKoeln: "in Cologne" },
  programm: {
    kicker: "Event schedule",
    titel: "The programme",
    intro: "The programme consists of several modules, held at regular intervals over two years on weekends – complemented by one-week winter and summer camps.",
    vorbei: "completed",
    naechstes: "up next",
    geplant: "in planning",
    modul: "Module",
    weitereTitel: "Further modules are in planning",
    weitereText: "Seminars, workshops and winter and summer camps until June 2028 (est.) – in Cologne and other cities across Europe.",
    details: "Details",
    art: { auftakt: "Launch", seminar: "Seminar", workshop: "Skills Workshop", winterschool: "Winter School" },
  },
  kompetenzen: {
    kicker: "What you learn",
    titel: "Five competences.",
    intro: "In more than 10 practice-oriented modules, spread over weekends and one-week winter and summer camps, you will develop the following key competences over two years:",
    liste: [
      { name: "Insight", kurz: "Understand how politics, society, and media work.", text: "Learn to recognize connections, gain orientation, and contribute in an informed and responsible way." },
      { name: "Voice", kurz: "Find your voice – online and offline.", text: "Learn how to formulate clear messages, understand debates, and make your concerns visible." },
      { name: "Connect", kurz: "Build bridges between people and topics.", text: "Discover how to build relationships, create trust, and bring together people from culture, religion, education, sports, and civil society." },
      { name: "Create", kurz: "Turn ideas into real projects.", text: "From the first idea to implementation: learn how engagement becomes practical, effective, and sustainable." },
      { name: "Participate", kurz: "Take responsibility – for yourself, for others, and for society.", text: "Learn how values, teamwork, and democratic principles work together and how you can help shape positive change." },
    ],
  },
  rueckblick: {
    kicker: "Look back",
    titel: "How it all began.",
    text: "For the launch in April 2026, young Muslims from several European countries came to Cologne – for keynotes, panels and plenty of questions from the floor.",
    gaesteTitel: "Our guests so far",
    alle: "All guests of this module",
  },
  ueber: {
    kicker: "About the seminar series",
    titel: "Knowledge. Attitude. Action.",
    text: "Each seminar combines theoretical knowledge with practical application – complemented by exchange, mentoring and joint learning.",
    fuerWenTitel: "Who is the SES Academy for?",
    fuerWenText: "For young Muslims between 18 and 30 years old who want to actively shape their role in society.",
    fuerWenZusatz: "What matters is not what you already know – but that you are ready to make a difference.",
    ablaufTitel: "How a module works",
    ablauf: [
      { titel: "Input", text: "Each weekend seminar begins with an introductory seminar by experts from academia, politics and practice." },
      { titel: "Country groups", text: "Then you dive deeper with others from your country – in the European context, supported by specialists." },
      { titel: "Workshops", text: "Rhetoric, project management, written expression: practical skills so that you are heard." },
      { titel: "Camps", text: "In addition to the weekends, there are one-week winter and summer camps." },
    ],
  },
  faq: {
    kicker: "FAQ",
    titel: "Frequently Asked Questions",
    suche: "Search FAQs …",
    keineTreffer: "No results. Just write to us.",
    liste: [
      { frage: "What is the aim of the SES Academy?", antwort: ["The aim of the SES Academy is to promote politically interested Muslim youth in Europe, deepen their knowledge of political structures and strengthen their societal participation. This should encourage young Muslims to contribute actively to their societies."] },
      { frage: "Who can participate?", antwort: ["Young people aged 18 to 30 years who speak English, Turkish and the language of their respective country very well. Participants are also expected to attend the seminars regularly."] },
      {
        frage: "How can I join the programme?",
        antwort: ["The application process consists of two phases:"],
        punkte: ["Submitting your application via the online application form.", "A subsequent interview with applicants who have successfully passed the first phase."],
        nachsatz: "As spots are limited, we can only accept a limited number of participants. Applications for the current cohort closed on 15 January 2026.",
      },
      { frage: "From which countries is participation possible?", antwort: ["Participation is possible from all European countries in which the IGMG youth or women’s youth organizations are represented."] },
      { frage: "Is participation subject to a fee?", antwort: ["No, participation in the seminar programme is free of charge."] },
      { frage: "How long does the programme last?", antwort: ["The programme runs over a period of two to two and a half years."] },
      { frage: "How often do the seminars take place?", antwort: ["The weekend seminars (Saturday & Sunday) are held every two months. In addition, one-week winter and summer camps are organised."] },
      {
        frage: "What topics are covered?",
        antwort: ["Participants deal with topics such as:"],
        punkte: [
          "political systems in Europe",
          "constitutional frameworks, theories of democracy and religious freedom",
          "the relationship between Islam, religion and social participation",
          "religious, ethnic, cultural, ideological diversity and coexistence",
          "economy, environment and digitalisation",
          "the structures and tasks of the UN, the EU and national or local politics",
        ],
        nachsatz: "In addition, practical workshops on rhetorical skills, project management and written expression are offered.",
      },
      { frage: "What is the process of the seminars?", antwort: ["Each weekend seminar begins with an introductory seminar by experts. Afterwards, participants work in country groups to deepen the respective topics in the European context – supported by specialists from the various countries."] },
      { frage: "Who are the sponsors of the project?", antwort: ["The project is carried out by the Islam Council for the Federal Republic of Germany (Islamrat für die BRD) and in cooperation with the IGMG youth and women’s youth organizations."] },
    ],
  },
  kontakt: { titel: "Do you have any other questions?", text: "We’re happy to help.", cta: "Write to us" },
  footer: {
    claim: "Political Education for Young Muslims in Europe.",
    traeger: "A project of the Islamrat für die BRD in cooperation with the IGMG youth and women’s youth organisations.",
    impressum: "Legal notice",
    datenschutz: "Privacy",
    islamrat: "Islamrat.de",
    kontakt: "Contact",
  },
  seminar: { zurueck: "Back to overview", datum: "Date", ort: "Location", ortOffen: "in planning", vorher: "Previous module", nachher: "Next module", gaeste: "Guests", eindruecke: "Impressions" },
  formate: { keynote: "Keynote", panel: "Panel", videobotschaft: "Video message", moderation: "Moderation", grusswort: "Welcome address", eroeffnung: "Opening", studie: "Study", laendergruppe: "Country group", gespraech: "Conversation", schlusswort: "Closing remarks" },
  seminare: {
    auftakt: {
      titel: "Identity, Responsibility & Participation: Young Muslims in Europe",
      text: ["The opening session explores how personal values, religious influences, and individual experiences shape the civic engagement of young Muslims. Together, participants reflect on how to take responsibility and contribute confidently and constructively to democratic society."],
    },
    verfassungen: {
      titel: "Constitutions in Europe – Fundamentals & Current Challenges",
      text: ["What exactly is written in a constitution? Why do we need one? And what does it mean for citizens? This module provides essential knowledge about European constitutions, their protective functions, and how they must respond to crises, migration, digitalization, and social polarization."],
    },
    "skills-workshop": {
      titel: "Skills Workshop – Analysis, Critical Thinking and Information Management",
      text: ["How are political decisions made? How do social dynamics work? This workshop teaches analytical skills, critical thinking, and orientation in complex situations."],
    },
    demokratie: {
      titel: "Democracy in Europe – Forms, Opportunities & Stress Tests",
      text: ["Democracy looks different across Europe — yet everywhere it faces challenges. This module discusses various democratic models, issues such as populism and declining trust in institutions, and the importance of political participation. The goal is to understand democracy better and define one’s own role within it."],
    },
    "winter-school": {
      titel: "Winter School – Islam, Participation and Global Challenges",
      text: [
        "This Winter School addresses Islamic ethics, political participation and the understanding of international developments. Building on Islamic perspectives on responsibility and civic engagement, it explores how values, norms and ethical principles enable constructive participation. The programme also introduces key actors and structures of international politics – from the United Nations and the European Union to broader global dynamics in international relations.",
        "In addition, the Winter School strengthens essential communication skills: speaking persuasively, engaging in reflective discussion, writing clearly and using social media effectively.",
      ],
    },
  },
  bewerbungSeite: {
    "nav": "Apply",
    "meta": "Apply for the SES Academy – the free educational programme for young Muslims aged 18 to 30 in Europe.",
    "kicker": "Application",
    "titel": [
      "Join",
      "us."
    ],
    "intro": "You are between 18 and 30, want to understand how politics works – and make a difference yourself? Then the SES Academy is your place.",
    "status": "Applications for the current cohort closed on 15 January 2026. You can still register your interest now – we will get in touch as soon as a new application phase opens.",
    "voraussetzungenTitel": "What you bring",
    "voraussetzungen": [
      "You are between 18 and 30 years old.",
      "You speak English, Turkish and the language of your country very well.",
      "You live in a European country where the IGMG youth or women’s youth organisations are represented.",
      "You attend the seminars regularly – roughly one weekend every two months plus winter and summer camps."
    ],
    "ablaufTitel": "How applying works",
    "ablauf": [
      {
        "titel": "Apply online",
        "text": "Fill in the form and tell us why you want to take part."
      },
      {
        "titel": "Interview",
        "text": "Applicants who pass the first phase are invited to an interview."
      },
      {
        "titel": "Let’s go",
        "text": "Places are limited. If it’s a match, you’ll be part of the next cohort – free of charge."
      }
    ],
    "formTitel": "Your application",
    "felder": {
      "vorname": "First name",
      "nachname": "Last name",
      "email": "Email",
      "telefon": "Phone",
      "geburtsjahr": "Year of birth",
      "land": "Country",
      "stadt": "City",
      "sprachen": "Languages you speak very well",
      "spracheEn": "English",
      "spracheTr": "Turkish",
      "spracheLand": "National language",
      "motivation": "Why do you want to join the SES Academy?",
      "motivationHilfe": "A few sentences are enough – what interests you, what do you want to change?",
      "quelle": "How did you hear about the SES Academy?",
      "optional": "optional"
    },
    "einwilligung": "I agree that the Islamrat may process my details in order to handle my application.",
    "senden": "Send application",
    "hinweis": "After submitting, you will receive a confirmation by email.",
    "danke": "Thank you! We have received your application. A confirmation is on its way to your inbox.",
    "fehler": "Something went wrong. Please check your details or write to us at ses@islamrat.de.",
    "doppelt": "There is already an application for this year with this email address.",
    "mailBetreff": "Application SES Academy"
  },
  stimmen: {
    "nav": "Voices",
    "meta": "Commentaries, videos and projects by SES Academy participants.",
    "kicker": "Voices",
    "titel": [
      "We have",
      "something to say."
    ],
    "intro": "This is where SES Academy participants publish what they develop in the modules: commentaries, videos, graphics and podcasts – in their own language.",
    "leer": "The first contributions will be published soon.",
    "filterModul": "Module",
    "filterLand": "Country",
    "alle": "All",
    "typ": {
      "kommentar": "Commentary",
      "video": "Video",
      "grafik": "Graphic",
      "podcast": "Podcast"
    },
    "laender": {
      "de": "Germany",
      "fr": "France",
      "at": "Austria",
      "nl": "Netherlands",
      "be": "Belgium",
      "ch": "Switzerland",
      "andere": "Other countries"
    },
    "lesen": "Read more",
    "zurueck": "All voices",
    "videoLaden": "Play video",
    "videoHinweis": "Playing the video connects to YouTube.",
    "hinweis": "Contributions reflect the personal views of their authors.",
    "muster": "Sample",
    "startseiteTitel": "Voices from the Academy",
    "startseiteText": "What participants think, write and create."
  },
  presse: {
    "nav": "Press & speakers",
    "meta": "Information, photos and contact details about the SES Academy for press and speakers.",
    "kicker": "Press & speakers",
    "titel": "Everything at a glance.",
    "intro": "Have you been invited as a speaker or are you reporting on the SES Academy? Here you will find key information, photos and your contact person.",
    "kurzTitel": "The SES Academy in three sentences",
    "kurz": [
      "The SES Academy is an educational and empowerment programme by the Islamrat für die Bundesrepublik Deutschland for young Muslims aged 18 to 30 in Europe.",
      "Through keynotes, country groups and workshops, participants engage with democracy, constitutions, political participation and international politics.",
      "The aim is to understand social developments – and to help shape them."
    ],
    "faktenTitel": "Facts",
    "fakten": [
      [
        "Organiser",
        "Islamrat für die Bundesrepublik Deutschland"
      ],
      [
        "In cooperation with",
        "IGMG youth and women’s youth organisations"
      ],
      [
        "Duration",
        "April 2026 – June 2028 (est.)"
      ],
      [
        "Participants",
        "around 150 young adults aged 18–30, in country groups including Germany, France and Austria"
      ],
      [
        "Format",
        "Weekend seminars roughly every two months, plus winter and summer camps"
      ],
      [
        "Location",
        "Cologne (Colonia-Allee 3) and other cities in Europe"
      ]
    ],
    "gaesteTitel": "Guests so far (selection)",
    "downloadsTitel": "Downloads",
    "onepager": "One-pager (PDF)",
    "logo": "Logo (PNG)",
    "fotos": "Press photos",
    "fotoCredit": "Photo: Islamrat",
    "kontaktTitel": "Your contact",
    "kontaktRolle": "Secretary General of the Islamrat and project coordinator"
  },
  berichte: {
    "kicker": "Look back",
    "folgt": "Photos and a report on this module will follow soon.",
    "laut": "According to the programme",
    "module": {
      "auftakt": {"absaetze": ["Around 200 young women and men from various European countries came together in Cologne on 11 and 12 April 2026 for the launch of the SES Academy. Burhan Kesici, chairman of the Islamrat, opened the programme; former Scottish First Minister Humza Yousaf gave the first keynote. Kemal Ergün, chairman of the IGMG, and legal scholar Prof. Dr. Mathias Rohe also spoke. Hubertus Heil and Prof. Jocelyne Cesari sent video messages.", "Prof. Mahmut Hakkı Akın (Medeniyet University, Istanbul) presented a study among IGMG youth in nine European countries with 2,091 respondents. According to the study, 63.5 per cent think politicians should seek closer contact with Muslims – yet only 29 per cent can imagine going into politics themselves.", "Forums and panels explored the lived realities of young Muslims in Europe, paths to social and political participation, and Muslim identity in the public sphere. To close the first day, Oğuzhan Yazıcı (CDU) and Hakan Gördü (SÖZ) shared their experience of everyday politics. The second day was dedicated to workshops and group work; closing remarks were given by Murat Gümüş, Secretary General of the Islamrat."], "zitate": [{"text": "„keine Gemeinschaft am Rand“", "wer": "Burhan Kesici on Muslims in Europe", "quelle": "Opening speech, quoted verbatim (German) from IGMG and IslamiQ, 13/14 April 2026"}]},
      "verfassungen": {
        "absaetze": [
          "The second module on 13 and 14 June 2026 focused on Europe’s constitutions. The module was opened by Burhan Kesici, chairman of the Islamrat. The programme opened with a keynote by Farid Hafez (William & Mary, USA) on the history and current challenges of European constitutions, followed by panels with Hafez and Bünyamin Kalem (IGMG Youth) and with Dr. Mustafa Cerić, former Reis-ul-Ulema of Bosnia, and Büşra Çatal (IGMG Women’s Youth).",
          "According to the programme, participants then explored the topic in country groups – for France with lawyer Selda Can, for Germany with Jun.-Prof. Dr. Idris Nassery (Paderborn University). The evening was scheduled for the “Eğri Doğru” format – named after a Turkish saying about speaking openly and honestly – with Mehmet Daimagüler and Elif Zehra Kandemir, and Sunday for the workshop “Constitutional Advocacy”."
        ]
      },
      "skills-workshop": {"absaetze": ["The skills workshop on 12 and 13 September 2026 focused on analytical skills, critical thinking and handling information. After the opening by Burhan Kesici and remarks by Zehra Karataş, chair of IGMG Women’s Youth, it was time to get to work.", "For two days, participants worked in workshops and small groups – with a trainer, around tables, with pen and paper. Less lecture, more hands-on: exactly what a skills module is about."]}
    }
  },
};
