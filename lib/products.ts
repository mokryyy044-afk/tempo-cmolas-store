export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  tag: string;
  color: string;
  image: string;
  images: string[];
  sizes: string[];
  customizable: boolean;
  allowNumber: boolean;
  allowSurname: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
};

export type Player = {
  id: string;
  name: string;
  position: string;
  number: string;
  image: string;
  description: string;
};

export type MatchInfo = {
  opponent: string;
  date: string;
  time: string;
  place: string;
  score: string;
  tempoCrest: string;
  opponentCrest: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  image: string;
  source: "upload" | "url" | "instagram";
  albumId: string;
};

export type GalleryAlbum = {
  id: string;
  name: string;
  date: string;
  description: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logo: string;
  url: string;
  order: number;
};

export type ScheduleMatch = {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string;
  awayCrest: string;
  stadium: string;
  description: string;
  homeScore: string;
  awayScore: string;
};

export type NewsItem = {
  id: string;
  title: string;
  content: string;
  image: string;
  date: string;
  category: string;
  visible: boolean;
};

export type SocialEmbed = {
  id: string;
  title: string;
  url: string;
  platform: string;
  visible: boolean;
  order: number;
};

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type LeagueTableMode = "custom" | "embed" | "hidden";
export type LeagueTableScope = "all" | "home" | "away";
export type LeagueTableColumnId =
  | "position"
  | "crest"
  | "team"
  | "played"
  | "goals"
  | "points"
  | "form"
  | "wins"
  | "draws"
  | "losses"
  | "goalDifference"
  | "home"
  | "away";

export type LeagueTableStats = {
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDifference: string;
  goals: string;
  points: number;
  form: string;
};

export type LeagueTableTeam = {
  id: string;
  name: string;
  crest: string;
  highlight: boolean;
  all: LeagueTableStats;
  home: LeagueTableStats;
  away: LeagueTableStats;
};

export type LeagueTableColumn = {
  id: LeagueTableColumnId;
  label: string;
  visible: boolean;
  order: number;
};

export type LeagueTableConfig = {
  title: string;
  description: string;
  embedCode: string;
  visible: boolean;
  mode: LeagueTableMode;
  columns: LeagueTableColumn[];
  teams: LeagueTableTeam[];
};

export type HomeSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonHref: string;
  visible: boolean;
  order: number;
};

export type PublicTexts = {
  teamEyebrow: string;
  teamTitle: string;
  teamDescription: string;
  teamEmptyText: string;
  galleryEyebrow: string;
  galleryTitle: string;
  galleryDescription: string;
  galleryEmptyText: string;
  sponsorsEyebrow: string;
  sponsorsTitle: string;
  sponsorsDescription: string;
  sponsorsEmptyText: string;
  cartEyebrow: string;
  cartTitle: string;
  cartDescription: string;
  footerDescription: string;
};

export type SiteContent = {
  logoText: string;
  logoImage: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  homeSlides: HomeSlide[];
  clubHistory: string;
  publicTexts: PublicTexts;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  navyColor: string;
  accentColor: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  pickupText: string;
  navItems: NavigationItem[];
  facebookUrl: string;
  instagramUrl: string;
  footerText: string;
  sponsors: Sponsor[];
  schedule: ScheduleMatch[];
  news: NewsItem[];
  socialEmbeds: SocialEmbed[];
  instagramAccount: string;
  nextMatch: MatchInfo;
  lastResult: MatchInfo;
  previousMatch: MatchInfo;
  leagueTable: LeagueTableConfig;
  players: Player[];
  galleryAlbums: GalleryAlbum[];
  gallery: GalleryItem[];
};

export type OrderStatus = "nowe" | "potwierdzone" | "oplacone" | "w produkcji" | "gotowe" | "odebrane" | "anulowane";

export type OrderItem = {
  productId: number;
  name: string;
  image: string;
  price: number;
  size: string;
  number?: string;
  surname?: string;
  qty: number;
};

export type StoreOrder = {
  id: string;
  createdAt: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    delivery: "pickup" | "shipping";
    address: string;
    notes: string;
  };
  items: OrderItem[];
  total: number;
  status: OrderStatus;
};

