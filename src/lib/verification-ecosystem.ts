// SPACES Verification Ecosystem — FEATURE-015
// Frontend-only mock layer extending trust-engine.ts. Designed so backend swap
// (Supabase tables + AI-assisted review) can happen without changing consumers.

export type EntityType = "owner" | "agent" | "property" | "agency";

export const ENTITY_META: Record<EntityType, { label: string; short: string }> = {
  owner:    { label: "Property Owner",   short: "Owner"    },
  agent:    { label: "Real Estate Agent", short: "Agent"   },
  property: { label: "Property Listing",  short: "Property" },
  agency:   { label: "Agency",            short: "Agency"  },
};

export type EcoStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired"
  | "suspended";

export const ECO_STATUS_META: Record<EcoStatus, {
  label: string;
  tone: "muted" | "warning" | "success" | "danger" | "brand";
  description: string;
}> = {
  pending:      { label: "Pending",       tone: "muted",   description: "Awaiting document submission." },
  under_review: { label: "Under Review",  tone: "warning", description: "Trust team is reviewing." },
  verified:     { label: "Verified",      tone: "success", description: "All checks passed." },
  rejected:     { label: "Rejected",      tone: "danger",  description: "Verification denied. See reviewer notes." },
  expired:      { label: "Expired",       tone: "muted",   description: "Verification lapsed — please renew." },
  suspended:    { label: "Suspended",     tone: "danger",  description: "Temporarily paused by admin." },
};

// ---- Document requirements per entity ----------------------------

export type DocRequirement = { key: string; label: string; required: boolean; hint?: string };

export const OWNER_DOCS: DocRequirement[] = [
  { key: "gov_id",   label: "Government ID",       required: true,  hint: "NIDA / Passport / Voter ID." },
  { key: "selfie",   label: "Selfie Verification", required: true,  hint: "Live selfie holding your ID." },
  { key: "phone",    label: "Phone Verification",  required: true,  hint: "OTP to your registered number." },
  { key: "email",    label: "Email Verification",  required: true,  hint: "Confirm your email address." },
  { key: "tin",      label: "TIN Certificate",     required: false, hint: "Optional — improves Trust Score." },
  { key: "biz_lic",  label: "Business License",    required: false, hint: "Optional — for landlords operating as a business." },
];

export const AGENT_ECO_DOCS: DocRequirement[] = [
  { key: "license",     label: "Real Estate License", required: true },
  { key: "agency",      label: "Agency Affiliation",  required: true,  hint: "Name of agency or independent." },
  { key: "phone",       label: "Phone Verification",  required: true },
  { key: "email",       label: "Email Verification",  required: true },
  { key: "office_addr", label: "Office Address",      required: true },
  { key: "experience",  label: "Years of Experience", required: true },
  { key: "website",     label: "Website",             required: false },
];

export const PROPERTY_ECO_DOCS: DocRequirement[] = [
  { key: "ownership",   label: "Ownership Proof",     required: true,  hint: "Title deed / lease / POA." },
  { key: "gps",         label: "GPS Location",        required: true,  hint: "Pin exact coordinates on the map." },
  { key: "photos",      label: "Property Photos",     required: true,  hint: "Minimum 6 clear photos." },
  { key: "video",       label: "Video Walkthrough",   required: false },
  { key: "utilities",   label: "Utilities Info",      required: true,  hint: "Water, power, internet availability." },
  { key: "dup_check",   label: "Duplicate Detection", required: true,  hint: "Automated — must pass." },
  { key: "landmark",    label: "Nearby Landmark",     required: true },
];

export const AGENCY_ECO_DOCS: DocRequirement[] = [
  { key: "registration", label: "Registration Documents", required: true,  hint: "BRELA certificate." },
  { key: "office",       label: "Office Verification",     required: true,  hint: "Photo + address of registered office." },
  { key: "biz_license",  label: "Business License",         required: true },
  { key: "contacts",     label: "Company Contacts",         required: true },
  { key: "logo",         label: "Company Logo",             required: true },
  { key: "website",      label: "Website",                  required: true },
];

