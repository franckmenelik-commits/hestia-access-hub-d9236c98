import { useState } from "react";
import heroImg from "./assets/hero-home.jpg";

// ============================================================
// STACK GRATUIT :
// - Supabase (auth + base de données) -> supabase.com
// - Stripe (paiements) -> stripe.com
// - Resend (emails) -> resend.com
// - Vercel (hébergement) -> vercel.com
// Tous gratuits pour démarrer. 0$/mois.
// ============================================================

// ── ANTI-BYPASS ENGINE ──────────────────────────────────────
const redactContact = (text) => {
  return text
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "🔒 [email masqué]"
    )
    .replace(/(?:\+?\d[\d\s\-().]{8,}\d)/g, "🔒 [téléphone masqué]")
    .replace(/@\w{2,}/g, "🔒 [handle masqué]")
    .replace(
      /\b(instagram|whatsapp|telegram|facebook|snapchat|signal|wechat|line)\b/gi,
      "🔒 [réseau masqué]"
    )
    .replace(
      /\b(mon insta|mon ig|mon snap|mon télé|mon numéro|my number|my insta)\b/gi,
      "🔒 [contact masqué]"
    );
};

// ── MATCHING ENGINE ─────────────────────────────────────────
const computeScore = (a, b) => {
  let score = 0;
  if (a.home_location !== b.home_location) score += 30;
  const vibeCompat = {
    design: ["design", "nature"],
    chaleureux: ["chaleureux", "urbain"],
    nature: ["design", "nature"],
    urbain: ["chaleureux", "urbain"],
    cozy: ["cozy", "urban"],
    minimal: ["minimal", "nature"],
    urban: ["cozy", "urban"],
  };
  if (vibeCompat[a.home_vibe]?.includes(b.home_vibe)) score += 20;
  if (
    (a.hosting_style === "precis" && b.guest_behavior === "respectueux") ||
    (a.hosting_style === "flexible" && b.guest_behavior === "naturel") ||
    (a.hosting_style === "guide" && b.guest_behavior === "curieux")
  ) {
    score += 25;
  }
  const aRules = a.home_rules || [];
  const bRules = b.home_rules || [];
  const incompatible =
    (aRules.includes("pas_animaux") && bRules.includes("animaux_ok")) ||
    (bRules.includes("pas_animaux") && aRules.includes("animaux_ok")) ||
    (aRules.includes("pas_enfants") && bRules.includes("enfants_ok")) ||
    (bRules.includes("pas_enfants") && aRules.includes("enfants_ok"));
  if (!incompatible) score += 15;
  else score -= 30;
  if (a.travel_rhythm === b.travel_rhythm) score += 10;
  return Math.min(99, Math.max(40, score));
};

// ── MOCK DATA ────────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: "u1",
    name: "Sacha M.",
    location: "République Dominicaine",
    avatar: "🌴",
    isPremium: true,
    answers: {
      home_location: "americas",
      home_vibe: "nature",
      hosting_style: "flexible",
      guest_behavior: "naturel",
      home_rules: ["animaux_ok", "non_fumeur"],
      travel_rhythm: "3_4",
      match_priority: "destination",
    },
    bio: "Maison face à la plage, 4 chambres, piscine privée. On adore recevoir.",
    photos: ["🏖️", "🌺", "🏠"],
  },
  {
    id: "u2",
    name: "Léa & Tom B.",
    location: "Paris, France",
    avatar: "🗼",
    isPremium: true,
    answers: {
      home_location: "europe",
      home_vibe: "chaleureux",
      hosting_style: "guide",
      guest_behavior: "curieux",
      home_rules: ["non_fumeur", "pas_fete"],
      travel_rhythm: "3_4",
      match_priority: "style_vie",
    },
    bio: "Appart Marais 3P, déco vintage, à 5 min du Centre Pompidou.",
    photos: ["🛋️", "🎨", "🌆"],
  },
  {
    id: "u3",
    name: "Carlos V.",
    location: "Barcelona, Espagne",
    avatar: "🌞",
    isPremium: false,
    answers: {
      home_location: "europe",
      home_vibe: "urbain",
      hosting_style: "discret",
      guest_behavior: "naturel",
      home_rules: ["animaux_ok"],
      travel_rhythm: "5_plus",
      match_priority: "communication",
    },
    bio: "Penthouse Eixample, terrasse 60m², vue sur Sagrada Família.",
    photos: ["🏙️", "☀️", "🍷"],
  },
  {
    id: "u4",
    name: "Amara D.",
    location: "Dakar, Sénégal",
    avatar: "🌍",
    isPremium: true,
    answers: {
      home_location: "africa",
      home_vibe: "chaleureux",
      hosting_style: "guide",
      guest_behavior: "social",
      home_rules: ["non_fumeur", "enfants_ok"],
      travel_rhythm: "1_2",
      match_priority: "confiance",
    },
    bio: "Villa familiale à 10 min de la plage de N'Gor. Cuisine sénégalaise garantie.",
    photos: ["🌊", "🏡", "🌅"],
  },
  {
    id: "u5",
    name: "Yuki T.",
    location: "Tokyo, Japon",
    avatar: "⛩️",
    isPremium: true,
    answers: {
      home_location: "asia",
      home_vibe: "design",
      hosting_style: "precis",
      guest_behavior: "respectueux",
      home_rules: ["non_fumeur", "pas_animaux", "pas_fete"],
      travel_rhythm: "3_4",
      match_priority: "style_vie",
    },
    bio: "Appartement minimaliste Shinjuku, 2 chambres, vue sur les jardins.",
    photos: ["🌸", "🏯", "✨"],
  },
];

