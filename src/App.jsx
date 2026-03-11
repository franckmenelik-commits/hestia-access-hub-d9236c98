import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ClipboardList, Sparkles, Handshake, ShieldCheck, Shield, Lock, Star, MapPin, Home, Heart, Users, Zap, MessageCircle, Globe, Award } from "lucide-react";
import heroImg from "./assets/hero-home.jpg";
import hestiaLogo from "./assets/hestia-logo.png";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "./lib/supabase.js";

// ── ANTI-BYPASS ENGINE ──────────────────────────────────────
const redactContact = (text) =>
  text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "🔒 [email masqué]")
    .replace(/(?:\+?\d[\d\s\-().]{8,}\d)/g, "🔒 [téléphone masqué]")
    .replace(/@\w{2,}/g, "🔒 [handle masqué]")
    .replace(/\b(instagram|whatsapp|telegram|facebook|snapchat|signal|wechat|line)\b/gi, "🔒 [réseau masqué]")
    .replace(/\b(mon insta|mon ig|mon snap|mon télé|mon numéro|my number|my insta)\b/gi, "🔒 [contact masqué]");

// ── ADVANCED MATCHING ENGINE (8 dimensions) ─────────────────
const DIMENSION_LABELS = {
  geographic: "Géographie",
  vibe: "Ambiance",
  hostStyle: "Style d'hôte",
  dealbreakers: "Compatibilité",
  travelFreq: "Rythme",
  trust: "Confiance",
  communication: "Communication",
  lifeStage: "Style de vie",
};

const computeDetailedScore = (a, b) => {
  const dims = {};
  // 1. Geographic complementarity (different = better)
  dims.geographic = a.home_location !== b.home_location ? 95 : 40;
  // 2. Vibe alignment
  const vibeCompat = { design: ["design", "nature"], chaleureux: ["chaleureux", "urbain"], nature: ["design", "nature"], urbain: ["chaleureux", "urbain"], cozy: ["cozy", "urban"], minimal: ["minimal", "nature"], urban: ["cozy", "urban"] };
  dims.vibe = vibeCompat[a.home_vibe]?.includes(b.home_vibe) ? 88 : 45;
  // 3. Host/guest style
  const hostMatch = (a.hosting_style === "precis" && b.guest_behavior === "respectueux") || (a.hosting_style === "flexible" && b.guest_behavior === "naturel") || (a.hosting_style === "guide" && b.guest_behavior === "curieux");
  dims.hostStyle = hostMatch ? 92 : 50;
  // 4. Dealbreakers (0% if conflict)
  const aR = a.home_rules || [], bR = b.home_rules || [];
  const conflict = (aR.includes("pas_animaux") && bR.includes("animaux_ok")) || (bR.includes("pas_animaux") && aR.includes("animaux_ok")) || (aR.includes("pas_enfants") && bR.includes("enfants_ok")) || (bR.includes("pas_enfants") && aR.includes("enfants_ok"));
  dims.dealbreakers = conflict ? 0 : 90;
  // 5. Travel frequency sync
  dims.travelFreq = a.travel_rhythm === b.travel_rhythm ? 95 : 55;
  // 6. Trust score history (mock)
  dims.trust = (b.trustScore || 70);
  // 7. Communication style
  dims.communication = (a.match_priority === "communication" || b.match_priority === "communication") ? 88 : 65;
  // 8. Life stage similarity
  dims.lifeStage = a.match_priority === b.match_priority ? 90 : 60;

  const weights = { geographic: 0.2, vibe: 0.15, hostStyle: 0.15, dealbreakers: 0.15, travelFreq: 0.1, trust: 0.1, communication: 0.08, lifeStage: 0.07 };
  let total = 0;
  for (const k in weights) total += (dims[k] || 0) * weights[k];
  if (dims.dealbreakers === 0) total = Math.min(total, 25);
  return { dimensions: dims, total: Math.min(99, Math.max(20, Math.round(total))) };
};

// ── BADGE SYSTEM ────────────────────────────────────────────
const getBadge = (exchangeCount) => {
  if (exchangeCount >= 6) return { label: "Legend", emoji: "👑", color: "text-amber-600 bg-amber-50 border-amber-200", benefits: "Matchs prioritaires, Support VIP, Badge exclusif" };
  if (exchangeCount >= 3) return { label: "Ambassador", emoji: "🌟", color: "text-purple-600 bg-purple-50 border-purple-200", benefits: "Visibilité accrue, Invitations privées" };
  if (exchangeCount >= 1) return { label: "Trusted", emoji: "✅", color: "text-sage-dark bg-sage/10 border-sage/25", benefits: "Badge vérifié, Accès messagerie" };
  return { label: "Newcomer", emoji: "🌱", color: "text-warm-500 bg-warm-100 border-warm-200", benefits: "Créez votre premier échange" };
};

// ── CONTRACT GENERATOR ──────────────────────────────────────
const generateContract = async (userA, userB, dates) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const code = `HEX-${Date.now().toString(36).toUpperCase()}`;
  doc.setFillColor(245, 235, 228);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(60, 40, 30);
  doc.text("HESTIA", 105, 30, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Contrat d'échange de maison", 105, 40, { align: "center" });
  doc.setDrawColor(224, 122, 95);
  doc.setLineWidth(0.5);
  doc.line(30, 48, 180, 48);
  doc.setFontSize(10);
  let y = 60;
  doc.setFont("helvetica", "bold");
  doc.text("Partie A", 30, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Nom: ${userA.name}`, 30, y); y += 6;
  doc.text(`Lieu: ${userA.location || "Non spécifié"}`, 30, y); y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Partie B", 30, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Nom: ${userB.name}`, 30, y); y += 6;
  doc.text(`Lieu: ${userB.location}`, 30, y); y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Dates d'échange", 30, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(dates || "À définir entre les parties", 30, y); y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Règles de la maison", 30, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text("• Respecter les lieux comme son propre domicile", 30, y); y += 6;
  doc.text("• Laisser la maison dans l'état trouvé à l'arrivée", 30, y); y += 6;
  doc.text("• Signaler tout dommage dans les 24h", 30, y); y += 12;
  doc.setDrawColor(224, 122, 95);
  doc.line(30, y, 180, y); y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Code d'échange: ${code}`, 105, y, { align: "center" }); y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(129, 178, 154);
  doc.text("🛡️ Échange protégé par Hestia — Couverture Safely jusqu'à 50 000$", 105, y, { align: "center" });
  doc.save(`contrat-hestia-${code}.pdf`);
};

// ── MOCK DATA ────────────────────────────────────────────────
const MOCK_USERS = [
  { id: "u1", name: "Sacha M.", location: "République Dominicaine", avatar: "🌴", isPremium: true, verified: true, exchangeCount: 7, trustScore: 92, hestiaPoints: 480, includeCar: true, carType: "SUV Toyota RAV4", reviews: [{ author: "Marie L.", rating: 5, text: "Hôte exceptionnel, maison magnifique !" }, { author: "Paul R.", rating: 4, text: "Très bon séjour, communication fluide." }], coords: { lng: -69.9388, lat: 18.4861 }, answers: { home_location: "americas", home_vibe: "nature", hosting_style: "flexible", guest_behavior: "naturel", home_rules: ["animaux_ok", "non_fumeur"], travel_rhythm: "3_4", match_priority: "destination" }, bio: "Maison face à la plage, 4 chambres, piscine privée. On adore recevoir.", photos: ["🏖️", "🌺", "🏠"] },
  { id: "u2", name: "Léa & Tom B.", location: "Paris, France", avatar: "🗼", isPremium: true, verified: true, exchangeCount: 12, trustScore: 97, hestiaPoints: 720, includeCar: false, carType: "", reviews: [{ author: "Sacha M.", rating: 5, text: "Appartement parfait, super emplacement." }, { author: "Yuki T.", rating: 5, text: "Décoration magnifique, hôtes adorables." }, { author: "Carlos V.", rating: 4, text: "Très propre, quartier génial." }], coords: { lng: 2.3522, lat: 48.8566 }, answers: { home_location: "europe", home_vibe: "chaleureux", hosting_style: "guide", guest_behavior: "curieux", home_rules: ["non_fumeur", "pas_fete"], travel_rhythm: "3_4", match_priority: "style_vie" }, bio: "Appart Marais 3P, déco vintage, à 5 min du Centre Pompidou.", photos: ["🛋️", "🎨", "🌆"] },
  { id: "u3", name: "Carlos V.", location: "Barcelona, Espagne", avatar: "🌞", isPremium: false, verified: false, exchangeCount: 2, trustScore: 68, hestiaPoints: 120, includeCar: true, carType: "Citroën C3", reviews: [{ author: "Léa B.", rating: 4, text: "Superbe terrasse, vue incroyable." }], coords: { lng: 2.1734, lat: 41.3851 }, answers: { home_location: "europe", home_vibe: "urbain", hosting_style: "discret", guest_behavior: "naturel", home_rules: ["animaux_ok"], travel_rhythm: "5_plus", match_priority: "communication" }, bio: "Penthouse Eixample, terrasse 60m², vue sur Sagrada Família.", photos: ["🏙️", "☀️", "🍷"] },
  { id: "u4", name: "Amara D.", location: "Dakar, Sénégal", avatar: "🌍", isPremium: true, verified: true, exchangeCount: 5, trustScore: 88, hestiaPoints: 360, includeCar: false, carType: "", reviews: [{ author: "Tom B.", rating: 5, text: "Accueil chaleureux, cuisine divine !" }, { author: "Carlos V.", rating: 5, text: "Meilleur échange de ma vie." }], coords: { lng: -17.4677, lat: 14.7167 }, answers: { home_location: "africa", home_vibe: "chaleureux", hosting_style: "guide", guest_behavior: "social", home_rules: ["non_fumeur", "enfants_ok"], travel_rhythm: "1_2", match_priority: "confiance" }, bio: "Villa familiale à 10 min de la plage de N'Gor. Cuisine sénégalaise garantie.", photos: ["🌊", "🏡", "🌅"] },
  { id: "u5", name: "Yuki T.", location: "Tokyo, Japon", avatar: "⛩️", isPremium: true, verified: true, exchangeCount: 9, trustScore: 95, hestiaPoints: 540, includeCar: false, carType: "", reviews: [{ author: "Léa B.", rating: 5, text: "Minimalisme japonais parfait." }, { author: "Amara D.", rating: 5, text: "Très organisé, expérience unique." }], coords: { lng: 139.6917, lat: 35.6895 }, answers: { home_location: "asia", home_vibe: "design", hosting_style: "precis", guest_behavior: "respectueux", home_rules: ["non_fumeur", "pas_animaux", "pas_fete"], travel_rhythm: "3_4", match_priority: "style_vie" }, bio: "Appartement minimaliste Shinjuku, 2 chambres, vue sur les jardins.", photos: ["🌸", "🏯", "✨"] },
];