export const DOCS_BY_ENTITY: Record<EntityType, DocRequirement[]> = {
  owner:    OWNER_DOCS,
  agent:    AGENT_ECO_DOCS,
  property: PROPERTY_ECO_DOCS,
  agency:   AGENCY_ECO_DOCS,
};

// ---- Timeline & audit -------------------------------------------

export type TimelineAction =
  | "submitted"
  | "documents_received"
  | "under_review"
  | "approved"
  | "rejected"
  | "requested_more"
  | "suspended"
  | "revoked"
  | "expired"
  | "renewed";

export const TIMELINE_ACTION_META: Record<TimelineAction, { label: string; tone: "muted" | "brand" | "success" | "warning" | "danger" }> = {
  submitted:          { label: "Submitted",              tone: "brand"   },
  documents_received: { label: "Documents Received",      tone: "brand"   },
  under_review:       { label: "Under Review",            tone: "warning" },
  approved:           { label: "Approved",                tone: "success" },
  rejected:           { label: "Rejected",                tone: "danger"  },
  requested_more:     { label: "Requested More Documents", tone: "warning" },
  suspended:          { label: "Suspended",               tone: "danger"  },
  revoked:            { label: "Revoked",                 tone: "danger"  },
  expired:            { label: "Expired",                 tone: "muted"   },
  renewed:            { label: "Renewed",                 tone: "success" },
};

export type AuditEntry = {
  id: string;
  action: TimelineAction;
  reviewer: string;
  when: string;
  previousStatus?: EcoStatus;
  newStatus?: EcoStatus;
  reason?: string;
};

// ---- Verification case ------------------------------------------

export type VerificationCase = {
  id: string;
  entityType: EntityType;
  subjectName: string;         // e.g. "Villa Masaki" or "Amina Juma"
  subjectHandle?: string;
  submittedBy: string;
  submittedAt: string;
  status: EcoStatus;
  expiresAt?: string;
  reviewer?: string;
  reviewerNotes?: string;
  documents: { key: string; name: string; uploaded: boolean; verified: boolean; size?: string }[];
  timeline: AuditEntry[];
  // Placeholders for future AI-assisted review
  aiRiskScore?: number;      // 0..100
  aiFlags?: string[];
};

// ---- Trust score --------------------------------------------------

export type TrustFactorKey =
  | "verification" | "response_speed" | "listing_quality"
  | "transactions" | "profile_completeness" | "ratings" | "reports";

export const TRUST_FACTOR_META: Record<TrustFactorKey, { label: string; max: number }> = {
  verification:         { label: "Verification",         max: 25 },
  response_speed:       { label: "Response Speed",       max: 15 },
  listing_quality:      { label: "Listing Quality",      max: 15 },
  transactions:         { label: "Successful Transactions", max: 15 },
  profile_completeness: { label: "Profile Completeness", max: 10 },
  ratings:              { label: "Customer Ratings",     max: 15 },
  reports:              { label: "Reports (deducted)",   max: 5  },
};

export type EcoTrustScore = { total: number; band: "green" | "yellow" | "red"; factors: Record<TrustFactorKey, number> };

export function computeEcoTrust(factors: Record<TrustFactorKey, number>): EcoTrustScore {
  const total = Math.max(0, Math.min(100, Math.round(Object.values(factors).reduce((a, b) => a + b, 0))));
  const band: EcoTrustScore["band"] = total >= 75 ? "green" : total >= 50 ? "yellow" : "red";
  return { total, band, factors };
}

export const TRUST_BAND_CLS: Record<EcoTrustScore["band"], string> = {
  green:  "bg-[color:var(--color-success-50)] text-[color:var(--color-success-700)] ring-[color:var(--color-success-200)]",
  yellow: "bg-[color:var(--color-warning-50)] text-[color:var(--color-warning-800)] ring-[color:var(--color-warning-200)]",
  red:    "bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)] ring-[color:var(--color-danger-200)]",
};

// ---- Notifications -----------------------------------------------

export type NotificationEvent =
  | "documents_submitted"
  | "approved"
  | "rejected"
  | "need_more_docs"
  | "expiring_soon";

