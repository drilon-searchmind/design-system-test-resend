/** @typedef {{ emoji: string; keywords: string }} KbEmojiOption */

/** @type {KbEmojiOption[]} */
export const KB_EMOJI_OPTIONS = [
  { emoji: "📋", keywords: "clipboard liste todo clickup opgave" },
  { emoji: "🚀", keywords: "rocket onboarding start launch" },
  { emoji: "📘", keywords: "book essentials politik vilkår" },
  { emoji: "🛠", keywords: "tools praktisk værktøj" },
  { emoji: "🎯", keywords: "target procedure mål sop" },
  { emoji: "💻", keywords: "computer tech ai kode" },
  { emoji: "💡", keywords: "idea vidensdeling workshop learning" },
  { emoji: "📗", keywords: "book ledelse leadership håndbog" },
  { emoji: "🤝", keywords: "handshake kommercielt partner referral" },
  { emoji: "🎨", keywords: "art produktion creative content design" },
  { emoji: "📄", keywords: "document side artikel wiki" },
  { emoji: "📁", keywords: "folder mappe arkiv" },
  { emoji: "📌", keywords: "pin vigtig fastgjort" },
  { emoji: "⭐", keywords: "star featured fremhævet favorit" },
  { emoji: "✅", keywords: "check done færdig godkendt" },
  { emoji: "❌", keywords: "cross nej afvist stop" },
  { emoji: "⚠️", keywords: "warning advarsel vigtigt" },
  { emoji: "🔒", keywords: "lock sikkerhed privat" },
  { emoji: "🔑", keywords: "key adgang password uniqkey" },
  { emoji: "🔗", keywords: "link reference url" },
  { emoji: "📊", keywords: "chart data rapport statistik" },
  { emoji: "📈", keywords: "growth stigning performance" },
  { emoji: "📉", keywords: "decline fald" },
  { emoji: "💰", keywords: "money budget økonomi pris" },
  { emoji: "🏢", keywords: "office firma kunde lokaler" },
  { emoji: "👥", keywords: "team medarbejdere people" },
  { emoji: "👤", keywords: "user person profil" },
  { emoji: "🧑‍💼", keywords: "business leder manager" },
  { emoji: "📞", keywords: "phone kontakt opkald" },
  { emoji: "✉️", keywords: "email mail besked" },
  { emoji: "📅", keywords: "calendar dato deadline plan" },
  { emoji: "⏰", keywords: "clock tid deadline" },
  { emoji: "🔔", keywords: "notification påmindelse alert" },
  { emoji: "📝", keywords: "note skriv dokumentation" },
  { emoji: "✏️", keywords: "edit rediger skriv" },
  { emoji: "🔍", keywords: "search søg find" },
  { emoji: "🧭", keywords: "compass guide navigation" },
  { emoji: "🗺️", keywords: "map oversigt struktur" },
  { emoji: "🧩", keywords: "puzzle integration proces" },
  { emoji: "⚙️", keywords: "settings indstillinger config" },
  { emoji: "🔧", keywords: "wrench fix vedligehold" },
  { emoji: "🧪", keywords: "test eksperiment" },
  { emoji: "🤖", keywords: "robot ai automation" },
  { emoji: "🧠", keywords: "brain viden læring" },
  { emoji: "📚", keywords: "books bibliotek læsning" },
  { emoji: "🎓", keywords: "graduation uddannelse træning" },
  { emoji: "🏆", keywords: "trophy succes resultat" },
  { emoji: "🎉", keywords: "celebration fest milestone" },
  { emoji: "☕", keywords: "coffee pause kultur" },
  { emoji: "🌱", keywords: "growth onboarding start" },
  { emoji: "🔥", keywords: "fire vigtigt hot prioritet" },
  { emoji: "💬", keywords: "chat feedback kommentar" },
  { emoji: "📣", keywords: "megaphone announcement besked" },
  { emoji: "🛡️", keywords: "shield sikkerhed compliance" },
  { emoji: "📦", keywords: "package leverance produkt" },
  { emoji: "🧾", keywords: "receipt faktura økonomi" },
  { emoji: "🖼️", keywords: "image billede creative" },
  { emoji: "🎬", keywords: "video film produktion" },
  { emoji: "📸", keywords: "camera foto" },
  { emoji: "🌐", keywords: "web global website" },
  { emoji: "🇩🇰", keywords: "denmark danmark flag" },
];

/**
 * @param {string} query
 */
export function filterKbEmojiOptions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return KB_EMOJI_OPTIONS;
  return KB_EMOJI_OPTIONS.filter(
    (opt) => opt.emoji.includes(q) || opt.keywords.toLowerCase().includes(q),
  );
}
