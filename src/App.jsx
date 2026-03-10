import { useState, useEffect, useRef } from "react";
import heroImg from "./assets/hero-home.jpg";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "./lib/supabase.js";

// ============================================================
// STACK GRATUIT :
// - Supabase (auth + base de données) -> supabase.com
// - Stripe (paiements) -> stripe.com
// - Resend (emails) -> resend.com
// - Vercel (hébergement) -> vercel.com
// - Mapbox GL JS (cartes) -> mapbox.com
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
    verified: true,
    exchangeCount: 7,
    trustScore: 92,
    hestiaPoints: 480,
    includeCar: true,
    carType: "SUV Toyota RAV4",
    reviews: [
      { author: "Marie L.", rating: 5, text: "Hôte exceptionnel, maison magnifique !" },
      { author: "Paul R.", rating: 4, text: "Très bon séjour, communication fluide." },
    ],
    coords: { lng: -69.9388, lat: 18.4861 },
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
    verified: true,
    exchangeCount: 12,
    trustScore: 97,
    hestiaPoints: 720,
    includeCar: false,
    carType: "",
    reviews: [
      { author: "Sacha M.", rating: 5, text: "Appartement parfait, super emplacement." },
      { author: "Yuki T.", rating: 5, text: "Décoration magnifique, hôtes adorables." },
      { author: "Carlos V.", rating: 4, text: "Très propre, quartier génial." },
    ],
    coords: { lng: 2.3522, lat: 48.8566 },
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
    verified: false,
    exchangeCount: 2,
    trustScore: 68,
    hestiaPoints: 120,
    includeCar: true,
    carType: "Citroën C3",
    reviews: [
      { author: "Léa B.", rating: 4, text: "Superbe terrasse, vue incroyable." },
    ],
    coords: { lng: 2.1734, lat: 41.3851 },
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
    verified: true,
    exchangeCount: 5,
    trustScore: 88,
    hestiaPoints: 360,
    includeCar: false,
    carType: "",
    reviews: [
      { author: "Tom B.", rating: 5, text: "Accueil chaleureux, cuisine divine !" },
      { author: "Carlos V.", rating: 5, text: "Meilleur échange de ma vie." },
    ],
    coords: { lng: -17.4677, lat: 14.7167 },
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
    verified: true,
    exchangeCount: 9,
    trustScore: 95,
    hestiaPoints: 540,
    includeCar: false,
    carType: "",
    reviews: [
      { author: "Léa B.", rating: 5, text: "Minimalisme japonais parfait." },
      { author: "Amara D.", rating: 5, text: "Très organisé, expérience unique." },
    ],
    coords: { lng: 139.6917, lat: 35.6895 },
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

