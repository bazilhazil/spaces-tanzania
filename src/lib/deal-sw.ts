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
  "Value (TZS)": "Thamani (TZS)", "Mark completed (admin override)": "Weka imekamilika (admin)", "Mark completed": "Weka imekamilika",
};

export function dx(en: string): string {
  if (typeof document === "undefined" || document.documentElement.lang !== "sw") return en;
  return SW[en] ?? en;
}
