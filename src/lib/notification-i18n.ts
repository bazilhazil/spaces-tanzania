// Shows notification texts (stored in English by the database) in the reader's language.
type T = (k: string, v?: Record<string, string | number>) => string;

const TITLES: Record<string, string> = {
  "New notification": "notifText.newNotification",
  "New message": "notifText.newMessage",
  "New viewing request": "notifText.newViewing",
  "Viewing approved": "notifText.viewingConfirmed",
  "Viewing confirmed": "notifText.viewingConfirmed",
  "Viewing declined": "notifText.viewingDeclined",
  "Viewing rejected": "notifText.viewingDeclined",
  "Viewing cancelled": "notifText.viewingCancelled",
  "Viewing time changed": "notifText.viewingTimeChanged",
  "New viewing time suggested": "notifText.viewingTimeChanged",
  "New lead": "notifText.newInquiry",
  "New inquiry": "notifText.newInquiry",
  "Deal created": "notifText.dealCreated",
  "New verification submission": "notifUi.newVer",
  "Verification submitted": "notifText.verSubmitted",
  "Verification in progress": "notifText.verInProgress",
  "Verification approved": "notifText.verApproved",
  "Verified by SPACES": "notifText.verifiedBySpaces",
  "New user registered": "notifText.newUser",
  "Report received": "notifText.reportReceived",
  "Urgent report received": "notifText.urgentReport",
  "New listing report": "notifText.listingReport",
  "Your report is being reviewed": "notifText.reportReviewing",
  "Leave a review": "notifText.leaveReview",
  "Review published": "notifText.reviewPublished",
  "Your space is now live on SPACES": "notifText.spaceLive",
  "Your space is pending review": "notifText.spacePending",
  "New space awaiting approval": "notifText.spaceAwaiting",
  "Property Manager request not approved": "notifUi.pmRejected",
  "Property Manager access approved": "notifUi.pmApproved",
  "Request submitted": "notifUi.pmSubmitted",
  "A new Property Manager access request is awaiting review.": "notifUi.newPmBody",
  "A new property verification is awaiting review.": "notifUi.newPropBody",
  "Your Property Manager workspace is now available from your dashboard.": "notifUi.pmApprovedBody",
  "We received your Property Manager access request and will review it shortly.": "notifUi.pmSubmittedBody",
};

const STAGES: Record<string, string> = {
  contacted: "notifText.stage_contacted",
  "viewing scheduled": "notifText.stage_viewing_scheduled",
  "viewing completed": "notifText.stage_viewing_completed",
  negotiation: "notifText.stage_negotiation",
  "offer made": "notifText.stage_offer_made",
  completed: "notifText.stage_completed",
};

export function localizeNotifText(t: T, s: string | null | undefined): string {
  if (!s) return "";
  const exact = TITLES[s.trim()];
  if (exact) return t(exact);
  let m = s.match(/^Stage changed to (.+)$/);
  if (m) return t("notifText.stageChanged", { stage: STAGES[m[1]] ? t(STAGES[m[1]]) : m[1] });
  m = s.match(/^You have a new message from (.+)$/);
  if (m) return t("notifText.newMessageFrom", { name: m[1] });
  m = s.match(/^(\d+) new messages from (.+)$/);
  if (m) return t("notifText.nMessagesFrom", { n: m[1], name: m[2] });
  m = s.match(/^(.*): someone requested to view your property\.?$/);
  if (m) return t("notifText.someoneRequested", { property: m[1] });
  // "<Property> — <Title>"
  m = s.match(/^(.*) — (.+)$/);
  if (m && TITLES[m[2].trim()]) return `${m[1]} — ${t(TITLES[m[2].trim()])}`;
  return s;
}