const MOCK_MESSAGES = {
  u1: [
    { from: "them", text: "Bonjour ! J'ai vu ton profil et je pense qu'on serait un excellent match. Ma maison en RD est dispo en juillet.", time: "10:32" },
    { from: "me", text: "Super ! Montréal serait parfait pour vous en juillet, il fait beau. C'est un chalet à 45 min de la ville.", time: "10:45" },
    { from: "them", text: "On peut s'échanger nos numéros pour continuer ?", time: "10:47" },
    { from: "them", text: "Mon whatsapp c'est +1 809 XXXXXXX", time: "10:48", redacted: true },
  ],
  u2: [
    { from: "them", text: "Coucou, ton profil nous plaît beaucoup ! On cherche justement quelque chose pour août.", time: "Hier" },
  ],
};

// ── TRANSLATIONS ─────────────────────────────────────────────
const T = {
  fr: {
    tagline: "Échangez votre maison avec des gens qui lui ressemblent.",
    sub: "La première plateforme de home exchange basée sur la compatibilité humaine.",
    cta: "Créer mon profil gratuitement",
    login: "Se connecter",
    pricing_title: "Simple et transparent",
    free_label: "Gratuit",
    free_price: "0€",
    free_desc: "Pour toujours",
    free_f: ["Créer un profil", "Voir vos matchs (score visible)", "1 aperçu de message"],
    member_label: "Member",
    member_price: "99€",
    member_desc: "par an",
    member_f: ["Tout le gratuit", "Messagerie complète", "3 échanges / an", "Badge vérifié"],
    premium_label: "Premium",
    premium_price: "199€",
    premium_desc: "par an",
    premium_f: ["Tout Member", "Matchs prioritaires", "Échanges illimités", "Support dédié"],
    start: "Commencer",
    anti_title: "Pourquoi passer par Hestia ?",
    anti_1: "Les contacts sont masqués jusqu'à la confirmation d'échange sur la plateforme.",
    anti_2: "Chaque échange confirmé génère un code de protection des deux côtés.",
    anti_3: "Les avis ne peuvent être laissés qu'après un échange vérifié.",
    nav_matches: "Mes matchs",
    nav_messages: "Messages",
    nav_profile: "Mon profil",
    nav_exchanges: "Échanges",
    match_score: "compatibilité",
    locked_msg: "Passe en Member pour envoyer des messages",
    upgrade: "Passer en Member — 99€/an",
    confirm_exchange: "Confirmer l'échange",
    exchange_confirmed: "Échange confirmé ✓ — Contacts révélés",
    redacted_notice: "Ce message contenait des coordonnées. Confirmez l'échange pour les voir.",
    propose: "Proposer un échange",
    send: "Envoyer",
    type_msg: "Votre message...",
    free_blur: "Passez en Member pour voir ce match",
  },
  en: {
    tagline: "Swap your home with people who share your vibe.",
    sub: "The first home exchange platform built on human compatibility.",
    cta: "Create my profile — free",
    login: "Log in",
    pricing_title: "Simple & transparent",
    free_label: "Free",
    free_price: "$0",
    free_desc: "Forever",
    free_f: ["Create a profile", "See your matches (score visible)", "1 message preview"],
    member_label: "Member",
    member_price: "$99",
    member_desc: "per year",
    member_f: ["Everything in Free", "Full messaging", "3 exchanges / year", "Verified badge"],
    premium_label: "Premium",
    premium_price: "$199",
    premium_desc: "per year",
    premium_f: ["Everything in Member", "Priority matching", "Unlimited exchanges", "Dedicated support"],
    start: "Get started",
    anti_title: "Why keep it on Hestia?",
    anti_1: "Contact info is hidden until both parties confirm the exchange on the platform.",
    anti_2: "Every confirmed exchange generates a protection code for both sides.",
    anti_3: "Reviews can only be left after a verified exchange.",
    nav_matches: "My matches",
    nav_messages: "Messages",
    nav_profile: "My profile",
    nav_exchanges: "Exchanges",
    match_score: "compatibility",
    locked_msg: "Upgrade to Member to send messages",
    upgrade: "Upgrade to Member — $99/year",
    confirm_exchange: "Confirm exchange",
    exchange_confirmed: "Exchange confirmed ✓ — Contacts revealed",
    redacted_notice: "This message contained contact info. Confirm the exchange to reveal it.",
    propose: "Propose an exchange",
    send: "Send",
    type_msg: "Your message...",
    free_blur: "Upgrade to Member to see this match",
  },
};

