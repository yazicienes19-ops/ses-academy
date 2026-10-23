import type { Texte } from "../typ";

// Offizielle Texte wörtlich aus ses.islamrat.de (Landingpage + Seminarbeiträge); neu formuliert sind nur UI-Texte, Laufband, Rückblick.
export const de: Texte = {
  meta: {
    titel: "SES Academy – Politische Bildung für junge Muslime in Europa",
    beschreibung:
      "Die SES Academy ist ein Bildungsprogramm des Islamrats für junge Muslime zwischen 18 und 30 Jahren in Europa: Vorträge, Workshops, Ländergruppen – von April 2026 bis Juni 2028.",
  },
  nav: { programm: "Programm", kompetenzen: "Was du lernst", rueckblick: "Rückblick", faq: "FAQ", kontakt: "Kontakt", menue: "Menü öffnen", schliessen: "Menü schließen" },
  hero: {
    kicker: "Seminar für soziale und politische Bildung",
    zeilen: ["Deine", "Stimme.", "Dein Europa."],
    claim: "Politische Bildung für junge Muslime in Europa.",
    intro:
      "Die SES Academy (Abk. von „Sosyal ve Siyasal Eğitim Semineri“ – Seminar für soziale und politische Bildung) ist ein zweijähriges Bildungsprogramm, das junge Muslime in Europa dabei unterstützt, politische und gesellschaftliche Entwicklungen zu verstehen und sich verantwortungsbewusst sowie gemeinwohlorientiert einzubringen.",
    ctaProgramm: "Zum Programm",
    ctaFaq: "Häufige Fragen",
    laufzeitLabel: "Programmlaufzeit",
    laufzeit: "April 2026 – Juni 2028 (vorauss.)",
    ortLabel: "Ort",
    ort: "Köln & weitere Städte in Europa",
    alterLabel: "Zielgruppe",
    alter: "18–30 Jahre",
    kostenLabel: "Teilnahme",
    kosten: "kostenlos",
    fotoAlt: "Panel beim Auftakt der SES Academy: eine Teilnehmerin spricht ins Mikrofon",
    fotoText: "Auftakt · April 2026 · Köln",
  },
  laufband: ["Demokratie", "Verfassung", "Teilhabe", "Europa", "Religionsfreiheit", "Kritisches Denken", "Medien", "Verantwortung", "Gemeinschaft"],
  bewerbung: {
    titel: "Der aktuelle Jahrgang läuft.",
    text: "Die Bewerbungsphase endete am 15. Januar 2026. Du willst über künftige Jahrgänge informiert werden? Schreib uns.",
    cta: "ses@islamrat.de",
  },
  naechstes: { kicker: "Als Nächstes", mehr: "Mehr erfahren", inKoeln: "in Köln" },
  programm: {
    kicker: "Veranstaltungsplan",
    titel: "Das Programm",
    intro:
      "Das Programm umfasst mehrere Module, die über zwei Jahre hinweg in regelmäßigen Abständen an Wochenenden durchgeführt werden – ergänzt durch einwöchige Winter- und Sommercamps.",
    vorbei: "stattgefunden",
    naechstes: "als Nächstes",
    geplant: "in Planung",
    modul: "Modul",
    weitereTitel: "Weitere Module in Planung",
    weitereText: "Seminare, Workshops sowie Winter- und Sommercamps bis voraussichtlich Juni 2028 – in Köln und weiteren Städten Europas.",
    details: "Details",
    art: { auftakt: "Auftakt", seminar: "Seminar", workshop: "Skills Workshop", winterschool: "Winter School" },
  },
  kompetenzen: {
    kicker: "Was du lernst",
    titel: "Fünf Kompetenzen.",
    intro:
      "In über 10 praxisnahen Modulen, verteilt auf Wochenenden sowie einwöchige Winter- und Sommercamps, entwickelst du über zwei Jahre hinweg unter anderem folgende Kompetenzen:",
    liste: [
      { name: "Insight", kurz: "Verstehe, wie Politik, Gesellschaft und Medien funktionieren.", text: "Lerne, Zusammenhänge zu erkennen, Orientierung zu finden und Dich informiert und verantwortungsbewusst einzubringen." },
      { name: "Voice", kurz: "Finde Deine Stimme – online und offline.", text: "Lerne, wie man klare Botschaften formuliert, Debatten versteht und eigene Anliegen sichtbar macht." },
      { name: "Connect", kurz: "Bau Brücken zwischen Menschen und Themen.", text: "Entdecke, wie man Beziehungen aufbaut, Vertrauen schafft und Menschen aus Kultur, Religion, Bildung, Sport und Zivilgesellschaft zusammenführt." },
      { name: "Create", kurz: "Mach aus Ideen echte Projekte.", text: "Von der ersten Idee bis zur Umsetzung: Du lernst, wie Engagement praktisch, wirksam und nachhaltig wird." },
      { name: "Participate", kurz: "Übernimm Verantwortung – für Dich, für andere und für die Gesellschaft.", text: "Erfahre, wie Werte, Teamwork und demokratische Prinzipien zusammenwirken und wie Du selbst positiv Veränderung mitgestalten kannst." },
    ],
  },
  rueckblick: {
    kicker: "Rückblick",
    titel: "So hat es angefangen.",
    text: "Zum Auftakt im April 2026 kamen junge Musliminnen und Muslime aus mehreren Ländern Europas nach Köln – mit Keynotes, Panels und vielen Fragen aus dem Saal.",
    gaesteTitel: "Bisher zu Gast",
    alle: "Alle Gäste dieses Moduls",
  },
  ueber: {
    kicker: "Über die Seminarreihe",
    titel: "Wissen. Haltung. Handeln.",
    text:
      "Jedes Modul verbindet theoretisches Wissen mit praktischer Anwendung – ergänzt durch Austausch, Mentoring und gemeinsames Lernen. So entsteht ein Raum, in dem junge Menschen Wissen aufbauen, neue Perspektiven entwickeln und ihre Handlungskompetenzen stärken können.",
    fuerWenTitel: "Für wen ist die SES Academy gedacht?",
    fuerWenText: "Für junge Muslime zwischen 18 und 30 Jahren, die ihre Rolle in der Gesellschaft aktiv und verantwortungsvoll mitgestalten möchten.",
    fuerWenZusatz: "Wichtig ist nicht, was du schon weißt – sondern, dass du bereit bist, etwas zu bewegen.",
    ablaufTitel: "So läuft ein Modul",
    ablauf: [
      { titel: "Impuls", text: "Jedes Wochenendseminar beginnt mit einem Einführungsseminar durch Expertinnen und Experten aus Wissenschaft, Politik und Praxis." },
      { titel: "Ländergruppen", text: "Danach vertiefst du das Thema mit anderen aus deinem Land – im europäischen Kontext, begleitet von Fachleuten." },
      { titel: "Workshops", text: "Rhetorik, Projektmanagement, schriftlicher Ausdruck: praktische Skills, damit du gehört wirst." },
      { titel: "Camps", text: "Neben den Wochenenden gibt es einwöchige Winter- und Sommercamps." },
    ],
  },
  faq: {
    kicker: "FAQ",
    titel: "Häufig gestellte Fragen",
    suche: "FAQs durchsuchen …",
    keineTreffer: "Keine Treffer. Schreib uns einfach.",
    liste: [
      { frage: "Was ist das Ziel der SES Academy?", antwort: ["Ziel ist es, politisch und gesellschaftlich interessierte junge Muslime in Europa zu empowern, ihr Wissen über politische und gesellschaftliche Prozesse zu vertiefen und ihre gesellschaftliche Teilhabe nachhaltig zu stärken."] },
      { frage: "Wer kann teilnehmen?", antwort: ["Junge Muslime im Alter von 18 bis 30 Jahren, die Englisch, Türkisch und die Sprache ihres jeweiligen Landes sehr gut beherrschen. Außerdem wird erwartet, dass die Teilnehmenden regelmäßig an den Seminaren teilnehmen."] },
      {
        frage: "Wie kann ich am Programm teilnehmen?",
        antwort: ["Der Bewerbungsprozess besteht aus zwei Phasen:"],
        punkte: ["Die Anmeldung über das Online-Bewerbungsformular.", "Ein anschließendes Vorstellungsgespräch mit den Bewerberinnen und Bewerbern, die die erste Phase erfolgreich durchlaufen haben."],
        nachsatz: "Da die Plätze begrenzt sind, können wir nur eine begrenzte Anzahl an Teilnehmenden aufnehmen. Die Bewerbungsphase für den aktuellen Jahrgang endete am 15. Januar 2026.",
      },
      { frage: "Aus welchen Ländern ist eine Teilnahme möglich?", antwort: ["Eine Teilnahme ist aus allen europäischen Ländern möglich, in denen die IGMG Jugend- oder Frauenjugendorganisationen vertreten sind. Wenn genügend Teilnehmende aus einem Land vertreten sind, bilden wir dafür eine eigene Ländergruppe."] },
      { frage: "Ist die Teilnahme gebührenpflichtig?", antwort: ["Nein, die Teilnahme am Seminarprogramm ist kostenlos."] },
      { frage: "Wie lange dauert das Programm?", antwort: ["Das Programm erstreckt sich über zwei bis zweieinhalb Jahre."] },
      { frage: "Wie häufig finden die Seminare statt?", antwort: ["Die Wochenendseminare (Samstag & Sonntag) werden alle zwei Monate durchgeführt. Zusätzlich werden einwöchige Winter- und Sommercamps organisiert."] },
      {
        frage: "Welche Themen werden behandelt?",
        antwort: ["Die Teilnehmenden beschäftigen sich u. a. mit Themen wie:"],
        punkte: [
          "den politischen Systemen in Europa,",
          "Verfassungsrahmen, Demokratietheorien und Religionsfreiheit,",
          "dem Verhältnis von Islam, Religion und gesellschaftlicher Teilhabe,",
          "gesellschaftlicher Vielfalt und Zusammenleben,",
          "Wirtschaft, Umwelt und Digitalisierung,",
          "sowie den Strukturen und Aufgaben der UN, EU und nationalen bzw. lokalen Politik.",
        ],
        nachsatz: "Darüber hinaus werden praktische Workshops zu rhetorischen Fähigkeiten, Projektmanagement und schriftlichem Ausdruck angeboten.",
      },
      { frage: "Wie ist der Ablauf der Seminare?", antwort: ["Jedes Wochenendseminar beginnt mit einem Einführungsseminar durch Experten aus Wissenschaft, Politik und Praxis. Anschließend arbeiten die Teilnehmenden in Ländergruppen, um die jeweiligen Themen im europäischen Kontext zu vertiefen – unterstützt durch Fachleute aus den verschiedenen Ländern."] },
      { frage: "Wer sind die Träger des Projekts?", antwort: ["Das Projekt wird vom Islamrat für die Bundesrepublik Deutschland getragen. Die IGMG Jugend- und Frauenjugendorganisationen sind Kooperationspartner des Islamrats."] },
    ],
  },
  kontakt: { titel: "Hast du weitere Fragen?", text: "Wir helfen dir gerne weiter.", cta: "Schreib uns" },
  footer: {
    claim: "Politische Bildung für junge Muslime in Europa.",
    traeger: "Ein Projekt des Islamrats für die BRD in Kooperation mit den Jugend- und Frauenjugendorganisationen der IGMG.",
    impressum: "Impressum",
    datenschutz: "Datenschutz",
    islamrat: "Islamrat.de",
    kontakt: "Kontakt",
  },
  seminar: { zurueck: "Zurück zur Übersicht", datum: "Datum", ort: "Ort", ortOffen: "in Planung", vorher: "Vorheriges Modul", nachher: "Nächstes Modul", gaeste: "Zu Gast", eindruecke: "Eindrücke" },
  formate: { keynote: "Keynote", panel: "Panel", videobotschaft: "Videobotschaft", moderation: "Moderation", grusswort: "Grußwort", eroeffnung: "Eröffnung", studie: "Studie", laendergruppe: "Ländergruppe", gespraech: "Gespräch", schlusswort: "Schlusswort" },
  seminare: {
    auftakt: {
      titel: "Identität, Verantwortung und Partizipation: Junge Muslime in Europa",
      text: ["Im Mittelpunkt der Auftaktveranstaltung steht die Frage, wie persönliche Werte, religiöse Prägungen und individuelle Erfahrungen das gesellschaftliche Engagement junger Muslime beeinflussen. Gemeinsam wird erarbeitet, wie Verantwortung übernommen und demokratische Teilhabe selbstbewusst und konstruktiv gestaltet werden kann."],
    },
    verfassungen: {
      titel: "Verfassungen in Europa – Grundlagen & aktuelle Herausforderungen",
      text: ["Was steht eigentlich in einer Verfassung? Wozu braucht man sie? Und was bedeutet das für Bürgerinnen und Bürger? Dieses Modul vermittelt die wichtigsten Grundlagen europäischer Verfassungen, zeigt ihre Schutzfunktionen auf und beleuchtet, wie sie auf Krisen, Migration, Digitalisierung oder gesellschaftliche Polarisierung reagieren müssen."],
    },
    "skills-workshop": {
      titel: "Skills Workshop – Analytisches und kritisches Denken und Informationsmanagement",
      text: ["Wie entstehen politische Entscheidungen? Wie funktionieren soziale Dynamiken? Dieser Workshop vermittelt Analysefähigkeiten, kritisches Denken und Orientierung in komplexen Situationen."],
    },
    demokratie: {
      titel: "Demokratie in Europa – Formen, Chancen und Belastungsproben",
      text: ["Demokratie ist nicht überall gleich – aber überall herausgefordert. Hier geht es um unterschiedliche demokratische Modelle in Europa, um Themen wie Populismus, Vertrauensverlust in Institutionen und politische Teilhabe. Ziel ist, Demokratie besser zu verstehen – und die eigene Rolle darin zu finden."],
    },
    "winter-school": {
      titel: "Winter School – Islam, Partizipation und globale Herausforderungen",
      text: [
        "Diese Winter School behandelt islamische Ethik, politische Teilhabe und das Verständnis internationaler Entwicklungen. Ausgehend von islamischen Perspektiven auf Verantwortung und gesellschaftliches Engagement wird erarbeitet, wie Werte, Normen und ethische Prinzipien konstruktive Partizipation ermöglichen. Außerdem bietet das Programm eine Einführung in zentrale Akteure und Strukturen der internationalen Politik – von den Vereinten Nationen über die Europäische Union bis hin zu globalen Entwicklungen in den internationalen Beziehungen.",
        "Daneben stärkt die Winter School zentrale kommunikative Kompetenzen: überzeugend sprechen, reflektiert diskutieren, klar schreiben und Social Media gezielt einsetzen.",
      ],
    },
  },
  bewerbungSeite: {
    "nav": "Bewerben",
    "meta": "Bewirb dich für die SES Academy – das kostenlose Bildungsprogramm für junge Muslime zwischen 18 und 30 in Europa.",
    "kicker": "Bewerbung",
    "titel": [
      "Sei",
      "dabei."
    ],
    "intro": "Du bist zwischen 18 und 30, willst verstehen, wie Politik funktioniert – und selbst etwas bewegen? Dann ist die SES Academy dein Ort.",
    "status": "Die Bewerbungsphase für den aktuellen Jahrgang endete am 15. Januar 2026. Du kannst dich trotzdem schon jetzt eintragen – wir melden uns, sobald eine neue Bewerbungsphase startet.",
    "voraussetzungenTitel": "Das bringst du mit",
    "voraussetzungen": [
      "Du bist zwischen 18 und 30 Jahre alt.",
      "Du sprichst sehr gut Englisch, Türkisch und die Sprache deines Landes.",
      "Du lebst in einem europäischen Land, in dem die IGMG Jugend- oder Frauenjugendorganisationen vertreten sind.",
      "Du nimmst regelmäßig an den Seminaren teil – etwa alle zwei Monate ein Wochenende plus Winter- und Sommercamps."
    ],
    "ablaufTitel": "So läuft die Bewerbung",
    "ablauf": [
      {
        "titel": "Online bewerben",
        "text": "Du füllst das Formular aus und erzählst uns, warum du dabei sein willst."
      },
      {
        "titel": "Gespräch",
        "text": "Wer die erste Phase erfolgreich durchläuft, wird zu einem Vorstellungsgespräch eingeladen."
      },
      {
        "titel": "Los geht’s",
        "text": "Die Plätze sind begrenzt. Wenn es passt, bist du Teil des nächsten Jahrgangs – kostenlos."
      }
    ],
    "formTitel": "Deine Bewerbung",
    "felder": {
      "vorname": "Vorname",
      "nachname": "Nachname",
      "email": "E-Mail",
      "telefon": "Telefon",
      "geburtsjahr": "Geburtsjahr",
      "land": "Land",
      "stadt": "Stadt",
      "sprachen": "Sprachen, die du sehr gut beherrschst",
      "spracheEn": "Englisch",
      "spracheTr": "Türkisch",
      "spracheLand": "Landessprache",
      "motivation": "Warum möchtest du bei der SES Academy dabei sein?",
      "motivationHilfe": "Ein paar Sätze reichen – was interessiert dich, was willst du bewegen?",
      "quelle": "Wie hast du von der SES Academy erfahren?",
      "optional": "optional"
    },
    "einwilligung": "Ich bin einverstanden, dass der Islamrat meine Angaben zur Bearbeitung meiner Bewerbung verarbeitet.",
    "senden": "Bewerbung absenden",
    "hinweis": "Nach dem Absenden bekommst du eine Eingangsbestätigung per E-Mail.",
    "danke": "Danke! Deine Bewerbung ist bei uns eingegangen. Eine Bestätigung ist unterwegs in dein Postfach.",
    "fehler": "Das hat leider nicht geklappt. Bitte prüfe deine Angaben oder schreib uns an ses@islamrat.de.",
    "doppelt": "Mit dieser E-Mail-Adresse liegt bereits eine Bewerbung für diesen Jahrgang vor.",
    "mailBetreff": "Bewerbung SES Academy"
  },
  stimmen: {
    "nav": "Stimmen",
    "meta": "Kommentare, Videos und Projekte der Teilnehmenden der SES Academy.",
    "kicker": "Stimmen",
    "titel": [
      "Wir haben",
      "was zu sagen."
    ],
    "intro": "Hier veröffentlichen Teilnehmende der SES Academy, was sie in den Modulen erarbeiten: Kommentare, Videos, Grafiken und Podcasts – in ihrer eigenen Sprache.",
    "leer": "Die ersten Beiträge erscheinen in Kürze.",
    "filterModul": "Modul",
    "filterLand": "Land",
    "alle": "Alle",
    "typ": {
      "kommentar": "Kommentar",
      "video": "Video",
      "grafik": "Grafik",
      "podcast": "Podcast"
    },
    "laender": {
      "de": "Deutschland",
      "fr": "Frankreich",
      "at": "Österreich",
      "nl": "Niederlande",
      "be": "Belgien",
      "ch": "Schweiz",
      "andere": "Weitere Länder"
    },
    "lesen": "Weiterlesen",
    "zurueck": "Alle Stimmen",
    "videoLaden": "Video abspielen",
    "videoHinweis": "Beim Abspielen wird eine Verbindung zu YouTube hergestellt.",
    "hinweis": "Die Beiträge geben die persönliche Meinung der Autorinnen und Autoren wieder.",
    "muster": "Muster",
    "startseiteTitel": "Stimmen aus der Academy",
    "startseiteText": "Was Teilnehmende denken, schreiben und produzieren."
  },
  presse: {
    "nav": "Presse & Referent:innen",
    "meta": "Informationen, Fotos und Ansprechpartner zur SES Academy für Presse und Referent:innen.",
    "kicker": "Presse & Referent:innen",
    "titel": "Alles auf einen Blick.",
    "intro": "Sie sind als Referentin oder Referent eingeladen oder berichten über die SES Academy? Hier finden Sie die wichtigsten Informationen, Fotos und Ihren Ansprechpartner.",
    "kurzTitel": "Die SES Academy in drei Sätzen",
    "kurz": [
      "Die SES Academy ist ein Bildungs- und Empowerment-Programm des Islamrats für die Bundesrepublik Deutschland für junge Musliminnen und Muslime zwischen 18 und 30 Jahren in Europa.",
      "In Keynotes, Ländergruppen und Workshops setzen sich die Teilnehmenden mit Demokratie, Verfassung, politischer Teilhabe und internationaler Politik auseinander.",
      "Ziel ist, gesellschaftliche Entwicklungen einordnen zu können – und sich mitgestaltend einzubringen."
    ],
    "faktenTitel": "Fakten",
    "fakten": [
      [
        "Träger",
        "Islamrat für die Bundesrepublik Deutschland"
      ],
      [
        "Kooperation",
        "Jugend- und Frauenjugendorganisationen der IGMG"
      ],
      [
        "Laufzeit",
        "April 2026 – Juni 2028 (vorauss.)"
      ],
      [
        "Teilnehmende",
        "rund 150 junge Erwachsene, 18–30 Jahre, in Ländergruppen u. a. aus Deutschland, Frankreich und Österreich"
      ],
      [
        "Format",
        "Wochenendseminare etwa alle zwei Monate, dazu Winter- und Sommercamps"
      ],
      [
        "Ort",
        "Köln (Colonia-Allee 3) und weitere Städte in Europa"
      ]
    ],
    "gaesteTitel": "Bisher zu Gast (Auswahl)",
    "downloadsTitel": "Downloads",
    "onepager": "One-Pager (PDF)",
    "logo": "Logo (PNG)",
    "fotos": "Pressefotos",
    "fotoCredit": "Foto: Islamrat",
    "kontaktTitel": "Ihr Ansprechpartner",
    "kontaktRolle": "Generalsekretär des Islamrats und Projektkoordinator"
  },
  berichte: {
    "kicker": "Rückblick",
    "folgt": "Fotos und Bericht zu diesem Modul folgen in Kürze.",
    "laut": "Laut Programm",
    "module": {
      "auftakt": {"absaetze": ["Rund 200 junge Frauen und Männer aus verschiedenen europäischen Ländern kamen am 11. und 12. April 2026 in Köln zum Auftakt der SES Academy zusammen. Burhan Kesici, Vorsitzender des Islamrats, eröffnete das Programm; die erste Keynote hielt der ehemalige schottische First Minister Humza Yousaf. Außerdem sprachen Kemal Ergün, Vorsitzender der IGMG, und der Rechtswissenschaftler Prof. Dr. Mathias Rohe. Hubertus Heil und Prof. Jocelyne Cesari schickten Videobotschaften.", "Prof. Mahmut Hakkı Akın (Medeniyet Universität, Istanbul) stellte eine Studie unter IGMG-Jugendlichen in neun europäischen Ländern mit 2.091 Befragten vor. Laut der Studie meinen 63,5 Prozent, dass Politikerinnen und Politiker engeren Kontakt zu Muslimen suchen sollten – aber nur 29 Prozent können sich vorstellen, selbst in die Politik zu gehen.", "In Foren und Panels ging es um die Lebensrealitäten junger Muslime in Europa, um Wege gesellschaftlicher und politischer Teilhabe und um muslimische Identität im öffentlichen Raum. Zum Abschluss des ersten Tages berichteten Oğuzhan Yazıcı (CDU) und Hakan Gördü (SÖZ) aus dem politischen Alltag. Der zweite Tag gehörte Workshops und Gruppenarbeit; das Schlusswort sprach Murat Gümüş, Generalsekretär des Islamrats."], "zitate": [{"text": "„keine Gemeinschaft am Rand“", "wer": "Burhan Kesici über Muslime in Europa", "quelle": "Eröffnungsrede, wörtlich zitiert nach IGMG und IslamiQ (13./14.04.2026)"}]},
      "verfassungen": {
        "absaetze": [
          "Das zweite Modul am 13. und 14. Juni 2026 widmete sich den Verfassungen Europas. Eröffnet wurde es von Burhan Kesici, dem Vorsitzenden des Islamrats. Auf dem Programm stand zum Auftakt eine Keynote von Farid Hafez (William & Mary, USA) zu Geschichte und aktuellen Herausforderungen europäischer Verfassungen, gefolgt von Panels mit Hafez und Bünyamin Kalem (IGMG-Jugend) sowie mit Dr. Mustafa Cerić, dem ehemaligen Reis-ul-Ulema von Bosnien, und Büşra Çatal (IGMG-Frauenjugend).",
          "Laut Programm vertieften die Teilnehmenden das Thema anschließend in Ländergruppen – für Frankreich mit der Rechtsanwältin Selda Can, für Deutschland mit Jun.-Prof. Dr. Idris Nassery (Universität Paderborn). Für den Abend war das Format „Eğri Doğru“ – nach der türkischen Redewendung, offen und aufrichtig miteinander zu sprechen – mit Mehmet Daimagüler und Elif Zehra Kandemir angesetzt, für den Sonntag der Workshop „Constitutional Advocacy“."
        ]
      },
      "skills-workshop": {"absaetze": ["Beim Skills Workshop am 12. und 13. September 2026 standen Analysefähigkeit, kritisches Denken und der Umgang mit Informationen im Mittelpunkt. Nach der Eröffnung durch Burhan Kesici und einem Grußwort von Zehra Karataş, Vorsitzende der IGMG-Frauenjugend, ging es an die Arbeit.", "Zwei Tage lang arbeiteten die Teilnehmenden in Workshops und Kleingruppen – mit einem Trainer, an Tischen, mit Stift und Papier. Weniger Vortrag, mehr selbst machen: genau das, was ein Skills-Modul ausmacht."]}
    }
  },
};
