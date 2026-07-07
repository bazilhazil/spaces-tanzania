import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "sw";

const STORAGE_KEY = "spaces.lang";

type Dict = Record<string, string>;

const en: Dict = {
  // Nav
  "nav.home": "Home",
  "nav.buy": "Buy",
  "nav.rent": "Rent",
  "nav.commercial": "Commercial",
  "nav.agents": "Agents",
  "nav.upload": "Upload Property",
  "nav.search": "Search",
  "nav.login": "Login",
  "nav.register": "Register",
  "nav.logout": "Sign out",
  "nav.dashboard": "Dashboard",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.language": "Language",

  // Dashboard sidebar
  "side.myProperties": "My Properties",
  "side.messages": "Messages",
  "side.viewings": "Viewing Requests",
  "side.analytics": "Analytics",
  "side.subscription": "Subscription",
  "side.favorites": "Favorites",
  "side.savedSearches": "Saved Searches",
  "side.clients": "Clients",
  "side.properties": "Properties",
  "side.users": "Users",
  "side.verification": "Verification",
  "side.reports": "Reports",
  "side.payments": "Payments",
  "side.performance": "Performance",

  // Homepage
  "home.featured": "Featured Properties",
  "home.featured.sub": "Extraordinary spaces curated by our team.",
  "home.latest": "Latest Properties",
  "home.latest.sub": "Just added by owners and agents across Tanzania.",
  "home.categories": "Featured Categories",
  "home.categories.sub": "Every kind of space you might need — all in one trusted marketplace.",
  "home.viewAll": "View all",

  // Footer
  "footer.explore": "Explore",
  "footer.company": "Company",
  "footer.support": "Support",
  "footer.tagline": "Find Your Perfect Space.",
  "footer.rights": "All rights reserved. Dar es Salaam, Tanzania.",

  // Auth gate
  "gate.title": "Create your free account",
  "gate.sub": "Upload your property and reach thousands of buyers across Tanzania.",
  "gate.google": "Continue with Google",
  "gate.email": "Register with Email",
  "gate.have": "Already have an account?",

  // Welcome
  "welcome.title": "Welcome to SPACES",
  "welcome.sub": "Choose the language you'd like to use.",
  "welcome.hint": "You can change your language anytime in Settings.",

  // Settings > Language
  "lang.title": "Language",
  "lang.desc": "Choose the language for your SPACES experience.",
  "lang.saved": "Language updated",

  // Settings menu labels
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.notifications": "Notifications",
  "settings.privacy": "Privacy",
  "settings.support": "Support",
  "settings.about": "About",
};

const sw: Dict = {
  "nav.home": "Mwanzo",
  "nav.buy": "Nunua",
  "nav.rent": "Pangisha",
  "nav.commercial": "Biashara",
  "nav.agents": "Mawakala",
  "nav.upload": "Ongeza Mali",
  "nav.search": "Tafuta",
  "nav.login": "Ingia",
  "nav.register": "Jisajili",
  "nav.logout": "Toka",
  "nav.dashboard": "Dashibodi",
  "nav.profile": "Wasifu",
  "nav.settings": "Mipangilio",
  "nav.language": "Lugha",

  "side.myProperties": "Mali Zangu",
  "side.messages": "Ujumbe",
  "side.viewings": "Maombi ya Kutazama",
  "side.analytics": "Takwimu",
  "side.subscription": "Usajili",
  "side.favorites": "Ulizohifadhi",
  "side.savedSearches": "Utafutaji Uliohifadhiwa",
  "side.clients": "Wateja",
  "side.properties": "Mali",
  "side.users": "Watumiaji",
  "side.verification": "Uthibitisho",
  "side.reports": "Ripoti",
  "side.payments": "Malipo",
  "side.performance": "Utendaji",

  "home.featured": "Mali Zinazopendekezwa",
  "home.featured.sub": "Nafasi za kipekee zilizochaguliwa na timu yetu.",
  "home.latest": "Mali Mpya",
  "home.latest.sub": "Zilizoongezwa hivi karibuni na wamiliki na mawakala kote Tanzania.",
  "home.categories": "Aina za Mali",
  "home.categories.sub": "Kila aina ya nafasi unayohitaji — mahali pamoja pa kuaminika.",
  "home.viewAll": "Ona zote",

  "footer.explore": "Chunguza",
  "footer.company": "Kampuni",
  "footer.support": "Msaada",
  "footer.tagline": "Pata Nafasi Yako Kamili.",
  "footer.rights": "Haki zote zimehifadhiwa. Dar es Salaam, Tanzania.",

  "gate.title": "Fungua akaunti yako bila malipo",
  "gate.sub": "Ongeza mali yako na fikia maelfu ya wanunuzi kote Tanzania.",
  "gate.google": "Endelea na Google",
  "gate.email": "Jisajili kwa Barua Pepe",
  "gate.have": "Una akaunti tayari?",

  "welcome.title": "Karibu SPACES",
  "welcome.sub": "Chagua lugha unayotaka kutumia.",
  "welcome.hint": "Unaweza kubadilisha lugha wakati wowote kwenye Mipangilio.",

  "lang.title": "Lugha",
  "lang.desc": "Chagua lugha ya matumizi yako ya SPACES.",
  "lang.saved": "Lugha imebadilishwa",

  "settings.language": "Lugha",
  "settings.theme": "Mandhari",
  "settings.notifications": "Arifa",
  "settings.privacy": "Faragha",
  "settings.support": "Msaada",
  "settings.about": "Kuhusu",
};

const dicts: Record<Lang, Dict> = { en, sw };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  chosen: boolean;
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [chosen, setChosen] = useState(true); // avoid SSR flash; corrected in effect

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "sw") {
        setLangState(saved);
        setChosen(true);
      } else {
        setChosen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string) => dicts[lang][key] ?? dicts.en[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, chosen }), [lang, setLang, t, chosen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
