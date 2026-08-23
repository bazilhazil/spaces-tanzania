import type { Lang } from "@/hooks/use-i18n";

/**
 * Long-form copy for the public information pages (About, Contact, Help/FAQ,
 * Terms, Privacy, Safety). Kept here instead of the flat JSON dictionaries
 * because these strings are structured (lists, sections, Q&A pairs).
 *
 * English is the default language, Kiswahili the secondary one — both must
 * always be complete. Never mix languages inside one block.
 */

export type Section = { heading: string; body: string[] };
export type Faq = { q: string; a: string };
export type HelpCategory = { id: string; title: string; items: Faq[] };

export type SiteContent = {
  about: {
    title: string;
    subtitle: string;
    intro: string[];
    whatTitle: string;
    what: { title: string; body: string }[];
    missionTitle: string;
    mission: string;
    visionTitle: string;
    vision: string;
    verifiedTitle: string;
    verified: string[];
    contactTitle: string;
    contactBody: string;
  };
  contact: {
    title: string;
    subtitle: string;
    detailsTitle: string;
    phone: string;
    email: string;
    whatsapp: string;
    location: string;
    hours: string;
    formTitle: string;
    name: string;
    emailField: string;
    phoneField: string;
    subject: string;
    message: string;
    optional: string;
    send: string;
    sending: string;
    success: string;
    failure: string;
    invalid: string;
    privacyNote: string;
  };
  help: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    noResults: string;
    categories: HelpCategory[];
    faqTitle: string;
    faqSubtitle: string;
    stillNeedHelp: string;
    contactCta: string;
  };
  terms: {
    title: string;
    updated: string;
    intro: string;
    sections: Section[];
  };
  privacy: {
    title: string;
    updated: string;
    intro: string;
    sections: Section[];
  };
  safety: {
    title: string;
    subtitle: string;
    tips: { title: string; body: string }[];
    reportTitle: string;
    reportBody: string;
    reportSpace: string;
    reportUser: string;
    signInNote: string;
  };
  footer: {
    findSpace: string;
    listSpace: string;
    about: string;
    help: string;
    contact: string;
    safety: string;
    terms: string;
    privacy: string;
  };
};