// ── AI CONCIERGE SUGGESTIONS ─────────────────────────────────
const AI_SUGGESTIONS = [
  { id: "ai1", name: "Villa méditerranéenne", location: "Amalfi, Italie", emoji: "🏖️", reason: "Style de vie compatible" },
  { id: "ai2", name: "Chalet alpin", location: "Chamonix, France", emoji: "🏔️", reason: "Rythme de voyage similaire" },
  { id: "ai3", name: "Riad traditionnel", location: "Marrakech, Maroc", emoji: "🕌", reason: "Ambiance chaleureuse" },
];

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
        // ── CAR SHARING STEP ──
        { id: "include_car", category: "Voiture partagée", question: "Inclure ta voiture dans l'échange ?", subtitle: "Optionnel — un vrai plus pour certains voyageurs", type: "select", options: [{ value: "yes", label: "🚗 Oui, inclure ma voiture" }, { value: "no", label: "🚶 Non merci" }] },
      ]
    : [
        { id: "home_location", category: "Your home", question: "Where is your home?", subtitle: "The starting point of every swap", type: "select", options: [{ value: "americas", label: "🌎 Americas" }, { value: "europe", label: "🌍 Europe" }, { value: "africa", label: "🌍 Africa" }, { value: "asia", label: "🌏 Asia & Oceania" }] },
        { id: "home_vibe", category: "Your home's soul", question: "How would you describe your space?", subtitle: "Pick what fits best", type: "select", options: [{ value: "design", label: "✦ Minimal & designed", desc: "Every object has its place" }, { value: "cozy", label: "☕ Cozy & lived-in", desc: "Books, plants, a kitchen that smells great" }, { value: "nature", label: "🌿 Nature & calm", desc: "Garden, natural light, away from noise" }, { value: "urban", label: "⚡ Urban & dynamic", desc: "Heart of the city" }] },
        { id: "hosting_style", category: "You as a host", question: "What kind of host are you?", subtitle: "Be honest", type: "select", options: [{ value: "guide", label: "🗺️ The local guide", desc: "I prep a secret address book" }, { value: "discret", label: "🔑 The discreet & trusting", desc: "I leave the keys and trust completely" }, { value: "precis", label: "📋 The organized one", desc: "I have clear rules I want respected" }, { value: "flexible", label: "🌊 The flexible one", desc: "Make yourself truly at home" }] },
        { id: "guest_behavior", category: "You as a guest", question: "In someone else's home, you are...", subtitle: "The real compatibility question", type: "select", options: [{ value: "respectueux", label: "🧘 Ultra respectful", desc: "I leave everything as I found it" }, { value: "naturel", label: "🏡 Natural & comfortable", desc: "I live normally and tidy well before leaving" }, { value: "curieux", label: "🔍 Curious & attentive", desc: "I try to understand how they live" }, { value: "social", label: "💬 Social", desc: "I like staying in touch with hosts" }] },
        { id: "home_rules", category: "Your rules", question: "What's non-negotiable at your place?", subtitle: "Select all that apply", type: "multi", options: [{ value: "non_fumeur", label: "🚭 No smoking" }, { value: "pas_animaux", label: "🐾 No pets" }, { value: "animaux_ok", label: "🐕 Pets welcome" }, { value: "pas_fete", label: "🔇 No parties" }, { value: "enfants_ok", label: "👨‍👩‍👧 Families welcome" }, { value: "pas_enfants", label: "🚫 No children" }] },
        { id: "travel_rhythm", category: "Your rhythm", question: "How often do you travel per year?", subtitle: "To calibrate your opportunities", type: "select", options: [{ value: "1_2", label: "1–2 times a year", desc: "Main holidays" }, { value: "3_4", label: "3–4 times a year", desc: "One long + a few short" }, { value: "5_plus", label: "5+ times a year", desc: "I travel whenever I can" }, { value: "nomade", label: "Almost nomadic", desc: "Home is as much there as here" }] },
        { id: "match_priority", category: "The perfect match", question: "A great match is above all...", subtitle: "What matters most to you", type: "select", options: [{ value: "style_vie", label: "🌀 A compatible lifestyle" }, { value: "communication", label: "💬 Smooth communication" }, { value: "destination", label: "📍 The right destination" }, { value: "confiance", label: "🔒 A verified, reliable profile" }] },
        // ── CAR SHARING STEP ──
        { id: "include_car", category: "Car sharing", question: "Include your car in the exchange?", subtitle: "Optional — a real plus for some travelers", type: "select", options: [{ value: "yes", label: "🚗 Yes, include my car" }, { value: "no", label: "🚶 No thanks" }] },
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

// ── HESTIA PASSPORT COMPONENT ────────────────────────────────
const HestiaPassport = ({ user, lang }) => (
  <div className="bg-white rounded-2xl shadow-soft p-5 border border-warm-100 mb-4">
    <div className="flex items-center gap-2 mb-4">
      <span className="font-serif text-base font-bold text-warm-800">🛂 Hestia Passport</span>
    </div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
        <p className="font-sans text-2xl font-bold text-terracotta">{user.trustScore || 75}</p>
        <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">
          {lang === "fr" ? "Score confiance" : "Trust score"}
        </p>
      </div>
      <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
        <p className="font-sans text-2xl font-bold text-sage-dark">{user.exchangeCount || 0}</p>
        <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">
          {lang === "fr" ? "Échanges" : "Exchanges"}
        </p>
      </div>
      <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
        {user.verified ? (
          <p className="text-2xl">✅</p>
        ) : (
          <p className="text-2xl">⏳</p>
        )}
        <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">
          {lang === "fr" ? "Vérifié" : "Verified"}
        </p>
      </div>
    </div>
    {/* Reviews */}
    {user.reviews && user.reviews.length > 0 && (
      <div>
        <p className="font-sans text-xs text-warm-400 uppercase tracking-wider mb-2">
          {lang === "fr" ? "Avis récents" : "Recent reviews"}
        </p>
        {user.reviews.slice(0, 2).map((r, i) => (
          <div key={i} className="bg-cream-light rounded-xl p-3 mb-2 border border-warm-100">
            <div className="flex justify-between items-center mb-1">
              <span className="font-sans text-sm font-semibold text-warm-700">{r.author}</span>
              <span className="font-sans text-xs text-terracotta">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            </div>
            <p className="font-sans text-sm text-warm-500">{r.text}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── INSURANCE BADGE COMPONENT ────────────────────────────────
const InsuranceBadge = ({ lang }) => (
  <div className="flex items-center gap-2 bg-sage/10 border border-sage/25 rounded-xl px-3 py-2 mb-3">
    <span className="text-sage-dark text-sm font-semibold font-sans">Échange protégé ✓</span>
    <span className="text-warm-400 text-xs font-sans">— Couverture Safely incluse</span>
  </div>
);

// ── HESTIA POINTS BADGE ──────────────────────────────────────
const HestiaPointsBadge = ({ points }) => (
  <div className="inline-flex items-center gap-1.5 bg-terracotta/8 border border-terracotta/20 rounded-full px-4 py-1.5">
    <span className="font-sans font-bold text-sm text-terracotta">✦ {points} pts Hestia</span>
  </div>
);

// ── APPROXIMATE MAP COMPONENT (MAPBOX GL JS) ─────────────────
const MAPBOX_TOKEN = "pk.eyJ1IjoiaGVzdGlhLWFwcCIsImEiOiJjbHMwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ.placeholder";

const ApproximateMap = ({ coords, isConfirmed }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !coords || mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Add random offset for approximate location (±0.01 degrees ≈ 1km)
        const offset = isConfirmed ? 0 : 0.008;
        const jitteredLng = coords.lng + (Math.random() - 0.5) * offset * 2;
        const jitteredLat = coords.lat + (Math.random() - 0.5) * offset * 2;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [jitteredLng, jitteredLat],
          zoom: isConfirmed ? 15 : 12,
          interactive: true,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (cancelled) return;
          setMapLoaded(true);

          if (!isConfirmed) {
            // Approximate circle
            map.addSource("approx-area", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [jitteredLng, jitteredLat],
                },
              },
            });
            map.addLayer({
              id: "approx-circle",
              type: "circle",
              source: "approx-area",
              paint: {
                "circle-radius": 60,
                "circle-color": "rgba(129, 178, 154, 0.25)",
                "circle-stroke-color": "rgba(129, 178, 154, 0.5)",
                "circle-stroke-width": 2,
                "circle-blur": 0.6,
              },
            });
          } else {
            // Exact marker
            new mapboxgl.Marker({ color: "#E07A5F" })
              .setLngLat([coords.lng, coords.lat])
              .addTo(map);
          }
        });

        map.on("error", () => {
          if (!cancelled) setMapError(true);
        });
      } catch {
        if (!cancelled) setMapError(true);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coords, isConfirmed]);

  if (!coords) return null;

  if (mapError) {
    return (
      <div className="rounded-2xl overflow-hidden mb-4 border border-warm-100 bg-cream-light h-48 flex flex-col items-center justify-center">
        <span className="text-3xl mb-2">🗺️</span>
        <p className="font-sans text-warm-400 text-sm text-center px-4">
          {isConfirmed ? "Localisation exacte disponible" : "Quartier approximatif — Localisation exacte après confirmation"}
        </p>
        <p className="font-sans text-warm-300 text-xs mt-1">
          📍 {isConfirmed ? "Adresse exacte révélée" : "Zone approximative"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-4 border border-warm-100 relative">
      <div ref={mapContainer} className="h-48 w-full" />
      {!isConfirmed && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent px-4 py-3">
          <p className="font-sans text-warm-500 text-xs flex items-center gap-1">
            <span>📍</span> Localisation approximative — Adresse exacte après confirmation
          </p>
        </div>
      )}
      {isConfirmed && mapLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent px-4 py-3">
          <p className="font-sans text-sage-dark text-xs flex items-center gap-1">
            <span>📍</span> Adresse exacte révélée ✓
          </p>
        </div>
      )}
    </div>
  );
};

