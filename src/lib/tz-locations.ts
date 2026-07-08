// Tanzania hierarchical location data.
// Structure is country-scoped so neighboring countries (KE, UG, RW…) can be added
// under new top-level entries without touching call sites.

export type Country = { code: string; name: string; dial: string };
export type Region = { name: string; districts: District[] };
export type District = { name: string; wards: string[] };

export const COUNTRIES: Country[] = [
  { code: "TZ", name: "Tanzania", dial: "+255" },
  // Future: { code: "KE", name: "Kenya", dial: "+254" }, etc.
];

// 31 mainland + Zanzibar regions. Ward lists are a curated subset of the most
// searched wards per district — the picker also lets users type any street name.
export const TZ_REGIONS: Region[] = [
  {
    name: "Dar es Salaam",
    districts: [
      { name: "Kinondoni", wards: ["Masaki", "Mikocheni", "Msasani", "Mwananyamala", "Sinza", "Kijitonyama", "Kawe", "Mbezi Beach", "Tegeta", "Bunju"] },
      { name: "Ilala", wards: ["Upanga", "Kariakoo", "Kivukoni", "Posta", "Ilala", "Buguruni", "Vingunguti", "Tabata", "Ukonga", "Segerea"] },
      { name: "Temeke", wards: ["Kigamboni", "Mbagala", "Chang'ombe", "Kurasini", "Mtoni", "Tandika", "Yombo Vituka", "Toangoma"] },
      { name: "Ubungo", wards: ["Ubungo", "Kimara", "Mbezi Luis", "Goba", "Kibamba", "Mabibo", "Manzese", "Sinza"] },
      { name: "Kigamboni", wards: ["Kigamboni", "Vijibweni", "Kibada", "Somangila", "Tungi", "Mjimwema"] },
    ],
  },
  {
    name: "Arusha",
    districts: [
      { name: "Arusha City", wards: ["Kati", "Kaloleni", "Sekei", "Themi", "Sombetini", "Levolosi", "Njiro", "Sanawari", "Baraa", "Unga Limited"] },
      { name: "Arusha Rural", wards: ["Mateves", "Moshono", "Kimnyaki", "Olmotonyi"] },
      { name: "Meru", wards: ["Usa River", "Tengeru", "King'ori", "Poli", "Nkoaranga"] },
      { name: "Karatu", wards: ["Karatu", "Mbulumbulu", "Endabash", "Rhotia"] },
      { name: "Monduli", wards: ["Monduli Juu", "Mto wa Mbu", "Makuyuni"] },
      { name: "Longido", wards: ["Longido", "Namanga", "Engarenaibor"] },
      { name: "Ngorongoro", wards: ["Loliondo", "Ngorongoro", "Endulen"] },
    ],
  },
  {
    name: "Kilimanjaro",
    districts: [
      { name: "Moshi Urban", wards: ["Shirimatunda", "Msaranga", "Mji Mpya", "Pasua", "Njoro", "Rau"] },
      { name: "Moshi Rural", wards: ["Kibosho", "Old Moshi", "Uru", "Mwika", "Marangu"] },
      { name: "Hai", wards: ["Bomang'ombe", "Machame", "Masama"] },
      { name: "Rombo", wards: ["Mkuu", "Tarakea", "Usseri"] },
      { name: "Same", wards: ["Same", "Mwanga", "Kisiwani"] },
      { name: "Mwanga", wards: ["Mwanga", "Kileo", "Lembeni"] },
      { name: "Siha", wards: ["Sanya Juu", "Ngarenairobi"] },
    ],
  },
  {
    name: "Mwanza",
    districts: [
      { name: "Nyamagana", wards: ["Mkuyuni", "Pamba", "Isamilo", "Mbugani", "Nyamagana", "Butimba"] },
      { name: "Ilemela", wards: ["Kirumba", "Ilemela", "Nyakato", "Buswelu", "Sangabuye"] },
      { name: "Magu", wards: ["Magu", "Ng'wagala", "Kabila"] },
      { name: "Sengerema", wards: ["Sengerema", "Nyampande", "Kasenyi"] },
      { name: "Kwimba", wards: ["Ngudu", "Malya", "Mwamashimba"] },
      { name: "Misungwi", wards: ["Misungwi", "Bukumbi"] },
      { name: "Ukerewe", wards: ["Nansio", "Bukindo"] },
    ],
  },
  {
    name: "Dodoma",
    districts: [
      { name: "Dodoma Urban", wards: ["Kilimani", "Kikuyu", "Mtumba", "Chang'ombe", "Miyuji", "Ipagala", "Chamwino"] },
      { name: "Chamwino", wards: ["Chamwino", "Buigiri", "Manzase"] },
      { name: "Bahi", wards: ["Bahi", "Mundemu"] },
      { name: "Kongwa", wards: ["Kongwa", "Mpwapwa Road", "Kibaigwa"] },
      { name: "Mpwapwa", wards: ["Mpwapwa", "Gulwe"] },
      { name: "Kondoa", wards: ["Kondoa", "Kolo"] },
      { name: "Chemba", wards: ["Chemba", "Farkwa"] },
    ],
  },
  {
    name: "Zanzibar Urban/West",
    districts: [
      { name: "Mjini", wards: ["Stone Town", "Malindi", "Mchangani", "Mkunazini", "Vuga"] },
      { name: "Magharibi A", wards: ["Fuoni", "Kianga", "Mombasa"] },
      { name: "Magharibi B", wards: ["Mwanakwerekwe", "Kibweni", "Bububu"] },
    ],
  },
  {
    name: "Zanzibar North",
    districts: [
      { name: "Kaskazini A", wards: ["Nungwi", "Kendwa", "Matemwe"] },
      { name: "Kaskazini B", wards: ["Mkokotoni", "Chaani"] },
    ],
  },
  {
    name: "Zanzibar South",
    districts: [
      { name: "Kati", wards: ["Koani", "Uzini"] },
      { name: "Kusini", wards: ["Makunduchi", "Kizimkazi", "Paje", "Jambiani"] },
    ],
  },
  {
    name: "Pemba North",
    districts: [
      { name: "Wete", wards: ["Wete", "Kojani"] },
      { name: "Micheweni", wards: ["Micheweni", "Konde"] },
    ],
  },
  {
    name: "Pemba South",
    districts: [
      { name: "Chake Chake", wards: ["Chake Chake", "Ole"] },
      { name: "Mkoani", wards: ["Mkoani", "Wambaa"] },
    ],
  },
  {
    name: "Mbeya",
    districts: [
      { name: "Mbeya City", wards: ["Iyunga", "Forest", "Sisimba", "Nzovwe", "Uyole", "Mwansekwa"] },
      { name: "Mbeya Rural", wards: ["Inyala", "Ilungu", "Ijombe"] },
      { name: "Rungwe", wards: ["Tukuyu", "Kiwira"] },
      { name: "Kyela", wards: ["Kyela", "Ipinda"] },
      { name: "Mbarali", wards: ["Rujewa", "Chimala"] },
      { name: "Chunya", wards: ["Chunya", "Makongolosi"] },
      { name: "Busokelo", wards: ["Lupata", "Ntaba"] },
    ],
  },
  {
    name: "Tanga",
    districts: [
      { name: "Tanga City", wards: ["Chumbageni", "Ngamiani", "Majengo", "Mabawa", "Central", "Nguvumali"] },
      { name: "Muheza", wards: ["Muheza", "Amani"] },
      { name: "Korogwe", wards: ["Korogwe", "Mombo"] },
      { name: "Lushoto", wards: ["Lushoto", "Soni", "Mlalo"] },
      { name: "Handeni", wards: ["Handeni", "Kabuku"] },
      { name: "Kilindi", wards: ["Songe", "Kwediboma"] },
      { name: "Pangani", wards: ["Pangani", "Bushiri"] },
      { name: "Mkinga", wards: ["Kasera", "Maramba"] },
    ],
  },
  {
    name: "Morogoro",
    districts: [
      { name: "Morogoro Urban", wards: ["Boma", "Kihonda", "Sabasaba", "Uwanja wa Taifa", "Mji Mkuu"] },
      { name: "Morogoro Rural", wards: ["Mkuyuni", "Mvuha"] },
      { name: "Kilombero", wards: ["Ifakara", "Mang'ula"] },
      { name: "Mvomero", wards: ["Turiani", "Mtibwa"] },
      { name: "Kilosa", wards: ["Kilosa", "Mikumi"] },
      { name: "Ulanga", wards: ["Mahenge", "Vigoi"] },
      { name: "Gairo", wards: ["Gairo", "Nongwe"] },
      { name: "Malinyi", wards: ["Malinyi", "Igawa"] },
    ],
  },
  {
    name: "Pwani",
    districts: [
      { name: "Kibaha Urban", wards: ["Mailimoja", "Tumbi", "Pangani"] },
      { name: "Kibaha Rural", wards: ["Mlandizi", "Ruvu"] },
      { name: "Bagamoyo", wards: ["Bagamoyo", "Kiromo", "Zinga"] },
      { name: "Kisarawe", wards: ["Kisarawe", "Maneromango"] },
      { name: "Mkuranga", wards: ["Mkuranga", "Kisiju"] },
      { name: "Rufiji", wards: ["Utete", "Ikwiriri"] },
      { name: "Mafia", wards: ["Kilindoni", "Utende"] },
      { name: "Chalinze", wards: ["Chalinze", "Msata"] },
    ],
  },
  {
    name: "Iringa",
    districts: [
      { name: "Iringa Urban", wards: ["Mkwawa", "Gangilonga", "Mivinjeni", "Kihesa"] },
      { name: "Iringa Rural", wards: ["Kalenga", "Ilula"] },
      { name: "Mufindi", wards: ["Mafinga", "Sao Hill"] },
      { name: "Kilolo", wards: ["Kilolo", "Ilula"] },
    ],
  },
  {
    name: "Njombe",
    districts: [
      { name: "Njombe Urban", wards: ["Njombe", "Ramadhani", "Uwemba"] },
      { name: "Makambako", wards: ["Makambako", "Mahongole"] },
      { name: "Makete", wards: ["Makete", "Iwawa"] },
      { name: "Ludewa", wards: ["Ludewa", "Manda"] },
      { name: "Wanging'ombe", wards: ["Wanging'ombe", "Igwachanya"] },
    ],
  },
  {
    name: "Ruvuma",
    districts: [
      { name: "Songea Urban", wards: ["Songea", "Ruhuwiko", "Mshangano"] },
      { name: "Songea Rural", wards: ["Peramiho", "Maposeni"] },
      { name: "Mbinga", wards: ["Mbinga", "Mkumbi"] },
      { name: "Tunduru", wards: ["Tunduru", "Nakapanya"] },
      { name: "Namtumbo", wards: ["Namtumbo", "Kitanda"] },
      { name: "Nyasa", wards: ["Mbamba Bay", "Liuli"] },
    ],
  },
  {
    name: "Mtwara",
    districts: [
      { name: "Mtwara Urban", wards: ["Shangani", "Chikongola", "Magomeni", "Majengo"] },
      { name: "Mtwara Rural", wards: ["Ziwani", "Mayanga"] },
      { name: "Newala", wards: ["Newala", "Chihangu"] },
      { name: "Tandahimba", wards: ["Tandahimba", "Mkalu"] },
      { name: "Masasi", wards: ["Masasi", "Chikundi"] },
      { name: "Nanyumbu", wards: ["Nanyumbu", "Mangaka"] },
    ],
  },
  {
    name: "Lindi",
    districts: [
      { name: "Lindi Urban", wards: ["Mingoyo", "Msinjahili", "Rasbura"] },
      { name: "Lindi Rural", wards: ["Nyangao", "Mnara"] },
      { name: "Kilwa", wards: ["Kilwa Masoko", "Kivinje"] },
      { name: "Liwale", wards: ["Liwale", "Mkutano"] },
      { name: "Nachingwea", wards: ["Nachingwea", "Ruponda"] },
      { name: "Ruangwa", wards: ["Ruangwa", "Namichiga"] },
    ],
  },
  {
    name: "Singida",
    districts: [
      { name: "Singida Urban", wards: ["Ipembe", "Mtamaa", "Mandewa"] },
      { name: "Singida Rural", wards: ["Ilongero", "Merya"] },
      { name: "Iramba", wards: ["Kiomboi", "Ndago"] },
      { name: "Manyoni", wards: ["Manyoni", "Itigi"] },
      { name: "Ikungi", wards: ["Ikungi", "Mungaa"] },
      { name: "Mkalama", wards: ["Nduguti", "Iguguno"] },
    ],
  },
  {
    name: "Tabora",
    districts: [
      { name: "Tabora Urban", wards: ["Kanyenye", "Cheyo", "Ipuli", "Ng'ambo"] },
      { name: "Uyui", wards: ["Isikizya", "Loya"] },
      { name: "Igunga", wards: ["Igunga", "Nanga"] },
      { name: "Nzega", wards: ["Nzega", "Bukene"] },
      { name: "Sikonge", wards: ["Sikonge", "Kipili"] },
      { name: "Urambo", wards: ["Urambo", "Kaliua"] },
      { name: "Kaliua", wards: ["Kaliua", "Ushirika"] },
    ],
  },
  {
    name: "Kigoma",
    districts: [
      { name: "Kigoma Ujiji", wards: ["Gungu", "Kigoma", "Bangwe", "Kibirizi", "Mwanga"] },
      { name: "Kigoma Rural", wards: ["Ilagala", "Mwandiga"] },
      { name: "Kasulu", wards: ["Kasulu", "Muhange"] },
      { name: "Kibondo", wards: ["Kibondo", "Kifura"] },
      { name: "Buhigwe", wards: ["Buhigwe", "Munyegera"] },
      { name: "Uvinza", wards: ["Uvinza", "Nguruka"] },
      { name: "Kakonko", wards: ["Kakonko", "Mugunzu"] },
    ],
  },
  {
    name: "Kagera",
    districts: [
      { name: "Bukoba Urban", wards: ["Bakoba", "Miembeni", "Kashai", "Buhembe"] },
      { name: "Bukoba Rural", wards: ["Kyaka", "Katoro"] },
      { name: "Karagwe", wards: ["Kayanga", "Nyakahanga"] },
      { name: "Muleba", wards: ["Muleba", "Kagoma"] },
      { name: "Biharamulo", wards: ["Biharamulo", "Nyantakara"] },
      { name: "Ngara", wards: ["Ngara", "Rulenge"] },
      { name: "Missenyi", wards: ["Bunazi", "Kilimilile"] },
      { name: "Kyerwa", wards: ["Kyerwa", "Rukuraijo"] },
    ],
  },
  {
    name: "Mara",
    districts: [
      { name: "Musoma Urban", wards: ["Mwisenge", "Bweri", "Mukendo", "Nyasho"] },
      { name: "Musoma Rural", wards: ["Bukima", "Suguti"] },
      { name: "Bunda", wards: ["Bunda", "Mugeta"] },
      { name: "Serengeti", wards: ["Mugumu", "Nyansurura"] },
      { name: "Tarime", wards: ["Tarime", "Sirari"] },
      { name: "Rorya", wards: ["Shirati", "Utegi"] },
      { name: "Butiama", wards: ["Butiama", "Kyanyari"] },
    ],
  },
  {
    name: "Shinyanga",
    districts: [
      { name: "Shinyanga Urban", wards: ["Ndala", "Kolandoto", "Chibe", "Kambarage"] },
      { name: "Shinyanga Rural", wards: ["Tinde", "Puni"] },
      { name: "Kahama", wards: ["Kahama", "Mwendakulima"] },
      { name: "Kishapu", wards: ["Kishapu", "Mondo"] },
      { name: "Msalala", wards: ["Bulige", "Bugarama"] },
      { name: "Ushetu", wards: ["Ushetu", "Ubagwe"] },
    ],
  },
  {
    name: "Simiyu",
    districts: [
      { name: "Bariadi", wards: ["Bariadi", "Sagata"] },
      { name: "Itilima", wards: ["Nkololo", "Zagayu"] },
      { name: "Maswa", wards: ["Maswa", "Malampaka"] },
      { name: "Meatu", wards: ["Mwanhuzi", "Mwabuma"] },
      { name: "Busega", wards: ["Nyashimo", "Lamadi"] },
    ],
  },
  {
    name: "Geita",
    districts: [
      { name: "Geita Urban", wards: ["Bombambili", "Katoro", "Mtakuja"] },
      { name: "Geita Rural", wards: ["Nyamalulu", "Butundwe"] },
      { name: "Chato", wards: ["Chato", "Buseresere"] },
      { name: "Bukombe", wards: ["Ushirombo", "Runzewe"] },
      { name: "Nyang'hwale", wards: ["Kharumwa", "Bukwimba"] },
      { name: "Mbogwe", wards: ["Masumbwe", "Nanda"] },
    ],
  },
  {
    name: "Rukwa",
    districts: [
      { name: "Sumbawanga Urban", wards: ["Kanondo", "Katandala", "Mpanda Road", "Nzunda"] },
      { name: "Sumbawanga Rural", wards: ["Mtowisa", "Laela"] },
      { name: "Kalambo", wards: ["Matai", "Kasanga"] },
      { name: "Nkasi", wards: ["Namanyere", "Kirando"] },
    ],
  },
  {
    name: "Katavi",
    districts: [
      { name: "Mpanda Urban", wards: ["Mpanda", "Kashaulili"] },
      { name: "Mpanda Rural", wards: ["Mpimbwe", "Inyonga"] },
      { name: "Mlele", wards: ["Inyonga", "Utende"] },
      { name: "Nsimbo", wards: ["Nsimbo", "Kapalamsenga"] },
    ],
  },
  {
    name: "Songwe",
    districts: [
      { name: "Mbozi", wards: ["Vwawa", "Mlowo"] },
      { name: "Ileje", wards: ["Itumba", "Bupigu"] },
      { name: "Momba", wards: ["Chitete", "Kamsamba"] },
      { name: "Songwe", wards: ["Mkwajuni", "Galula"] },
      { name: "Tunduma", wards: ["Tunduma", "Mpemba"] },
    ],
  },
  {
    name: "Manyara",
    districts: [
      { name: "Babati Urban", wards: ["Babati", "Bagara", "Sigino"] },
      { name: "Babati Rural", wards: ["Magugu", "Mamire"] },
      { name: "Hanang", wards: ["Katesh", "Endasak"] },
      { name: "Mbulu", wards: ["Mbulu", "Haydom"] },
      { name: "Simanjiro", wards: ["Orkesumet", "Mererani"] },
      { name: "Kiteto", wards: ["Kibaya", "Sunya"] },
    ],
  },
];