export type AdminRole = "admin" | "moderator";

export type AdminUser = {
  login: string;
  password: string;
  role: AdminRole;
};

export type AdminSession = {
  login: string;
  role: AdminRole;
  createdAt: string;
};

export const PRODUCTS_STORAGE_KEY = "tempo-cmolas-products";
export const ORDERS_STORAGE_KEY = "tempo-cmolas-orders";
export const CATEGORIES_STORAGE_KEY = "tempo-cmolas-categories";
export const SITE_CONTENT_STORAGE_KEY = "tempo-cmolas-site-content";
export const ADMIN_USERS_STORAGE_KEY = "tempo-cmolas-admin-users";
export const ADMIN_SESSION_STORAGE_KEY = "tempo-cmolas-admin-session";
export const CMS_BACKUP_STORAGE_KEY = "tempo-cmolas-cms-backup";

export const defaultAdminUsers: AdminUser[] = [
  { login: "admin", password: "", role: "admin" },
  { login: "moderator", password: "", role: "moderator" }
];

export const orderStatuses: OrderStatus[] = ["nowe", "potwierdzone", "oplacone", "w produkcji", "gotowe", "odebrane", "anulowane"];

export const defaultCategories: ProductCategory[] = [
  { id: "koszulki-meczowe", name: "Koszulki meczowe" },
  { id: "odziez-klubowa", name: "Odzież klubowa" },
  { id: "szaliki", name: "Szaliki" },
  { id: "czapki", name: "Czapki" },
  { id: "gadzety-kibica", name: "Gadżety kibica" },
  { id: "akcesoria-sportowe", name: "Akcesoria sportowe" },
  { id: "promocje-preorder", name: "Promocje / preorder" }
];

export const defaultLeagueTableColumns: LeagueTableColumn[] = [
  { id: "position", label: "#", visible: true, order: 0 },
  { id: "crest", label: "Herb", visible: true, order: 1 },
  { id: "team", label: "Drużyna", visible: true, order: 2 },
  { id: "played", label: "Mecze", visible: true, order: 3 },
  { id: "goals", label: "Gole", visible: true, order: 4 },
  { id: "points", label: "Punkty", visible: true, order: 5 },
  { id: "form", label: "Ostatnie 5", visible: true, order: 6 },
  { id: "wins", label: "Zwycięstwa", visible: false, order: 7 },
  { id: "draws", label: "Remisy", visible: false, order: 8 },
  { id: "losses", label: "Porażki", visible: false, order: 9 },
  { id: "goalDifference", label: "Różnica", visible: false, order: 10 },
  { id: "home", label: "U siebie", visible: false, order: 11 },
  { id: "away", label: "Wyjazd", visible: false, order: 12 }
];

