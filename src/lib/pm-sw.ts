// Kiswahili for the property operations screens (Property Management, My Tenancy).
// Same pattern as deal-sw.ts: English is the key and the default.
const SW: Record<string, string> = {
  // structure
  Property: "Mali", Properties: "Mali", Building: "Jengo", Buildings: "Majengo", Unit: "Chumba/Kitengo", Units: "Vitengo",
  "Whole property": "Mali nzima", "No building": "Bila jengo", "Add building": "Ongeza jengo", "Building name": "Jina la jengo",
  Floors: "Ghorofa", Floor: "Ghorofa", Description: "Maelezo", "Size (m²)": "Ukubwa (m²)", Size: "Ukubwa",
  "No buildings yet": "Hakuna majengo bado", "Group units into buildings (e.g. Block A) — optional.": "Panga vitengo kwenye majengo (mf. Jengo A) — si lazima.",
  "Unit name or number": "Jina au namba ya kitengo", "Unit type": "Aina ya kitengo", Bedrooms: "Vyumba vya kulala", Bathrooms: "Bafu",
  "Rent per month (TZS)": "Kodi kwa mwezi (TZS)", "Deposit (TZS)": "Amana (TZS)", "Service charge (TZS)": "Ada ya huduma (TZS)",
  Status: "Hali", Availability: "Upatikanaji", Occupancy: "Hali ya ukaaji", "View / edit unit": "Tazama / hariri kitengo",
  Vacant: "Wazi", Occupied: "Kinakaliwa", Reserved: "Kimehifadhiwa", Maintenance: "Matengenezo", "Notice given": "Notisi imetolewa",
  Ready: "Tayari", Available: "Kinapatikana", Apartment: "Apatimenti", House: "Nyumba", Room: "Chumba", Office: "Ofisi", Shop: "Duka",
  Warehouse: "Ghala", Other: "Nyingine", Tenant: "Mpangaji", Tenants: "Wapangaji", None: "Hakuna", bed: "vyumba", bath: "bafu", month: "mwezi",
  // dashboard
  "Total properties": "Jumla ya mali", "Total buildings": "Jumla ya majengo", "Total units": "Jumla ya vitengo",
  "Occupied units": "Vitengo vinavyokaliwa", "Vacant units": "Vitengo vilivyo wazi", "Reserved units": "Vitengo vilivyohifadhiwa",
  "Rent due": "Kodi inayodaiwa", "Rent collected": "Kodi iliyokusanywa", "Outstanding rent": "Kodi iliyobaki", Outstanding: "Iliyobaki",
  "Open maintenance": "Matengenezo yaliyo wazi", "Monthly expenses": "Matumizi ya mwezi", "Active deals": "Mikataba hai",
  "Next actions": "Hatua zinazofuata", "Collect overdue rent": "Kusanya kodi iliyochelewa", "Assign maintenance": "Panga matengenezo",
  "Fill vacant units": "Jaza vitengo vilivyo wazi", "Add your first unit": "Ongeza kitengo chako cha kwanza", "Review deals": "Kagua mikataba",
  "Nothing urgent — everything is up to date.": "Hakuna jambo la dharura — kila kitu kiko sawa.",
  // tabs
  Leases: "Mikataba ya pango", Rent: "Kodi", Contractors: "Mafundi", Documents: "Nyaraka", Reports: "Ripoti", Expenses: "Matumizi",
  Deals: "Mikataba",
  // tenants
  "Add tenant": "Ongeza mpangaji", "Full name": "Jina kamili", Phone: "Simu", Email: "Barua pepe", "Emergency contact": "Mtu wa dharura",
  "Emergency phone": "Simu ya dharura", "View details": "Tazama maelezo", "Linked SPACES account": "Akaunti ya SPACES iliyounganishwa",
  Notes: "Kumbukumbu", Lease: "Mkataba wa pango", "Tenancy status": "Hali ya upangaji", Active: "Hai", Notice: "Notisi", Past: "Zamani",
  "No tenants yet": "Hakuna wapangaji bado", "Add your first tenant to start tracking rent, leases and maintenance.": "Ongeza mpangaji wako wa kwanza kuanza kufuatilia kodi, mikataba na matengenezo.",
  "Lease start": "Mwanzo wa mkataba", "Lease end": "Mwisho wa mkataba", "Monthly rent": "Kodi ya mwezi", Deposit: "Amana", "Payment status": "Hali ya malipo",
  // leases
  "Create lease": "Tengeneza mkataba", "Start date": "Tarehe ya kuanza", "End date": "Tarehe ya kuisha", "Monthly rent (TZS)": "Kodi ya mwezi (TZS)",
  "Payment frequency": "Mara za malipo", Monthly: "Kila mwezi", Quarterly: "Kila robo mwaka", Biannual: "Kila nusu mwaka", Annual: "Kila mwaka",
  "Late fee": "Faini ya kuchelewa", "Late fee value": "Kiasi cha faini", "Grace days": "Siku za neema", "Special terms": "Masharti maalum",
  Draft: "Rasimu", Expiring: "Unakaribia kuisha", Expired: "Umeisha", Terminated: "Umesitishwa", Renewed: "Umehuishwa",
  "No leases yet": "Hakuna mikataba ya pango bado", "open ended": "bila mwisho", "Open ended": "Bila mwisho",
  // rent
  "Rent schedule": "Ratiba ya kodi", "This month": "Mwezi huu", "Previous months": "Miezi iliyopita", "Due date": "Tarehe ya kulipa",
  "Amount paid": "Kiasi kilicholipwa", Paid: "Imelipwa", Partial: "Sehemu", Due: "Inadaiwa", Overdue: "Imechelewa", Unpaid: "Inadaiwa",
  "Add rent charge": "Ongeza deni la kodi", "Add charge": "Ongeza deni", "Record payment": "Rekodi malipo", "Record a payment": "Rekodi malipo",
  "Amount (TZS)": "Kiasi (TZS)", Method: "Njia", Reference: "Kumbukumbu ya malipo", "Mobile money": "Pesa kwa simu", "Bank transfer": "Uhamisho wa benki",
  Cash: "Taslimu", "Amount due (TZS)": "Kiasi kinachodaiwa (TZS)", "Rent charge": "Deni la kodi", "No rent records yet": "Hakuna kumbukumbu za kodi bado",
  "Payments awaiting verification": "Malipo yanayosubiri uthibitisho", Approve: "Idhinisha", Reject: "Kataa",
  "Online rent payment will be available after the payment provider is connected. Record Mobile Money, bank or cash payments manually for now.":
    "Malipo ya kodi mtandaoni yatapatikana baada ya kuunganisha mtoa huduma wa malipo. Kwa sasa rekodi malipo ya simu, benki au taslimu kwa mkono.",
  // maintenance
  "New maintenance request": "Ombi jipya la matengenezo", "Create request": "Tuma ombi", "Report maintenance": "Ripoti tatizo la matengenezo",
  Issue: "Tatizo", Category: "Aina", Priority: "Kipaumbele", Low: "Chini", Normal: "Kawaida", High: "Juu", Urgent: "Dharura",
  Plumbing: "Mabomba", Electrical: "Umeme", Structural: "Muundo", Appliance: "Vifaa", Security: "Ulinzi", Cleaning: "Usafi",
  Reported: "Imeripotiwa", New: "Imeripotiwa", Assigned: "Imepangiwa", "In progress": "Inaendelea", Completed: "Imekamilika",
  Cancelled: "Imesitishwa", Closed: "Imefungwa", Rejected: "Imekataliwa", Reviewing: "Inakaguliwa", Approved: "Imeidhinishwa",
  Contractor: "Fundi", "Assigned to": "Amepangiwa", "Not assigned": "Hajapangiwa", "Not tenant related": "Haihusu mpangaji",
  "Costs and notes": "Gharama na kumbukumbu", "Estimated cost (TZS)": "Gharama inayokadiriwa (TZS)", "Approved cost (TZS)": "Gharama iliyoidhinishwa (TZS)",
  "Actual cost (TZS)": "Gharama halisi (TZS)", Estimated: "Makadirio", Actual: "Halisi", Opened: "Ilifunguliwa", Photos: "Picha",
  "No maintenance requests": "Hakuna maombi ya matengenezo", "Requests raised by you or by a tenant appear here.": "Maombi yako au ya mpangaji yataonekana hapa.",
  // contractors
  "Add contractor": "Ongeza fundi", Name: "Jina", Company: "Kampuni", Service: "Huduma", Location: "Eneo", "No contractors yet": "Hakuna mafundi bado",
  // expenses
  "Add expense": "Ongeza matumizi", Supplier: "Msambazaji", Amount: "Kiasi", Date: "Tarehe", Receipt: "Stakabadhi",
  Utilities: "Huduma (maji/umeme)", Management: "Usimamizi", Repairs: "Marekebisho", Taxes: "Kodi za serikali",
  "Total income": "Jumla ya mapato", "Total expenses": "Jumla ya matumizi", "Net property cash flow": "Mtiririko halisi wa fedha",
  "No expenses yet": "Hakuna matumizi bado", "Record costs such as repairs, security or utilities to see your net cash flow.":
    "Rekodi gharama kama marekebisho, ulinzi au huduma ili kuona mtiririko wako wa fedha.",
  // documents
  "Upload document": "Pakia hati", Upload: "Pakia", "Document type": "Aina ya hati", "Not linked to a lease": "Haijaunganishwa na mkataba",
  Identification: "Kitambulisho", "Title document": "Hati ya umiliki", "Tenant document": "Hati ya mpangaji", "Proof of payment": "Uthibitisho wa malipo",
  File: "Faili",
  // generic
  Save: "Hifadhi", Cancel: "Ghairi", "Saving…": "Inahifadhi…", Select: "Chagua", Saved: "Imehifadhiwa", "Could not save": "Imeshindikana kuhifadhi",
  "Could not update": "Imeshindikana kusasisha", Updated: "Imesasishwa", Collection: "Ukusanyaji", "Property overview": "Muhtasari wa mali",
  "Open jobs": "Kazi zilizo wazi", Expected: "Inayotarajiwa", Collected: "Iliyokusanywa", "Occupancy rate": "Kiwango cha ukaaji",
  "My property": "Mali yangu", Open: "Fungua", "No tenancy yet": "Bado huna upangaji",
  "When your landlord or property manager adds you as a tenant on Spaces, your home, rent and lease appear here.": "Mwenye nyumba au msimamizi akikuongeza kama mpangaji kwenye Spaces, nyumba, kodi na mkataba wako vitaonekana hapa.",
  "Rent charges added by your landlord appear here.": "Madeni ya kodi yaliyoongezwa na mwenye nyumba yataonekana hapa.",
  "Previous payments": "Malipo yaliyopita", "No lease recorded": "Hakuna mkataba uliorekodiwa",
  "Your landlord has not added a lease for your tenancy yet.": "Mwenye nyumba bado hajaongeza mkataba wa upangaji wako.",
  "Report a problem and your landlord or manager will see it here.": "Ripoti tatizo na mwenye nyumba au msimamizi ataliona hapa.",
  "No documents yet": "Hakuna nyaraka bado", "Documents your landlord shares with you appear here.": "Nyaraka anazokushirikisha mwenye nyumba zitaonekana hapa.",
  "Upload proof of payment": "Pakia uthibitisho wa malipo", "Send for verification": "Tuma kwa uthibitisho", "Send request": "Tuma ombi",
  "Request sent": "Ombi limetumwa", "What is the problem?": "Tatizo ni nini?", "Photo or video (optional)": "Picha au video (si lazima)",
  "Amount paid (TZS)": "Kiasi kilicholipwa (TZS)", "Payment method": "Njia ya malipo", "Proof (photo or PDF)": "Uthibitisho (picha au PDF)",
  "Your landlord or manager checks it and confirms. Nothing is confirmed automatically.": "Mwenye nyumba au msimamizi ataikagua na kuthibitisha. Hakuna kinachothibitishwa kiotomatiki.", "My unit": "Kitengo changu", "Rent paid": "Kodi iliyolipwa",
};

export function px(en: string): string {
  if (typeof document === "undefined") return en;
  let lang = document.documentElement.lang;
  try { lang = localStorage.getItem("spaces.lang") || lang; } catch { /* storage blocked */ }
  if (lang !== "sw") return en;
  return SW[en] ?? en;
}