// ── QUESTIONNAIRE DATA ───────────────────────────────────────
const getQuestions = (lang) =>
  lang === "fr"
    ? [
        { id: "home_location", category: "Ta maison", question: "Où se trouve ta maison ?", subtitle: "Le point de départ de tout échange", type: "select", options: [{ value: "americas", label: "🌎 Amériques" }, { value: "europe", label: "🌍 Europe" }, { value: "africa", label: "🌍 Afrique" }, { value: "asia", label: "🌏 Asie & Océanie" }] },
        { id: "home_vibe", category: "L'âme de ta maison", question: "Comment tu décrirais ton espace ?", subtitle: "Choisis ce qui lui ressemble le mieux", type: "select", options: [{ value: "design", label: "✦ Épuré & design", desc: "Chaque objet a sa place" }, { value: "chaleureux", label: "☕ Chaleureux & vivant", desc: "Des livres, des plantes, une cuisine qui sent bon" }, { value: "nature", label: "🌿 Nature & calme", desc: "Jardin, lumière naturelle, loin du bruit" }, { value: "urbain", label: "⚡ Urbain & dynamique", desc: "En plein cœur de la ville" }] },
        { id: "hosting_style", category: "Toi comme hôte", question: "Quel type d'hôte tu es ?", subtitle: "Sois honnête", type: "select", options: [{ value: "guide", label: "🗺️ Le guide local", desc: "Je prépare un carnet d'adresses secrètes" }, { value: "discret", label: "🔑 Le discret bienveillant", desc: "Je laisse les clés et fais confiance" }, { value: "precis", label: "📋 Le précis & organisé", desc: "J'ai des règles claires à respecter" }, { value: "flexible", label: "🌊 Le flexible", desc: "Installe-toi comme chez toi, vraiment" }] },
        { id: "guest_behavior", category: "Toi comme invité", question: "Dans une maison qui n'est pas la tienne, tu es...", subtitle: "La vraie question de compatibilité", type: "select", options: [{ value: "respectueux", label: "🧘 Ultra respectueux", desc: "Je laisse tout comme je l'ai trouvé" }, { value: "naturel", label: "🏡 Naturel & à l'aise", desc: "Je vis normalement et range bien avant de partir" }, { value: "curieux", label: "🔍 Curieux & attentionné", desc: "J'essaie de comprendre leur façon de vivre" }, { value: "social", label: "💬 Social", desc: "J'aime rester en contact avec les hôtes" }] },
        { id: "home_rules", category: "Tes règles", question: "Ce qui est non-négociable chez toi ?", subtitle: "Sélectionne tout ce qui s'applique", type: "multi", options: [{ value: "non_fumeur", label: "🚭 Non-fumeur" }, { value: "pas_animaux", label: "🐾 Pas d'animaux" }, { value: "animaux_ok", label: "🐕 Animaux bienvenus" }, { value: "pas_fete", label: "🔇 Pas de fêtes" }, { value: "enfants_ok", label: "👨‍👩‍👧 Familles bienvenues" }, { value: "pas_enfants", label: "🚫 Pas d'enfants" }] },
        { id: "travel_rhythm", category: "Ton rythme", question: "Combien de fois par an tu voyages ?", subtitle: "Pour calibrer tes opportunités", type: "select", options: [{ value: "1_2", label: "1–2 fois par an", desc: "Les grandes vacances" }, { value: "3_4", label: "3–4 fois par an", desc: "Un long + quelques courts" }, { value: "5_plus", label: "5 fois ou plus", desc: "Je voyage dès que je peux" }, { value: "nomade", label: "Quasi nomade", desc: "La maison est autant là-bas qu'ici" }] },
        { id: "match_priority", category: "Le match parfait", question: "Un bon match c'est avant tout...", subtitle: "Ce qui prime pour toi", type: "select", options: [{ value: "style_vie", label: "🌀 Un style de vie compatible" }, { value: "communication", label: "💬 Une communication fluide" }, { value: "destination", label: "📍 La bonne destination" }, { value: "confiance", label: "🔒 Un profil fiable & vérifié" }] },
      ]
    : [
        { id: "home_location", category: "Your home", question: "Where is your home?", subtitle: "The starting point of every swap", type: "select", options: [{ value: "americas", label: "🌎 Americas" }, { value: "europe", label: "🌍 Europe" }, { value: "africa", label: "🌍 Africa" }, { value: "asia", label: "🌏 Asia & Oceania" }] },
        { id: "home_vibe", category: "Your home's soul", question: "How would you describe your space?", subtitle: "Pick what fits best", type: "select", options: [{ value: "design", label: "✦ Minimal & designed", desc: "Every object has its place" }, { value: "cozy", label: "☕ Cozy & lived-in", desc: "Books, plants, a kitchen that smells great" }, { value: "nature", label: "🌿 Nature & calm", desc: "Garden, natural light, away from noise" }, { value: "urban", label: "⚡ Urban & dynamic", desc: "Heart of the city" }] },
        { id: "hosting_style", category: "You as a host", question: "What kind of host are you?", subtitle: "Be honest", type: "select", options: [{ value: "guide", label: "🗺️ The local guide", desc: "I prep a secret address book" }, { value: "discret", label: "🔑 The discreet & trusting", desc: "I leave the keys and trust completely" }, { value: "precis", label: "📋 The organized one", desc: "I have clear rules I want respected" }, { value: "flexible", label: "🌊 The flexible one", desc: "Make yourself truly at home" }] },
        { id: "guest_behavior", category: "You as a guest", question: "In someone else's home, you are...", subtitle: "The real compatibility question", type: "select", options: [{ value: "respectueux", label: "🧘 Ultra respectful", desc: "I leave everything as I found it" }, { value: "naturel", label: "🏡 Natural & comfortable", desc: "I live normally and tidy well before leaving" }, { value: "curieux", label: "🔍 Curious & attentive", desc: "I try to understand how they live" }, { value: "social", label: "💬 Social", desc: "I like staying in touch with hosts" }] },
        { id: "home_rules", category: "Your rules", question: "What's non-negotiable at your place?", subtitle: "Select all that apply", type: "multi", options: [{ value: "non_fumeur", label: "🚭 No smoking" }, { value: "pas_animaux", label: "🐾 No pets" }, { value: "animaux_ok", label: "🐕 Pets welcome" }, { value: "pas_fete", label: "🔇 No parties" }, { value: "enfants_ok", label: "👨‍👩‍👧 Families welcome" }, { value: "pas_enfants", label: "🚫 No children" }] },
        { id: "travel_rhythm", category: "Your rhythm", question: "How often do you travel per year?", subtitle: "To calibrate your opportunities", type: "select", options: [{ value: "1_2", label: "1–2 times a year", desc: "Main holidays" }, { value: "3_4", label: "3–4 times a year", desc: "One long + a few short" }, { value: "5_plus", label: "5+ times a year", desc: "I travel whenever I can" }, { value: "nomade", label: "Almost nomadic", desc: "Home is as much there as here" }] },
        { id: "match_priority", category: "The perfect match", question: "A great match is above all...", subtitle: "What matters most to you", type: "select", options: [{ value: "style_vie", label: "🌀 A compatible lifestyle" }, { value: "communication", label: "💬 Smooth communication" }, { value: "destination", label: "📍 The right destination" }, { value: "confiance", label: "🔒 A verified, reliable profile" }] },
      ];