export const TZ_REGION_NAMES = TZ_REGIONS.map((r) => r.name);

export function getRegion(name?: string) {
  if (!name) return undefined;
  return TZ_REGIONS.find((r) => r.name.toLowerCase() === name.toLowerCase());
}

export function getDistricts(regionName?: string): District[] {
  return getRegion(regionName)?.districts ?? [];
}

export function getDistrict(regionName?: string, districtName?: string) {
  if (!districtName) return undefined;
  return getDistricts(regionName).find((d) => d.name.toLowerCase() === districtName.toLowerCase());
}

export function getWards(regionName?: string, districtName?: string): string[] {
  return getDistrict(regionName, districtName)?.wards ?? [];
}

// Flat search index — region / district / ward. Used by location search.
export type LocationHit = {
  kind: "region" | "district" | "ward";
  region: string;
  district?: string;
  ward?: string;
  label: string;      // "Masaki, Kinondoni, Dar es Salaam"
  path: string[];     // ["Dar es Salaam", "Kinondoni", "Masaki"]
};

let _index: LocationHit[] | null = null;
function buildIndex(): LocationHit[] {
  if (_index) return _index;
  const out: LocationHit[] = [];
  for (const r of TZ_REGIONS) {
    out.push({ kind: "region", region: r.name, label: r.name, path: [r.name] });
    for (const d of r.districts) {
      out.push({
        kind: "district", region: r.name, district: d.name,
        label: `${d.name}, ${r.name}`, path: [r.name, d.name],
      });
      for (const w of d.wards) {
        out.push({
          kind: "ward", region: r.name, district: d.name, ward: w,
          label: `${w}, ${d.name}, ${r.name}`, path: [r.name, d.name, w],
        });
      }
    }
  }
  _index = out;
  return out;
}

export function searchLocations(q: string, limit = 12): LocationHit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const idx = buildIndex();
  const starts: LocationHit[] = [];
  const contains: LocationHit[] = [];
  for (const h of idx) {
    const l = h.label.toLowerCase();
    if (l.startsWith(query)) starts.push(h);
    else if (l.includes(query)) contains.push(h);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