// ── AI CONCIERGE CARD ────────────────────────────────────────
const AiConciergeCard = ({ lang }) => (
  <div className="bg-gradient-to-br from-terracotta/5 to-sage/5 rounded-2xl shadow-soft p-5 mb-6 border border-terracotta/15">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">🤖</span>
      <span className="font-serif text-base font-bold text-warm-800">AI Concierge</span>
    </div>
    <p className="font-sans text-warm-500 text-sm mb-4">
      {lang === "fr"
        ? "Basé sur votre profil, nous avons trouvé 3 maisons pour votre prochain voyage"
        : "Based on your profile, we found 3 homes for your next trip"}
    </p>
    <div className="flex flex-col gap-2">
      {AI_SUGGESTIONS.map((s) => (
        <div key={s.id} className="bg-white rounded-xl p-3 border border-warm-100 flex items-center gap-3 hover:shadow-soft transition-shadow cursor-pointer">
          <span className="text-2xl">{s.emoji}</span>
          <div className="flex-1">
            <p className="font-sans text-sm font-semibold text-warm-800">{s.name}</p>
            <p className="font-sans text-xs text-warm-400">📍 {s.location}</p>
          </div>
          <span className="font-sans text-[0.6rem] text-sage-dark bg-sage/10 px-2 py-1 rounded-full border border-sage/20">
            {s.reason}
          </span>
        </div>
      ))}
    </div>
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

// ── AUTH PAGE (SUPABASE) ─────────────────────────────────────
const AuthPage = ({ lang, onAuth }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // onAuth will be triggered by onAuthStateChange in HestiaApp
      } else {
        if (!name.trim()) { setError(lang === "fr" ? "Prénom requis" : "Name required"); setLoading(false); return; }
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (err) throw err;
        // Create profile in users table
        if (data.user) {
          await supabase.from("users").upsert({
            id: data.user.id,
            email,
            name,
            is_premium: false,
            hestia_points: 0,
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm">
              {error}
            </div>
          )}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            className="w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "..."
              : isLogin ? (lang === "fr" ? "Se connecter" : "Log in") : (lang === "fr" ? "Créer mon compte" : "Create account")}
          </button>
          <p
            className="font-sans text-warm-400 text-sm text-center mt-5 cursor-pointer hover:text-terracotta transition-colors"
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
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
  const [carType, setCarType] = useState("");

  const questions = getQuestions(lang);
  const q = questions[step];
  const isMulti = q?.type === "multi";
  const selected = answers[q?.id];
  const canContinue = isMulti ? (selected?.length || 0) > 0 : !!selected;
  const isCarStep = q?.id === "include_car";

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

        <div className={`${isMulti ? "grid grid-cols-2" : "flex flex-col"} gap-2.5 mb-4`}>
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
        </div>

        {/* Car type field — shown if user selected "yes" on car step */}
        {isCarStep && selected === "yes" && (
          <input
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all mb-4"
            placeholder={lang === "fr" ? "🚗 Type de voiture (ex: Renault Clio, Tesla Model 3...)" : "🚗 Car type (e.g. Honda Civic, Tesla Model 3...)"}
            value={carType}
            onChange={(e) => setCarType(e.target.value)}
          />
        )}

        <div className={isMulti ? "col-span-2 mb-6" : "mb-6"}>
          <input
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all"
            placeholder={lang === "fr" ? "✏️ Autre chose à préciser ? (optionnel)" : "✏️ Anything else to add? (optional)"}
            value={otherText[q.id] || ""}
            onChange={(e) => setOtherText({ ...otherText, [q.id]: e.target.value })}
          />
        </div>

        <button
          className={`w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] ${
            canContinue ? "hover:bg-terracotta-dark hover:shadow-soft opacity-100" : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => {
            if (!canContinue) return;
            if (step < questions.length - 1) setStep((s) => s + 1);
            else onComplete({ ...answers, car_type: carType });
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
const Dashboard = ({ lang, user, answers, isPremium, onUpgrade, onLogout }) => {
  const [tab, setTab] = useState("matches");
  const [activeConv, setActiveConv] = useState(null);
  const [msgInput, setMsgInput] = useState("");
  const [conversations, setConversations] = useState(MOCK_MESSAGES);
  const [confirmedExchanges, setConfirmedExchanges] = useState([]);
  const [isAdmin] = useState(user.email === "admin@hestia.app");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const t = T[lang];

  const userPoints = 240;

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
          <HestiaPointsBadge points={userPoints} />
          {isPremium && (
            <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium bg-terracotta/8 px-3 py-1.5 rounded-full border border-terracotta/20">
              ✦ MEMBER
            </span>
          )}
          <Avatar emoji="👤" size="w-9 h-9" />
          <button
            onClick={onLogout}
            className="font-sans text-xs text-warm-500 border border-warm-200 px-3 py-1.5 rounded-xl hover:bg-cream hover:text-terracotta transition-colors"
          >
            {lang === "fr" ? "Déconnexion" : "Logout"}
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-100 flex z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.06)]">
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => { setTab(n.id); if (n.id !== "messages") setActiveConv(null); setSelectedProfile(null); }}
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
        {tab === "matches" && !selectedProfile && (
          <div>
            {/* AI Concierge Card */}
            <AiConciergeCard lang={lang} />

            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">
              {matches.length} {lang === "fr" ? "matchs trouvés" : "matches found"}
            </p>

            {matches.map((m, i) => (
              <div
                key={m.id}
                className={`bg-white rounded-2xl shadow-soft p-5 mb-4 relative overflow-hidden border transition-shadow hover:shadow-card cursor-pointer ${
                  i === 0 ? "border-terracotta/20" : "border-warm-100"
                }`}
                onClick={() => (isPremium || i < 2) && setSelectedProfile(m)}
              >
                {!isPremium && i >= 2 && (
                  <div className="absolute inset-0 backdrop-blur-md bg-cream-light/70 flex flex-col items-center justify-center z-10 rounded-2xl">
                    <span className="text-2xl mb-2">🔒</span>
                    <p className="font-sans text-warm-500 text-sm text-center mb-4 px-6">{t.free_blur}</p>
                    <button className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-terracotta-dark transition-all" onClick={(e) => { e.stopPropagation(); onUpgrade(); }}>
                      {t.upgrade}
                    </button>
                  </div>
                )}

                <div className="flex gap-4 items-start">
                  <Avatar emoji={m.avatar} size="w-14 h-14" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg font-semibold text-warm-800">{m.name}</span>
                        {m.verified && <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20 font-sans font-medium">✅ Vérifié</span>}
                      </div>
                      <ScoreBadge score={m.score} />
                    </div>
                    <p className="font-sans text-warm-400 text-sm mb-1">📍 {m.location}</p>
                    <p className="font-sans text-warm-600 text-sm leading-relaxed mb-2">{m.bio}</p>
                    {m.includeCar && (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-warm-500 bg-cream rounded-full px-2.5 py-1 border border-warm-100 mb-2">
                        🚗 {m.carType}
                      </span>
                    )}
                    <div className="flex gap-2 flex-wrap items-center">
                      {(isPremium || i < 2) && (
                        <button
                          className="font-sans text-sm text-warm-600 border border-warm-200 px-4 py-2 rounded-xl hover:bg-cream transition-colors"
                          onClick={(e) => { e.stopPropagation(); setTab("messages"); setActiveConv(m.id); }}
                        >
                          💬 {lang === "fr" ? "Écrire" : "Message"}
                        </button>
                      )}
                      <span className="font-sans text-xs text-warm-400">
                        🔄 {m.exchangeCount} {lang === "fr" ? "échanges" : "exchanges"}
                      </span>
                      <HestiaPointsBadge points={m.hestiaPoints} />
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

        {/* ── SELECTED PROFILE DETAIL ── */}
        {tab === "matches" && selectedProfile && (
          <div>
            <button
              className="font-sans text-sm text-warm-500 border border-warm-200 px-3 py-2 rounded-xl bg-white hover:bg-cream transition-colors mb-4"
              onClick={() => setSelectedProfile(null)}
            >
              ← {lang === "fr" ? "Retour aux matchs" : "Back to matches"}
            </button>

            <div className="bg-white rounded-2xl shadow-card p-6 border border-warm-100 mb-4">
              <div className="flex gap-4 items-center mb-4">
                <Avatar emoji={selectedProfile.avatar} size="w-16 h-16" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl font-bold text-warm-800">{selectedProfile.name}</span>
                    {selectedProfile.verified && <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20">✅</span>}
                  </div>
                  <p className="font-sans text-warm-400 text-sm">📍 {selectedProfile.location}</p>
                </div>
                <div className="ml-auto">
                  <ScoreBadge score={selectedProfile.score} large />
                </div>
              </div>
              <p className="font-sans text-warm-600 text-sm leading-relaxed mb-4">{selectedProfile.bio}</p>
              {selectedProfile.includeCar && (
                <div className="flex items-center gap-2 bg-cream-light rounded-xl p-3 border border-warm-100 mb-4">
                  <span className="text-lg">🚗</span>
                  <div>
                    <p className="font-sans text-sm font-semibold text-warm-700">{lang === "fr" ? "Voiture incluse" : "Car included"}</p>
                    <p className="font-sans text-xs text-warm-400">{selectedProfile.carType}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Approximate Map */}
            <ApproximateMap coords={selectedProfile.coords} isConfirmed={confirmedExchanges.includes(selectedProfile.id)} />

            {/* Hestia Passport */}
            <HestiaPassport user={selectedProfile} lang={lang} />

            <div className="flex gap-2">
              <button
                className="flex-1 bg-terracotta text-white font-sans font-semibold text-sm py-3 rounded-xl hover:bg-terracotta-dark transition-all"
                onClick={() => { setTab("messages"); setActiveConv(selectedProfile.id); setSelectedProfile(null); }}
              >
                💬 {lang === "fr" ? "Écrire" : "Message"}
              </button>
              <button
                className="flex-1 font-sans text-sm text-warm-600 border border-warm-200 py-3 rounded-xl hover:bg-cream transition-colors"
                onClick={() => { confirmExchange(selectedProfile.id); }}
              >
                {t.propose}
              </button>
            </div>
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

              {/* Insurance badge on confirmed exchanges */}
              {isConfirmed && <InsuranceBadge lang={lang} />}

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
                    <InsuranceBadge lang={lang} />
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

            {/* Non-simultaneous exchange points info */}
            <div className="bg-gradient-to-br from-terracotta/5 to-sage/5 rounded-2xl p-5 mt-4 border border-terracotta/15">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✦</span>
                <span className="font-serif text-base font-bold text-warm-800">Hestia Points</span>
              </div>
              <p className="font-sans text-warm-500 text-sm mb-3">
                {lang === "fr"
                  ? "Pas de match simultané ? Accueillez un voyageur et gagnez des points pour voyager plus tard."
                  : "No simultaneous match? Host a traveler and earn points to travel later."}
              </p>
              <div className="flex items-center gap-3">
                <HestiaPointsBadge points={userPoints} />
                <span className="font-sans text-xs text-warm-400">
                  {lang === "fr" ? "= 1 nuit d'échange" : "= 1 exchange night"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">{t.nav_profile}</p>

            <div className="bg-white rounded-2xl shadow-soft p-6 mb-4 border border-warm-100">
              <div className="flex gap-4 items-center mb-4">
                <Avatar emoji="👤" size="w-16 h-16" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl font-bold text-warm-800">{user.name}</span>
                    <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20">✅</span>
                  </div>
                  <div className="font-sans text-warm-400 text-sm">{user.email}</div>
                  {isPremium && (
                    <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium mt-1 inline-block">✦ Member</span>
                  )}
                </div>
              </div>

              {/* Points display */}
              <div className="flex items-center gap-3 mb-4">
                <HestiaPointsBadge points={userPoints} />
              </div>

              {/* Car info */}
              {answers.include_car === "yes" && (
                <div className="flex items-center gap-2 bg-cream-light rounded-xl p-3 border border-warm-100 mb-4">
                  <span className="text-lg">🚗</span>
                  <div>
                    <p className="font-sans text-sm font-semibold text-warm-700">{lang === "fr" ? "Voiture incluse" : "Car included"}</p>
                    <p className="font-sans text-xs text-warm-400">{answers.car_type || (lang === "fr" ? "Type non précisé" : "Type not specified")}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(answers)
                  .filter(([k]) => !["include_car", "car_type"].includes(k))
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

            {/* Hestia Passport for own profile */}
            <HestiaPassport user={{ trustScore: 75, exchangeCount: 0, verified: true, reviews: [] }} lang={lang} />

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const u = { name: meta?.name || "Vous", email: session.user.email };
        setUser(u);

        const { data: profile } = await supabase
          .from("users")
          .select("is_premium, hestia_points, name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setIsPremium(profile.is_premium || false);
          setUser((prev) => ({ ...prev, name: profile.name || prev.name }));
        }

        setScreen((prev) => (prev === "landing" || prev === "auth") ? "onboarding" : prev);
      } else {
        setUser(null);
        setScreen("landing");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleComplete = (ans) => {
    setAnswers(ans);
    setScreen("dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAnswers({});
    setIsPremium(false);
    setScreen("landing");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-light flex items-center justify-center">
        <span className="font-serif text-xl tracking-widest text-warm-800 italic animate-pulse">HESTIA</span>
      </div>
    );
  }

  return (
    <div>
      {screen === "landing" && (
        <LandingPage lang={lang} setLang={setLang} onStart={() => setScreen("auth")} />
      )}
      {screen === "auth" && <AuthPage lang={lang} onAuth={() => {}} />}
      {screen === "onboarding" && <Questionnaire lang={lang} onComplete={handleComplete} />}
      {screen === "dashboard" && (
        <Dashboard
          lang={lang}
          user={user || { name: "Vous", email: "" }}
          answers={answers}
          isPremium={isPremium}
          onUpgrade={handleUpgrade}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