export const defaultSiteContent: SiteContent = {
  logoText: "Tempo Cmolas",
  logoImage: "",
  heroTitle: "KS Tempo Cmolas",
  heroText: "Oficjalny sklep i centrum informacji klubu. Niebiesko-biale barwy, produkty kibica, kadra, mecze i galeria.",
  heroImage: "/gallery-pattern.svg",
  heroPrimaryCta: "Przejdź do sklepu",
  heroSecondaryCta: "Zobacz najbliższy mecz",
  homeSlides: [
    { id: "slide-1", eyebrow: "Kolekcja Tempo", title: "Koszulki z numerem", description: "Niebiesko-białe barwy na dzień meczowy.", image: "/hero-kit.svg", buttonText: "Zobacz produkty", buttonHref: "#produkty", visible: true, order: 0 },
    { id: "slide-2", eyebrow: "Kolekcja Tempo", title: "Szaliki i czapki", description: "Klubowe dodatki dla kibiców Tempo.", image: "/scarf.svg", buttonText: "Przejdź do sklepu", buttonHref: "#sklep", visible: true, order: 1 },
    { id: "slide-3", eyebrow: "Kolekcja Tempo", title: "Bluzy klubowe", description: "Wygodna odzież klubowa na trening i trybuny.", image: "/hoodie.svg", buttonText: "Sprawdź kolekcję", buttonHref: "#produkty", visible: true, order: 2 }
  ],
  clubHistory: "KS Tempo Cmolas to lokalny klub pilkarski budowany przez zawodnikow, trenerow, kibicow i partnerow z Cmolasu. Ta sekcja jest gotowa do uzupelnienia pelna historia klubu.",
  publicTexts: {
    teamEyebrow: "Kadra",
    teamTitle: "Skład drużyny",
    teamDescription: "",
    teamEmptyText: "Skład zostanie wkrótce uzupełniony.",
    galleryEyebrow: "Galeria",
    galleryTitle: "Zdjęcia meczowe",
    galleryDescription: "",
    galleryEmptyText: "",
    sponsorsEyebrow: "Partnerzy",
    sponsorsTitle: "Sponsorzy",
    sponsorsDescription: "",
    sponsorsEmptyText: "",
    cartEyebrow: "Koszyk",
    cartTitle: "Twoje zamowienie",
    cartDescription: "Sprawdz produkty, rozmiary i personalizacje przed finalizacja.",
    footerDescription: ""
  },
  primaryColor: "#0b63ce",
  secondaryColor: "#071b3a",
  backgroundColor: "#ffffff",
  buttonColor: "#0b63ce",
  navyColor: "#071b3a",
  accentColor: "#e9f4ff",
  contactAddress: "Cmolas 630A, 36-105 Cmolas",
  contactPhone: "Telefon klubu / sklepu",
  contactEmail: "sklep@tempocmolas.pl",
  pickupText: "Odbior osobisty przy klubie",
  navItems: [
    { id: "home", label: "Strona glowna", href: "#start", visible: true },
    { id: "shop", label: "Sklep", href: "#sklep", visible: true },
    { id: "categories", label: "Kategorie", href: "#kategorie", visible: true },
    { id: "club", label: "O klubie", href: "#o-klubie", visible: true },
    { id: "team", label: "Kadra", href: "#kadra", visible: true },
    { id: "matches", label: "Mecze", href: "#mecze", visible: true },
    { id: "schedule", label: "Terminarz", href: "#terminarz", visible: true },
    { id: "table", label: "Tabela", href: "#tabela", visible: true },
    { id: "news", label: "Aktualności", href: "#aktualnosci", visible: true },
    { id: "gallery", label: "Galeria", href: "#galeria", visible: true },
    { id: "social", label: "Rolki", href: "#social", visible: true },
    { id: "cart", label: "Koszyk", href: "#koszyk", visible: true },
    { id: "contact", label: "Kontakt", href: "#kontakt", visible: true }
  ],
  facebookUrl: "",
  instagramUrl: "",
  footerText: "",
  sponsors: [],
  schedule: [],
  news: [],
  socialEmbeds: [],
  instagramAccount: "",
  nextMatch: {
    opponent: "Najblizszy rywal",
    date: "Do ustawienia",
    time: "Do ustawienia",
    place: "Stadion Tempo Cmolas",
    score: "-",
    tempoCrest: "",
    opponentCrest: ""
  },
  lastResult: {
    opponent: "Ostatni rywal",
    date: "Do ustawienia",
    time: "",
    place: "Wyjazd",
    score: "0:0",
    tempoCrest: "",
    opponentCrest: ""
  },
  previousMatch: {
    opponent: "Poprzedni rywal",
    date: "Do ustawienia",
    time: "",
    place: "Dom",
    score: "0:0",
    tempoCrest: "",
    opponentCrest: ""
  },
  leagueTable: {
    title: "Tabela ligowa",
    description: "",
    embedCode: "",
    visible: false,
    mode: "hidden",
    columns: defaultLeagueTableColumns,
    teams: []
  },
  players: [],
  galleryAlbums: [],
  gallery: []
};