const MOCK_MESSAGES = {
  u1: [
    { from: "them", text: "Bonjour ! J'ai vu ton profil et je pense qu'on serait un excellent match. Ma maison en RD est dispo en juillet.", time: "10:32" },
    { from: "me", text: "Super ! Montréal serait parfait pour vous en juillet, il fait beau.", time: "10:45" },
    { from: "them", text: "Mon whatsapp c'est +1 809 XXXXXXX", time: "10:48", redacted: true },
  ],
  u2: [{ from: "them", text: "Coucou, ton profil nous plaît beaucoup ! On cherche quelque chose pour août.", time: "Hier" }],
};

// ── QUESTIONNAIRE DATA ───────────────────────────────────────
const getQuestions = () => [
  { id: "home_location", category: "Ta maison", question: "Où se trouve ta maison ?", subtitle: "Le point de départ de tout échange", type: "select", options: [{ value: "americas", label: "🌎 Amériques" }, { value: "europe", label: "🌍 Europe" }, { value: "africa", label: "🌍 Afrique" }, { value: "asia", label: "🌏 Asie & Océanie" }] },
  { id: "home_vibe", category: "L'âme de ta maison", question: "Comment tu décrirais ton espace ?", subtitle: "Choisis ce qui lui ressemble le mieux", type: "select", options: [{ value: "design", label: "✦ Épuré & design", desc: "Chaque objet a sa place" }, { value: "chaleureux", label: "☕ Chaleureux & vivant", desc: "Des livres, des plantes, une cuisine qui sent bon" }, { value: "nature", label: "🌿 Nature & calme", desc: "Jardin, lumière naturelle, loin du bruit" }, { value: "urbain", label: "⚡ Urbain & dynamique", desc: "En plein cœur de la ville" }] },
  { id: "hosting_style", category: "Toi comme hôte", question: "Quel type d'hôte tu es ?", subtitle: "Sois honnête", type: "select", options: [{ value: "guide", label: "🗺️ Le guide local", desc: "Je prépare un carnet d'adresses secrètes" }, { value: "discret", label: "🔑 Le discret bienveillant", desc: "Je laisse les clés et fais confiance" }, { value: "precis", label: "📋 Le précis & organisé", desc: "J'ai des règles claires à respecter" }, { value: "flexible", label: "🌊 Le flexible", desc: "Installe-toi comme chez toi, vraiment" }] },
  { id: "guest_behavior", category: "Toi comme invité", question: "Dans une maison qui n'est pas la tienne, tu es...", subtitle: "La vraie question de compatibilité", type: "select", options: [{ value: "respectueux", label: "🧘 Ultra respectueux", desc: "Je laisse tout comme je l'ai trouvé" }, { value: "naturel", label: "🏡 Naturel & à l'aise", desc: "Je vis normalement et range bien avant de partir" }, { value: "curieux", label: "🔍 Curieux & attentionné", desc: "J'essaie de comprendre leur façon de vivre" }, { value: "social", label: "💬 Social", desc: "J'aime rester en contact avec les hôtes" }] },
  { id: "home_rules", category: "Tes règles", question: "Ce qui est non-négociable chez toi ?", subtitle: "Sélectionne tout ce qui s'applique", type: "multi", options: [{ value: "non_fumeur", label: "🚭 Non-fumeur" }, { value: "pas_animaux", label: "🐾 Pas d'animaux" }, { value: "animaux_ok", label: "🐕 Animaux bienvenus" }, { value: "pas_fete", label: "🔇 Pas de fêtes" }, { value: "enfants_ok", label: "👨‍👩‍👧 Familles bienvenues" }, { value: "pas_enfants", label: "🚫 Pas d'enfants" }] },
  { id: "travel_rhythm", category: "Ton rythme", question: "Combien de fois par an tu voyages ?", subtitle: "Pour calibrer tes opportunités", type: "select", options: [{ value: "1_2", label: "1–2 fois par an", desc: "Les grandes vacances" }, { value: "3_4", label: "3–4 fois par an", desc: "Un long + quelques courts" }, { value: "5_plus", label: "5 fois ou plus", desc: "Je voyage dès que je peux" }, { value: "nomade", label: "Quasi nomade", desc: "La maison est autant là-bas qu'ici" }] },
  { id: "match_priority", category: "Le match parfait", question: "Un bon match c'est avant tout...", subtitle: "Ce qui prime pour toi", type: "select", options: [{ value: "style_vie", label: "🌀 Un style de vie compatible" }, { value: "communication", label: "💬 Une communication fluide" }, { value: "destination", label: "📍 La bonne destination" }, { value: "confiance", label: "🔒 Un profil fiable & vérifié" }] },
  { id: "include_car", category: "Voiture partagée", question: "Inclure ta voiture dans l'échange ?", subtitle: "Optionnel — un vrai plus pour certains voyageurs", type: "select", options: [{ value: "yes", label: "🚗 Oui, inclure ma voiture" }, { value: "no", label: "🚶 Non merci" }] },
];

