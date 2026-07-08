// SPACES Trust & Safety Engine
// Frontend-only mock layer. Swap types & queries to real backend when APIs are ready.

export type PropertyLifecycleStage =
  | "draft"
  | "pending_verification"
  | "needs_changes"
  | "approved"
  | "live"
  | "featured"
  | "reserved"
  | "rented"
  | "sold"
  | "archived";

export const PROPERTY_LIFECYCLE: {
  key: PropertyLifecycleStage;
  label: string;
  description: string;
  tone: "brand" | "gold" | "success" | "danger" | "muted" | "warning";
}[] = [
  { key: "draft",                label: "Draft",                description: "Owner is still preparing the listing.",           tone: "muted" },
  { key: "pending_verification", label: "Pending Verification", description: "Awaiting review from the SPACES trust team.",     tone: "warning" },
  { key: "needs_changes",        label: "Needs Changes",        description: "Owner action required before approval.",           tone: "danger" },
  { key: "approved",             label: "Approved",             description: "Passed all checks. Ready to publish.",             tone: "success" },
  { key: "live",                 label: "Live",                 description: "Publicly visible in search.",                      tone: "success" },
  { key: "featured",             label: "Featured",             description: "Promoted placement across SPACES.",                tone: "gold" },
  { key: "reserved",             label: "Reserved",             description: "Under negotiation with a buyer or tenant.",        tone: "brand" },
  { key: "rented",               label: "Rented",               description: "Successfully leased through SPACES.",              tone: "brand" },
  { key: "sold",                 label: "Sold",                 description: "Successfully sold through SPACES.",                tone: "brand" },
  { key: "archived",             label: "Archived",             description: "Removed from public listings.",                    tone: "muted" },
];

export type VerificationStatus = "not_started" | "pending" | "verified" | "rejected" | "resubmit";

export const VERIFICATION_STATUS_META: Record<
  VerificationStatus,
  { label: string; tone: "muted" | "warning" | "success" | "danger" }
> = {
  not_started: { label: "Not started",         tone: "muted" },
  pending:     { label: "Under review",         tone: "warning" },
  verified:    { label: "Verified",             tone: "success" },
  rejected:    { label: "Rejected",             tone: "danger" },
  resubmit:    { label: "Needs resubmission",   tone: "warning" },
};

export type VerificationKind = "identity" | "property" | "business" | "agent";

export type IdentityDocType = "national_id" | "passport" | "driving_licence" | "voter_id";

export const IDENTITY_DOCS: { key: IdentityDocType; label: string; hint: string; required: boolean }[] = [
  { key: "national_id",     label: "National ID (NIDA)",  hint: "Front and back, all corners visible.", required: true },
  { key: "passport",        label: "Passport",             hint: "Photo page in colour.",                 required: false },
  { key: "driving_licence", label: "Driving Licence",       hint: "Front side only.",                      required: false },
  { key: "voter_id",        label: "Voter ID",              hint: "Optional — improves your Trust Score.", required: false },
];

export type PropertyProofType =
  | "title_deed" | "power_of_attorney" | "lease_agreement" | "management_authorization";

export const PROPERTY_PROOFS: { key: PropertyProofType; label: string; description: string }[] = [
  { key: "title_deed",              label: "Proof of Ownership",             description: "Title deed or certificate of occupancy in your name." },
  { key: "power_of_attorney",       label: "Power of Attorney",              description: "Notarised POA from the registered owner." },
  { key: "lease_agreement",         label: "Lease Agreement",                 description: "Signed lease authorising you to sublet or list." },
  { key: "management_authorization", label: "Property Management Authorisation", description: "Owner-signed letter authorising you to manage this property." },
];

export type BusinessDocType = "certificate_of_incorporation" | "tin" | "business_licence" | "address" | "logo" | "website";
export const BUSINESS_DOCS: { key: BusinessDocType; label: string; hint: string; required: boolean }[] = [
  { key: "certificate_of_incorporation", label: "Certificate of Incorporation", hint: "BRELA-issued document.",   required: true },
  { key: "tin",                          label: "TIN Certificate",              hint: "Tax Identification Number.", required: true },
  { key: "business_licence",             label: "Business Licence",             hint: "Current trading licence.",   required: true },
  { key: "address",                      label: "Registered Address",           hint: "Physical office address.",   required: true },
  { key: "logo",                         label: "Company Logo",                 hint: "PNG or SVG, transparent background preferred.", required: false },
  { key: "website",                      label: "Website",                      hint: "Optional but recommended.",  required: false },
];