export const NOTIFICATION_META: Record<NotificationEvent, { title: string; body: string }> = {
  documents_submitted: { title: "Documents received",   body: "We got your submission and will review shortly." },
  approved:            { title: "Verification approved", body: "Your badge is now live across SPACES." },
  rejected:            { title: "Verification rejected", body: "See reviewer notes for next steps." },
  need_more_docs:      { title: "Additional documents needed", body: "Please upload the requested items." },
  expiring_soon:       { title: "Verification expiring", body: "Renew within 30 days to keep your badge." },
};

// ---- Mock data ---------------------------------------------------

export const MOCK_VERIFICATION_CASES: VerificationCase[] = [
  {
    id: "vc-1001",
    entityType: "owner",
    subjectName: "Amina Juma",
    subjectHandle: "@amina.juma",
    submittedBy: "@amina.juma",
    submittedAt: "2 days ago",
    status: "under_review",
    reviewer: "Moderator Nia",
    documents: [
      { key: "gov_id", name: "NIDA — front.jpg",   uploaded: true, verified: true,  size: "1.2 MB" },
      { key: "gov_id", name: "NIDA — back.jpg",    uploaded: true, verified: true,  size: "1.1 MB" },
      { key: "selfie", name: "Selfie with ID.jpg", uploaded: true, verified: false, size: "820 KB" },
      { key: "phone",  name: "Phone OTP",          uploaded: true, verified: true },
      { key: "email",  name: "Email confirmation", uploaded: true, verified: true },
    ],
    aiRiskScore: 12,
    aiFlags: [],
    timeline: [
      { id: "t1", action: "submitted",          reviewer: "@amina.juma",   when: "2 days ago", newStatus: "pending" },
      { id: "t2", action: "documents_received", reviewer: "System",         when: "2 days ago", previousStatus: "pending", newStatus: "under_review" },
      { id: "t3", action: "under_review",       reviewer: "Moderator Nia",  when: "1 day ago",  previousStatus: "under_review", newStatus: "under_review" },
    ],
  },
  {
    id: "vc-1002",
    entityType: "property",
    subjectName: "Villa Masaki #4821",
    submittedBy: "@amina.juma",
    submittedAt: "5 hours ago",
    status: "under_review",
    reviewer: "Trust Team",
    documents: [
      { key: "ownership", name: "Title deed.pdf",   uploaded: true, verified: false, size: "3.4 MB" },
      { key: "gps",       name: "GPS pin",          uploaded: true, verified: true },
      { key: "photos",    name: "12 photos",        uploaded: true, verified: true },
      { key: "utilities", name: "Utilities form",   uploaded: true, verified: true },
      { key: "landmark",  name: "Landmark: Coco Beach", uploaded: true, verified: true },
      { key: "dup_check", name: "Duplicate scan",   uploaded: true, verified: true },
    ],
    aiRiskScore: 8,
    aiFlags: ["Photos brightness slightly low"],
    timeline: [
      { id: "t1", action: "submitted",          reviewer: "@amina.juma",  when: "5h ago",  newStatus: "pending" },
      { id: "t2", action: "documents_received", reviewer: "System",        when: "5h ago",  previousStatus: "pending", newStatus: "under_review" },
    ],
  },
  {
    id: "vc-1003",
    entityType: "agent",
    subjectName: "Neema Kileo",
    subjectHandle: "@neema-kileo",
    submittedBy: "@neema-kileo",
    submittedAt: "12 days ago",
    status: "verified",
    reviewer: "Super Admin",
    expiresAt: "March 2027",
    documents: [
      { key: "license",     name: "Real estate license.pdf", uploaded: true, verified: true, size: "2.1 MB" },
      { key: "agency",      name: "Atrio Properties",         uploaded: true, verified: true },
      { key: "phone",       name: "Phone OTP",                uploaded: true, verified: true },
      { key: "email",       name: "Email confirmation",       uploaded: true, verified: true },
      { key: "office_addr", name: "Masaki, Dar es Salaam",    uploaded: true, verified: true },
      { key: "experience",  name: "7 years",                  uploaded: true, verified: true },
    ],
    aiRiskScore: 3,
    timeline: [
      { id: "t1", action: "submitted",          reviewer: "@neema-kileo",  when: "14 days ago", newStatus: "pending" },
      { id: "t2", action: "documents_received", reviewer: "System",         when: "14 days ago", previousStatus: "pending", newStatus: "under_review" },
      { id: "t3", action: "under_review",       reviewer: "Super Admin",    when: "13 days ago" },
      { id: "t4", action: "approved",           reviewer: "Super Admin",    when: "12 days ago", previousStatus: "under_review", newStatus: "verified", reason: "All documents verified." },
    ],
  },
  {
    id: "vc-1004",
    entityType: "agency",
    subjectName: "Atrio Properties Ltd",
    submittedBy: "@atrio-properties",
    submittedAt: "yesterday",
    status: "pending",
    documents: [
      { key: "registration", name: "BRELA cert.pdf",     uploaded: true, verified: false, size: "1.8 MB" },
      { key: "office",       name: "Office photo.jpg",    uploaded: true, verified: false },
      { key: "biz_license",  name: "Business licence.pdf", uploaded: true, verified: false },
      { key: "contacts",     name: "Contacts",             uploaded: true, verified: false },
      { key: "logo",         name: "logo.png",             uploaded: true, verified: true },
      { key: "website",      name: "atrio.co.tz",          uploaded: true, verified: false },
    ],
    aiRiskScore: 22,
    aiFlags: ["Website WHOIS registered <30 days ago"],
    timeline: [
      { id: "t1", action: "submitted", reviewer: "@atrio-properties", when: "yesterday", newStatus: "pending" },
    ],
  },
  {
    id: "vc-1005",
    entityType: "property",
    subjectName: "Beach House #4720",
    submittedBy: "@peter.tz",
    submittedAt: "1 week ago",
    status: "rejected",
    reviewer: "Moderator Nia",
    reviewerNotes: "Duplicate of listing #4501. Please remove or provide unique proof of ownership.",
    documents: [
      { key: "ownership", name: "Deed.pdf",    uploaded: true, verified: false, size: "2.0 MB" },
      { key: "photos",    name: "6 photos",    uploaded: true, verified: true },
      { key: "dup_check", name: "Duplicate scan (FAILED)", uploaded: true, verified: false },
    ],
    aiRiskScore: 78,
    aiFlags: ["High photo similarity with listing #4501", "GPS within 3m of #4501"],
    timeline: [
      { id: "t1", action: "submitted",          reviewer: "@peter.tz",     when: "7d ago", newStatus: "pending" },
      { id: "t2", action: "documents_received", reviewer: "System",         when: "7d ago", previousStatus: "pending", newStatus: "under_review" },
      { id: "t3", action: "rejected",           reviewer: "Moderator Nia",  when: "5d ago", previousStatus: "under_review", newStatus: "rejected", reason: "Duplicate of #4501." },
    ],
  },
  {
    id: "vc-1006",
    entityType: "owner",
    subjectName: "Kelvin Mushi",
    subjectHandle: "@kelvin.mushi",
    submittedBy: "@kelvin.mushi",
    submittedAt: "6 months ago",
    status: "expired",
    reviewer: "Trust Team",
    expiresAt: "last week",
    documents: [],
    timeline: [
      { id: "t1", action: "approved", reviewer: "Trust Team", when: "6 months ago", newStatus: "verified" },
      { id: "t2", action: "expired",  reviewer: "System",     when: "last week",     previousStatus: "verified", newStatus: "expired" },
    ],
  },
];

// ---- Widgets: KPIs ----------------------------------------------

export function ecosystemKpis(cases: VerificationCase[]) {
  const pending = cases.filter((c) => c.status === "pending" || c.status === "under_review").length;
  const approvedToday = cases.filter((c) => c.status === "verified" && /hours?\s+ago|today/i.test(c.submittedAt)).length;
  const rejectedToday = cases.filter((c) => c.status === "rejected").length;
  const expiring = cases.filter((c) => c.status === "expired" || c.expiresAt === "last week").length;
  return { pending, approvedToday, rejectedToday, expiring, total: cases.length };
}