// ── COMPONENTS ───────────────────────────────────────────────

const ScoreBadge = ({ score, large }) => {
  const color = score >= 80 ? "text-sage-dark bg-sage/10 border-sage/30" : score >= 65 ? "text-terracotta bg-terracotta/10 border-terracotta/30" : "text-warm-500 bg-warm-200 border-warm-300";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${color} ${large ? "px-5 py-2.5" : ""}`}>
      <div className={`rounded-full ${score >= 80 ? "bg-sage-dark" : score >= 65 ? "bg-terracotta" : "bg-warm-500"} ${large ? "w-2.5 h-2.5" : "w-1.5 h-1.5"}`} />
      <span className={`font-sans font-bold ${large ? "text-2xl" : "text-sm"}`}>{score}%</span>
    </div>
  );
};

const Avatar = ({ emoji, size = "w-12 h-12" }) => (
  <div className={`${size} rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center text-xl flex-shrink-0`}>
    {emoji}
  </div>
);

// ── LANDING PAGE ─────────────────────────────────────────────
const LandingPage = ({ lang, setLang, onStart }) => {
  const t = T[lang];
  return (
    <div className="min-h-screen bg-cream-light">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 md:px-10 py-5">
        <span className="font-serif text-xl tracking-widest text-warm-800 italic">HESTIA</span>
        <div className="flex gap-3 items-center">
          <button onClick={() => setLang((l) => (l === "fr" ? "en" : "fr"))} className="px-4 py-2 text-sm font-sans text-warm-600 border border-warm-200 rounded-xl hover:bg-cream transition-colors">
            {lang === "fr" ? "EN" : "FR"}
          </button>
          <button onClick={onStart} className="px-4 py-2 text-sm font-sans text-warm-700 border border-warm-200 rounded-xl hover:bg-cream transition-colors">
            {t.login}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-16 md:pb-28">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="animate-fade-up">
              <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium mb-5">
                Home Exchange — Reimagined
              </p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-warm-900 leading-tight mb-6 text-balance">
                {t.tagline}
              </h1>
              <p className="font-sans text-warm-500 text-lg leading-relaxed mb-10 max-w-md">
                {t.sub}
              </p>
              <button
                onClick={onStart}
                className="bg-terracotta text-white font-sans font-semibold text-base px-8 py-4 rounded-2xl shadow-soft hover:bg-terracotta-dark hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                {t.cta}
              </button>
            </div>

            <div className="relative animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="rounded-3xl overflow-hidden shadow-elevated">
                <img src={heroImg} alt="Beautiful Mediterranean home" className="w-full h-64 md:h-96 object-cover" />
              </div>
              {/* Floating score card */}
              <div className="absolute -bottom-4 -left-4 md:-left-8 bg-white rounded-2xl shadow-card p-4 border border-warm-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-lg">🏡</div>
                  <div>
                    <p className="font-sans text-xs text-warm-400 mb-0.5">Match trouvé</p>
                    <ScoreBadge score={92} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust section */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 mb-20">
        <div className="bg-white rounded-3xl shadow-card p-8 md:p-10 border border-warm-100">
          <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-8">
            {t.anti_title}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[t.anti_1, t.anti_2, t.anti_3].map((txt, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-terracotta text-lg mt-0.5 flex-shrink-0">✦</span>
                <p className="font-sans text-warm-500 text-sm leading-relaxed">{txt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 pb-24">
        <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-10">
          {t.pricing_title}
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { label: t.free_label, price: t.free_price, desc: t.free_desc, features: t.free_f, highlight: false },
            { label: t.member_label, price: t.member_price, desc: t.member_desc, features: t.member_f, highlight: true },
            { label: t.premium_label, price: t.premium_price, desc: t.premium_desc, features: t.premium_f, highlight: false },
          ].map((plan, i) => (
            <div
              key={i}
              className={`bg-white rounded-3xl p-7 border relative overflow-hidden transition-shadow hover:shadow-elevated ${
                plan.highlight ? "border-terracotta/30 shadow-card" : "border-warm-100 shadow-soft"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-terracotta to-sage" />
              )}
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-2">{plan.label}</p>
              <div className={`font-serif text-4xl font-bold mb-1 ${plan.highlight ? "text-terracotta" : "text-warm-800"}`}>
                {plan.price}
              </div>
              <p className="font-sans text-warm-400 text-sm mb-6">{plan.desc}</p>
              {plan.features.map((f, j) => (
                <div key={j} className="flex gap-2.5 items-center mb-3">
                  <span className="text-sage text-sm">✓</span>
                  <span className="font-sans text-warm-600 text-sm">{f}</span>
                </div>
              ))}
              <button
                onClick={onStart}
                className={`w-full mt-6 font-sans font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 ${
                  plan.highlight
                    ? "bg-terracotta text-white hover:bg-terracotta-dark hover:shadow-soft hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-cream text-warm-700 border border-warm-200 hover:bg-warm-100"
                }`}
              >
                {t.start}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── AUTH PAGE ────────────────────────────────────────────────