export type AgentDocType = "real_estate_license" | "business_registration" | "agency_name" | "years_experience" | "profile_photo";
export const AGENT_DOCS: { key: AgentDocType; label: string; hint: string; required: boolean }[] = [
  { key: "real_estate_license", label: "Real Estate License",   hint: "If issued in your jurisdiction.", required: false },
  { key: "business_registration", label: "Business Registration", hint: "BRELA or equivalent.",             required: true },
  { key: "agency_name",         label: "Agency Name",            hint: "Trading name shown on your profile.", required: true },
  { key: "years_experience",    label: "Years of Experience",    hint: "Approximate years in real estate.", required: true },
  { key: "profile_photo",       label: "Profile Photo",          hint: "Clear headshot on plain background.", required: true },
];

// ---- Trust Score --------------------------------------------------

export type TrustSignal = {
  key: string;
  label: string;
  weight: number;      // signed contribution to score
  tone: "success" | "danger" | "muted";
  detail?: string;
};

export type TrustScore = {
  score: number;         // 0..100
  tier: "new" | "rising" | "trusted" | "elite";
  signals: TrustSignal[];
};

export function computeTrustScore(signals: TrustSignal[]): TrustScore {
  const raw = signals.reduce((acc, s) => acc + s.weight, 0);
  const score = Math.max(0, Math.min(100, 50 + raw));
  const tier: TrustScore["tier"] =
    score >= 90 ? "elite" : score >= 75 ? "trusted" : score >= 55 ? "rising" : "new";
  return { score, tier, signals };
}

export const TRUST_TIER_META: Record<
  TrustScore["tier"],
  { label: string; tone: "muted" | "brand" | "success" | "gold"; description: string }
> = {
  new:     { label: "New",     tone: "muted",   description: "Just getting started on SPACES." },
  rising:  { label: "Rising",  tone: "brand",   description: "Building a reputation. Keep going." },
  trusted: { label: "Trusted", tone: "success", description: "Highly reliable member of SPACES." },
  elite:   { label: "Elite",   tone: "gold",    description: "Top 1% of SPACES members." },
};

// ---- Listing Quality Score ---------------------------------------

export type ListingQualityFactor = {
  key: "photos" | "description" | "location" | "amenities" | "verification" | "pricing" | "completeness";
  label: string;
  weight: number;      // 0..1 relative importance
  achieved: number;    // 0..1
};

export function computeListingQuality(factors: ListingQualityFactor[]) {
  const totalWeight = factors.reduce((a, f) => a + f.weight, 0) || 1;
  const raw = factors.reduce((a, f) => a + f.achieved * f.weight, 0) / totalWeight;
  return Math.round(raw * 100);
}

// ---- Report reasons ----------------------------------------------

export type ReportReason =
  | "fake_listing" | "wrong_price" | "wrong_location" | "already_sold"
  | "duplicate" | "scam" | "offensive";

export const REPORT_REASONS: { key: ReportReason; label: string; description: string }[] = [
  { key: "fake_listing",  label: "Fake listing",       description: "This property does not exist or is misrepresented." },
  { key: "wrong_price",   label: "Wrong price",         description: "The listed price is inaccurate or misleading." },
  { key: "wrong_location", label: "Wrong location",     description: "The pinned location doesn't match the property." },
  { key: "already_sold",  label: "Already sold / rented", description: "This property is no longer available." },
  { key: "duplicate",     label: "Duplicate listing",   description: "Same property listed more than once." },
  { key: "scam",          label: "Scam or fraud",       description: "Suspicious payment or contact behaviour." },
  { key: "offensive",     label: "Offensive content",   description: "Photos or description are inappropriate." },
];

// ---- Mock user data (display-only) --------------------------------

export type VerificationRecord = {
  kind: VerificationKind;
  status: VerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewer?: string;
  notes?: string;
  documents: { name: string; status: VerificationStatus; size?: string }[];
};