// ── SPINNER ──────────────────────────────────────────────────
const Spinner = ({ className = "h-4 w-4" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── TOAST ────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-warm-800 text-white font-sans text-sm px-6 py-3 rounded-2xl shadow-elevated z-[100] max-w-sm text-center"
  >
    {message}
    <button onClick={onClose} className="ml-3 text-warm-300 hover:text-white">✕</button>
  </motion.div>
);

// ── RADAR CHART (SVG) ────────────────────────────────────────
const RadarChart = ({ dimensions, size = 120 }) => {
  const keys = ["geographic", "vibe", "hostStyle", "dealbreakers", "travelFreq", "trust"];
  const labels = ["Géo", "Vibe", "Hôte", "Compat.", "Rythme", "Confiance"];
  const cx = size / 2, cy = size / 2, r = size / 2 - 16;
  const angleStep = (2 * Math.PI) / keys.length;

  const getPoint = (i, val) => {
    const angle = angleStep * i - Math.PI / 2;
    const dist = (val / 100) * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = keys.map((k, i) => getPoint(i, dimensions[k] || 0));
  const polygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={keys.map((_, i) => getPoint(i, level * 100).join(",")).join(" ")}
          fill="none"
          stroke="hsl(15, 20%, 88%)"
          strokeWidth="0.5"
        />
      ))}
      {/* Axes */}
      {keys.map((_, i) => {
        const [x, y] = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(15, 20%, 88%)" strokeWidth="0.5" />;
      })}
      {/* Data */}
      <polygon points={polygon} fill="hsla(14, 68%, 63%, 0.2)" stroke="hsl(14, 68%, 63%)" strokeWidth="1.5" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="hsl(14, 68%, 63%)" />
      ))}
      {/* Labels */}
      {keys.map((_, i) => {
        const [x, y] = getPoint(i, 115);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-warm-400" style={{ fontSize: "7px", fontFamily: "DM Sans" }}>
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
};

// ── SCORE BADGE ──────────────────────────────────────────────
const ScoreBadge = ({ score, large }) => {
  const color = score >= 80 ? "text-sage-dark bg-sage/10 border-sage/30" : score >= 65 ? "text-terracotta bg-terracotta/10 border-terracotta/30" : "text-warm-500 bg-warm-200 border-warm-300";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${color} ${large ? "px-5 py-2.5" : ""}`}>
      <div className={`rounded-full ${score >= 80 ? "bg-sage-dark" : score >= 65 ? "bg-terracotta" : "bg-warm-500"} ${large ? "w-2.5 h-2.5" : "w-1.5 h-1.5"}`} />
      <span className={`font-sans font-bold ${large ? "text-2xl" : "text-sm"}`}>{score}%</span>
    </div>
  );
};

const Avatar = ({ emoji, initials, size = "w-12 h-12" }) => (
  <div className={`${size} rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center flex-shrink-0 ${initials ? "font-sans font-bold text-terracotta" : "text-xl"}`}>
    {initials || emoji}
  </div>
);

const NiveauBadge = ({ exchangeCount, compact }) => {
  const b = getBadge(exchangeCount);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-sans font-medium ${b.color} ${compact ? "text-[0.6rem] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}>
      {b.emoji} {b.label}
    </span>
  );
};

const InsuranceBadge = () => (
  <div className="flex items-center gap-2 bg-sage/10 border border-sage/25 rounded-xl px-3 py-2 mb-3">
    <span className="text-sage-dark text-sm font-semibold font-sans">🛡️ Échange protégé ✓</span>
    <span className="text-warm-400 text-xs font-sans">— Couverture Safely — jusqu'à 50 000$</span>
  </div>
);

const HestiaPointsBadge = ({ points }) => (
  <div className="inline-flex items-center gap-1.5 bg-terracotta/10 border border-terracotta/20 rounded-full px-4 py-1.5">
    <span className="font-sans font-bold text-sm text-terracotta">✦ {points} pts</span>
  </div>
);

// ── WAITLIST MODAL ───────────────────────────────────────────
const WaitlistModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.from("waitlist").insert({ name: name.trim(), email: email.trim() });
      if (err) {
        if (err.message?.includes("duplicate") || err.code === "23505") setError("Cet email est déjà sur la liste d'attente !");
        else setError("Une erreur est survenue. Réessayez.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-end sm:items-center justify-center" onClick={onClose}>
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-8 shadow-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-terracotta" size={28} />
              </motion.div>
              <h3 className="font-serif text-2xl font-bold text-warm-900 mb-2">✦ Vous êtes sur la liste</h3>
              <p className="font-sans text-warm-500 text-sm mb-6">Nous vous contactons très bientôt.</p>
              <button onClick={onClose} className="bg-terracotta text-white font-sans font-semibold text-sm px-8 py-3 rounded-xl hover:bg-terracotta-dark transition-all">Fermer</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-xl font-bold text-warm-900">Demander une invitation</h3>
                <button onClick={onClose} className="text-warm-400 hover:text-warm-600 text-xl">✕</button>
              </div>
              <p className="font-sans text-warm-500 text-sm mb-6">Hestia est accessible sur invitation uniquement. Rejoignez <span className="font-semibold text-terracotta">847 personnes</span> sur la liste d'attente.</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm">{error}</div>}
              <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3" placeholder="Votre prénom" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3" placeholder="Votre email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-5" placeholder="Quelle ville ?" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
              <button className="w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl hover:bg-terracotta-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2" onClick={handleSubmit} disabled={loading || !name.trim() || !email.trim()}>
                {loading && <Spinner />}
                {loading ? "Envoi..." : "Rejoindre la liste"}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── ANIMATED COUNTER ─────────────────────────────────────────
const AnimatedCounter = ({ target, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString("fr-FR")}</span>;
};

// ── SOCIAL PROOF TICKER ──────────────────────────────────────
const SocialTicker = () => {
  const items = [
    "Marie de Paris vient de rejoindre ✦",
    "Carlos de Barcelone a confirmé un échange ✦",
    "3 nouveaux matchs cette heure ✦",
    "Yuki de Tokyo a reçu un avis 5★ ✦",
    "Amara de Dakar a rejoint Hestia Premium ✦",
    "12 échanges confirmés aujourd'hui ✦",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden bg-cream py-2 border-b border-warm-100">
      <motion.div
        className="flex whitespace-nowrap gap-10"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="font-sans text-xs text-terracotta/70 tracking-wide">{item}</span>
        ))}
      </motion.div>
    </div>
  );
};

// ── HESTIA PASSPORT ──────────────────────────────────────────
const HestiaPassport = ({ user }) => {
  const badge = getBadge(user.exchangeCount || 0);
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 border border-warm-100 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-serif text-base font-bold text-warm-800">🛂 Hestia Passport</span>
        <NiveauBadge exchangeCount={user.exchangeCount || 0} compact />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
          <p className="font-sans text-2xl font-bold text-terracotta">{user.trustScore || 75}</p>
          <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">Score confiance</p>
        </div>
        <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
          <p className="font-sans text-2xl font-bold text-sage-dark">{user.exchangeCount || 0}</p>
          <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">Échanges</p>
        </div>
        <div className="bg-cream-light rounded-xl p-3 text-center border border-warm-100">
          {user.verified ? <p className="text-2xl">✅</p> : <p className="text-2xl">⏳</p>}
          <p className="font-sans text-[0.65rem] text-warm-400 uppercase tracking-wider mt-1">Vérifié</p>
        </div>
      </div>
      {user.hestiaPoints && (
        <div className="flex items-center justify-between mb-4 bg-cream-light rounded-xl p-3 border border-warm-100">
          <HestiaPointsBadge points={user.hestiaPoints} />
          <span className="font-sans text-xs text-warm-400">Membre depuis 2024</span>
        </div>
      )}
      {user.reviews?.length > 0 && (
        <div>
          <p className="font-sans text-xs text-warm-400 uppercase tracking-wider mb-2">Avis récents</p>
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
      <div className="mt-3 p-3 bg-gradient-to-r from-terracotta/5 to-sage/5 rounded-xl border border-terracotta/10">
        <p className="font-sans text-xs text-warm-500"><span className="font-semibold">{badge.emoji} {badge.label}</span> — {badge.benefits}</p>
      </div>
    </div>
  );
};

// ── LANDING PAGE ─────────────────────────────────────────────
const LandingPage = ({ onOpenAuth, onOpenWaitlist, onNavigate }) => {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-cream-light">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-warm-100">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={hestiaLogo} alt="Hestia" className="h-8 w-8" />
            <span className="font-serif text-xl tracking-widest text-warm-800 italic">HESTIA</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => onNavigate ? onNavigate("comment-ca-marche") : scrollTo("how-it-works")} className="font-sans text-sm text-warm-600 hover:text-terracotta transition-colors">Comment ça marche</button>
            <button onClick={() => scrollTo("pricing")} className="font-sans text-sm text-warm-600 hover:text-terracotta transition-colors">Tarifs</button>
            <button onClick={() => onNavigate ? onNavigate("assurance") : scrollTo("trust")} className="font-sans text-sm text-warm-600 hover:text-terracotta transition-colors">Assurance</button>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={onOpenAuth} className="font-sans text-sm text-warm-700 hover:text-terracotta transition-colors">Se connecter</button>
            <button onClick={onOpenWaitlist} className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all active:scale-[0.97]">
              Demander une invitation
            </button>
          </div>
        </div>
      </nav>

      {/* Social Proof Ticker — right below nav */}
      <SocialTicker />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20 md:pb-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium mb-5">Home Exchange — Reimagined</p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-warm-900 leading-tight mb-6 text-balance">
                Les meilleures maisons ne se louent pas. Elles s'échangent.
              </h1>
              <p className="font-sans text-warm-500 text-lg leading-relaxed mb-8 max-w-md">
                La première plateforme de home exchange basée sur la compatibilité humaine.
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <button onClick={onOpenWaitlist} className="bg-terracotta text-white font-sans font-semibold text-base px-8 py-4 rounded-2xl shadow-soft hover:bg-terracotta-dark hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  Demander une invitation
                </button>
                <span className="font-sans text-warm-400 text-sm">847 personnes sur liste d'attente</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
              <div className="rounded-3xl overflow-hidden shadow-elevated">
                <img src={heroImg} alt="Beautiful Mediterranean home" className="w-full h-64 md:h-96 object-cover" />
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="absolute -bottom-4 -left-4 md:-left-8 bg-white rounded-2xl shadow-card p-4 border border-warm-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-lg">🏡</div>
                  <div>
                    <p className="font-sans text-xs text-warm-400 mb-0.5">Match trouvé</p>
                    <ScoreBadge score={92} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* How it Works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-3">Comment ça marche</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-warm-900 text-center mb-16">4 étapes vers votre prochain échange</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {[
            { step: "01", Icon: User, title: "Créez votre profil", desc: "Décrivez votre maison, votre style de vie et vos envies de voyage." },
            { step: "02", Icon: ClipboardList, title: "Répondez au questionnaire", desc: "Notre algorithme analyse 8 dimensions de compatibilité." },
            { step: "03", Icon: Sparkles, title: "Recevez vos matchs", desc: "Des suggestions personnalisées avec score de compatibilité détaillé." },
            { step: "04", Icon: Handshake, title: "Échangez en confiance", desc: "Assurance incluse, contrat automatique, contacts protégés." },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }} className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center">
                <item.Icon className="text-terracotta" size={24} />
              </div>
              <p className="font-sans text-[0.65rem] tracking-[0.2em] uppercase text-terracotta mb-2">{item.step}</p>
              <h3 className="font-serif text-base md:text-lg font-bold text-warm-800 mb-2">{item.title}</h3>
              <p className="font-sans text-warm-500 text-xs md:text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="bg-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-3">Sécurité</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-warm-900 text-center mb-16">Pourquoi Hestia est sûr</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🪪", title: "Identité vérifiée", desc: "Chaque membre passe par une vérification d'identité avant de pouvoir échanger." },
              { icon: "🛡️", title: "Assurance Safely jusqu'à 50 000$", desc: "Chaque échange est automatiquement couvert par notre partenaire Safely." },
              { icon: "🔒", title: "Messagerie protégée", desc: "Les coordonnées personnelles sont masquées jusqu'à confirmation mutuelle de l'échange." },
              { icon: "⭐", title: "Avis post-échange uniquement", desc: "Seuls les membres ayant réellement échangé peuvent laisser un avis. Pas de faux." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-4 p-6 rounded-2xl border border-warm-100 bg-cream-light/50 hover:shadow-soft transition-shadow">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-serif text-base font-bold text-warm-800 mb-1">{item.title}</h3>
                  <p className="font-sans text-warm-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div>
              <p className="font-serif text-3xl md:text-5xl font-bold text-terracotta"><AnimatedCounter target={1247} /></p>
              <p className="font-sans text-warm-500 text-xs md:text-sm mt-1 md:mt-2">maisons disponibles</p>
            </div>
            <div>
              <p className="font-serif text-3xl md:text-5xl font-bold text-terracotta"><AnimatedCounter target={34} /></p>
              <p className="font-sans text-warm-500 text-xs md:text-sm mt-1 md:mt-2">pays</p>
            </div>
            <div>
              <p className="font-serif text-3xl md:text-5xl font-bold text-terracotta"><AnimatedCounter target={98} />%</p>
              <p className="font-sans text-warm-500 text-xs md:text-sm mt-1 md:mt-2">de matchs satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-3">Tarifs</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-warm-900 text-center mb-16">Simple et transparent</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: "Gratuit", price: "0€", desc: "Pour toujours", features: ["Créer un profil", "Voir vos matchs (score visible)", "1 aperçu de message"], highlight: false, badge: null },
            { label: "Member", price: "99€", desc: "par an", features: ["Tout le gratuit", "Messagerie complète", "3 échanges / an", "Badge vérifié", "Assurance Safely incluse", "Contrat automatique"], highlight: true, badge: "Plus populaire" },
            { label: "Premium", price: "199€", desc: "par an", features: ["Tout Member", "Matchs prioritaires", "Échanges illimités", "Support dédié", "AI Concierge", "Badge Premium exclusif"], highlight: false, badge: "Exclusif" },
          ].map((plan, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-3xl p-7 border relative overflow-hidden transition-all hover:shadow-elevated ${plan.highlight ? "border-terracotta/30 shadow-card scale-[1.02] md:scale-105" : "border-warm-100 shadow-soft"}`}
            >
              {plan.badge && (
                <div className={`absolute top-4 right-4 text-[0.6rem] tracking-[0.15em] uppercase font-sans font-bold px-3 py-1.5 rounded-full ${plan.highlight ? "bg-terracotta text-white" : "bg-warm-800 text-white"}`}>
                  {plan.badge}
                </div>
              )}
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-1">{plan.label}</p>
              <p className="font-serif text-4xl font-bold text-warm-900 mb-1">{plan.price}</p>
              <p className="font-sans text-warm-400 text-sm mb-6">{plan.desc}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="font-sans text-warm-600 text-sm flex items-start gap-2">
                    <span className="text-terracotta mt-0.5 flex-shrink-0">✦</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={onOpenWaitlist} className={`w-full font-sans font-semibold text-sm py-3 rounded-xl transition-all ${plan.highlight ? "bg-terracotta text-white hover:bg-terracotta-dark" : "border border-warm-200 text-warm-700 hover:bg-cream"}`}>
                Demander une invitation
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium text-center mb-3">Témoignages</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-warm-900 text-center mb-16">Ce que nos membres disent</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Sophie L.", city: "Lyon", initials: "S", text: "Notre échange avec une famille à Lisbonne a été magique. Le matching est incroyablement précis — on avait les mêmes valeurs, les mêmes envies. Nos enfants sont devenus amis !", rating: 5 },
              { name: "Marc & Julie R.", city: "Montréal", initials: "MJ", text: "Après 4 échanges via Hestia, on ne réserve plus d'hôtels. La confiance est immédiate grâce au Passport et aux avis vérifiés. Le contrat automatique rassure tout le monde.", rating: 5 },
              { name: "Kenji H.", city: "Tokyo", initials: "K", text: "En tant que digital nomad, Hestia m'a permis de vivre 3 mois à Barcelone en échangeant mon appart de Shinjuku. Le score de compatibilité ne ment pas — 94% et c'était parfait.", rating: 5 },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-cream-light/50 rounded-2xl p-5 md:p-6 border border-warm-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center font-sans font-bold text-terracotta text-sm flex-shrink-0">{t.initials}</div>
                  <div>
                    <p className="font-sans text-sm font-semibold text-warm-800">{t.name}</p>
                    <p className="font-sans text-xs text-warm-400">📍 {t.city}</p>
                  </div>
                </div>
                <p className="font-sans text-warm-500 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <p className="font-sans text-xs text-terracotta">{"★".repeat(t.rating)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-warm-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Prêt à échanger autrement ?</h2>
          <p className="font-sans text-warm-300 text-lg mb-8">Rejoignez une communauté de voyageurs qui partagent plus qu'un toit.</p>
          <button onClick={onOpenWaitlist} className="bg-terracotta text-white font-sans font-semibold text-lg px-10 py-4 rounded-2xl hover:bg-terracotta-dark hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            Demander une invitation
          </button>
          <p className="font-sans text-warm-500 text-sm mt-4">847 personnes sur liste d'attente</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-900 border-t border-warm-700 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={hestiaLogo} alt="Hestia" className="h-7 w-7 brightness-200" />
                <span className="font-serif text-lg tracking-widest text-white italic">HESTIA</span>
              </div>
              <p className="font-sans text-warm-400 text-sm leading-relaxed">La première plateforme de home exchange basée sur la compatibilité humaine.</p>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold text-white mb-4 uppercase tracking-wider">Plateforme</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onNavigate && onNavigate("comment-ca-marche")} className="font-sans text-sm text-warm-400 hover:text-terracotta-light transition-colors">Comment ça marche</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="font-sans text-sm text-warm-400 hover:text-terracotta-light transition-colors">Tarifs</button></li>
                <li><button onClick={() => onNavigate && onNavigate("assurance")} className="font-sans text-sm text-warm-400 hover:text-terracotta-light transition-colors">Assurance</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold text-white mb-4 uppercase tracking-wider">Entreprise</h4>
              <ul className="space-y-2">
                {["À propos", "Contact", "Carrières"].map((item) => (
                  <li key={item}><button className="font-sans text-sm text-warm-400 hover:text-terracotta-light transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-sm font-semibold text-white mb-4 uppercase tracking-wider">Légal</h4>
              <ul className="space-y-2">
                {["Mentions légales", "Confidentialité", "CGU"].map((item) => (
                  <li key={item}><button className="font-sans text-sm text-warm-400 hover:text-terracotta-light transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-warm-700 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-sans text-warm-500 text-xs">© 2024 Hestia. Tous droits réservés.</p>
            <p className="font-sans text-warm-500 text-xs">support@hestia.app</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ── AUTH PAGE ─────────────────────────────────────────────────
const translateError = (msg) => {
  if (!msg) return "";
  if (msg.includes("already registered") || msg.includes("already been registered")) return "Email déjà utilisé";
  if (msg.includes("least 6") || msg.includes("too short") || msg.includes("Password")) return "Mot de passe trop court (6 caractères minimum)";
  if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) return "Email ou mot de passe incorrect";
  if (msg.includes("Email not confirmed")) return "Email non confirmé. Vérifiez votre boîte mail.";
  if (msg.includes("rate limit") || msg.includes("Too many")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return msg;
};

const AuthPage = ({ onAuth, confirmationBanner, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) return;
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError(translateError(err.message));
      } else {
        const { error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: "https://join-hestia.lovable.app/" },
        });
        if (err) setError(translateError(err.message));
        else {
          setSignupSuccess(true);
          showToast?.(`📬 Email de confirmation envoyé à ${email}`);
        }
      }
    } catch (err) {
      setError("Erreur réseau. Réessayez.");
    }
    setLoading(false);
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-cream-light flex items-center justify-center px-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl shadow-card p-10 border border-warm-100">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="font-serif text-2xl font-bold text-warm-900 mb-3">Vérifiez votre email</h2>
            <p className="font-sans text-warm-500 text-sm mb-2">Un lien de confirmation a été envoyé à</p>
            <p className="font-sans text-terracotta font-semibold mb-6">{email}</p>
            <button className="font-sans text-sm text-terracotta hover:underline" onClick={() => { setSignupSuccess(false); setIsLogin(true); setError(""); }}>
              ← Retour à la connexion
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src={hestiaLogo} alt="Hestia" className="h-8 w-8" />
            <span className="font-serif text-xl tracking-widest text-warm-800 italic">HESTIA</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-warm-900">
            {isLogin ? "Bon retour" : "Rejoindre Hestia"}
          </h2>
        </div>
        <div className="bg-white rounded-3xl shadow-card p-8 border border-warm-100">
          {confirmationBanner && (
            <div className="bg-sage/10 border border-sage/30 text-sage-dark rounded-xl px-4 py-3 mb-4 font-sans text-sm flex items-center gap-2">
              <span>✅</span> Email confirmé ! Connectez-vous maintenant.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm">{error}</div>}
          {!isLogin && (
            <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3" placeholder="Ton prénom" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-3" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full px-4 py-3.5 rounded-xl border border-warm-200 bg-cream-light/50 text-warm-800 font-sans text-sm outline-none focus:border-terracotta/50 focus:ring-2 focus:ring-terracotta/10 transition-all mb-6" placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()} />
          <button className="w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl hover:bg-terracotta-dark hover:shadow-soft transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2" onClick={handleSubmit} disabled={loading}>
            {loading && <Spinner />}
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer mon compte"}
          </button>
          <p className="font-sans text-warm-400 text-sm text-center mt-5 cursor-pointer hover:text-terracotta transition-colors" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin ? "Pas encore de compte ? Créer un profil" : "Déjà un compte ? Se connecter"}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ── QUESTIONNAIRE ────────────────────────────────────────────
const Questionnaire = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [otherText, setOtherText] = useState({});
  const [carType, setCarType] = useState("");
  const questions = getQuestions();
  const q = questions[step];
  const isMulti = q?.type === "multi";
  const selected = answers[q?.id];
  const canContinue = isMulti ? (selected?.length || 0) > 0 : !!selected;

  const handleSelect = (value) => {
    if (isMulti) {
      const cur = answers[q.id] || [];
      setAnswers({ ...answers, [q.id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
    } else {
      setAnswers({ ...answers, [q.id]: value });
    }
  };

  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <img src={hestiaLogo} alt="Hestia" className="h-7 w-7" />
            <span className="font-serif text-base tracking-widest text-warm-800 italic">HESTIA</span>
          </div>
        </div>
        <div className="h-1 bg-warm-100 rounded-full mb-10 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-terracotta to-sage rounded-full" animate={{ width: `${((step + 1) / questions.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-2">{q.category}</p>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-warm-900 mb-2">{q.question}</h2>
            <p className="font-sans text-warm-400 text-sm mb-7">{q.subtitle}</p>

            <div className={`${isMulti ? "grid grid-cols-2" : "flex flex-col"} gap-2.5 mb-4`}>
              {q.options.map((opt) => {
                const sel = isMulti ? (selected || []).includes(opt.value) : selected === opt.value;
                return (
                  <button key={opt.value} onClick={() => handleSelect(opt.value)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all duration-200 ${sel ? "border-terracotta/40 bg-terracotta/5 shadow-soft" : "border-warm-100 bg-white hover:border-warm-200 hover:shadow-soft"}`}>
                    <span className={`font-sans text-sm ${sel ? "text-terracotta font-semibold" : "text-warm-700"}`}>{opt.label}</span>
                    {opt.desc && <span className="font-sans text-xs text-warm-400">{opt.desc}</span>}
                  </button>
                );
              })}
            </div>

            {q.id === "include_car" && selected === "yes" && (
              <input className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all mb-4" placeholder="🚗 Type de voiture (ex: Renault Clio, Tesla Model 3...)" value={carType} onChange={(e) => setCarType(e.target.value)} />
            )}

            <input className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all mb-6" placeholder="✏️ Autre chose à préciser ? (optionnel)" value={otherText[q.id] || ""} onChange={(e) => setOtherText({ ...otherText, [q.id]: e.target.value })} />
          </motion.div>
        </AnimatePresence>

        <button className={`w-full bg-terracotta text-white font-sans font-semibold text-sm py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] ${canContinue ? "hover:bg-terracotta-dark hover:shadow-soft" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => { if (!canContinue) return; if (step < questions.length - 1) setStep(s => s + 1); else onComplete({ ...answers, car_type: carType }); }}>
          {step === questions.length - 1 ? "Voir mes matchs →" : "Continuer →"}
        </button>
        {step > 0 && (
          <button className="w-full mt-3 font-sans text-sm text-warm-500 py-3 rounded-xl border border-warm-200 bg-white hover:bg-cream transition-colors" onClick={() => setStep(s => s - 1)}>← Retour</button>
        )}
        <p className="font-sans text-warm-300 text-xs text-center mt-4">{step + 1} / {questions.length}</p>
      </motion.div>
    </div>
  );
};

// ── DASHBOARD ────────────────────────────────────────────────
const Dashboard = ({ user, answers, isPremium, onUpgrade, onLogout, showToast }) => {
  const [tab, setTab] = useState("matches");
  const [activeConv, setActiveConv] = useState(null);
  const [msgInput, setMsgInput] = useState("");
  const [conversations, setConversations] = useState(MOCK_MESSAGES);
  const [confirmedExchanges, setConfirmedExchanges] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const userPoints = 240;

  const matches = MOCK_USERS.map((u) => {
    const result = computeDetailedScore(answers, u.answers);
    return { ...u, score: result.total, dimensions: result.dimensions };
  }).sort((a, b) => b.score - a.score);

  const sendMessage = () => {
    if (!msgInput.trim() || !activeConv) return;
    const redacted = redactContact(msgInput);
    setConversations((prev) => ({ ...prev, [activeConv]: [...(prev[activeConv] || []), { from: "me", text: redacted, time: "maintenant" }] }));
    setMsgInput("");
  };

  const confirmExchange = (userId) => setConfirmedExchanges((prev) => prev.includes(userId) ? prev : [...prev, userId]);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast?.("Erreur de paiement — réessayez ou contactez support@hestia.app");
    } catch {
      showToast?.("Erreur de paiement — réessayez ou contactez support@hestia.app");
    }
    setUpgradeLoading(false);
  };

  const navItems = [
    { id: "matches", icon: "✦", label: "Matchs" },
    { id: "messages", icon: "💬", label: "Messages" },
    { id: "exchanges", icon: "🔄", label: "Échanges" },
    { id: "profile", icon: "◉", label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-cream-light flex flex-col">
      {/* Top bar */}
      <div className="px-5 py-4 border-b border-warm-100 bg-white/80 backdrop-blur-sm flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={hestiaLogo} alt="Hestia" className="h-7 w-7" />
          <span className="font-serif text-base tracking-widest text-warm-800 italic">HESTIA</span>
        </div>
        <div className="flex items-center gap-3">
          <HestiaPointsBadge points={userPoints} />
          {isPremium && <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium bg-terracotta/10 px-3 py-1.5 rounded-full border border-terracotta/20">✦ MEMBER</span>}
          <button onClick={onLogout} className="font-sans text-xs text-warm-500 border border-warm-200 px-3 py-1.5 rounded-xl hover:bg-cream hover:text-terracotta transition-colors">Déconnexion</button>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-100 flex z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.06)]">
        {navItems.map((n) => (
          <button key={n.id} onClick={() => { setTab(n.id); if (n.id !== "messages") setActiveConv(null); setSelectedProfile(null); }}
            className="flex-1 py-3 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-colors">
            <span className="text-base">{n.icon}</span>
            <span className={`text-[0.6rem] tracking-wider font-sans uppercase ${tab === n.id ? "text-terracotta font-semibold" : "text-warm-300"}`}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-24 pt-6 max-w-2xl w-full mx-auto">
        <AnimatePresence mode="wait">

          {/* ── MATCHES TAB ── */}
          {tab === "matches" && !selectedProfile && (
            <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">{matches.length} matchs trouvés</p>
              {matches.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className={`bg-white rounded-2xl shadow-soft p-5 mb-4 relative overflow-hidden border transition-all hover:shadow-card cursor-pointer ${i === 0 ? "border-terracotta/20" : "border-warm-100"}`}
                  onClick={() => (isPremium || i < 2) && setSelectedProfile(m)}>
                  {!isPremium && i >= 2 && (
                    <div className="absolute inset-0 backdrop-blur-md bg-cream-light/70 flex flex-col items-center justify-center z-10 rounded-2xl">
                      <span className="text-2xl mb-2">🔒</span>
                      <p className="font-sans text-warm-500 text-sm text-center mb-4 px-6">Passez en Member pour voir ce match</p>
                      <button className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-terracotta-dark transition-all flex items-center gap-2" onClick={(e) => { e.stopPropagation(); handleUpgrade(); }}>
                        {upgradeLoading && <Spinner />} Passer en Member — 99€/an
                      </button>
                    </div>
                  )}
                  <div className="flex gap-4 items-start">
                    <div className="relative">
                      <Avatar emoji={m.avatar} size="w-14 h-14" />
                      <div className="absolute -bottom-1 -right-1"><NiveauBadge exchangeCount={m.exchangeCount} compact /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-serif text-lg font-semibold text-warm-800 truncate">{m.name}</span>
                          {m.verified && <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20 font-sans font-medium flex-shrink-0">✅</span>}
                        </div>
                        <ScoreBadge score={m.score} />
                      </div>
                      <p className="font-sans text-warm-400 text-sm mb-1">📍 {m.location}</p>
                      <p className="font-sans text-warm-600 text-sm leading-relaxed mb-2 line-clamp-2">{m.bio}</p>
                      {/* Mini Radar */}
                      {m.dimensions && (
                        <div className="flex items-center gap-3 mb-2">
                          <RadarChart dimensions={m.dimensions} size={80} />
                          <div className="flex-1">
                            <p className="font-sans text-xs text-terracotta font-semibold mb-1">Pourquoi ce match à {m.score}%</p>
                            {Object.entries(m.dimensions).slice(0, 3).filter(([_, v]) => v > 70).map(([k, v]) => (
                              <p key={k} className="font-sans text-[0.65rem] text-warm-500">✦ {DIMENSION_LABELS[k]}: {v}%</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.includeCar && <span className="inline-flex items-center gap-1 font-sans text-xs text-warm-500 bg-cream rounded-full px-2.5 py-1 border border-warm-100">🚗 {m.carType}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
              {!isPremium && (
                <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20">
                  <p className="font-sans text-warm-500 text-sm mb-4">{Math.max(matches.length - 2, 0)} autres matchs disponibles en Member</p>
                  <button className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark transition-all flex items-center justify-center gap-2 mx-auto" onClick={handleUpgrade}>
                    {upgradeLoading && <Spinner />} Passer en Member — 99€/an
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SELECTED PROFILE ── */}
          {tab === "matches" && selectedProfile && (
            <motion.div key="profile-detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button className="font-sans text-sm text-warm-500 border border-warm-200 px-3 py-2 rounded-xl bg-white hover:bg-cream transition-colors mb-4" onClick={() => setSelectedProfile(null)}>← Retour aux matchs</button>
              <div className="bg-white rounded-2xl shadow-card p-6 border border-warm-100 mb-4">
                <div className="flex gap-4 items-center mb-4">
                  <div className="relative">
                    <Avatar emoji={selectedProfile.avatar} size="w-16 h-16" />
                    <div className="absolute -bottom-1 -right-1"><NiveauBadge exchangeCount={selectedProfile.exchangeCount} compact /></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-xl font-bold text-warm-800">{selectedProfile.name}</span>
                      {selectedProfile.verified && <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20">✅</span>}
                    </div>
                    <p className="font-sans text-warm-400 text-sm">📍 {selectedProfile.location}</p>
                  </div>
                  <ScoreBadge score={selectedProfile.score} large />
                </div>
                <p className="font-sans text-warm-600 text-sm leading-relaxed mb-4">{selectedProfile.bio}</p>
                {selectedProfile.includeCar && (
                  <div className="flex items-center gap-2 bg-cream-light rounded-xl p-3 border border-warm-100 mb-4">
                    <span className="text-lg">🚗</span>
                    <div>
                      <p className="font-sans text-sm font-semibold text-warm-700">Voiture incluse</p>
                      <p className="font-sans text-xs text-warm-400">{selectedProfile.carType}</p>
                    </div>
                  </div>
                )}
                {/* Full Radar */}
                {selectedProfile.dimensions && (
                  <div className="mb-4">
                    <p className="font-sans text-xs text-terracotta font-semibold mb-3">Pourquoi ce match à {selectedProfile.score}%</p>
                    <RadarChart dimensions={selectedProfile.dimensions} size={160} />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(selectedProfile.dimensions).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-warm-100 rounded-full overflow-hidden">
                            <div className="h-full bg-terracotta rounded-full" style={{ width: `${v}%` }} />
                          </div>
                          <span className="font-sans text-[0.6rem] text-warm-400 w-16">{DIMENSION_LABELS[k]}</span>
                          <span className="font-sans text-[0.6rem] text-warm-600 font-semibold w-8 text-right">{v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <HestiaPassport user={selectedProfile} />
              <div className="flex gap-2">
                <button className="flex-1 bg-terracotta text-white font-sans font-semibold text-sm py-3 rounded-xl hover:bg-terracotta-dark transition-all" onClick={() => { setTab("messages"); setActiveConv(selectedProfile.id); setSelectedProfile(null); }}>💬 Écrire</button>
                <button className="flex-1 font-sans text-sm text-warm-600 border border-warm-200 py-3 rounded-xl hover:bg-cream transition-colors" onClick={() => confirmExchange(selectedProfile.id)}>Proposer un échange</button>
              </div>
            </motion.div>
          )}

          {/* ── MESSAGES LIST ── */}
          {tab === "messages" && !activeConv && (
            <motion.div key="messages-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">Messages</p>
              {!isPremium && (
                <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20 mb-5">
                  <p className="font-sans text-warm-500 text-sm mb-4">🔒 Passe en Member pour envoyer des messages</p>
                  <button className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark transition-all flex items-center gap-2 mx-auto" onClick={handleUpgrade}>
                    {upgradeLoading && <Spinner />} Passer en Member — 99€/an
                  </button>
                </div>
              )}
              {Object.entries(conversations).map(([uid, msgs]) => {
                const matchUser = MOCK_USERS.find((u) => u.id === uid);
                if (!matchUser) return null;
                const last = msgs[msgs.length - 1];
                return (
                  <div key={uid} className={`bg-white rounded-2xl shadow-soft p-4 mb-3 border border-warm-100 transition-all ${isPremium ? "cursor-pointer hover:shadow-card hover:border-warm-200" : "opacity-50"}`} onClick={() => isPremium && setActiveConv(uid)}>
                    <div className="flex gap-3 items-center">
                      <Avatar emoji={matchUser.avatar} size="w-11 h-11" />
                      <div className="flex-1 overflow-hidden">
                        <div className="font-sans font-semibold text-warm-800 text-sm mb-0.5">{matchUser.name}</div>
                        <div className="font-sans text-warm-400 text-sm truncate">{last.redacted ? "🔒 Ce message contient des coordonnées..." : last.text.substring(0, 50) + "..."}</div>
                      </div>
                      <span className="font-sans text-warm-300 text-xs">{last.time}</span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ── ACTIVE CONVERSATION ── */}
          {tab === "messages" && activeConv && (() => {
            const matchUser = MOCK_USERS.find((u) => u.id === activeConv);
            const msgs = conversations[activeConv] || [];
            const isConfirmed = confirmedExchanges.includes(activeConv);
            return (
              <motion.div key="conversation" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-[calc(100vh-10rem)]">
                <div className="flex items-center gap-3 mb-4">
                  <button className="font-sans text-sm text-warm-500 border border-warm-200 px-3 py-2 rounded-xl bg-white hover:bg-cream transition-colors" onClick={() => setActiveConv(null)}>←</button>
                  <Avatar emoji={matchUser?.avatar} size="w-10 h-10" />
                  <div>
                    <div className="font-sans font-semibold text-warm-800 text-sm">{matchUser?.name}</div>
                    <div className="font-sans text-warm-400 text-xs">📍 {matchUser?.location}</div>
                  </div>
                  {!isConfirmed && (
                    <button className="ml-auto bg-terracotta text-white font-sans font-semibold text-xs px-4 py-2 rounded-xl hover:bg-terracotta-dark transition-all" onClick={() => confirmExchange(activeConv)}>Confirmer l'échange</button>
                  )}
                  {isConfirmed && <span className="ml-auto text-xs tracking-wider uppercase text-sage-dark font-sans font-medium">Échange confirmé ✓</span>}
                </div>
                {isConfirmed && <InsuranceBadge />}
                {isConfirmed && (
                  <button className="font-sans text-xs text-terracotta border border-terracotta/20 px-4 py-2 rounded-xl mb-3 hover:bg-terracotta/5 transition-colors"
                    onClick={() => generateContract(user, matchUser, "Dates à définir")}>
                    📄 Télécharger le contrat
                  </button>
                )}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                  {msgs.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-3 border ${msg.from === "me" ? "bg-terracotta/8 border-terracotta/15 rounded-2xl rounded-br-sm" : "bg-white border-warm-100 rounded-2xl rounded-bl-sm shadow-soft"}`}>
                        {msg.redacted && !isConfirmed ? (
                          <p className="font-sans text-sm text-terracotta">🔒 Ce message contenait des coordonnées. Confirmez l'échange pour les voir.</p>
                        ) : (
                          <p className="font-sans text-sm text-warm-700">{msg.text}</p>
                        )}
                        <p className="font-sans text-[0.65rem] text-warm-300 mt-1.5 text-right">{msg.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2 pt-3 border-t border-warm-100">
                  <input className="flex-1 px-4 py-3 rounded-xl border border-warm-200 bg-white text-warm-700 font-sans text-sm outline-none focus:border-terracotta/50 transition-all" placeholder="Votre message..." value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                  <button className="bg-terracotta text-white font-sans font-semibold text-sm px-5 py-3 rounded-xl hover:bg-terracotta-dark transition-all" onClick={sendMessage}>Envoyer</button>
                </div>
                <p className="font-sans text-warm-300 text-xs text-center mt-3">🔒 Coordonnées masquées automatiquement jusqu'à la confirmation d'échange</p>
              </motion.div>
            );
          })()}

          {/* ── EXCHANGES TAB ── */}
          {tab === "exchanges" && (
            <motion.div key="exchanges" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">Échanges</p>
              {confirmedExchanges.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft p-8 text-center border border-warm-100">
                  <p className="text-3xl mb-3">🏡</p>
                  <p className="font-sans text-warm-500 text-sm">Aucun échange confirmé pour l'instant. Matchez et confirmez un échange pour commencer.</p>
                </div>
              ) : (
                confirmedExchanges.map((uid) => {
                  const u = MOCK_USERS.find((x) => x.id === uid);
                  if (!u) return null;
                  return (
                    <motion.div key={uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-soft p-5 mb-3 border border-sage/20">
                      <InsuranceBadge />
                      <div className="flex gap-3 items-center">
                        <Avatar emoji={u.avatar} size="w-12 h-12" />
                        <div className="flex-1">
                          <div className="font-sans font-semibold text-warm-800 mb-1">{u.name}</div>
                          <div className="font-sans text-warm-400 text-sm">📍 {u.location}</div>
                          <p className="text-xs tracking-wider uppercase text-sage-dark font-sans font-medium mt-2">✓ Échange confirmé — Contacts révélés</p>
                        </div>
                        <button className="font-sans text-xs text-terracotta border border-terracotta/20 px-3 py-2 rounded-xl hover:bg-terracotta/5 transition-colors"
                          onClick={() => generateContract(user, u, "Dates à définir")}>
                          📄 Contrat
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div className="bg-gradient-to-br from-terracotta/5 to-sage/5 rounded-2xl p-5 mt-4 border border-terracotta/15">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✦</span>
                  <span className="font-serif text-base font-bold text-warm-800">Hestia Points</span>
                </div>
                <p className="font-sans text-warm-500 text-sm mb-3">Pas de match simultané ? Accueillez un voyageur et gagnez des points pour voyager plus tard.</p>
                <div className="flex items-center gap-3">
                  <HestiaPointsBadge points={userPoints} />
                  <span className="font-sans text-xs text-warm-400">= 1 nuit d'échange</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta font-sans font-medium mb-5">Mon profil</p>
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-4 border border-warm-100">
                <div className="flex gap-4 items-center mb-4">
                  <div className="relative">
                    <Avatar emoji="👤" size="w-16 h-16" />
                    <div className="absolute -bottom-1 -right-1"><NiveauBadge exchangeCount={0} compact /></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-xl font-bold text-warm-800">{user.name}</span>
                      <span className="text-xs bg-sage/15 text-sage-dark px-2 py-0.5 rounded-full border border-sage/20">✅</span>
                    </div>
                    <div className="font-sans text-warm-400 text-sm">{user.email}</div>
                    {isPremium && <span className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium mt-1 inline-block">✦ Member</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4"><HestiaPointsBadge points={userPoints} /></div>

                {/* Ce que j'offre */}
                <div className="mb-4">
                  <p className="font-sans text-xs text-warm-400 uppercase tracking-wider mb-3">Ce que j'offre avec ma maison</p>
                  <div className="space-y-2">
                    {[
                      { icon: "🚗", label: "Voiture incluse", active: answers.include_car === "yes", detail: answers.car_type },
                      { icon: "🚲", label: "Vélo disponible", active: false, detail: null },
                      { icon: "🐾", label: "Animaux acceptés", active: (answers.home_rules || []).includes("animaux_ok"), detail: null },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.active ? "bg-sage/5 border-sage/20" : "bg-cream-light/50 border-warm-100"}`}>
                        <span className="text-lg">{item.icon}</span>
                        <span className={`font-sans text-sm flex-1 ${item.active ? "text-warm-700 font-medium" : "text-warm-400"}`}>{item.label}</span>
                        <div className={`w-10 h-6 rounded-full transition-colors ${item.active ? "bg-sage" : "bg-warm-200"} relative`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${item.active ? "left-5" : "left-1"}`} />
                        </div>
                        {item.detail && <span className="font-sans text-xs text-warm-400">{item.detail}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(answers).filter(([k]) => !["include_car", "car_type"].includes(k)).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="bg-cream-light rounded-xl p-3 border border-warm-100">
                      <p className="text-xs tracking-[0.15em] uppercase text-terracotta font-sans font-medium mb-1">{k.replace(/_/g, " ")}</p>
                      <p className="font-sans text-warm-700 text-sm">{Array.isArray(v) ? v.join(", ") : v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <HestiaPassport user={{ trustScore: 75, exchangeCount: 0, verified: true, reviews: [], hestiaPoints: userPoints }} />

              {!isPremium && (
                <div className="bg-white rounded-2xl shadow-soft p-6 text-center border border-terracotta/20">
                  <p className="font-sans text-warm-500 text-sm mb-4">Passez en Member pour débloquer la messagerie et les échanges.</p>
                  <button className="bg-terracotta text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-terracotta-dark transition-all flex items-center gap-2 mx-auto" onClick={handleUpgrade}>
                    {upgradeLoading && <Spinner />} Passer en Member — 99€/an
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

// ── ASSURANCE PAGE ───────────────────────────────────────────
const AssurancePage = ({ onBack, onOpenWaitlist }) => (
  <div className="min-h-screen bg-cream-light">
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-warm-100">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-2">
          <img src={hestiaLogo} alt="Hestia" className="h-8 w-8" />
          <span className="font-serif text-xl tracking-widest text-warm-800 italic">HESTIA</span>
        </button>
        <button onClick={onBack} className="font-sans text-sm text-warm-500 hover:text-terracotta transition-colors">← Retour</button>
      </div>
    </nav>
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium mb-3">Protection</p>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-warm-900 mb-6">Votre échange, protégé de A à Z</h1>
        <p className="font-sans text-warm-500 text-lg leading-relaxed mb-12">Hestia s'associe à <span className="font-semibold text-warm-700">Safely</span>, leader mondial de l'assurance pour l'hébergement partagé, pour couvrir chaque échange automatiquement.</p>

        <div className="space-y-6 mb-16">
          {[
            { Icon: ShieldCheck, title: "Couverture jusqu'à 50 000$", desc: "Dommages matériels, vol, dégâts accidentels — chaque échange est couvert sans frais supplémentaires pour les membres." },
            { Icon: Shield, title: "Activation automatique", desc: "Dès qu'un échange est confirmé par les deux parties, la couverture se déclenche automatiquement. Aucune démarche à faire." },
            { Icon: Lock, title: "Vérification d'identité", desc: "Chaque membre passe une vérification d'identité avant de pouvoir participer à un échange. Document officiel + selfie." },
            { Icon: Star, title: "Avis vérifiés uniquement", desc: "Seuls les membres ayant réellement complété un échange peuvent laisser un avis. Zéro faux avis, confiance maximale." },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex gap-4 p-6 rounded-2xl border border-warm-100 bg-white hover:shadow-soft transition-shadow">
              <div className="w-12 h-12 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center flex-shrink-0">
                <item.Icon className="text-terracotta" size={22} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-warm-800 mb-1">{item.title}</h3>
                <p className="font-sans text-warm-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <h2 className="font-serif text-2xl font-bold text-warm-900 mb-8">Questions fréquentes</h2>
        <div className="space-y-4 mb-16">
          {[
            { q: "Que couvre exactement l'assurance Safely ?", a: "Dommages matériels au logement et à son contenu, vol constaté pendant l'échange, dégâts accidentels (bris de vitre, mobilier, électroménager). La couverture va jusqu'à 50 000$ par échange." },
            { q: "Dois-je payer un supplément pour l'assurance ?", a: "Non. L'assurance Safely est incluse dans votre abonnement Member ou Premium. Aucun frais supplémentaire." },
            { q: "Que se passe-t-il en cas de sinistre ?", a: "Signalez le dommage dans les 24h via l'app. Notre équipe et Safely traitent votre dossier sous 48h. Photos et description suffisent dans la majorité des cas." },
            { q: "Les animaux domestiques sont-ils couverts ?", a: "Les dégâts causés par des animaux sont couverts si l'accueil d'animaux a été accepté par les deux parties dans le contrat d'échange." },
            { q: "L'assurance s'applique-t-elle aussi à la voiture partagée ?", a: "Non, la couverture Safely concerne uniquement le logement. Pour la voiture, nous recommandons de vérifier votre assurance auto personnelle." },
          ].map((item, i) => (
            <details key={i} className="bg-white rounded-2xl border border-warm-100 overflow-hidden group">
              <summary className="p-5 font-sans text-sm font-semibold text-warm-800 cursor-pointer hover:text-terracotta transition-colors list-none flex justify-between items-center">
                {item.q}
                <span className="text-warm-300 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <div className="px-5 pb-5">
                <p className="font-sans text-warm-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="text-center bg-white rounded-3xl p-8 md:p-12 border border-warm-100 shadow-soft">
          <h3 className="font-serif text-2xl font-bold text-warm-900 mb-3">Échangez l'esprit tranquille</h3>
          <p className="font-sans text-warm-500 text-sm mb-6">Rejoignez Hestia et bénéficiez de la protection Safely dès votre premier échange.</p>
          <button onClick={onOpenWaitlist} className="bg-terracotta text-white font-sans font-semibold text-base px-8 py-4 rounded-2xl hover:bg-terracotta-dark hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
            Demander une invitation
          </button>
        </div>
      </motion.div>
    </div>
  </div>
);

// ── COMMENT ÇA MARCHE PAGE ──────────────────────────────────
const CommentCaMarchePage = ({ onBack, onOpenWaitlist }) => {
  const dimensions = [
    { Icon: Globe, label: "Complémentarité géographique", desc: "Vous voulez aller là-bas, ils veulent venir ici. L'algorithme favorise les destinations croisées.", pct: 20 },
    { Icon: Home, label: "Alignement d'ambiance", desc: "Design épuré, chaleureux, nature ou urbain — on matche les styles de logement similaires.", pct: 15 },
    { Icon: Users, label: "Style hôte / invité", desc: "Guide local ou discret ? Ultra-respectueux ou à l'aise ? On vérifie la compatibilité relationnelle.", pct: 15 },
    { Icon: ShieldCheck, label: "Vérification dealbreakers", desc: "Fumeur vs non-fumeur, animaux, enfants — un seul conflit = score à 0% sur cette dimension.", pct: 15 },
    { Icon: Zap, label: "Rythme de voyage", desc: "Voyageur occasionnel ou nomade ? On synchronise les fréquences pour maximiser les opportunités.", pct: 10 },
    { Icon: Award, label: "Score de confiance", desc: "Basé sur les avis, les échanges complétés et la vérification d'identité.", pct: 10 },
    { Icon: MessageCircle, label: "Style de communication", desc: "Réactif, détaillé, décontracté — la communication fluide est clé pour un bon échange.", pct: 8 },
    { Icon: Heart, label: "Étape de vie", desc: "Famille, couple, solo, retraité — on matche les modes de vie similaires.", pct: 7 },
  ];

  return (
    <div className="min-h-screen bg-cream-light">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-warm-100">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <button onClick={onBack} className="flex items-center gap-2">
            <img src={hestiaLogo} alt="Hestia" className="h-8 w-8" />
            <span className="font-serif text-xl tracking-widest text-warm-800 italic">HESTIA</span>
          </button>
          <button onClick={onBack} className="font-sans text-sm text-warm-500 hover:text-terracotta transition-colors">← Retour</button>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-sans font-medium mb-3">Comment ça marche</p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-warm-900 mb-6">L'algorithme de matching Hestia</h1>
          <p className="font-sans text-warm-500 text-lg leading-relaxed mb-12">Pas de hasard. Notre algorithme analyse <span className="font-semibold text-warm-700">8 dimensions de compatibilité</span> pour vous proposer les meilleurs échanges possibles.</p>

          {/* Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            {[
              { step: "01", Icon: User, title: "Créez votre profil", desc: "Décrivez votre maison et vos envies." },
              { step: "02", Icon: ClipboardList, title: "Questionnaire", desc: "8 questions, 3 minutes." },
              { step: "03", Icon: Sparkles, title: "Matchs IA", desc: "Score sur 8 dimensions." },
              { step: "04", Icon: Handshake, title: "Échangez", desc: "Contrat + assurance inclus." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center bg-white rounded-2xl p-5 border border-warm-100">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center">
                  <item.Icon className="text-terracotta" size={20} />
                </div>
                <p className="font-sans text-[0.6rem] tracking-[0.2em] uppercase text-terracotta mb-1">{item.step}</p>
                <h3 className="font-serif text-sm font-bold text-warm-800 mb-1">{item.title}</h3>
                <p className="font-sans text-warm-500 text-xs">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* 8 Dimensions */}
          <h2 className="font-serif text-2xl font-bold text-warm-900 mb-8">Les 8 dimensions de compatibilité</h2>
          <div className="space-y-4 mb-16">
            {dimensions.map((dim, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex gap-4 items-start p-5 rounded-2xl border border-warm-100 bg-white">
                <div className="w-11 h-11 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center flex-shrink-0">
                  <dim.Icon className="text-terracotta" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-sans text-sm font-semibold text-warm-800">{dim.label}</h3>
                    <span className="font-sans text-xs text-terracotta font-bold">{dim.pct}%</span>
                  </div>
                  <p className="font-sans text-warm-500 text-xs leading-relaxed mb-2">{dim.desc}</p>
                  <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-terracotta rounded-full" initial={{ width: 0 }} whileInView={{ width: `${dim.pct * 5}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06 + 0.3, duration: 0.6 }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center bg-white rounded-3xl p-8 md:p-12 border border-warm-100 shadow-soft">
            <h3 className="font-serif text-2xl font-bold text-warm-900 mb-3">Prêt à trouver votre match ?</h3>
            <p className="font-sans text-warm-500 text-sm mb-6">Rejoignez Hestia et découvrez vos premiers matchs en 3 minutes.</p>
            <button onClick={onOpenWaitlist} className="bg-terracotta text-white font-sans font-semibold text-base px-8 py-4 rounded-2xl hover:bg-terracotta-dark hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              Demander une invitation
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ── APP ROOT ─────────────────────────────────────────────────
export default function HestiaApp() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmationBanner, setConfirmationBanner] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes("type=signup") || hash.includes("type=magiclink"))) {
      supabase.auth.getSession().then(() => {
        setConfirmationBanner(true);
        setScreen("auth");
        window.history.replaceState(null, "", window.location.pathname);
      });
    }
    if (window.location.pathname === "/success") {
      setScreen("dashboard");
      showToast("Bienvenue dans Hestia Member 🎉");
      window.history.replaceState(null, "", "/");
    }
  }, [showToast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUser({ name: meta?.name || "Vous", email: session.user.email });
        if (confirmationBanner) {
          setScreen("auth");
        } else {
          setScreen((prev) => (prev === "landing" || prev === "auth") ? "onboarding" : prev);
        }
      } else {
        setUser(null);
        if (!confirmationBanner) setScreen("landing");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [confirmationBanner]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAnswers({});
    setIsPremium(false);
    setScreen("landing");
  };

  const handleNavigate = (page) => {
    setScreen(page);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-light flex items-center justify-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif text-xl tracking-widest text-warm-800 italic animate-pulse">HESTIA</motion.span>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onOpenAuth={() => setScreen("auth")} onOpenWaitlist={() => setWaitlistOpen(true)} onNavigate={handleNavigate} />
          </motion.div>
        )}
        {screen === "assurance" && (
          <motion.div key="assurance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AssurancePage onBack={() => handleNavigate("landing")} onOpenWaitlist={() => setWaitlistOpen(true)} />
          </motion.div>
        )}
        {screen === "comment-ca-marche" && (
          <motion.div key="ccm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CommentCaMarchePage onBack={() => handleNavigate("landing")} onOpenWaitlist={() => setWaitlistOpen(true)} />
          </motion.div>
        )}
        {screen === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthPage onAuth={() => {}} confirmationBanner={confirmationBanner} showToast={showToast} />
          </motion.div>
        )}
        {screen === "onboarding" && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Questionnaire onComplete={(ans) => { setAnswers(ans); setScreen("dashboard"); }} />
          </motion.div>
        )}
        {screen === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard user={user || { name: "Vous", email: "" }} answers={answers} isPremium={isPremium} onUpgrade={() => {}} onLogout={handleLogout} showToast={showToast} />
          </motion.div>
        )}
      </AnimatePresence>

      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}
