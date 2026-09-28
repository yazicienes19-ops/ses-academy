import type { Texte } from "../typ";

// Textes officiels de ses.islamrat.de/fr/ ; durée alignée sur l’original allemand (2 à 2,5 ans). Nouveaux textes d’interface : traduction à faire relire.
export const fr: Texte = {
  meta: {
    titel: "SES Academy – Formation politique des jeunes musulmans en Europe",
    beschreibung:
      "La SES Academy est un programme de formation de l’Islamrat pour les jeunes musulmans de 18 à 30 ans en Europe : conférences, ateliers et groupes de pays – d’avril 2026 à juin 2028.",
  },
  nav: { programm: "Programme", kompetenzen: "Ce que tu apprendras", rueckblick: "Retour en images", faq: "FAQ", kontakt: "Contact", menue: "Ouvrir le menu", schliessen: "Fermer le menu" },
  hero: {
    kicker: "Séminaire d’éducation sociale et politique",
    zeilen: ["Ta", "voix.", "Ton Europe."],
    claim: "Formation politique des jeunes musulmans en Europe.",
    intro:
      "La SES Academy (abrév. de „Sosyal ve Siyasal Eğitim Semineri“ – séminaire d’éducation sociale et politique) est un programme de formation de deux ans qui aide les jeunes musulmans d’Europe à acquérir une culture politique, à s’engager dans la société et à assumer des responsabilités.",
    ctaProgramm: "Voir le programme",
    ctaFaq: "Questions fréquentes",
    laufzeitLabel: "Durée du programme",
    laufzeit: "avril 2026 – juin 2028 (prévisionnel)",
    ortLabel: "Lieu",
    ort: "Cologne et d’autres villes en Europe",
    alterLabel: "Public",
    alter: "18–30 ans",
    kostenLabel: "Participation",
    kosten: "gratuit",
    fotoAlt: "Table ronde lors du lancement de la SES Academy : une participante prend la parole",
    fotoText: "Lancement · avril 2026 · Cologne",
  },
  laufband: ["Démocratie", "Constitution", "Participation", "Europe", "Liberté de religion", "Esprit critique", "Médias", "Responsabilité", "Communauté"],
  bewerbung: {
    titel: "La promotion actuelle est en cours.",
    text: "Les candidatures ont été clôturées le 15 janvier 2026. Tu veux être informé·e des prochaines promotions ? Écris-nous.",
    cta: "ses@islamrat.de",
  },
  naechstes: { kicker: "Prochainement", mehr: "En savoir plus" },
  programm: {
    kicker: "Calendrier des rencontres",
    titel: "Le programme",
    intro: "Le programme comprend plusieurs modules, organisés à intervalles réguliers sur deux ans pendant les week-ends – complétés par des séjours d’une semaine en hiver et en été.",
    vorbei: "terminé",
    naechstes: "prochainement",
    geplant: "en préparation",
    modul: "Module",
    weitereTitel: "D’autres modules sont en planification",
    weitereText: "Séminaires, ateliers et séjours d’hiver et d’été jusqu’en juin 2028 (prévisionnel) – à Cologne et dans d’autres villes d’Europe.",
    details: "Détails",
    art: { auftakt: "Lancement", seminar: "Séminaire", workshop: "Atelier de compétences", winterschool: "Winter School" },
  },
  kompetenzen: {
    kicker: "Ce que tu apprendras",
    titel: "Cinq compétences.",
    intro: "À travers plus de 10 modules axés sur la pratique, répartis sur des week-ends et aussi des séjours d’une semaine en hiver et en été, tu développeras au fil de deux ans les compétences clés suivantes :",
    liste: [
      { name: "Compréhension", kurz: "Comprends comment fonctionnent la politique, la société et les médias.", text: "Apprends à reconnaître les liens, à t’orienter et à t’engager de manière informée et responsable." },
      { name: "Voix", kurz: "Trouve ta voix – en ligne et hors ligne.", text: "Apprends à formuler des messages clairs, à comprendre les débats et à rendre visibles tes préoccupations." },
      { name: "Relier", kurz: "Construis des ponts entre les personnes et les sujets.", text: "Découvre comment créer des relations, instaurer la confiance et réunir des personnes issues de la culture, de la religion, de l’éducation, du sport et de la société civile." },
      { name: "Créer", kurz: "Transforme des idées en véritables projets.", text: "De la première idée à la mise en œuvre : apprends comment l’engagement devient concret, efficace et durable." },
      { name: "Participer", kurz: "Prends des responsabilités – pour toi-même, pour les autres et pour la société.", text: "Découvre comment les valeurs, le travail d’équipe et les principes démocratiques interagissent et comment tu peux contribuer à des changements positifs." },
    ],
  },
  rueckblick: {
    kicker: "Retour en images",
    titel: "Tout a commencé ainsi.",
    text: "Pour le lancement en avril 2026, de jeunes musulmans venus de plusieurs pays d’Europe se sont retrouvés à Cologne – discours, tables rondes et de nombreuses questions de la salle.",
    gaesteTitel: "Nos invités jusqu’ici",
    alle: "Tous les invités de ce module",
  },
  ueber: {
    kicker: "À propos du programme",
    titel: "Savoir. Posture. Action.",
    text: "Chaque séminaire associe un savoir théorique à une application pratique, complété par des échanges, du suivi personnel et un apprentissage en groupe à travers des travaux collectifs.",
    fuerWenTitel: "À qui s’adresse la SES Academy ?",
    fuerWenText: "Aux jeunes musulmans âgés de 18 à 30 ans qui veulent participer activement à la société.",
    fuerWenZusatz: "Peu importe ce que tu sais déjà, l’important est d’être prêt à faire bouger les choses.",
    ablaufTitel: "Déroulement d’un module",
    ablauf: [
      { titel: "Introduction", text: "Chaque séminaire de week-end commence par une introduction assurée par des experts du monde académique, politique et de terrain." },
      { titel: "Groupes de pays", text: "Ensuite, tu approfondis le thème avec les participants de ton pays – dans le contexte européen, accompagné·e par des spécialistes." },
      { titel: "Ateliers", text: "Rhétorique, gestion de projet, expression écrite : des compétences pratiques pour te faire entendre." },
      { titel: "Séjours", text: "En plus des week-ends, des séjours d’une semaine sont organisés en hiver et en été." },
    ],
  },
  faq: {
    kicker: "FAQ",
    titel: "Questions fréquemment posées",
    suche: "Rechercher dans la FAQ …",
    keineTreffer: "Aucun résultat. Écris-nous simplement.",
    liste: [
      { frage: "Quel est l’objectif de la SES Academy ?", antwort: ["L’objectif de la SES Academy est de promouvoir les jeunes musulmans intéressés par la politique en Europe, d’approfondir leur connaissance des structures politiques et de renforcer leur participation à la société. Ainsi, les jeunes musulmans sont encouragés à contribuer activement à leurs sociétés."] },
      { frage: "Qui peut participer ?", antwort: ["Les jeunes de 18 à 30 ans qui maîtrisent parfaitement l’anglais, le turc et la langue de leur pays. Il est également attendu que les participants prennent part régulièrement aux séminaires."] },
      {
        frage: "Comment puis-je participer au programme ?",
        antwort: ["Le processus de candidature se déroule en deux étapes :"],
        punkte: ["L’inscription via le formulaire de candidature en ligne.", "Un entretien avec les candidat·e·s ayant réussi la première étape."],
        nachsatz: "Comme les places sont limitées, nous ne pouvons accepter qu’un nombre restreint de participant·e·s. Les candidatures pour la promotion actuelle ont été clôturées le 15 janvier 2026.",
      },
      { frage: "Quels pays sont concernés ?", antwort: ["La participation est possible depuis tous les pays d’Europe où sont présentes les associations de jeunesse de la CIMG (IGMG)."] },
      { frage: "La participation est-elle payante ?", antwort: ["Non, la participation au programme est gratuite."] },
      { frage: "Combien de temps dure le programme ?", antwort: ["Le programme dure deux ans à deux ans et demi."] },
      { frage: "À quelle fréquence ont lieu les séminaires ?", antwort: ["Les séminaires de week-end (samedi et dimanche) ont lieu tous les deux mois. De plus, des séjours d’hiver et d’été d’une semaine sont organisés."] },
      {
        frage: "Quels thèmes seront abordés ?",
        antwort: ["Nos intervenants aborderont les thèmes suivants :"],
        punkte: [
          "les systèmes politiques en Europe",
          "les cadres constitutionnels, les théories démocratiques et la liberté de religion",
          "la relation entre islam, religion et participation sociétale",
          "la diversité et le vivre ensemble (religion, ethnie, culture, idées)",
          "l’économie, l’environnement et le numérique",
          "les structures et les missions de l’ONU, de l’UE ainsi que des politiques nationales et locales",
        ],
        nachsatz: "Enfin, des ateliers de rhétorique et d’éloquence, de gestion de projet et d’expression écrite seront proposés.",
      },
      { frage: "Comment se déroule un séminaire ?", antwort: ["Chaque séminaire de week-end commence par une introduction assurée par des experts. Ensuite, les participants travaillent par groupes de pays afin d’approfondir les sujets dans le contexte européen, accompagnés par des professionnels et intervenants des différents pays concernés."] },
      { frage: "Qui porte le projet ?", antwort: ["Le projet est porté par le Conseil islamique de la République fédérale d’Allemagne (Islamrat für die BRD) et réalisé en coopération avec les associations de jeunesse de la CIMG (IGMG)."] },
    ],
  },
  kontakt: { titel: "Tu as d’autres questions ?", text: "Nous t’aidons volontiers.", cta: "Écris-nous" },
  footer: {
    claim: "Formation politique des jeunes musulmans en Europe.",
    traeger: "Un projet de l’Islamrat für die BRD en coopération avec les associations de jeunesse et de jeunesse féminine de la CIMG (IGMG).",
    impressum: "Mentions légales",
    datenschutz: "Confidentialité",
    islamrat: "Islamrat.de",
    kontakt: "Contact",
  },
  seminar: { zurueck: "Retour à l’aperçu", datum: "Date", ort: "Lieu", ortOffen: "en préparation", vorher: "Module précédent", nachher: "Module suivant", gaeste: "Invités", eindruecke: "Impressions" },
  formate: { keynote: "Discours", panel: "Table ronde", videobotschaft: "Message vidéo", moderation: "Modération", grusswort: "Mot d’accueil", eroeffnung: "Ouverture", studie: "Étude", laendergruppe: "Groupe de pays", gespraech: "Entretien", schlusswort: "Mot de clôture" },
  seminare: {
    auftakt: {
      titel: "Identité, Responsabilité et Participation – Jeunes Musulmans en Europe",
      text: ["La séance d’ouverture explore la manière dont les valeurs personnelles, les références religieuses et les parcours individuels influencent l’engagement social et politique des jeunes musulmans. Les participants y réfléchissent collectivement à la façon de contribuer, avec confiance et de manière constructive, au fonctionnement d’une société démocratique."],
    },
    verfassungen: {
      titel: "Constitutions Européennes – Fondements et Défis Actuels",
      text: [
        "Que contient exactement une constitution ? Pourquoi est-elle indispensable ? Et que représente-t-elle pour les citoyens ?",
        "Ce module présente les principes fondamentaux des constitutions européennes, leurs mécanismes de protection et analyse la manière dont elles doivent évoluer face aux crises, aux migrations et aux phénomènes de polarisation sociale.",
      ],
    },
    "skills-workshop": {
      titel: "Atelier de Compétences – Analyse, Pensée Critique et Gestion de l’Information",
      text: ["Comment les décisions politiques sont-elles prises ? Comment fonctionnent réellement les dynamiques sociales ? Cet atelier vise à renforcer les capacités d’analyse, l’esprit critique et l’aptitude à s’orienter dans des situations complexes."],
    },
    demokratie: {
      titel: "La Démocratie en Europe – Modèles, Opportunités et Épreuves de Résistance",
      text: [
        "La démocratie prend des formes variées en Europe, tout en étant confrontée à des défis communs.",
        "Ce module analyse différents modèles démocratiques et aborde des enjeux tels que le populisme, la perte de confiance dans les institutions et la participation politique. Il vise à aider les participants à mieux comprendre la démocratie et à y trouver leur place.",
      ],
    },
    "winter-school": {
      titel: "Winter School – Islam, Participation et Enjeux Mondiaux",
      text: [
        "Cette Winter School aborde l’éthique islamique, la participation politique et la compréhension des dynamiques internationales. À partir des perspectives islamiques sur la responsabilité et l’engagement sociétal, elle montre comment les valeurs, les normes et les principes éthiques peuvent soutenir une participation constructive.",
        "Le programme propose également une introduction aux principaux acteurs et structures de la politique internationale — des Nations unies à l’Union européenne — ainsi qu’aux grandes évolutions des relations internationales.",
        "Par ailleurs, la Winter School renforce des compétences essentielles en communication : s’exprimer avec conviction, débattre de manière réfléchie, écrire avec clarté et utiliser les réseaux sociaux de façon stratégique.",
      ],
    },
  },
  bewerbungSeite: {
    "nav": "Candidater",
    "meta": "Candidate à la SES Academy – le programme de formation gratuit pour les jeunes musulmans de 18 à 30 ans en Europe.",
    "kicker": "Candidature",
    "titel": [
      "Rejoins-",
      "nous."
    ],
    "intro": "Tu as entre 18 et 30 ans, tu veux comprendre comment fonctionne la politique – et faire bouger les choses ? Alors la SES Academy est faite pour toi.",
    "status": "Les candidatures pour la promotion actuelle ont été clôturées le 15 janvier 2026. Tu peux déjà t’inscrire – nous te contacterons dès qu’une nouvelle phase de candidature s’ouvrira.",
    "voraussetzungenTitel": "Ce que tu apportes",
    "voraussetzungen": [
      "Tu as entre 18 et 30 ans.",
      "Tu parles très bien l’anglais, le turc et la langue de ton pays.",
      "Tu vis dans un pays européen où les associations de jeunesse de la CIMG (IGMG) sont présentes.",
      "Tu participes régulièrement aux séminaires – environ un week-end tous les deux mois, plus les séjours d’hiver et d’été."
    ],
    "ablaufTitel": "Comment candidater",
    "ablauf": [
      {
        "titel": "Candidature en ligne",
        "text": "Remplis le formulaire et dis-nous pourquoi tu veux participer."
      },
      {
        "titel": "Entretien",
        "text": "Les candidat·e·s qui réussissent la première étape sont invité·e·s à un entretien."
      },
      {
        "titel": "C’est parti",
        "text": "Les places sont limitées. Si ça correspond, tu fais partie de la prochaine promotion – gratuitement."
      }
    ],
    "formTitel": "Ta candidature",
    "felder": {
      "vorname": "Prénom",
      "nachname": "Nom",
      "email": "E-mail",
      "telefon": "Téléphone",
      "geburtsjahr": "Année de naissance",
      "land": "Pays",
      "stadt": "Ville",
      "sprachen": "Langues que tu maîtrises très bien",
      "spracheEn": "Anglais",
      "spracheTr": "Turc",
      "spracheLand": "Langue nationale",
      "motivation": "Pourquoi veux-tu rejoindre la SES Academy ?",
      "motivationHilfe": "Quelques phrases suffisent – qu’est-ce qui t’intéresse, que veux-tu changer ?",
      "quelle": "Comment as-tu entendu parler de la SES Academy ?",
      "optional": "facultatif"
    },
    "einwilligung": "J’accepte que l’Islamrat traite mes données pour le traitement de ma candidature.",
    "senden": "Envoyer la candidature",
    "hinweis": "En envoyant, ton application e-mail s’ouvre avec ta candidature complète adressée à ses@islamrat.de – il ne te reste qu’à l’envoyer.",
    "danke": "Ton application e-mail devrait s’être ouverte. Sinon, écris-nous directement à ses@islamrat.de.",
    "mailBetreff": "Candidature SES Academy"
  },
  stimmen: {
    "nav": "Voix",
    "meta": "Tribunes, vidéos et projets des participant·e·s de la SES Academy.",
    "kicker": "Voix",
    "titel": [
      "Nous avons",
      "des choses à dire."
    ],
    "intro": "Ici, les participant·e·s de la SES Academy publient ce qu’ils élaborent pendant les modules : tribunes, vidéos, infographies et podcasts – dans leur propre langue.",
    "leer": "Les premières contributions seront bientôt publiées.",
    "filterModul": "Module",
    "filterLand": "Pays",
    "alle": "Tous",
    "typ": {
      "kommentar": "Tribune",
      "video": "Vidéo",
      "grafik": "Infographie",
      "podcast": "Podcast"
    },
    "laender": {
      "de": "Allemagne",
      "fr": "France",
      "at": "Autriche",
      "nl": "Pays-Bas",
      "be": "Belgique",
      "ch": "Suisse",
      "andere": "Autres pays"
    },
    "lesen": "Lire la suite",
    "zurueck": "Toutes les voix",
    "videoLaden": "Lire la vidéo",
    "videoHinweis": "La lecture de la vidéo établit une connexion avec YouTube.",
    "hinweis": "Les contributions reflètent l’opinion personnelle de leurs auteur·e·s.",
    "muster": "Exemple",
    "startseiteTitel": "Des voix de l’Academy",
    "startseiteText": "Ce que les participant·e·s pensent, écrivent et créent."
  },
  presse: {
    "nav": "Presse & intervenant·e·s",
    "meta": "Informations, photos et contact de la SES Academy pour la presse et les intervenant·e·s.",
    "kicker": "Presse & intervenant·e·s",
    "titel": "L’essentiel en un coup d’œil.",
    "intro": "Vous êtes invité·e comme intervenant·e ou vous couvrez la SES Academy ? Vous trouverez ici les informations clés, des photos et votre interlocuteur.",
    "kurzTitel": "La SES Academy en trois phrases",
    "kurz": [
      "La SES Academy est un programme de formation et d’empowerment de l’Islamrat für die Bundesrepublik Deutschland destiné aux jeunes musulman·e·s de 18 à 30 ans en Europe.",
      "À travers des conférences, des groupes de pays et des ateliers, les participant·e·s travaillent sur la démocratie, les constitutions, la participation politique et la politique internationale.",
      "L’objectif : comprendre les évolutions de la société – et contribuer à les façonner."
    ],
    "faktenTitel": "Faits",
    "fakten": [
      [
        "Porteur",
        "Islamrat für die Bundesrepublik Deutschland"
      ],
      [
        "En coopération avec",
        "les associations de jeunesse et de jeunesse féminine de la CIMG (IGMG)"
      ],
      [
        "Durée",
        "avril 2026 – juin 2028 (prévisionnel)"
      ],
      [
        "Participant·e·s",
        "environ 150 jeunes adultes de 18 à 30 ans, en groupes de pays dont l’Allemagne, la France et l’Autriche"
      ],
      [
        "Format",
        "Séminaires de week-end environ tous les deux mois, plus séjours d’hiver et d’été"
      ],
      [
        "Lieu",
        "Cologne (Colonia-Allee 3) et d’autres villes d’Europe"
      ]
    ],
    "gaesteTitel": "Invités jusqu’ici (sélection)",
    "downloadsTitel": "Téléchargements",
    "onepager": "Fiche de présentation (PDF)",
    "logo": "Logo (PNG)",
    "fotos": "Photos de presse",
    "fotoCredit": "Photo : Islamrat",
    "kontaktTitel": "Votre interlocuteur",
    "kontaktRolle": "Secrétaire général de l’Islamrat et coordinateur du projet"
  },
  berichte: {
    "kicker": "Retour en images",
    "folgt": "Photos et compte rendu de ce module suivront prochainement.",
    "laut": "Selon le programme",
    "module": {
      "auftakt": {"absaetze": ["Environ 200 jeunes femmes et hommes venus de différents pays d’Europe se sont réunis à Cologne les 11 et 12 avril 2026 pour le lancement de la SES Academy. Burhan Kesici, président de l’Islamrat, a ouvert le programme ; l’ancien Premier ministre écossais Humza Yousaf a prononcé le premier discours. Kemal Ergün, président de la CIMG (IGMG), et le juriste Prof. Mathias Rohe ont également pris la parole. Hubertus Heil et la Prof. Jocelyne Cesari ont envoyé des messages vidéo.", "Le Prof. Mahmut Hakkı Akın (Université Medeniyet, Istanbul) a présenté une étude menée auprès de jeunes de la CIMG dans neuf pays européens, avec 2 091 personnes interrogées. Selon l’étude, 63,5 % estiment que les responsables politiques devraient rechercher un contact plus étroit avec les musulmans – mais seulement 29 % envisagent de s’engager eux-mêmes en politique.", "Forums et tables rondes ont abordé les réalités de vie des jeunes musulman·e·s en Europe, les voies de la participation sociale et politique et l’identité musulmane dans l’espace public. Pour clore la première journée, Oğuzhan Yazıcı (CDU) et Hakan Gördü (SÖZ) ont partagé leur expérience de la politique au quotidien. La deuxième journée était consacrée aux ateliers et au travail en groupe ; le mot de clôture a été prononcé par Murat Gümüş, secrétaire général de l’Islamrat."], "zitate": [{"text": "„keine Gemeinschaft am Rand“", "wer": "Burhan Kesici à propos des musulmans en Europe", "quelle": "Discours d’ouverture, cité mot pour mot (en allemand) d’après IGMG et IslamiQ, 13/14 avril 2026"}]},
      "verfassungen": {
        "absaetze": [
          "Le deuxième module, les 13 et 14 juin 2026, était consacré aux constitutions européennes. Le module a été ouvert par Burhan Kesici, président de l’Islamrat. Le programme s’ouvrait sur un discours de Farid Hafez (William & Mary, États-Unis) sur l’histoire et les défis actuels des constitutions européennes, suivi de tables rondes avec Hafez et Bünyamin Kalem (jeunesse de la CIMG) ainsi qu’avec le Dr Mustafa Cerić, ancien Reis-ul-Ulema de Bosnie, et Büşra Çatal (jeunesse féminine de la CIMG).",
          "Selon le programme, les participant·e·s ont ensuite approfondi le thème en groupes de pays – pour la France avec l’avocate Selda Can, pour l’Allemagne avec le Prof. Idris Nassery (Université de Paderborn). Le soir était prévu le format « Eğri Doğru » – d’après une expression turque invitant à parler franchement – avec Mehmet Daimagüler et Elif Zehra Kandemir, et le dimanche l’atelier « Constitutional Advocacy »."
        ]
      },
      "skills-workshop": {"absaetze": ["L’atelier de compétences des 12 et 13 septembre 2026 était consacré à l’analyse, à l’esprit critique et à la gestion de l’information. Après l’ouverture par Burhan Kesici et une allocution de Zehra Karataş, présidente de la jeunesse féminine de la CIMG, place au travail.", "Pendant deux jours, les participant·e·s ont travaillé en ateliers et en petits groupes – avec un formateur, autour de tables, papier et stylo en main. Moins d’exposés, plus de pratique : c’est tout l’esprit d’un module de compétences."]}
    }
  },
};