const AuthPage = ({ lang, onAuth }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center px-5">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <span className="font-serif text-xl tracking-widest text-warm-800 italic block mb-3">HESTIA</span>
          <h2 className="font-serif text-3xl font-bold text-warm-900">
            {isLogin ? (lang === "fr" ? "Bon retour" : "Welcome back") : (lang === "fr" ? "Rejoindre Hestia" : "Join Hestia")}
          </h2>
        </div>

        <div className="bg-white rounded-3xl shadow-card p-8 border border-warm-100">
          {!isLogin && (
            <input
              className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3"
              placeholder={lang === "fr" ? "Ton prénom" : "Your first name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-6"
            placeholder={lang === "fr" ? "Mot de passe" : "Password"}
            type="password"
          />
          <button
            className="w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all duration-300 active:scale-[0.98]"
            onClick={() => onAuth(name || "Vous", email)}
          >
            {isLogin ? (lang === "fr" ? "Se connecter" : "Log in") : (lang === "fr" ? "Créer mon compte" : "Create account")}
          </button>
          <p
            className="font-sans text-warm-400 text-sm text-center mt-5 cursor-pointer hover:text-terracotta transition-colors"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? (lang === "fr" ? "Pas encore de compte ? Créer un profil" : "No account? Create one")
              : (lang === "fr" ? "Déjà un compte ? Se connecter" : "Already have an account? Log in")}
          </p>
        </div>
      </div>
    </div>
  );
};

// ── QUESTIONNAIRE ────────────────────────────────────────────
const Questionnaire = ({ lang, onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [otherText, setOtherText] = useState({});

  const questions = getQuestions(lang);
  const q = questions[step];
  const isMulti = q?.type === "multi";
  const selected = answers[q?.id];
  const canContinue = isMulti ? (selected?.length || 0) > 0 : !!selected;

  const handleSelect = (value) => {
    if (isMulti) {
      const cur = answers[q.id] || [];
      const upd = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      setAnswers({ ...answers, [q.id]: upd });
    } else {
      setAnswers({ ...answers, [q.id]: value });
    }
  };

  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center px-5 py-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <span className="font-serif text-base tracking-widest text-warm-800 italic">HESTIA</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-warm-100 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-terracotta to-sage rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>

        <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-2">{q.category}</p>
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-warm-900 mb-2">{q.question}</h2>
        <p className="font-sans text-warm-400 text-sm mb-7">{q.subtitle}</p>

        <div className={`${isMulti ? "grid grid-cols-2" : "flex flex-col"} gap-2.5 mb-6`}>
          {q.options.map((opt) => {
            const sel = isMulti ? (selected || []).includes(opt.value) : selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all duration-200 ${
                  sel
                    ? "border-terracotta/40 bg-terracotta/5 shadow-soft"
                    : "border-warm-100 bg-white hover:border-warm-200 hover:shadow-soft"
                }`}
              >
                <span className={`font-sans text-sm ${sel ? "text-terracotta font-semibold" : "text-warm-700"}`}>
                  {opt.label}
                </span>
                {opt.desc && <span className="font-sans text-xs text-warm-400">{opt.desc}</span>}
              </button>
            );
          })}

          <div className={isMulti ? "col-span-2" : ""}>
            <input
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all"
              placeholder={lang === "fr" ? "✏️ Autre chose à préciser ? (optionnel)" : "✏️ Anything else to add? (optional)"}
              value={otherText[q.id] || ""}
              onChange={(e) => setOtherText({ ...otherText, [q.id]: e.target.value })}
            />
          </div>
        </div>

        <button
          className={`w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] ${
            canContinue ? "hover:bg-terracotta-dark hover:shadow-soft opacity-100" : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => {
            if (!canContinue) return;
            if (step < questions.length - 1) setStep((s) => s + 1);
            else onComplete(answers);
          }}
        >
          {step === questions.length - 1
            ? (lang === "fr" ? "Voir mes matchs →" : "See my matches →")
            : (lang === "fr" ? "Continuer →" : "Continue →")}
        </button>

        {step > 0 && (
          <button
            className="w-full mt-3 font-sans text-sm text-warm-500 py-3 rounded-xl border border-warm-200 bg-white hover:bg-cream transition-colors"
            onClick={() => setStep((s) => s - 1)}
          >
            {lang === "fr" ? "← Retour" : "← Back"}
          </button>
        )}

        <p className="font-sans text-warm-300 text-xs text-center mt-4">
          {step + 1} / {questions.length}
        </p>
      </div>
    </div>
  );
};

// ── DASHBOARD ────────────────────────────────────────────────
const Dashboard = ({ lang, user, answers, isPremium, onUpgrade }) => {
  const [tab, setTab] = useState("matches");
  const [activeConv, setActiveConv] = useState(null);
  const [msgInput, setMsgInput] = useState("");
  const [conversations, setConversations] = useState(MOCK_MESSAGES);
  const [confirmedExchanges, setConfirmedExchanges] = useState([]);
  const [isAdmin] = useState(user.email === "admin@hestia.app");
  const t = T[lang];

  const matches = MOCK_USERS.map((u) => ({
    ...u,
    score: computeScore(answers, u.answers),
  })).sort((a, b) => b.score - a.score);

  const sendMessage = () => {
    if (!msgInput.trim() || !activeConv) return;
    const redacted = redactContact(msgInput);
    const newMsg = { from: "me", text: redacted, time: lang === "fr" ? "maintenant" : "now" };
    setConversations((prev) => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), newMsg] }));
    setMsgInput("");
  };

  const confirmExchange = (userId) =>
    setConfirmedExchanges((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

  const navItems = [
    { id: "matches", icon: "✦", label: t.nav_matches },
    { id: "messages", icon: "💬", label: t.nav_messages },
    { id: "exchanges", icon: "🔄", label: t.nav_exchanges },
    { id: "profile", icon: "◉", label: t.nav_profile },
    ...(isAdmin ? [{ id: "admin", icon: "⚙️", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-cream-light flex flex-col">
      {/* Top bar */}
      <div className="px-5 py-4 border-b border-warm-100 bg-white/80 backdrop-blur-sm flex justify-between items-center sticky top-0 z-50">
        <span className="font-serif text-base tracking-widest text-warm-800 italic">HESTIA</span>
        <div className="flex items-center gap-3">
          {isPremium && (
            <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium bg-terracotta/8 px-3 py-1.5 rounded-full border border-terracotta/20">
              ✦ MEMBER
            </span>
          )}
          <Avatar emoji="👤" size="w-9 h-9" />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-100 flex z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.06)]">
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => { setTab(n.id); if (n.id !== "messages") setActiveConv(null); }}
            className="flex-1 py-3 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-colors"
          >
            <span className="text-base">{n.icon}</span>
            <span className={`text-[0.6rem] tracking-wider font-sans uppercase ${tab === n.id ? "text-terracotta font-semibold" : "text-warm-300"}`}>
              {n.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-24 pt-6 max-w-2xl w-full mx-auto">

        {/* ── MATCHES TAB ── */}
        {tab === "matches" && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">
              {matches.length} {lang === "fr" ? "matchs trouvés" : "matches found"}
            </p>

            {matches.map((m, i) => (
              <div
                key={m.id}
                className={`bg-white rounded-2xl shadow-soft p-5 mb-4 relative overflow-hidden border transition-shadow hover:shadow-card ${
                  i === 0 ? "border-terracotta/20" : "border-warm-100"
                }`}
              >
                {!isPremium && i >= 2 && (
                  <div className="absolute inset-0 backdrop-blur-md bg-cream-light/70 flex flex-col items-center justify-center z-10 rounded-2xl">
                    <span className="text-2xl mb-2">🔒</span>
                    <p className="font-sans text-warm-500 text-sm text-center mb-4 px-6">{t.free_blur}</p>
                    <button className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-terracotta-dark transition-all" onClick={onUpgrade}>
                      {t.upgrade}
                    </button>
                  </div>
                )}

                <div className="flex gap-4 items-start">
                  <Avatar emoji={m.avatar} size="w-14 h-14" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-serif text-lg font-semibold text-warm-800">{m.name}</span>
                      <ScoreBadge score={m.score} />
                    </div>
                    <p className="font-sans text-warm-400 text-sm mb-2">📍 {m.location}</p>
                    <p className="font-sans text-warm-600 text-sm leading-relaxed mb-3">{m.bio}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(isPremium || i < 2) && (
                        <button
                          className="font-sans text-sm text-warm-600 border border-warm-200 px-4 py-2 rounded-xl hover:bg-cream transition-colors"
                          onClick={() => { setTab("messages"); setActiveConv(m.id); }}
                        >
                          💬 {lang === "fr" ? "Écrire" : "Message"}
                        </button>
                      )}
                      {m.isPremium && (
                        <span className="text-xs tracking-[0.15em] uppercase text-sage-dark font-sans font-medium bg-sage/10 px-3 py-2 rounded-xl border border-sage/20">
                          ✦ Vérifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!isPremium && (
              <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20">
                <p className="font-sans text-warm-500 text-sm mb-4">
                  {lang === "fr"
                    ? `${Math.max(matches.length - 2, 0)} autres matchs disponibles en Member`
                    : `${Math.max(matches.length - 2, 0)} more matches available in Member`}
                </p>
                <button
                  className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all duration-300 animate-btn-glow"
                  onClick={onUpgrade}
                >
                  {t.upgrade}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES LIST ── */}
        {tab === "messages" && !activeConv && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">{t.nav_messages}</p>

            {!isPremium && (
              <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20 mb-5">
                <p className="font-sans text-warm-500 text-sm mb-4">🔒 {t.locked_msg}</p>
                <button className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark transition-all" onClick={onUpgrade}>
                  {t.upgrade}
                </button>
              </div>
            )}

            {Object.entries(conversations).map(([uid, msgs]) => {
              const matchUser = MOCK_USERS.find((u) => u.id === uid);
              if (!matchUser) return null;
              const last = msgs[msgs.length - 1];
              return (
                <div
                  key={uid}
                  className={`bg-white rounded-2xl shadow-soft p-4 mb-3 border border-warm-100 transition-all ${isPremium ? "cursor-pointer hover:shadow-card hover:border-warm-200" : "opacity-50"}`}
                  onClick={() => isPremium && setActiveConv(uid)}
                >
                  <div className="flex gap-3 items-center">
                    <Avatar emoji={matchUser.avatar} size="w-11 h-11" />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-sans font-semibold text-warm-800 text-sm mb-0.5">{matchUser.name}</div>
                      <div className="font-sans text-warm-400 text-sm truncate">
                        {last.redacted ? "🔒 " + t.redacted_notice.substring(0, 40) + "..." : last.text.substring(0, 50) + "..."}
                      </div>
                    </div>
                    <span className="font-sans text-warm-300 text-xs">{last.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ACTIVE CONVERSATION ── */}
        {tab === "messages" && activeConv && (() => {
          const matchUser = MOCK_USERS.find((u) => u.id === activeConv);
          const msgs = conversations[activeConv] || [];
          const isConfirmed = confirmedExchanges.includes(activeConv);

          return (
            <div className="flex flex-col h-[calc(100vh-10rem)]">
              <div className="flex items-center gap-3 mb-4">
                <button
                  className="font-sans text-sm text-warm-500 border border-warm-200 px-3 py-2 rounded-xl bg-white hover:bg-cream transition-colors"
                  onClick={() => setActiveConv(null)}
                >
                  ←
                </button>
                <Avatar emoji={matchUser?.avatar} size="w-10 h-10" />
                <div>
                  <div className="font-sans font-semibold text-warm-800 text-sm">{matchUser?.name}</div>
                  <div className="font-sans text-warm-400 text-xs">📍 {matchUser?.location}</div>
                </div>
                {!isConfirmed && (
                  <button
                    className="ml-auto bg-terracotta text-white font-sans font-semibold text-xs px-4 py-2 rounded-xl hover:bg-terracotta-dark transition-all"
                    onClick={() => confirmExchange(activeConv)}
                  >
                    {t.confirm_exchange}
                  </button>
                )}
                {isConfirmed && (
                  <span className="ml-auto text-xs tracking-wider uppercase text-sage-dark font-sans font-medium">
                    {t.exchange_confirmed}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                {msgs.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-4 py-3 border ${
                        msg.from === "me"
                          ? "bg-terracotta/8 border-terracotta/15 rounded-2xl rounded-br-sm"
                          : "bg-white border-warm-100 rounded-2xl rounded-bl-sm shadow-soft"
                      }`}
                    >
                      {msg.redacted && !isConfirmed ? (
                        <p className="font-sans text-sm text-terracotta">🔒 {t.redacted_notice}</p>
                      ) : (
                        <p className="font-sans text-sm text-warm-700">{msg.text}</p>
                      )}
                      <p className="font-sans text-[0.65rem] text-warm-300 mt-1.5 text-right">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-3 border-t border-warm-100">
                <input
                  className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all"
                  placeholder={t.type_msg}
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-3 rounded-xl hover:bg-terracotta-dark transition-all"
                  onClick={sendMessage}
                >
                  {t.send}
                </button>
              </div>
              <p className="font-sans text-warm-300 text-xs text-center mt-3">
                🔒 {lang === "fr" ? "Coordonnées masquées automatiquement jusqu'à la confirmation d'échange" : "Contact info auto-hidden until exchange confirmation"}
              </p>
            </div>
          );
        })()}

        {/* ── EXCHANGES TAB ── */}
        {tab === "exchanges" && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">{t.nav_exchanges}</p>

            {confirmedExchanges.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-soft p-8 text-center border border-warm-100">
                <p className="text-3xl mb-3">🏡</p>
                <p className="font-sans text-warm-500 text-sm">
                  {lang === "fr"
                    ? "Aucun échange confirmé pour l'instant. Matchez et confirmez un échange pour commencer."
                    : "No confirmed exchanges yet. Match and confirm an exchange to get started."}
                </p>
              </div>
            ) : (
              confirmedExchanges.map((uid) => {
                const u = MOCK_USERS.find((x) => x.id === uid);
                if (!u) return null;
                return (
                  <div key={uid} className="bg-white rounded-2xl shadow-soft p-5 mb-3 border border-sage/20">
                    <div className="flex gap-3 items-center">
                      <Avatar emoji={u.avatar} size="w-12 h-12" />
                      <div>
                        <div className="font-sans font-semibold text-warm-800 mb-1">{u.name}</div>
                        <div className="font-sans text-warm-400 text-sm">📍 {u.location}</div>
                        <p className="text-xs tracking-wider uppercase text-sage-dark font-sans font-medium mt-2">
                          ✓ {lang === "fr" ? "Échange confirmé — Contacts révélés" : "Confirmed — Contacts revealed"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">{t.nav_profile}</p>

            <div className="bg-white rounded-2xl shadow-soft p-6 mb-4 border border-warm-100">
              <div className="flex gap-4 items-center mb-6">
                <Avatar emoji="👤" size="w-16 h-16" />
                <div>
                  <div className="font-serif text-xl font-bold text-warm-800 mb-1">{user.name}</div>
                  <div className="font-sans text-warm-400 text-sm">{user.email}</div>
                  {isPremium && (
                    <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium mt-1 inline-block">✦ Member</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(answers)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="bg-cream-light rounded-xl p-3 border border-warm-100">
                      <p className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium mb-1">
                        {k.replace(/_/g, " ")}
                      </p>
                      <p className="font-sans text-warm-700 text-sm">
                        {Array.isArray(v) ? v.join(", ") : v}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {!isPremium && (
              <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20">
                <p className="font-sans text-warm-500 text-sm mb-4">
                  {lang === "fr"
                    ? "Passez en Member pour débloquer la messagerie et les échanges."
                    : "Upgrade to Member to unlock messaging and exchanges."}
                </p>
                <button
                  className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all duration-300 animate-btn-glow"
                  onClick={onUpgrade}
                >
                  {t.upgrade}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN TAB ── */}
        {tab === "admin" && isAdmin && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-2">Admin Panel</p>
            <p className="font-sans text-warm-400 text-sm mb-5">Vue complète — matche les utilisateurs manuellement.</p>

            {MOCK_USERS.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl shadow-soft p-4 mb-3 border border-warm-100">
                <div className="flex gap-3 items-center">
                  <Avatar emoji={u.avatar} size="w-11 h-11" />
                  <div className="flex-1">
                    <div className="font-sans font-semibold text-warm-800 text-sm">{u.name} — {u.location}</div>
                    <div className="font-sans text-warm-400 text-xs">{u.bio}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="bg-terracotta text-white font-sans font-semibold text-xs px-3 py-2 rounded-lg hover:bg-terracotta-dark transition-all">
                      Matcher
                    </button>
                    <button className="font-sans text-xs text-warm-500 border border-warm-200 px-3 py-2 rounded-lg hover:bg-cream transition-colors">
                      Profil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── APP ROOT ─────────────────────────────────────────────────
export default function HestiaApp() {
  const [screen, setScreen] = useState("landing");
  const [lang, setLang] = useState("fr");
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isPremium, setIsPremium] = useState(false);

  const handleAuth = (name, email) => {
    setUser({ name, email });
    setScreen("onboarding");
  };

  const handleComplete = (ans) => {
    setAnswers(ans);
    setScreen("dashboard");
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur : " + data.error);
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
  };

  return (
    <div>
      {screen === "landing" && (
        <LandingPage lang={lang} setLang={setLang} onStart={() => setScreen("auth")} />
      )}
      {screen === "auth" && <AuthPage lang={lang} onAuth={handleAuth} />}
      {screen === "onboarding" && <Questionnaire lang={lang} onComplete={handleComplete} />}
      {screen === "dashboard" && (
        <Dashboard
          lang={lang}
          user={user || { name: "Vous", email: "" }}
          answers={answers}
          isPremium={isPremium}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  );
}