export const MOCK_USER_VERIFICATIONS: Record<VerificationKind, VerificationRecord> = {
  identity: {
    kind: "identity",
    status: "verified",
    submittedAt: "2 weeks ago",
    reviewedAt: "12 days ago",
    reviewer: "Trust Team",
    documents: [
      { name: "National ID — front", status: "verified", size: "1.2 MB" },
      { name: "National ID — back",  status: "verified", size: "1.1 MB" },
      { name: "Live selfie",          status: "verified", size: "820 KB" },
    ],
  },
  property: {
    kind: "property",
    status: "pending",
    submittedAt: "2 days ago",
    documents: [
      { name: "Title Deed — Villa Masaki", status: "pending", size: "3.4 MB" },
    ],
  },
  business: {
    kind: "business",
    status: "not_started",
    documents: [],
  },
  agent: {
    kind: "agent",
    status: "resubmit",
    submittedAt: "5 days ago",
    reviewedAt: "yesterday",
    reviewer: "Moderator Nia",
    notes: "Please upload a clearer scan of your business registration.",
    documents: [
      { name: "Business Registration", status: "resubmit", size: "0.9 MB" },
      { name: "Profile photo",         status: "verified", size: "480 KB" },
    ],
  },
};

export const MOCK_TRUST_SIGNALS: TrustSignal[] = [
  { key: "id",         label: "Identity verified",           weight: 20, tone: "success", detail: "National ID confirmed by Trust Team." },
  { key: "prop",       label: "1 property verified",          weight: 10, tone: "success" },
  { key: "response",   label: "Average response under 15m",   weight: 8,  tone: "success" },
  { key: "reviews",    label: "4.9 average rating (23 reviews)", weight: 12, tone: "success" },
  { key: "tx",         label: "3 completed transactions",     weight: 9,  tone: "success" },
  { key: "unanswered", label: "2 unanswered inquiries",       weight: -4, tone: "danger", detail: "Reply within 24h to recover points." },
];

// ---- Mock public profile -----------------------------------------

export type PublicProfileData = {
  handle: string;
  displayName: string;
  memberSince: string;
  role: "Owner" | "Agent" | "Business";
  location: string;
  bio: string;
  avatarInitials: string;
  verifiedBadges: VerificationKind[];
  stats: {
    responseRate: number;      // 0..100
    responseTime: string;
    listings: number;
    transactions: number;
    rating: number;            // 0..5
    reviewCount: number;
  };
};

export const MOCK_PROFILES: Record<string, PublicProfileData> = {
  "neema-kileo": {
    handle: "neema-kileo",
    displayName: "Neema Kileo",
    memberSince: "March 2025",
    role: "Agent",
    location: "Dar es Salaam, Tanzania",
    bio: "Senior agent at Atrio Properties. I help families find their forever home across Dar es Salaam and Zanzibar.",
    avatarInitials: "NK",
    verifiedBadges: ["identity", "agent", "business"],
    stats: { responseRate: 98, responseTime: "8m 42s", listings: 27, transactions: 41, rating: 4.9, reviewCount: 63 },
  },
  "amina-juma": {
    handle: "amina-juma",
    displayName: "Amina Juma",
    memberSince: "January 2026",
    role: "Owner",
    location: "Masaki, Dar es Salaam",
    bio: "Owner of family villas in Masaki and Oyster Bay. I list what I would happily live in.",
    avatarInitials: "AJ",
    verifiedBadges: ["identity", "property"],
    stats: { responseRate: 92, responseTime: "22m", listings: 4, transactions: 2, rating: 4.8, reviewCount: 11 },
  },
};

export const MOCK_REPORT_QUEUE = [
  { id: "rp1", target: "Listing #4801", reason: "fake_listing" as ReportReason, reporter: "@kelvin.mushi", severity: "high",   when: "12m ago", assignee: "Moderator Nia" },
  { id: "rp2", target: "Listing #4772", reason: "wrong_location" as ReportReason, reporter: "@grace",     severity: "low",    when: "2h ago",  assignee: "—" },
  { id: "rp3", target: "@peter.tz",      reason: "scam" as ReportReason,          reporter: "3 users",     severity: "high",   when: "3h ago",  assignee: "Moderator Nia" },
  { id: "rp4", target: "Listing #4720", reason: "duplicate" as ReportReason,     reporter: "moderator",   severity: "low",    when: "yesterday", assignee: "auto" },
];

export const MOCK_AUDIT_TRAIL = [
  { id: "au1", actor: "Trust Team",      action: "Approved identity for @amina",           when: "12 days ago" },
  { id: "au2", actor: "Moderator Nia",   action: "Requested resubmission of agent docs",   when: "yesterday"  },
  { id: "au3", actor: "System",          action: "Auto-flagged listing #4821 for review",  when: "2h ago"     },
  { id: "au4", actor: "Super Admin",     action: "Approved business @atrio-properties",    when: "3d ago"     },
];
