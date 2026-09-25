// Kiswahili for the deals pipeline and admin deals monitor.
// The language comes from <html lang>, which the i18n provider keeps in sync.
const SW: Record<string, string> = {
  // stages / health / reasons
  Inquiry: "Ulizo", Contacted: "Amewasiliana", Viewing: "Kutembelea", Viewed: "Ametembelea",
  Offer: "Ofa", Negotiating: "Majadiliano", Agreement: "Makubaliano", "Agreement signed": "Makubaliano yamesainiwa",
  Verification: "Uhakiki", Payment: "Malipo", Completed: "Imekamilika", Cancelled: "Imesitishwa",
  Healthy: "Inaendelea vizuri", Waiting: "Inasubiri", "At Risk": "Iko hatarini", Closed: "Imefungwa",
  Price: "Bei", Location: "Eneo", "Customer changed mind": "Mteja amebadili nia", "Property unavailable": "Mali haipatikani",
  "Chose another property": "Amechagua mali nyingine", "No response": "Hakuna jibu", Other: "Nyingine",
  // ui
  Active: "Hai", "Add an internal note…": "Ongeza kumbukumbu ya ndani…", "Add note": "Ongeza kumbukumbu", All: "Zote",
  "All priorities": "Vipaumbele vyote", "All regions": "Mikoa yote", "All stages": "Hatua zote", "Apply filters": "Tumia vichujio",
  "Assign me as agent": "Nipe kama dalali", "Avg. close time": "Wastani wa muda wa kufunga", Buyer: "Mnunuzi",
  "Cancel deal": "Sitisha mkataba", "Cancel this deal?": "Usitishe mkataba huu?", Clear: "Futa", "Clear Filters": "Futa vichujio",
  "Closing this week": "Inafungwa wiki hii",
  "Collected revenue counts only confirmed real payments. Estimated fees and test payments are never counted as earned.":
    "Mapato yaliyokusanywa yanahesabu malipo halisi yaliyothibitishwa tu. Ada zinazokadiriwa na malipo ya majaribio hayahesabiwi.",
  "Currently scheduled for": "Imepangwa kwa", Dalali: "Dalali", Deal: "Mkataba", "Deal cancelled": "Mkataba umesitishwa",
  "Deal completed": "Mkataba umekamilika", "Deal status": "Hali ya mkataba",
  "Deals appear here as soon as buyers inquire on your listings.": "Mikataba itaonekana hapa mara wanunuzi watakapouliza kuhusu mali zako.",
  Delete: "Futa", Deleted: "Imefutwa", "Document uploaded": "Hati imepakiwa", Drag: "Buruta", "Expected close": "Tarehe ya kufunga inayotarajiwa",
  "Export CSV": "Pakua CSV", Failed: "Imeshindikana", "Failed to load deals": "Imeshindikana kupakia mikataba",
  "Follow each buyer from first message to completion — simply.": "Fuatilia kila mnunuzi tangu ujumbe wa kwanza hadi kukamilika — kwa urahisi.",
  "Follow-up": "Ufuatiliaji", "Follow-up scheduled": "Ufuatiliaji umepangwa", From: "Kuanzia", Health: "Hali", High: "Juu",
  "Keep deal": "Endelea na mkataba", "Loading…": "Inapakia…", Low: "Chini", Medium: "Wastani", "More detail (optional)…": "Maelezo zaidi (si lazima)…",
  "Move failed": "Imeshindikana kuhamisha", "My Deals": "Mikataba Yangu", "No activity yet.": "Hakuna shughuli bado.", "No deals yet": "Hakuna mikataba bado",
  "No documents uploaded.": "Hakuna hati zilizopakiwa.", "No notes yet.": "Hakuna kumbukumbu bado.", "No payments yet": "Hakuna malipo bado",
  "Note added": "Kumbukumbu imeongezwa", Notes: "Kumbukumbu", "Offers & deal revenue": "Ofa na mapato ya mikataba", Open: "Fungua",
  Owner: "Mmiliki", "Owner / Agent": "Mmiliki / Dalali", Paid: "Imelipwa", Pending: "Inasubiri", Pipeline: "Mfululizo", "Pipeline value": "Thamani ya mikataba",
  Priority: "Kipaumbele", "Priority updated": "Kipaumbele kimesasishwa", "Property status": "Hali ya mali", "Property type": "Aina ya mali",
  Reason: "Sababu", Region: "Mkoa", "Related Lead": "Ulizo husika", Rent: "Kodi", Sale: "Mauzo", Schedule: "Panga",
  "Search buyer, property or reference…": "Tafuta mnunuzi, mali au namba ya kumbukumbu…", Stage: "Hatua", Summary: "Muhtasari",
  Timeline: "Mfuatano", To: "Hadi", Transaction: "Muamala", "Untitled property": "Mali isiyo na jina", "Update failed": "Imeshindikana kusasisha",
  "Upload failed": "Imeshindikana kupakia", Urgent: "Dharura", Value: "Thamani",
  "Stage (admin override)": "Hatua (ubadilishaji wa admin)", "Stage (updates automatically)": "Hatua (inajisasisha yenyewe)",
  Documents: "Hati", "Completed deals": "Mikataba iliyokamilika",
  "Commission tracking appears here once deals record an agreed commission.": "Ufuatiliaji wa kamisheni utaonekana hapa mikataba ikiwa na kamisheni iliyokubaliwa.",
  "Value (TZS)": "Thamani (TZS)", "Mark completed (admin override)": "Weka imekamilika (admin)", "Mark completed": "Weka imekamilika",
  // admin deals monitor
  "Active deals": "Mikataba hai", "Offers today": "Ofa za leo", Negotiations: "Majadiliano", Agreements: "Makubaliano",
  Payments: "Malipo", "Transaction value": "Thamani ya miamala", "Agent commissions": "Kamisheni za madalali",
  "Estimated revenue": "Mapato yanayokadiriwa", "Pending revenue": "Mapato yanayosubiriwa", "Collected revenue": "Mapato yaliyokusanywa",
  "Test payments (not revenue)": "Malipo ya majaribio (si mapato)", Ref: "Namba", Property: "Mali", "SPACES fee": "Ada ya SPACES",
  Commission: "Kamisheni", deals: "mikataba", Revenue: "Mapato", Subscriptions: "Usajili", "Data & Backup": "Data na Nakala Rudufu",
  // admin monetization
  "Monetization & Deals": "Mapato na Mikataba",
  "Set every price, limit, fee and tax here. Changes apply immediately and are logged.": "Weka kila bei, kikomo, ada na kodi hapa. Mabadiliko yanaanza mara moja na yanahifadhiwa kwenye kumbukumbu.",
  "Products & Plans": "Bidhaa na Vifurushi", Boosts: "Matangazo ya kuongeza", "Transaction Fees": "Ada za miamala", "Rental Fees": "Ada za upangishaji",
  "Commission Rules": "Kanuni za kamisheni", "Taxes & Discounts": "Kodi na Punguzo", "Payment Methods": "Njia za malipo", "Change Log": "Kumbukumbu za mabadiliko",
  Hidden: "Imefichwa", Off: "Imezimwa", Name: "Jina", Description: "Maelezo", "Price / month (TZS)": "Bei / mwezi (TZS)", "Price / year (TZS)": "Bei / mwaka (TZS)",
  "Listing limit (blank = unlimited)": "Kikomo cha matangazo (acha wazi = bila kikomo)", "Unit limit": "Kikomo cha vyumba/vitengo", "Team members": "Wanatimu",
  Billing: "Malipo ya kifurushi", Monthly: "Kila mwezi", Annual: "Kila mwaka", "One-time": "Mara moja", Free: "Bure", "Tax %": "Kodi %",
  "Effective from": "Inaanza tarehe", "For roles": "Kwa majukumu", "Save plan": "Hifadhi kifurushi", "Price (TZS)": "Bei (TZS)", "Duration (days)": "Muda (siku)",
  Placement: "Mahali pa kuonekana", "Search results": "Matokeo ya utafutaji", Homepage: "Ukurasa wa mwanzo", Both: "Vyote viwili",
  "Priority score": "Alama ya kipaumbele", "Badge text": "Maandishi ya beji", "Save boost": "Hifadhi tangazo", "Add rule": "Ongeza kanuni",
  "No rules yet. Nothing is charged until you add one.": "Hakuna kanuni bado. Hakuna kinachotozwa hadi uongeze moja.",
  "Transaction type": "Aina ya muamala", Any: "Yoyote", Developer: "Mwendelezaji", "Paid by": "Analipa", "Percentage %": "Asilimia %",
  "Fixed amount (TZS)": "Kiasi maalum (TZS)", "Minimum (floor)": "Kiwango cha chini", "Maximum (cap)": "Kiwango cha juu",
  "Example on 100,000,000 TZS": "Mfano kwa TZS 100,000,000", fee: "ada", tax: "kodi", "Save rule": "Hifadhi kanuni", "Create rule": "Unda kanuni",
  "Saved and logged": "Imehifadhiwa na kurekodiwa", "Name is required": "Jina linahitajika", "Minimum cannot exceed maximum": "Kiwango cha chini hakiwezi kuzidi cha juu",
  "Duration must be at least 1 day": "Muda lazima uwe angalau siku 1", "This plan will be free. Activate anyway?": "Kifurushi hiki kitakuwa bure. Kiwashe hata hivyo?",
  "Online payments go live once the Selcom gateway credentials are connected. Until then, orders stay pending and are never marked paid automatically.":
    "Malipo ya mtandaoni yataanza baada ya kuunganisha Selcom. Hadi hapo, maagizo yanabaki yakisubiri na hayawekwi kama yamelipwa kiotomatiki.",
  Card: "Kadi", "Bank transfer": "Uhamisho wa benki", "Cash (manual)": "Taslimu (kwa mkono)",
  "No pricing changes yet.": "Hakuna mabadiliko ya bei bado.", Admin: "Admin", System: "Mfumo",
  UPDATE: "IMEBADILISHWA", INSERT: "IMEONGEZWA", DELETE: "IMEFUTWA",
  "billing plans": "vifurushi", "pricing rules": "kanuni za bei", "promotion products": "matangazo",
  owner: "mmiliki", agent: "dalali", "property manager": "msimamizi wa mali", developer: "mwendelezaji", buyer: "mnunuzi",
  seller: "muuzaji", tenant: "mpangaji", landlord: "mwenye nyumba", any: "yeyote",
  "transaction fee": "ada ya muamala", "service fee": "ada ya huduma", "rental fee": "ada ya upangishaji", commission: "kamisheni", discount: "punguzo",
  // admin menu
  Overview: "Muhtasari wa jumla", Operations: "Uendeshaji", Community: "Jamii", Growth: "Ukuaji",
  Dashboard: "Dashibodi", "Launch & Operations": "Uzinduzi na Uendeshaji", Analytics: "Takwimu", "Audit Logs": "Kumbukumbu za ukaguzi",
  Properties: "Mali", Inquiries: "Maulizo", Viewings: "Matembezi", Deals: "Mikataba", "Safety & Reports": "Usalama na Ripoti",
  Reviews: "Maoni", Support: "Msaada", Users: "Watumiaji", Agents: "Madalali",
  Subscriptions: "Usajili", Marketing: "Masoko", Notifications: "Arifa", "System Settings": "Mipangilio ya mfumo",
  "Data & Backup": "Data na Nakala", "Production Data": "Data halisi", "Super Admin": "Msimamizi Mkuu", Logout: "Toka",
  "Search users, spaces, inquiries…": "Tafuta watumiaji, mali, maulizo…", Status: "Hali",
};

export function dx(en: string): string {
  if (typeof document === "undefined") return en;
  let lang = document.documentElement.lang;
  try { lang = localStorage.getItem("spaces.lang") || lang; } catch { /* storage blocked */ }
  if (lang !== "sw") return en;
  return SW[en] ?? en;
}