const en: SiteContent = {
  about: {
    title: "About SPACES",
    subtitle: "SPACES GROUP LTD — Tanzania's trusted place to find and list spaces.",
    intro: [
      "SPACES is an online marketplace operated by SPACES GROUP LTD. We bring property seekers, owners and agents together in one simple, trustworthy place.",
      "Whether you are looking for a home to rent, a house to buy, or a shop, office or plot for your business, SPACES helps you search, compare and contact the right person directly.",
    ],
    whatTitle: "What SPACES does",
    what: [
      {
        title: "Find a Space",
        body: "Search real listings by location, price, type and features. See photos, details and the people behind each listing before you make contact.",
      },
      {
        title: "List a Space",
        body: "Owners and agents can publish a property in a few steps, manage inquiries, viewing requests and messages, and keep listing details up to date.",
      },
      {
        title: "Verified properties and users",
        body: "We offer identity, owner, agent and business verification, plus listing checks. Verified badges show what our team has reviewed, so you know who you are dealing with.",
      },
    ],
    missionTitle: "Our mission",
    mission:
      "To make finding and listing property in Tanzania simple, transparent and safe for everyone — with clear information and real people behind every listing.",
    visionTitle: "Our vision",
    vision:
      "To be the most trusted property marketplace in Tanzania and the wider region, where every space and every user can be confidently identified.",
    verifiedTitle: "Verification at SPACES",
    verified: [
      "Users can verify their identity, ownership, agency or business.",
      "Listings can be reviewed by our team before being highlighted as verified.",
      "Badges only show what has actually been checked — nothing more.",
      "Verification documents are stored privately and are never shown publicly.",
    ],
    contactTitle: "Contact us",
    contactBody: "Questions, partnerships or support — our team is happy to help.",
  },
  contact: {
    title: "Contact SPACES",
    subtitle: "Talk to our team. We usually reply within one business day.",
    detailsTitle: "Company details",
    phone: "Phone",
    email: "Email",
    whatsapp: "WhatsApp",
    location: "Location",
    hours: "Working hours",
    formTitle: "Send us a message",
    name: "Name",
    emailField: "Email",
    phoneField: "Phone",
    subject: "Subject",
    message: "Message",
    optional: "optional",
    send: "Send message",
    sending: "Sending…",
    success: "Thank you. Our team will get back to you.",
    failure: "We couldn't send your message. Please try again.",
    invalid: "Please fill in your name, a valid email, a subject and a message.",
    privacyNote: "We only use these details to reply to you. Read our Privacy Policy.",
  },
  help: {
    title: "Help Center",
    subtitle: "Answers to the most common questions about using SPACES.",
    searchPlaceholder: "Search help topics…",
    noResults: "No help topics match your search. Try different words or contact us.",
    faqTitle: "Frequently asked questions",
    faqSubtitle: "Short answers to what people ask most.",
    stillNeedHelp: "Still need help?",
    contactCta: "Contact support",
    categories: [
      {
        id: "finding",
        title: "Finding a Space",
        items: [
          {
            q: "How do I find a property?",
            a: "Open Find a Space, then filter by location, listing type, price, bedrooms and other features. Open any listing to see full details, photos and the contact options for that space.",
          },
          {
            q: "Can I save listings and searches?",
            a: "Yes. Sign in, then tap the heart on a listing to save it, or save your search from the results page. Saved items appear in your dashboard.",
          },
          {
            q: "How do I contact an owner or agent?",
            a: "Open the listing and use the Message, Call or WhatsApp buttons in the contact panel. Messaging keeps the conversation inside SPACES.",
          },
        ],
      },
      {
        id: "listing",
        title: "Listing a Space",
        items: [
          {
            q: "How do I list my property?",
            a: "Sign in, choose List Your Space, then follow the upload steps: details, location, photos, price and contact preferences. Submit when you are ready and the listing goes for review.",
          },
          {
            q: "How do I edit, pause or delete a listing?",
            a: "Go to Dashboard → My Properties. Each listing has View, Edit, Pause/Resume, Share and Delete actions.",
          },
          {
            q: "Why is my listing not visible yet?",
            a: "New and edited listings can be reviewed before they appear publicly. Only live listings show in search results.",
          },
        ],
      },
      {
        id: "account",
        title: "Account & Login",
        items: [
          {
            q: "How do I create an account?",
            a: "Choose Register, sign up with your email and password or with Google, then complete your profile.",
          },
          {
            q: "I forgot my password. What do I do?",
            a: "On the login page choose the password reset option and follow the email instructions.",
          },
          {
            q: "How do I update my profile?",
            a: "Go to Dashboard → Settings to change your name, phone, photo and other profile details.",
          },
        ],
      },
      {
        id: "viewings",
        title: "Viewing Requests",
        items: [
          {
            q: "How do I request a viewing?",
            a: "Open a listing and choose Request Viewing. Pick a date and time, add a note, and submit. The owner or agent receives it immediately.",
          },
          {
            q: "Where do I track my viewing requests?",
            a: "In Dashboard → Viewings you can see pending, approved, rescheduled and completed requests.",
          },
          {
            q: "Can I change a viewing request?",
            a: "Yes. Submitting a new time for the same property updates your existing request instead of creating a duplicate.",
          },
        ],
      },
      {
        id: "payments",
        title: "Payments",
        items: [
          {
            q: "How do payments work?",
            a: "SPACES charges only for platform plans and listing services shown in Billing. SPACES does not process rent, deposits or sale payments between users.",
          },
          {
            q: "Where can I see my invoices?",
            a: "Go to Dashboard → Billing for your current plan, and Payment History for past transactions.",
          },
          {
            q: "Should I pay a deposit through SPACES?",
            a: "No. Never send money through SPACES for a property. Inspect the space, confirm the agreement, and pay the verified party directly.",
          },
        ],
      },
      {
        id: "verification",
        title: "Verification",
        items: [
          {
            q: "How does verification work?",
            a: "Open Verification in your dashboard and submit the requested information for identity, ownership, agency or business. Our team reviews it and your badge appears once approved.",
          },
          {
            q: "Who can see my documents?",
            a: "Only our review team. Verification documents are stored privately and are never shown on your public profile or listings.",
          },
          {
            q: "What do the badges mean?",
            a: "A badge means that specific check was completed — identity, owner, agent, business or listing. It is not a guarantee of any transaction.",
          },
        ],
      },
      {
        id: "safety",
        title: "Safety",
        items: [
          {
            q: "How do I report a suspicious listing?",
            a: "Open the listing and use Report. Choose a reason, add details, and our moderation team reviews it.",
          },
          {
            q: "How do I report or block a user?",
            a: "Open their profile or your conversation with them and use Report or Block. Blocked users can no longer message you.",
          },
          {
            q: "What should I avoid?",
            a: "Avoid paying before inspecting, avoid moving off-platform too early, and avoid anyone who refuses a viewing or pressures you to pay quickly.",
          },
        ],
      },
      {
        id: "technical",
        title: "Technical Support",
        items: [
          {
            q: "How do I change my language?",
            a: "Use the language selector in the header or footer to switch between English and Kiswahili. Your choice is remembered on your device.",
          },
          {
            q: "The site is not loading correctly. What can I do?",
            a: "Refresh the page, check your internet connection, and try again. If the problem continues, contact us with the page address and what you were doing.",
          },
          {
            q: "How do I get more help?",
            a: "Use the Contact page and send our team a message with as much detail as possible.",
          },
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: August 2026",
    intro:
      "These Terms govern your use of the SPACES website and services operated by SPACES GROUP LTD. By using SPACES you agree to them.",
    sections: [
      {
        heading: "1. Account use",
        body: [
          "You must provide accurate information when creating an account and keep your login details secure.",
          "You are responsible for all activity that happens under your account.",
        ],
      },
      {
        heading: "2. Property listings",
        body: [
          "Listings must describe a real, available space with accurate details, prices and photos you have the right to publish.",
          "SPACES may review, pause or remove a listing that appears inaccurate, misleading or in breach of these Terms.",
        ],
      },
      {
        heading: "3. User responsibilities",
        body: [
          "You are responsible for independently confirming property ownership, documents, agreements, prices and any transaction details before committing to anything.",
          "Always inspect a space and verify the other party before making any payment.",
        ],
      },
      {
        heading: "4. Prohibited activity",
        body: [
          "Do not post false, duplicate or fraudulent listings, spam other users, harass anyone, scrape the platform, or attempt to bypass security measures.",
          "Do not use SPACES for any unlawful purpose.",
        ],
      },
      {
        heading: "5. Verification",
        body: [
          "Verification badges show that a specific check was completed by our team at a point in time.",
          "A badge is not a guarantee of ownership, legality, availability or the outcome of any transaction.",
        ],
      },
      {
        heading: "6. Messaging",
        body: [
          "Messages sent through SPACES must be relevant and respectful.",
          "We may review reported conversations for moderation and safety purposes.",
        ],
      },
      {
        heading: "7. Viewing requests",
        body: [
          "Viewing requests are arrangements between users. SPACES only passes on the request and tracks its status.",
          "Attendance, access and conduct during a viewing are the responsibility of the users involved.",
        ],
      },
      {
        heading: "8. Payments",
        body: [
          "SPACES charges only for its own plans and listing services, shown in your Billing section.",
          "SPACES does not handle rent, deposits, commissions or purchase payments between users, and is not an escrow service.",
        ],
      },
      {
        heading: "9. Reviews",
        body: [
          "Reviews must be based on a genuine interaction and written honestly.",
          "We may remove reviews that are fake, abusive, or that contain private information.",
        ],
      },
      {
        heading: "10. Reports",
        body: [
          "You can report a listing, message or user at any time. Our moderation team reviews reports and may act on them.",
          "Submitting knowingly false reports is a breach of these Terms.",
        ],
      },
      {
        heading: "11. Account suspension",
        body: [
          "We may suspend or close an account that breaches these Terms, poses a risk to other users, or is used fraudulently.",
        ],
      },
      {
        heading: "12. Limitation of responsibility",
        body: [
          "SPACES is a marketplace. We do not own, inspect, sell or rent the spaces listed and we do not guarantee ownership, legality, quality, availability or the safety of any transaction.",
          "To the extent permitted by law, SPACES GROUP LTD is not liable for losses arising from dealings between users.",
        ],
      },
      {
        heading: "13. Contact information",
        body: ["Questions about these Terms can be sent to our team through the Contact page."],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: August 2026",
    intro:
      "This policy explains what information SPACES GROUP LTD collects when you use SPACES, how it is used, and the choices you have.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Details you give us: name, email, phone number, profile information, listings, messages, viewing requests, reviews and reports.",
          "Technical information: device type, browser, approximate location and pages viewed.",
        ],
      },
      {
        heading: "How we use information",
        body: [
          "To run the marketplace: show listings, deliver messages and inquiries, manage viewing requests, and support your account.",
          "To keep SPACES safe, prevent fraud, review reports, and improve the service.",
        ],
      },
      {
        heading: "Account information",
        body: [
          "Your public profile can show your name, photo, role, location and verification badges.",
          "Your email address and personal contact details are not published publicly.",
        ],
      },
      {
        heading: "Property information",
        body: [
          "Information you publish in a listing is public once the listing is live, including photos, price and area.",
          "Contact details attached to a listing are shown to people viewing that listing so they can reach you.",
        ],
      },
      {
        heading: "Messages",
        body: [
          "Messages are stored so conversations continue across devices and are visible to the participants.",
          "Reported conversations may be reviewed by our moderation team.",
        ],
      },
      {
        heading: "Verification information",
        body: [
          "Verification documents are used only to confirm identity, ownership, agency or business status.",
          "They are stored privately, are never publicly accessible, and are not shown on profiles or listings.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use essential cookies and local storage to keep you signed in and remember preferences such as your language.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "We collect aggregated usage statistics to understand which pages and features are used, and to improve performance.",
        ],
      },
      {
        heading: "Data security",
        body: [
          "Access to data is restricted by authentication and database-level access rules, and sensitive files are kept in private storage.",
        ],
      },
      {
        heading: "Data retention",
        body: [
          "We keep information while your account is active and for as long as needed for legal, security and record-keeping purposes.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can view and update your profile details at any time, and you can ask us to correct or delete your account information.",
        ],
      },
      {
        heading: "Contact",
        body: ["For any privacy question, reach our team through the Contact page."],
      },
    ],
  },
  safety: {
    title: "Safety on SPACES",
    subtitle: "Simple steps that protect you when finding or listing a space.",
    tips: [
      {
        title: "Use verified users where possible",
        body: "Look for identity, owner and agent badges. They show what our team has already checked.",
      },
      {
        title: "Inspect properties before paying",
        body: "Always visit the space in person, or send someone you trust, before agreeing to anything.",
      },
      {
        title: "Do not send money to suspicious accounts",
        body: "Never pay a deposit to someone who avoids a viewing, rushes you, or asks for payment to an unrelated account.",
      },
      {
        title: "Report suspicious listings",
        body: "If something feels wrong, report it. Our moderation team reviews every report.",
      },
      {
        title: "Use SPACES communication tools",
        body: "Keep your conversation in SPACES messaging so there is a record if a problem arises.",
      },
      {
        title: "Confirm agreements before transactions",
        body: "Confirm ownership documents, the written agreement, and all amounts before any money changes hands.",
      },
    ],
    reportTitle: "Report a problem",
    reportBody: "Tell us about a listing or a user that looks unsafe. Reports are confidential.",
    reportSpace: "Report a Space",
    reportUser: "Report a User",
    signInNote: "You need to be signed in to send a report.",
  },
  footer: {
    findSpace: "Find a Space",
    listSpace: "List Your Space",
    about: "About",
    help: "Help",
    contact: "Contact",
    safety: "Safety",
    terms: "Terms",
    privacy: "Privacy",
  },
};

const sw: SiteContent = {
  about: {
    title: "Kuhusu SPACES",
    subtitle: "SPACES GROUP LTD — mahali pa kuaminika Tanzania kupata na kutangaza nafasi.",
    intro: [
      "SPACES ni soko la mtandaoni linaloendeshwa na SPACES GROUP LTD. Tunawaunganisha watafutaji wa nyumba, wamiliki na madalali mahali pamoja, kwa urahisi na uaminifu.",
      "Iwe unatafuta nyumba ya kupanga, nyumba ya kununua, au duka, ofisi au kiwanja kwa biashara yako, SPACES inakusaidia kutafuta, kulinganisha na kuwasiliana moja kwa moja na mtu sahihi.",
    ],
    whatTitle: "SPACES inafanya nini",
    what: [
      {
        title: "Tafuta Nafasi",
        body: "Tafuta matangazo halisi kwa eneo, bei, aina na sifa. Ona picha, maelezo na watu walio nyuma ya kila tangazo kabla ya kuwasiliana.",
      },
      {
        title: "Tangaza Nafasi",
        body: "Wamiliki na madalali wanaweza kuweka nyumba kwa hatua chache, kusimamia maswali, maombi ya kutembelea na ujumbe, na kusasisha maelezo wakati wowote.",
      },
      {
        title: "Nafasi na watumiaji waliothibitishwa",
        body: "Tunatoa uthibitisho wa utambulisho, umiliki, udalali na biashara, pamoja na ukaguzi wa matangazo. Alama za uthibitisho zinaonyesha kilichokaguliwa na timu yetu.",
      },
    ],
    missionTitle: "Dhamira yetu",
    mission:
      "Kufanya utafutaji na utangazaji wa nyumba Tanzania uwe rahisi, wazi na salama kwa kila mtu — kwa taarifa sahihi na watu halisi nyuma ya kila tangazo.",
    visionTitle: "Maono yetu",
    vision:
      "Kuwa soko la nyumba linaloaminika zaidi Tanzania na ukanda mzima, ambapo kila nafasi na kila mtumiaji anaweza kutambulika kwa uhakika.",
    verifiedTitle: "Uthibitisho ndani ya SPACES",
    verified: [
      "Watumiaji wanaweza kuthibitisha utambulisho, umiliki, udalali au biashara.",
      "Matangazo yanaweza kukaguliwa na timu yetu kabla ya kuonyeshwa kama yaliyothibitishwa.",
      "Alama zinaonyesha tu kile kilichokaguliwa — si zaidi ya hapo.",
      "Nyaraka za uthibitisho huhifadhiwa kwa siri na haziwekwi hadharani.",
    ],
    contactTitle: "Wasiliana nasi",
    contactBody: "Maswali, ushirikiano au msaada — timu yetu iko tayari kukusaidia.",
  },
  contact: {
    title: "Wasiliana na SPACES",
    subtitle: "Zungumza na timu yetu. Mara nyingi tunajibu ndani ya siku moja ya kazi.",
    detailsTitle: "Maelezo ya kampuni",
    phone: "Simu",
    email: "Barua pepe",
    whatsapp: "WhatsApp",
    location: "Eneo",
    hours: "Saa za kazi",
    formTitle: "Tutumie ujumbe",
    name: "Jina",
    emailField: "Barua pepe",
    phoneField: "Simu",
    subject: "Mada",
    message: "Ujumbe",
    optional: "hiari",
    send: "Tuma ujumbe",
    sending: "Inatuma…",
    success: "Asante. Timu yetu itakurudia.",
    failure: "Hatukuweza kutuma ujumbe wako. Tafadhali jaribu tena.",
    invalid: "Tafadhali jaza jina lako, barua pepe sahihi, mada na ujumbe.",
    privacyNote: "Tunatumia maelezo haya kukujibu tu. Soma Sera yetu ya Faragha.",
  },
  help: {
    title: "Kituo cha Msaada",
    subtitle: "Majibu ya maswali yanayoulizwa zaidi kuhusu kutumia SPACES.",
    searchPlaceholder: "Tafuta mada za msaada…",
    noResults: "Hakuna mada inayolingana na utafutaji wako. Jaribu maneno mengine au wasiliana nasi.",
    faqTitle: "Maswali yanayoulizwa mara kwa mara",
    faqSubtitle: "Majibu mafupi ya yale yanayoulizwa zaidi.",
    stillNeedHelp: "Bado unahitaji msaada?",
    contactCta: "Wasiliana na msaada",
    categories: [
      {
        id: "finding",
        title: "Kutafuta Nafasi",
        items: [
          {
            q: "Ninawezaje kupata nyumba?",
            a: "Fungua Tafuta Nafasi, kisha chuja kwa eneo, aina ya tangazo, bei, vyumba na sifa nyingine. Fungua tangazo lolote kuona maelezo kamili, picha na njia za mawasiliano.",
          },
          {
            q: "Naweza kuhifadhi matangazo na utafutaji?",
            a: "Ndiyo. Ingia kwenye akaunti, gusa alama ya moyo kwenye tangazo, au hifadhi utafutaji wako kutoka ukurasa wa matokeo. Vitu ulivyohifadhi vinaonekana kwenye dashibodi yako.",
          },
          {
            q: "Ninawasilianaje na mmiliki au dalali?",
            a: "Fungua tangazo na tumia vitufe vya Ujumbe, Piga simu au WhatsApp kwenye paneli ya mawasiliano. Ujumbe wa SPACES huhifadhi mazungumzo ndani ya jukwaa.",
          },
        ],
      },
      {
        id: "listing",
        title: "Kutangaza Nafasi",
        items: [
          {
            q: "Ninatangazaje nyumba yangu?",
            a: "Ingia kwenye akaunti, chagua Tangaza Nafasi Yako, kisha fuata hatua: maelezo, eneo, picha, bei na mapendeleo ya mawasiliano. Wasilisha ukiwa tayari na tangazo litapelekwa kukaguliwa.",
          },
          {
            q: "Nabadilishaje, nasimamishaje au nafutaje tangazo?",
            a: "Nenda Dashibodi → Nyumba Zangu. Kila tangazo lina vitendo vya Kuona, Kuhariri, Kusimamisha/Kuendeleza, Kushiriki na Kufuta.",
          },
          {
            q: "Kwa nini tangazo langu halionekani bado?",
            a: "Matangazo mapya na yaliyohaririwa yanaweza kukaguliwa kabla ya kuonekana hadharani. Matangazo yaliyo hai pekee ndiyo yanaonekana kwenye matokeo.",
          },
        ],
      },
      {
        id: "account",
        title: "Akaunti na Kuingia",
        items: [
          {
            q: "Nafungua akaunti vipi?",
            a: "Chagua Jisajili, tumia barua pepe na nenosiri au Google, kisha kamilisha wasifu wako.",
          },
          {
            q: "Nimesahau nenosiri. Nifanye nini?",
            a: "Kwenye ukurasa wa kuingia chagua kubadilisha nenosiri kisha fuata maelekezo utakayopokea kwa barua pepe.",
          },
          {
            q: "Nasasishaje wasifu wangu?",
            a: "Nenda Dashibodi → Mipangilio kubadilisha jina, simu, picha na maelezo mengine.",
          },
        ],
      },
      {
        id: "viewings",
        title: "Maombi ya Kutembelea",
        items: [
          {
            q: "Naombaje kutembelea nyumba?",
            a: "Fungua tangazo kisha chagua Omba Kutembelea. Chagua tarehe na saa, ongeza maelezo, na wasilisha. Mmiliki au dalali atapokea mara moja.",
          },
          {
            q: "Nafuatiliaje maombi yangu?",
            a: "Kwenye Dashibodi → Ziara utaona maombi yaliyosubiri, yaliyokubaliwa, yaliyopangwa upya na yaliyokamilika.",
          },
          {
            q: "Naweza kubadilisha ombi la kutembelea?",
            a: "Ndiyo. Ukituma muda mpya kwa nyumba ile ile, ombi lako lililopo linasasishwa badala ya kurudiwa.",
          },
        ],
      },
      {
        id: "payments",
        title: "Malipo",
        items: [
          {
            q: "Malipo yanafanyaje kazi?",
            a: "SPACES hutoza tu kwa mipango ya jukwaa na huduma za matangazo zinazoonekana kwenye Malipo. SPACES haishughulikii kodi, dhamana au malipo ya ununuzi kati ya watumiaji.",
          },
          {
            q: "Naona wapi risiti zangu?",
            a: "Nenda Dashibodi → Malipo kwa mpango wako wa sasa, na Historia ya Malipo kwa miamala iliyopita.",
          },
          {
            q: "Nilipe dhamana kupitia SPACES?",
            a: "Hapana. Usitume pesa kupitia SPACES kwa ajili ya nyumba. Kagua nafasi, thibitisha makubaliano, kisha lipa mhusika aliyethibitishwa moja kwa moja.",
          },
        ],
      },
      {
        id: "verification",
        title: "Uthibitisho",
        items: [
          {
            q: "Uthibitisho unafanyaje kazi?",
            a: "Fungua Uthibitisho kwenye dashibodi yako na wasilisha taarifa zinazohitajika za utambulisho, umiliki, udalali au biashara. Timu yetu itakagua na alama yako itaonekana ikikubaliwa.",
          },
          {
            q: "Nani anaona nyaraka zangu?",
            a: "Timu yetu ya ukaguzi pekee. Nyaraka za uthibitisho huhifadhiwa kwa siri na haziwekwi kwenye wasifu wala matangazo.",
          },
          {
            q: "Alama zinamaanisha nini?",
            a: "Alama inamaanisha ukaguzi husika ulikamilika — utambulisho, umiliki, udalali, biashara au tangazo. Si dhamana ya muamala wowote.",
          },
        ],
      },
      {
        id: "safety",
        title: "Usalama",
        items: [
          {
            q: "Naripotije tangazo la kutiliwa shaka?",
            a: "Fungua tangazo kisha tumia Ripoti. Chagua sababu, ongeza maelezo, na timu yetu ya usimamizi itakagua.",
          },
          {
            q: "Naripotije au kuzuia mtumiaji?",
            a: "Fungua wasifu wake au mazungumzo yenu kisha tumia Ripoti au Zuia. Aliyezuiwa hawezi tena kukutumia ujumbe.",
          },
          {
            q: "Niepuke nini?",
            a: "Epuka kulipa kabla ya kukagua, epuka kuhamia nje ya jukwaa mapema mno, na epuka mtu anayekataa ziara au anayekulazimisha kulipa haraka.",
          },
        ],
      },
      {
        id: "technical",
        title: "Msaada wa Kiufundi",
        items: [
          {
            q: "Nabadilishaje lugha?",
            a: "Tumia kichagua lugha kilicho juu au chini ya ukurasa kubadili kati ya Kiingereza na Kiswahili. Chaguo lako linakumbukwa kwenye kifaa chako.",
          },
          {
            q: "Tovuti haipakii vizuri. Nifanye nini?",
            a: "Onyesha upya ukurasa, angalia mtandao wako, kisha jaribu tena. Tatizo likiendelea, wasiliana nasi ukieleza ukurasa na ulichokuwa ukifanya.",
          },
          {
            q: "Napata wapi msaada zaidi?",
            a: "Tumia ukurasa wa Mawasiliano kutuma ujumbe kwa timu yetu ukieleza kwa kina.",
          },
        ],
      },
    ],
  },
  terms: {
    title: "Masharti ya Huduma",
    updated: "Yamesasishwa: Agosti 2026",
    intro:
      "Masharti haya yanasimamia matumizi ya tovuti na huduma za SPACES zinazoendeshwa na SPACES GROUP LTD. Kwa kutumia SPACES unakubaliana nayo.",
    sections: [
      {
        heading: "1. Matumizi ya akaunti",
        body: [
          "Unatakiwa kutoa taarifa sahihi unapofungua akaunti na kulinda taarifa zako za kuingia.",
          "Unawajibika kwa shughuli zote zinazofanyika kupitia akaunti yako.",
        ],
      },
      {
        heading: "2. Matangazo ya nyumba",
        body: [
          "Tangazo lazima lieleze nafasi halisi inayopatikana, kwa maelezo, bei na picha ulizo na haki ya kuziweka.",
          "SPACES inaweza kukagua, kusimamisha au kuondoa tangazo linaloonekana si sahihi, linalopotosha au linalokiuka masharti haya.",
        ],
      },
      {
        heading: "3. Wajibu wa mtumiaji",
        body: [
          "Unawajibika kuthibitisha mwenyewe umiliki wa nyumba, nyaraka, makubaliano, bei na maelezo ya muamala kabla ya kujitoa kwa lolote.",
          "Kagua nafasi na thibitisha mhusika kabla ya malipo yoyote.",
        ],
      },
      {
        heading: "4. Shughuli zilizokatazwa",
        body: [
          "Usiweke matangazo ya uongo, ya kurudiwa au ya udanganyifu, usisumbue watumiaji, usivune data ya jukwaa, na usijaribu kukwepa mifumo ya usalama.",
          "Usitumie SPACES kwa lengo lolote kinyume cha sheria.",
        ],
      },
      {
        heading: "5. Uthibitisho",
        body: [
          "Alama za uthibitisho zinaonyesha kuwa ukaguzi husika ulifanyika na timu yetu kwa wakati fulani.",
          "Alama si dhamana ya umiliki, uhalali, upatikanaji au matokeo ya muamala wowote.",
        ],
      },
      {
        heading: "6. Ujumbe",
        body: [
          "Ujumbe unaotumwa kupitia SPACES lazima uwe na maana na heshima.",
          "Tunaweza kukagua mazungumzo yaliyoripotiwa kwa madhumuni ya usimamizi na usalama.",
        ],
      },
      {
        heading: "7. Maombi ya kutembelea",
        body: [
          "Maombi ya kutembelea ni makubaliano kati ya watumiaji. SPACES inapeleka ombi na kufuatilia hali yake tu.",
          "Kuhudhuria, kuruhusu kuingia na mwenendo wakati wa ziara ni wajibu wa watumiaji husika.",
        ],
      },
      {
        heading: "8. Malipo",
        body: [
          "SPACES hutoza tu kwa mipango yake na huduma za matangazo zinazoonekana kwenye sehemu ya Malipo.",
          "SPACES haishughulikii kodi, dhamana, kamisheni au malipo ya ununuzi kati ya watumiaji, na si huduma ya escrow.",
        ],
      },
      {
        heading: "9. Mapitio",
        body: [
          "Mapitio yanapaswa kutokana na mwingiliano halisi na kuandikwa kwa ukweli.",
          "Tunaweza kuondoa mapitio ya uongo, ya matusi au yenye taarifa binafsi.",
        ],
      },
      {
        heading: "10. Ripoti",
        body: [
          "Unaweza kuripoti tangazo, ujumbe au mtumiaji wakati wowote. Timu yetu itakagua na kuchukua hatua inapohitajika.",
          "Kutuma ripoti za uongo kwa makusudi ni ukiukaji wa masharti haya.",
        ],
      },
      {
        heading: "11. Kusimamishwa kwa akaunti",
        body: [
          "Tunaweza kusimamisha au kufunga akaunti inayokiuka masharti haya, inayohatarisha watumiaji wengine au inayotumika kwa udanganyifu.",
        ],
      },
      {
        heading: "12. Ukomo wa wajibu",
        body: [
          "SPACES ni soko. Hatumiliki, hatukagui, hatuuzi wala hatupangishi nafasi zinazotangazwa, na hatuhakikishi umiliki, uhalali, ubora, upatikanaji wala usalama wa muamala wowote.",
          "Kwa kadri sheria inavyoruhusu, SPACES GROUP LTD haiwajibiki kwa hasara zinazotokana na mawasiliano au miamala kati ya watumiaji.",
        ],
      },
      {
        heading: "13. Mawasiliano",
        body: ["Maswali kuhusu masharti haya yanaweza kutumwa kwa timu yetu kupitia ukurasa wa Mawasiliano."],
      },
    ],
  },
  privacy: {
    title: "Sera ya Faragha",
    updated: "Imesasishwa: Agosti 2026",
    intro:
      "Sera hii inaeleza taarifa ambazo SPACES GROUP LTD hukusanya unapotumia SPACES, jinsi zinavyotumika, na chaguo ulizo nazo.",
    sections: [
      {
        heading: "Taarifa tunazokusanya",
        body: [
          "Taarifa unazotoa: jina, barua pepe, namba ya simu, wasifu, matangazo, ujumbe, maombi ya kutembelea, mapitio na ripoti.",
          "Taarifa za kiufundi: aina ya kifaa, kivinjari, eneo la takribani na kurasa ulizotembelea.",
        ],
      },
      {
        heading: "Jinsi tunavyotumia taarifa",
        body: [
          "Kuendesha soko: kuonyesha matangazo, kufikisha ujumbe na maswali, kusimamia maombi ya kutembelea na kusaidia akaunti yako.",
          "Kulinda usalama wa SPACES, kuzuia udanganyifu, kukagua ripoti na kuboresha huduma.",
        ],
      },
      {
        heading: "Taarifa za akaunti",
        body: [
          "Wasifu wako wa hadhara unaweza kuonyesha jina, picha, nafasi yako, eneo na alama za uthibitisho.",
          "Barua pepe yako na mawasiliano yako binafsi hayawekwi hadharani.",
        ],
      },
      {
        heading: "Taarifa za nyumba",
        body: [
          "Taarifa unazoweka kwenye tangazo huwa za hadhara mara tangazo linapokuwa hai, ikijumuisha picha, bei na eneo.",
          "Mawasiliano yaliyoambatanishwa na tangazo huonyeshwa kwa wanaotazama tangazo hilo ili waweze kukufikia.",
        ],
      },
      {
        heading: "Ujumbe",
        body: [
          "Ujumbe huhifadhiwa ili mazungumzo yaendelee kwenye vifaa vyote na huonekana kwa washiriki.",
          "Mazungumzo yaliyoripotiwa yanaweza kukaguliwa na timu yetu ya usimamizi.",
        ],
      },
      {
        heading: "Taarifa za uthibitisho",
        body: [
          "Nyaraka za uthibitisho hutumika tu kuthibitisha utambulisho, umiliki, udalali au biashara.",
          "Huhifadhiwa kwa siri, hazipatikani hadharani, na haziwekwi kwenye wasifu wala matangazo.",
        ],
      },
      {
        heading: "Vidakuzi",
        body: [
          "Tunatumia vidakuzi muhimu na hifadhi ya kifaa ili kukuweka umeingia na kukumbuka mapendeleo kama lugha yako.",
        ],
      },
      {
        heading: "Takwimu za matumizi",
        body: [
          "Tunakusanya takwimu za jumla kuelewa kurasa na huduma zinazotumika, na kuboresha utendaji.",
        ],
      },
      {
        heading: "Usalama wa data",
        body: [
          "Ufikiaji wa data unadhibitiwa kwa uthibitishaji na sheria za ufikiaji kwenye hifadhidata, na faili nyeti huhifadhiwa kwenye hifadhi ya faragha.",
        ],
      },
      {
        heading: "Muda wa kuhifadhi data",
        body: [
          "Tunahifadhi taarifa wakati akaunti yako ikiwa hai na kwa muda unaohitajika kisheria, kiusalama na kwa kumbukumbu.",
        ],
      },
      {
        heading: "Haki zako",
        body: [
          "Unaweza kuona na kusasisha wasifu wako wakati wowote, na unaweza kutuomba turekebishe au tufute taarifa za akaunti yako.",
        ],
      },
      {
        heading: "Mawasiliano",
        body: ["Kwa swali lolote la faragha, wasiliana na timu yetu kupitia ukurasa wa Mawasiliano."],
      },
    ],
  },
  safety: {
    title: "Usalama kwenye SPACES",
    subtitle: "Hatua rahisi zinazokulinda unapotafuta au kutangaza nafasi.",
    tips: [
      {
        title: "Tumia watumiaji waliothibitishwa pale inapowezekana",
        body: "Angalia alama za utambulisho, umiliki na udalali. Zinaonyesha kile timu yetu imekwisha kagua.",
      },
      {
        title: "Kagua nyumba kabla ya kulipa",
        body: "Tembelea nafasi mwenyewe, au mtume mtu unayemwamini, kabla ya kukubaliana lolote.",
      },
      {
        title: "Usitume pesa kwenye akaunti za kutiliwa shaka",
        body: "Usilipe dhamana kwa mtu anayekwepa ziara, anayekuharakisha, au anayeomba malipo kwenye akaunti isiyohusiana.",
      },
      {
        title: "Ripoti matangazo ya kutiliwa shaka",
        body: "Kama kitu hakiko sawa, ripoti. Timu yetu ya usimamizi hukagua kila ripoti.",
      },
      {
        title: "Tumia njia za mawasiliano za SPACES",
        body: "Weka mazungumzo ndani ya SPACES ili kuwe na kumbukumbu tatizo likitokea.",
      },
      {
        title: "Thibitisha makubaliano kabla ya muamala",
        body: "Thibitisha nyaraka za umiliki, mkataba ulioandikwa na kiasi chote kabla ya pesa kubadilishana mikono.",
      },
    ],
    reportTitle: "Ripoti tatizo",
    reportBody: "Tuambie kuhusu tangazo au mtumiaji anayeonekana si salama. Ripoti ni za siri.",
    reportSpace: "Ripoti Nafasi",
    reportUser: "Ripoti Mtumiaji",
    signInNote: "Unahitaji kuingia kwenye akaunti ili kutuma ripoti.",
  },
  footer: {
    findSpace: "Tafuta Nafasi",
    listSpace: "Tangaza Nafasi Yako",
    about: "Kuhusu",
    help: "Msaada",
    contact: "Mawasiliano",
    safety: "Usalama",
    terms: "Masharti",
    privacy: "Faragha",
  },
};

export const SITE_CONTENT: Record<Lang, SiteContent> = { en, sw };