export const defaultProducts: Product[] = [
  {
    id: 1,
    name: "Koszulka domowa Tempo Cmolas",
    category: "Koszulki meczowe",
    price: 159,
    description: "Niebiesko-biala koszulka domowa z opcja numeru i nazwiska.",
    tag: "Home",
    color: "Niebiesko-biala",
    image: "/jersey.svg",
    images: ["/jersey.svg"],
    sizes: ["128", "140", "152", "S", "M", "L", "XL", "XXL"],
    customizable: true,
    allowNumber: true,
    allowSurname: true
  },
  {
    id: 2,
    name: "Koszulka wyjazdowa Tempo Cmolas",
    category: "Koszulki meczowe",
    price: 159,
    description: "Biala koszulka wyjazdowa z granatowym pasem i personalizacja.",
    tag: "Away",
    color: "Biala z granatem",
    image: "/away-jersey.svg",
    images: ["/away-jersey.svg"],
    sizes: ["128", "140", "152", "S", "M", "L", "XL", "XXL"],
    customizable: true,
    allowNumber: true,
    allowSurname: true
  },
  {
    id: 3,
    name: "Bluza klubowa Tempo",
    category: "Odzież klubowa",
    price: 199,
    description: "Granatowa bluza klubowa na trening i dzien meczowy.",
    tag: "Trening",
    color: "Granatowa",
    image: "/hoodie.svg",
    images: ["/hoodie.svg"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    customizable: false,
    allowNumber: false,
    allowSurname: false
  },
  {
    id: 4,
    name: "Szalik Tempo Cmolas",
    category: "Szaliki",
    price: 69,
    description: "Niebiesko-bialy szalik kibica Tempo Cmolas.",
    tag: "Kibic",
    color: "Niebiesko-bialy",
    image: "/scarf.svg",
    images: ["/scarf.svg"],
    sizes: ["One size"],
    customizable: false,
    allowNumber: false,
    allowSurname: false
  },
  {
    id: 5,
    name: "Czapka Tempo Cmolas",
    category: "Czapki",
    price: 59,
    description: "Granatowa czapka z klubowym znakiem.",
    tag: "Logo",
    color: "Granatowa",
    image: "/cap.svg",
    images: ["/cap.svg"],
    sizes: ["S/M", "L/XL"],
    customizable: false,
    allowNumber: false,
    allowSurname: false
  },
  {
    id: 6,
    name: "Kubek klubowy Tempo",
    category: "Gadżety kibica",
    price: 39,
    description: "Bialy kubek klubowy z niebieskim akcentem.",
    tag: "Prezent",
    color: "Bialy z herbem",
    image: "/mug.svg",
    images: ["/mug.svg"],
    sizes: ["330 ml"],
    customizable: false,
    allowNumber: false,
    allowSurname: false
  }
];

export function normalizeProducts(products: unknown): Product[] {
  const list = Array.isArray(products) ? products as Partial<Product>[] : defaultProducts;
  return list.map((product, index) => {
    const existingImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    const legacyImage = product.image || existingImages[0] || "/jersey.svg";
    const images = existingImages.length > 0 ? existingImages : [legacyImage].filter(Boolean);

    return {
      ...product,
      id: Number(product.id ?? Date.now() + index),
      name: product.name ?? "Produkt",
      category: product.category ?? defaultCategories[0].name,
      price: Number(product.price ?? 0),
      description: product.description ?? "",
      tag: product.tag ?? "",
      color: product.color ?? "",
      image: product.image ?? images[0] ?? "/jersey.svg",
      images: images.length > 0 ? images : ["/jersey.svg"],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      customizable: Boolean(product.customizable || product.allowNumber || product.allowSurname),
      allowNumber: product.allowNumber ?? Boolean(product.customizable),
      allowSurname: product.allowSurname ?? Boolean(product.customizable)
    };
  });
}

export function normalizeCategories(categories: unknown): ProductCategory[] {
  return Array.isArray(categories) && categories.length > 0 ? categories as ProductCategory[] : defaultCategories;
}

export function normalizeSiteContent(content?: Partial<SiteContent>): SiteContent {
  const normalizeMatch = (match?: Partial<MatchInfo>, fallback = defaultSiteContent.nextMatch): MatchInfo => ({
    ...fallback,
    ...match,
    time: match?.time ?? fallback.time,
    tempoCrest: match?.tempoCrest ?? fallback.tempoCrest,
    opponentCrest: match?.opponentCrest ?? fallback.opponentCrest
  });

  const players = Array.isArray(content?.players)
    ? content.players.map((player) => ({ ...player, image: player.image ?? "", description: player.description ?? "" }))
    : defaultSiteContent.players;
  const galleryAlbums = Array.isArray(content?.galleryAlbums)
    ? content.galleryAlbums.map((album, index) => ({
      id: album.id ?? `album-${index}`,
      name: album.name ?? "Album",
      date: album.date ?? "",
      description: album.description ?? ""
    }))
    : defaultSiteContent.galleryAlbums;
  const gallery = Array.isArray(content?.gallery)
    ? content.gallery.map((item) => ({ ...item, albumId: item.albumId ?? "" }))
    : defaultSiteContent.gallery;
  const sponsors = Array.isArray(content?.sponsors)
    ? content.sponsors.map((sponsor, index) => ({
      id: sponsor.id ?? `sponsor-${index}`,
      name: sponsor.name ?? "",
      logo: sponsor.logo ?? "",
      url: sponsor.url ?? "",
      order: Number((sponsor as Partial<Sponsor>).order ?? index)
    })).sort((a, b) => a.order - b.order)
    : defaultSiteContent.sponsors;
  const homeSlides = Array.isArray(content?.homeSlides)
    ? content.homeSlides.map((slide, index) => ({
      id: slide.id ?? `slide-${index}`,
      eyebrow: slide.eyebrow ?? "",
      title: slide.title ?? "Slajd",
      description: slide.description ?? "",
      image: slide.image ?? "",
      buttonText: slide.buttonText ?? "",
      buttonHref: slide.buttonHref ?? "#sklep",
      visible: slide.visible ?? true,
      order: Number(slide.order ?? index)
    })).sort((a, b) => a.order - b.order)
    : defaultSiteContent.homeSlides;
  const schedule = Array.isArray(content?.schedule)
    ? content.schedule.map((match, index) => ({
      id: match.id ?? `match-${index}`,
      date: match.date ?? "",
      time: match.time ?? "",
      homeTeam: match.homeTeam ?? "Tempo Cmolas",
      awayTeam: match.awayTeam ?? "",
      homeCrest: match.homeCrest ?? "",
      awayCrest: match.awayCrest ?? "",
      stadium: match.stadium ?? "",
      description: match.description ?? "",
      homeScore: match.homeScore ?? "",
      awayScore: match.awayScore ?? ""
    })).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    : defaultSiteContent.schedule;
  const news = Array.isArray(content?.news)
    ? content.news.map((item, index) => ({
      id: item.id ?? `news-${index}`,
      title: item.title ?? "Aktualność",
      content: item.content ?? "",
      image: item.image ?? "",
      date: item.date ?? new Date().toISOString().slice(0, 10),
      category: item.category ?? "Klub",
      visible: item.visible ?? true
    })).sort((a, b) => b.date.localeCompare(a.date))
    : defaultSiteContent.news;
  const socialEmbeds = Array.isArray(content?.socialEmbeds)
    ? content.socialEmbeds.map((item, index) => ({
      id: item.id ?? `social-${index}`,
      title: item.title ?? "Rolki Tempo",
      url: item.url ?? "",
      platform: item.platform ?? "Instagram",
      visible: item.visible ?? true,
      order: Number(item.order ?? index)
    })).sort((a, b) => a.order - b.order)
    : defaultSiteContent.socialEmbeds;
  const defaultStats: LeagueTableStats = {
    position: 1,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalDifference: "0",
    goals: "0:0",
    points: 0,
    form: ""
  };
  const normalizeStats = (stats?: Partial<LeagueTableStats>, position = 1): LeagueTableStats => ({
    position: Number(stats?.position ?? position),
    played: Number(stats?.played ?? 0),
    wins: Number(stats?.wins ?? 0),
    draws: Number(stats?.draws ?? 0),
    losses: Number(stats?.losses ?? 0),
    goalDifference: stats?.goalDifference ?? "0",
    goals: stats?.goals ?? "0:0",
    points: Number(stats?.points ?? 0),
    form: stats?.form ?? ""
  });
  const leagueTeams = Array.isArray(content?.leagueTable?.teams)
    ? content.leagueTable.teams.map((team, index) => ({
      id: team.id ?? `team-${index}`,
      name: team.name ?? "Drużyna",
      crest: team.crest ?? "",
      highlight: Boolean(team.highlight || team.name?.toLowerCase().includes("tempo cmolas")),
      all: normalizeStats(team.all ?? defaultStats, index + 1),
      home: normalizeStats(team.home ?? team.all ?? defaultStats, index + 1),
      away: normalizeStats(team.away ?? team.all ?? defaultStats, index + 1)
    })).sort((a, b) => a.all.position - b.all.position)
    : [];
  const oldLeagueVisible = Boolean(content?.leagueTable?.visible);
  const oldLeagueEmbed = content?.leagueTable?.embedCode ?? "";
  const leagueMode = content?.leagueTable?.mode ?? (oldLeagueVisible && oldLeagueEmbed ? "embed" : oldLeagueVisible && leagueTeams.length > 0 ? "custom" : "hidden");
  const leagueColumns = defaultLeagueTableColumns.map((column) => {
    const saved = content?.leagueTable?.columns?.find((item) => item.id === column.id);
    return {
      id: column.id,
      label: saved?.label ?? column.label,
      visible: saved?.visible ?? column.visible,
      order: Number(saved?.order ?? column.order)
    };
  }).sort((a, b) => a.order - b.order);

  return {
    ...defaultSiteContent,
    ...content,
    secondaryColor: content?.secondaryColor ?? content?.navyColor ?? defaultSiteContent.secondaryColor,
    backgroundColor: content?.backgroundColor ?? defaultSiteContent.backgroundColor,
    buttonColor: content?.buttonColor ?? content?.primaryColor ?? defaultSiteContent.buttonColor,
    pickupText: content?.pickupText ?? defaultSiteContent.pickupText,
    publicTexts: {
      ...defaultSiteContent.publicTexts,
      ...content?.publicTexts
    },
    navItems: Array.isArray(content?.navItems) && content.navItems.length > 0
      ? content.navItems.map((item, index) => ({
        id: item.id ?? `nav-${index}`,
        label: item.label ?? "Menu",
        href: item.href ?? "#start",
        visible: item.visible ?? true
      }))
      : defaultSiteContent.navItems,
    nextMatch: normalizeMatch(content?.nextMatch, defaultSiteContent.nextMatch),
    lastResult: normalizeMatch(content?.lastResult, defaultSiteContent.lastResult),
    previousMatch: normalizeMatch(content?.previousMatch, defaultSiteContent.previousMatch),
    homeSlides,
    schedule,
    news,
    socialEmbeds,
    instagramAccount: content?.instagramAccount ?? defaultSiteContent.instagramAccount,
    leagueTable: {
      ...defaultSiteContent.leagueTable,
      ...content?.leagueTable,
      title: content?.leagueTable?.title ?? defaultSiteContent.leagueTable.title,
      description: content?.leagueTable?.description ?? "",
      embedCode: content?.leagueTable?.embedCode ?? "",
      visible: leagueMode !== "hidden",
      mode: leagueMode,
      columns: leagueColumns,
      teams: leagueTeams
    },
    players: isDemoPlayers(players) ? [] : players,
    galleryAlbums,
    gallery: isDemoGallery(gallery) ? [] : gallery,
    sponsors: isDemoSponsors(sponsors) ? [] : sponsors
  };
}

function isDemoPlayers(players: Player[]) {
  return players.length === 4 && players.every((player, index) => player.id === `p${index + 1}` && player.name === `Zawodnik ${index + 1}`);
}

function isDemoGallery(gallery: GalleryItem[]) {
  return gallery.length === 2 && gallery.some((item) => item.id === "g1") && gallery.some((item) => item.id === "g2");
}

function isDemoSponsors(sponsors: Sponsor[]) {
  return sponsors.length === 2
    && sponsors.some((sponsor) => sponsor.id === "s1" && sponsor.name === "Sponsor klubu")
    && sponsors.some((sponsor) => sponsor.id === "s2" && sponsor.name === "Partner techniczny");
}
