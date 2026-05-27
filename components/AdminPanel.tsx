"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  Home,
  ImagePlus,
  Images,
  LayoutDashboard,
  Lock,
  LogOut,
  PackagePlus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { sanitizeIframeEmbed } from "@/lib/embed";
import {
  ADMIN_USERS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  CMS_BACKUP_STORAGE_KEY,
  ORDERS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
  SITE_CONTENT_STORAGE_KEY,
  defaultAdminUsers,
  defaultCategories,
  defaultLeagueTableColumns,
  defaultProducts,
  defaultSiteContent,
  normalizeCategories,
  normalizeProducts,
  normalizeSiteContent,
  orderStatuses,
  type AdminSession,
  type AdminUser,
  type GalleryItem,
  type LeagueTableColumn,
  type LeagueTableColumnId,
  type LeagueTableScope,
  type LeagueTableStats,
  type LeagueTableTeam,
  type OrderStatus,
  type Player,
  type Product,
  type ProductCategory,
  type SiteContent,
  type Sponsor,
  type StoreOrder
} from "@/lib/products";
import {
  IMAGE_OPTIMIZED_SUCCESS,
  IMAGE_SAVE_SUCCESS,
  formatImageUploadError,
  formatStorageDataError,
  formatStorageImageError,
  normalizeImageSource,
  uploadImage
} from "@/lib/imageUpload";
import {
  loadRemoteCmsData,
  saveRemoteCategories,
  saveRemoteOrders,
  saveRemoteProducts,
  saveRemoteSiteContent,
  saveRemoteUsers
} from "@/lib/remoteCms";
import { safeSetLocalJson } from "@/lib/localCache";

type AdminSection =
  | "dashboard"
  | "products"
  | "orders"
  | "categories"
  | "home"
  | "slider"
  | "content"
  | "club"
  | "matches"
  | "schedule"
  | "leagueTable"
  | "team"
  | "news"
  | "social"
  | "gallery"
  | "sponsors"
  | "menu"
  | "settings";

type CmsBackup = {
  products?: unknown;
  categories?: unknown;
  orders?: unknown;
  siteContent?: Partial<SiteContent>;
  users?: unknown;
  exportedAt?: string;
  version?: number;
};

const emptyProduct: Product = {
  id: 0,
  name: "",
  category: "Koszulki meczowe",
  price: 0,
  description: "",
  tag: "Nowy",
  color: "",
  image: "",
  images: [],
  sizes: [],
  customizable: false,
  allowNumber: false,
  allowSurname: false
};

const sections: { id: AdminSection; label: string; icon: typeof LayoutDashboard; moderator?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Produkty", icon: Boxes },
  { id: "orders", label: "Zamówienia", icon: ShoppingCart },
  { id: "categories", label: "Kategorie", icon: Tags },
  { id: "home", label: "Strona główna", icon: Home },
  { id: "slider", label: "Slider strony głównej", icon: Images },
  { id: "content", label: "Treści strony", icon: ShieldCheck },
  { id: "club", label: "Klub", icon: ShieldCheck, moderator: true },
  { id: "matches", label: "Mecze", icon: CalendarDays, moderator: true },
  { id: "schedule", label: "Terminarz", icon: CalendarDays, moderator: true },
  { id: "leagueTable", label: "Tabela ligowa", icon: BarChart3, moderator: true },
  { id: "team", label: "Kadra", icon: Users, moderator: true },
  { id: "news", label: "Aktualności", icon: ShieldCheck, moderator: true },
  { id: "social", label: "Social media / Rolki", icon: Images, moderator: true },
  { id: "gallery", label: "Galeria", icon: Images, moderator: true },
  { id: "sponsors", label: "Sponsorzy", icon: BarChart3 },
  { id: "menu", label: "Menu / Nawigacja", icon: Tags },
  { id: "settings", label: "Ustawienia strony", icon: Settings }
];

export function AdminPanel() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>(defaultCategories);
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>(defaultAdminUsers);
  const [draft, setDraft] = useState<Product>(emptyProduct);
  const [notice, setNotice] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("Wszystkie");
  const [credentials, setCredentials] = useState({ login: "", password: "" });

  const isAdmin = session?.role === "admin";
  const canEditSection = isAdmin || ["dashboard", "club", "matches", "schedule", "leagueTable", "team", "news", "social", "gallery"].includes(activeSection);
  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase();
    return products.filter((product) => {
      const matchesSearch = [product.name, product.category, product.description].join(" ").toLowerCase().includes(query);
      const matchesCategory = productCategory === "Wszystkie" || product.category === productCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategory]);

  useEffect(() => {
    function readStorage(key: string) {
      try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch {
        window.localStorage.removeItem(key);
        return null;
      }
    }

    const normalizedUsers = Array.isArray(readStorage(ADMIN_USERS_STORAGE_KEY)) ? readStorage(ADMIN_USERS_STORAGE_KEY) as AdminUser[] : defaultAdminUsers;
    setUsers(normalizedUsers);
    safeSetLocalJson(ADMIN_USERS_STORAGE_KEY, normalizedUsers);
    setCredentials({ login: normalizedUsers[0]?.login ?? "", password: normalizedUsers[0]?.password ?? "" });

    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.href = "/admin/login/";
          return;
        }
        const parsedSession = await response.json() as AdminSession;
        setSession(parsedSession);
        setAuthReady(true);
      })
      .catch(() => {
        window.location.href = "/admin/login/";
      });

    const localBackup = readStorage(CMS_BACKUP_STORAGE_KEY) as CmsBackup | null;

    const nextProducts = normalizeProducts(readStorage(PRODUCTS_STORAGE_KEY) ?? localBackup?.products ?? defaultProducts);
    setProducts(nextProducts);
    safeSetLocalJson(PRODUCTS_STORAGE_KEY, nextProducts);

    const nextCategories = normalizeCategories(readStorage(CATEGORIES_STORAGE_KEY) ?? localBackup?.categories ?? defaultCategories);
    setCategories(nextCategories);
    safeSetLocalJson(CATEGORIES_STORAGE_KEY, nextCategories);

    const nextContent = normalizeSiteContent((readStorage(SITE_CONTENT_STORAGE_KEY) ?? localBackup?.siteContent) as Partial<SiteContent> | undefined);
    setSiteContent(nextContent);
    safeSetLocalJson(SITE_CONTENT_STORAGE_KEY, nextContent);

    const savedOrders = readStorage(ORDERS_STORAGE_KEY) ?? localBackup?.orders;
    setOrders(Array.isArray(savedOrders) ? savedOrders as StoreOrder[] : []);

    loadRemoteCmsData()
      .then((remote) => {
        const remoteProducts = normalizeProducts(remote.products ?? nextProducts);
        const remoteCategories = normalizeCategories(remote.categories ?? nextCategories);
        const remoteContent = normalizeSiteContent(remote.siteContent ?? nextContent);
        const remoteOrders = Array.isArray(remote.orders) ? remote.orders as StoreOrder[] : [];
        const remoteUsers = Array.isArray(remote.users) ? remote.users as AdminUser[] : normalizedUsers;

        setProducts(remoteProducts);
        setCategories(remoteCategories);
        setSiteContent(remoteContent);
        setOrders(remoteOrders);
        setUsers(remoteUsers);
        setCredentials({ login: remoteUsers[0]?.login ?? "", password: remoteUsers[0]?.password ?? "" });
        safeSetLocalJson(PRODUCTS_STORAGE_KEY, remoteProducts);
        safeSetLocalJson(CATEGORIES_STORAGE_KEY, remoteCategories);
        safeSetLocalJson(SITE_CONTENT_STORAGE_KEY, remoteContent);
        safeSetLocalJson(ORDERS_STORAGE_KEY, remoteOrders);
        safeSetLocalJson(ADMIN_USERS_STORAGE_KEY, remoteUsers);
        writeLocalBackup({ products: remoteProducts, categories: remoteCategories, siteContent: remoteContent, orders: remoteOrders, users: remoteUsers });
        setNotice("Połączono z Supabase. Dane CMS są wspólne dla urządzeń.");
      })
      .catch(() => {
        setNotice("Tryb lokalny/cache. Skonfiguruj Supabase, żeby dane były wspólne dla urządzeń.");
      });
  }, []);

  async function saveProducts(nextProducts: Product[], message = "Zapisano produkty. Zmiany od razu pojawią się w sklepie.") {
    const normalized = normalizeProducts(nextProducts);
    setProducts(normalized);
    writeLocalBackup({ products: normalized });
    safeSetLocalJson(PRODUCTS_STORAGE_KEY, normalized);
    try {
      await saveRemoteProducts(normalized);
      setNotice(message);
    } catch (error) {
      console.error("Błąd zapisu produktów w Supabase", error);
      setNotice("Nie udało się zapisać w Supabase. Sprawdź połączenie i konfigurację.");
    }
  }

  async function saveCategories(nextCategories: ProductCategory[]) {
    const normalized = normalizeCategories(nextCategories);
    setCategories(normalized);
    writeLocalBackup({ categories: normalized });
    safeSetLocalJson(CATEGORIES_STORAGE_KEY, normalized);
    try {
      await saveRemoteCategories(normalized);
      setNotice("Zapisano");
    } catch (error) {
      console.error("Błąd zapisu kategorii w Supabase", error);
      setNotice("Nie udało się zapisać w Supabase. Sprawdź połączenie i konfigurację.");
    }
  }

  async function saveContent(nextContent: SiteContent, message = "Zapisano treści strony.", imageSave = false) {
    const normalized = normalizeSiteContent(nextContent);
    setSiteContent(normalized);
    writeLocalBackup({ siteContent: normalized });
    safeSetLocalJson(SITE_CONTENT_STORAGE_KEY, normalized);
    try {
      await saveRemoteSiteContent(normalized);
      setNotice(message);
    } catch (error) {
      console.error("Błąd zapisu treści w Supabase", error, imageSave ? formatStorageImageError(error) : formatStorageDataError(error));
      setNotice("Nie udało się zapisać w Supabase. Sprawdź połączenie i konfigurację.");
    }
  }

  async function saveOrders(nextOrders: StoreOrder[]) {
    setOrders(nextOrders);
    writeLocalBackup({ orders: nextOrders });
    safeSetLocalJson(ORDERS_STORAGE_KEY, nextOrders);
    try {
      await saveRemoteOrders(nextOrders);
      setNotice("Zapisano");
    } catch (error) {
      console.error("Błąd zapisu zamówień w Supabase", error);
      setNotice("Nie udało się zapisać w Supabase. Sprawdź połączenie i konfigurację.");
    }
  }

  async function saveUsers(nextUsers: AdminUser[]) {
    if (!isAdmin) return;
    setUsers(nextUsers);
    writeLocalBackup({ users: nextUsers });
    safeSetLocalJson(ADMIN_USERS_STORAGE_KEY, nextUsers);
    try {
      await saveRemoteUsers(nextUsers);
      setNotice("Zapisano");
    } catch (error) {
      console.error("Błąd zapisu użytkowników w Supabase", error);
      setNotice("Nie udało się zapisać w Supabase. Sprawdź połączenie i konfigurację.");
    }
  }

  function addProduct() {
    if (!isAdmin) {
      setNotice("Moderator nie może zarządzać produktami.");
      return;
    }
    if (!draft.name.trim() || draft.price <= 0) {
      setNotice("Podaj nazwę produktu i cenę większą od 0.");
      return;
    }
    const draftImages = getProductImages(draft);
    saveProducts([{ ...draft, id: Date.now(), image: draft.image || draftImages[0] || "", images: draftImages, sizes: draft.sizes.filter(Boolean), customizable: draft.allowNumber || draft.allowSurname }, ...products], "Dodano");
    setDraft(emptyProduct);
  }

  function writeLocalBackup(overrides: Partial<CmsBackup> = {}) {
    try {
      const backup: CmsBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        products,
        categories,
        orders,
        siteContent,
        users,
        ...overrides
      };
      safeSetLocalJson(CMS_BACKUP_STORAGE_KEY, backup);
    } catch {
      // Manual export still remains available if the automatic backup exceeds browser storage.
    }
  }

  function updateProduct(id: number, patch: Partial<Product>) {
    if (!isAdmin) return;
    saveProducts(products.map((product) => {
      if (product.id !== id) return product;
      const nextProduct = { ...product, ...patch };
      return { ...nextProduct, customizable: nextProduct.allowNumber || nextProduct.allowSurname };
    }), "Zmieniono");
  }

  function deleteProduct(id: number) {
    if (!isAdmin) {
      setNotice("Moderator nie może usuwać produktów.");
      return;
    }
    saveProducts(products.filter((product) => product.id !== id), "Usunięto");
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    window.location.href = "/admin/login/";
  }

  function updateMatch(key: "nextMatch" | "lastResult" | "previousMatch", field: string, value: string, imageSave = false) {
    saveContent({ ...siteContent, [key]: { ...siteContent[key], [field]: value } }, imageSave ? IMAGE_OPTIMIZED_SUCCESS : "Zmieniono", imageSave);
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    saveContent(
      { ...siteContent, players: siteContent.players.map((player) => (player.id === id ? { ...player, ...patch } : player)) },
      patch.image !== undefined ? IMAGE_OPTIMIZED_SUCCESS : "Zmieniono",
      patch.image !== undefined
    );
  }

  function addPlayer() {
    saveContent({
      ...siteContent,
      players: [...siteContent.players, { id: `player-${Date.now()}`, name: "Nowy zawodnik", position: "Pozycja", number: "", image: "", description: "" }]
    }, "Dodano");
  }

  function removePlayer(id: string) {
    saveContent({ ...siteContent, players: siteContent.players.filter((player) => player.id !== id) }, "Usunięto");
  }

  function movePlayer(id: string, direction: -1 | 1) {
    const index = siteContent.players.findIndex((player) => player.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siteContent.players.length) return;
    const players = [...siteContent.players];
    [players[index], players[nextIndex]] = [players[nextIndex], players[index]];
    saveContent({ ...siteContent, players }, "Zmieniono");
  }

  function addSponsor() {
    if (!isAdmin) return;
    const sponsor: Sponsor = { id: `sponsor-${Date.now()}`, name: "Nowy sponsor", logo: "", url: "", order: siteContent.sponsors.length };
    saveContent({ ...siteContent, sponsors: [sponsor, ...siteContent.sponsors].map((item, index) => ({ ...item, order: index })) }, "Dodano");
  }

  function updateSponsor(id: string, patch: Partial<Sponsor>) {
    if (!isAdmin) return;
    saveContent({ ...siteContent, sponsors: siteContent.sponsors.map((sponsor) => (sponsor.id === id ? { ...sponsor, ...patch } : sponsor)) }, "Zmieniono", Boolean(patch.logo !== undefined));
  }

  if (!authReady || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050b16] text-white">
        <div className="rounded border border-white/10 bg-white/8 p-5 font-black">Ładuję bezpieczny panel CMS...</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden text-white lg:grid lg:grid-cols-[280px_1fr]"
      style={{
        backgroundColor: siteContent.secondaryColor,
        "--tempo-blue": siteContent.primaryColor,
        "--tempo-navy": siteContent.secondaryColor,
        "--tempo-sky": siteContent.accentColor
      } as React.CSSProperties}
    >
      <aside className="border-b border-white/10 bg-[#081221] p-3 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded font-black" style={{ backgroundColor: siteContent.buttonColor }}>TC</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ecbff]">Tempo CMS</p>
            <p className="font-black">{session.login} / {session.role}</p>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:mt-6 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0">
          {sections.map((item) => {
            const Icon = item.icon;
            const locked = session.role === "moderator" && !item.moderator && item.id !== "dashboard";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                style={activeSection === item.id ? { backgroundColor: siteContent.buttonColor } : undefined}
                className={`flex min-h-12 shrink-0 items-center gap-2 rounded px-3 py-3 text-left text-xs font-black transition sm:text-sm lg:w-full ${activeSection === item.id ? "text-white" : "text-white/68 hover:bg-white/8 hover:text-white"}`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {locked ? <Lock size={14} className="text-white/35" /> : null}
              </button>
            );
          })}
        </nav>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:mt-6 lg:grid-cols-1">
          <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded border border-white/12 text-sm font-black uppercase text-white/78 transition hover:bg-white/8">
            <Home size={17} />
            Podgląd strony
          </Link>
          <button onClick={logout} className="inline-flex h-11 items-center justify-center gap-2 rounded bg-white text-sm font-black uppercase text-[#071b3a]">
            <LogOut size={17} />
            Wyloguj
          </button>
        </div>
      </aside>

      <section className="min-w-0 p-3 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#9ecbff]">Profesjonalny panel administracyjny</p>
            <h1 className="mt-2 text-2xl font-black uppercase leading-tight sm:text-4xl xl:text-5xl">{sections.find((section) => section.id === activeSection)?.label}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-white/58">
              Po konfiguracji Supabase panel zapisuje dane we wspólnej bazie i Storage. localStorage zostaje tylko jako cache awaryjny oraz backup import/eksport.
            </p>
          </div>
          <div className="rounded border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-[#9ecbff]">
            {isAdmin ? "Pełne uprawnienia admina" : "Tryb moderatora: galeria, mecze i kadra"}
          </div>
        </header>

        {notice ? <div className="mt-5 rounded border border-[#0b63ce]/40 bg-[#0b63ce]/15 p-3 text-sm font-black leading-6 text-[#bfe0ff]">{notice}</div> : null}
        {!canEditSection ? <LockedPanel /> : renderSection()}
      </section>
    </main>
  );

  function renderSection() {
    if (activeSection === "dashboard") {
      return (
        <section className="mt-8 grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStat value={String(products.length)} label="Produkty" />
            <AdminStat value={String(orders.length)} label="Zamówienia" />
            <AdminStat value={`${totalRevenue} zł`} label="Wartość zamówień" />
            <AdminStat value={String(siteContent.gallery.length)} label="Zdjęcia w galerii" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <PanelCard title="Szybka edycja strony głównej">
              <CMSInput label="Tytuł hero" value={siteContent.heroTitle} onChange={(heroTitle) => saveContent({ ...siteContent, heroTitle })} />
              <CMSTextarea label="Tekst hero" value={siteContent.heroText} onChange={(heroText) => saveContent({ ...siteContent, heroText })} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CMSInput label="Tekst głównego przycisku" value={siteContent.heroPrimaryCta} onChange={(heroPrimaryCta) => saveContent({ ...siteContent, heroPrimaryCta })} />
                <CMSInput label="Tekst drugiego przycisku" value={siteContent.heroSecondaryCta} onChange={(heroSecondaryCta) => saveContent({ ...siteContent, heroSecondaryCta })} />
              </div>
            </PanelCard>
            <LivePreview content={siteContent} />
          </div>
        </section>
      );
    }

    if (activeSection === "products") {
      return (
        <section className="mt-8 grid gap-5">
          <PanelCard title="Dodaj nowy produkt">
            {!isAdmin ? <RoleNote /> : <ProductEditor product={draft} categories={categories} onChange={setDraft} />}
            {isAdmin ? (
              <button onClick={addProduct} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#0b63ce] px-5 py-3 text-sm font-black uppercase text-white transition hover:bg-[#084da3] sm:w-auto">
                <PackagePlus size={18} />
                Dodaj nowy produkt
              </button>
            ) : null}
          </PanelCard>

          <PanelCard title="Produkty w sklepie">
            <SaveSectionButton onClick={() => saveProducts(products, "Zapisano")} />
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Szukaj produktu..." className="h-11 w-full rounded border border-white/12 bg-white/8 pl-10 pr-3 font-bold text-white outline-none focus:border-[#9ecbff]" />
              </label>
              <select value={productCategory} onChange={(event) => setProductCategory(event.target.value)} className="h-11 rounded border border-white/12 bg-[#0b1728] px-3 font-bold text-white outline-none">
                {["Wszystkie", ...categories.map((category) => category.name)].map((category) => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div className="grid gap-4">
              {filteredProducts.map((product) => (
                <article key={product.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
                  <div className="grid min-w-0 gap-5 xl:grid-cols-[150px_1fr_auto]">
                    <ProductImagePreview product={product} />
                    <ProductEditor product={product} categories={categories} onChange={(next) => updateProduct(product.id, next)} disabled={!isAdmin} />
                    <button onClick={() => deleteProduct(product.id)} disabled={!isAdmin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-red-400/30 px-4 py-3 text-sm font-black uppercase text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35">
                      <Trash2 size={18} />
                      Usuń
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </PanelCard>
        </section>
      );
    }

    if (activeSection === "orders") return <OrdersSection orders={orders} saveOrders={saveOrders} />;
    if (activeSection === "categories") return <CategoriesSection categories={categories} saveCategories={saveCategories} isAdmin={isAdmin} />;
    if (activeSection === "home") return <HomeSection content={siteContent} saveContent={saveContent} isAdmin={isAdmin} />;
    if (activeSection === "slider") return <SliderSection content={siteContent} saveContent={saveContent} isAdmin={isAdmin} />;
    if (activeSection === "content") return <ContentTextsSection content={siteContent} saveContent={saveContent} isAdmin={isAdmin} />;
    if (activeSection === "club") return <ClubSection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "matches") return <MatchesSection content={siteContent} updateMatch={updateMatch} saveContent={saveContent} />;
    if (activeSection === "schedule") return <ScheduleSection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "leagueTable") return <LeagueTableSection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "team") return <TeamSection content={siteContent} addPlayer={addPlayer} updatePlayer={updatePlayer} removePlayer={removePlayer} movePlayer={movePlayer} saveContent={saveContent} />;
    if (activeSection === "news") return <NewsSection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "social") return <SocialSection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "gallery") return <GallerySection content={siteContent} saveContent={saveContent} />;
    if (activeSection === "sponsors") return <SponsorsSection content={siteContent} addSponsor={addSponsor} updateSponsor={updateSponsor} saveContent={saveContent} isAdmin={isAdmin} />;
    if (activeSection === "menu") return <MenuSection content={siteContent} saveContent={saveContent} isAdmin={isAdmin} />;
    return (
      <SettingsSection
        content={siteContent}
        saveContent={saveContent}
        users={users}
        saveUsers={saveUsers}
        credentials={credentials}
        setCredentials={setCredentials}
        isAdmin={isAdmin}
        products={products}
        categories={categories}
        orders={orders}
        siteContent={siteContent}
        onImportBackup={(backup) => {
          try {
            const nextProducts = normalizeProducts(backup.products ?? products);
            const nextCategories = normalizeCategories(backup.categories ?? categories);
            const nextContent = normalizeSiteContent(backup.siteContent ?? siteContent);
            const nextOrders = Array.isArray(backup.orders) ? backup.orders as StoreOrder[] : orders;
            const nextUsers = Array.isArray(backup.users) ? backup.users as AdminUser[] : users;
            safeSetLocalJson(PRODUCTS_STORAGE_KEY, nextProducts);
            safeSetLocalJson(CATEGORIES_STORAGE_KEY, nextCategories);
            safeSetLocalJson(SITE_CONTENT_STORAGE_KEY, nextContent);
            safeSetLocalJson(ORDERS_STORAGE_KEY, nextOrders);
            safeSetLocalJson(ADMIN_USERS_STORAGE_KEY, nextUsers);
            setProducts(nextProducts);
            setCategories(nextCategories);
            setSiteContent(nextContent);
            setOrders(nextOrders);
            setUsers(nextUsers);
            setNotice("Zaimportowano backup CMS");
          } catch (error) {
            setNotice(formatStorageDataError(error));
          }
        }}
      />
    );
  }
}

function OrdersSection({ orders, saveOrders }: { orders: StoreOrder[]; saveOrders: (orders: StoreOrder[]) => void }) {
  return (
    <PanelCard title="Zarządzanie zamówieniami" className="mt-8">
      <SaveSectionButton onClick={() => saveOrders(orders)} />
      <div className="grid gap-4">
        {orders.length === 0 ? <EmptyState text="Brak zamówień. Po finalizacji koszyka klienta zamówienie pojawi się tutaj." /> : null}
        {orders.map((order) => (
          <article key={order.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black">{order.id}</h3>
                  <span className="rounded bg-[#0b63ce]/20 px-2 py-1 text-xs font-black uppercase text-[#9ecbff]">{order.status}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-white/52">{new Date(order.createdAt).toLocaleString("pl-PL")}</p>
                <div className="mt-4 grid gap-1 text-sm font-bold text-white/72">
                  <p>{order.customer.fullName}</p>
                  <p>{order.customer.phone} / {order.customer.email}</p>
                  <p>{order.customer.delivery === "shipping" ? `Wysyłka: ${order.customer.address}` : "Odbiór osobisty"}</p>
                  {order.customer.notes ? <p>Uwagi: {order.customer.notes}</p> : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex gap-3 rounded bg-white/6 p-3">
                      <ProductOrderImage src={item.image} name={item.name} />
                      <div>
                        <p className="font-black">{item.name} x{item.qty}</p>
                        <p className="mt-1 text-sm font-bold text-white/52">
                          Rozmiar: {item.size}
                          {item.number ? ` / Numer: ${item.number}` : ""}
                          {item.surname ? ` / Nazwisko: ${item.surname}` : ""}
                          {` / ${item.price * item.qty} zł`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-2xl font-black">Razem: {order.total} zł</p>
              </div>
              <div className="grid h-fit gap-3">
                <CMSSelect label="Status" value={order.status} options={orderStatuses} onChange={(status) => saveOrders(orders.map((item) => item.id === order.id ? { ...item, status: status as OrderStatus } : item))} />
                <button onClick={() => saveOrders(orders.filter((item) => item.id !== order.id))} className="inline-flex h-11 items-center justify-center gap-2 rounded border border-red-400/30 px-4 text-sm font-black uppercase text-red-200 transition hover:bg-red-500/10">
                  <Trash2 size={18} />
                  Usuń zamówienie
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PanelCard>
  );
}

function CategoriesSection({ categories, saveCategories, isAdmin }: { categories: ProductCategory[]; saveCategories: (categories: ProductCategory[]) => void; isAdmin: boolean }) {
  return (
    <PanelCard title="Kategorie produktów" className="mt-8">
      <SaveSectionButton onClick={() => saveCategories(categories)} disabled={!isAdmin} />
      {!isAdmin ? <RoleNote /> : null}
      <div className="grid gap-3">
        {categories.map((category) => (
          <div key={category.id} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={category.name} disabled={!isAdmin} onChange={(event) => saveCategories(categories.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} className="admin-input" />
            <button disabled={!isAdmin} onClick={() => saveCategories(categories.filter((item) => item.id !== category.id))} className="h-11 rounded border border-red-400/30 px-4 text-sm font-black uppercase text-red-200 disabled:opacity-35">Usuń</button>
          </div>
        ))}
      </div>
      <button disabled={!isAdmin} onClick={() => saveCategories([...categories, { id: `cat-${Date.now()}`, name: "Nowa kategoria" }])} className="mt-4 h-11 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white disabled:opacity-35">
        Dodaj kategorię
      </button>
    </PanelCard>
  );
}

function HomeSection({ content, saveContent, isAdmin }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void; isAdmin: boolean }) {
  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
      <PanelCard title="Strona główna i banery">
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} disabled={!isAdmin} />
        {!isAdmin ? <RoleNote /> : null}
        <CMSInput label="Logo tekstowe" value={content.logoText} onChange={(logoText) => saveContent({ ...content, logoText })} disabled={!isAdmin} />
        <ImagePicker label="Herb klubu / logo graficzne" value={content.logoImage} onChange={(logoImage) => saveContent({ ...content, logoImage }, IMAGE_OPTIMIZED_SUCCESS, true)} disabled={!isAdmin} />
        <CMSInput label="Tytuł hero" value={content.heroTitle} onChange={(heroTitle) => saveContent({ ...content, heroTitle })} disabled={!isAdmin} />
        <CMSTextarea label="Tekst hero" value={content.heroText} onChange={(heroText) => saveContent({ ...content, heroText })} disabled={!isAdmin} />
        <ImagePicker label="Baner / zdjęcie hero" value={content.heroImage} onChange={(heroImage) => saveContent({ ...content, heroImage }, IMAGE_OPTIMIZED_SUCCESS, true)} disabled={!isAdmin} />
        <div className="grid gap-3 md:grid-cols-2">
          <CMSInput label="Przycisk główny" value={content.heroPrimaryCta} onChange={(heroPrimaryCta) => saveContent({ ...content, heroPrimaryCta })} disabled={!isAdmin} />
          <CMSInput label="Przycisk meczowy" value={content.heroSecondaryCta} onChange={(heroSecondaryCta) => saveContent({ ...content, heroSecondaryCta })} disabled={!isAdmin} />
        </div>
      </PanelCard>
      <LivePreview content={content} />
    </section>
  );
}

function SliderSection({ content, saveContent, isAdmin }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void; isAdmin: boolean }) {
  function saveSlides(slides: SiteContent["homeSlides"], message = "Zapisano") {
    saveContent({ ...content, homeSlides: slides.map((slide, order) => ({ ...slide, order })) }, message);
  }

  function addSlide() {
    saveSlides([
      ...content.homeSlides,
      { id: `slide-${Date.now()}`, eyebrow: "Kolekcja Tempo", title: "Nowy slajd", description: "", image: "", buttonText: "", buttonHref: "#sklep", visible: true, order: content.homeSlides.length }
    ], "Dodano");
  }

  function updateSlide(id: string, patch: Partial<SiteContent["homeSlides"][number]>, imageSave = false) {
    saveContent(
      { ...content, homeSlides: content.homeSlides.map((slide) => slide.id === id ? { ...slide, ...patch } : slide) },
      imageSave ? IMAGE_OPTIMIZED_SUCCESS : "Zmieniono",
      imageSave
    );
  }

  function removeSlide(id: string) {
    saveSlides(content.homeSlides.filter((slide) => slide.id !== id), "Usunięto");
  }

  function moveSlide(id: string, direction: -1 | 1) {
    const index = content.homeSlides.findIndex((slide) => slide.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= content.homeSlides.length) return;
    const slides = [...content.homeSlides];
    [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
    saveSlides(slides, "Zmieniono");
  }

  return (
    <PanelCard title="Slider strony głównej" className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} disabled={!isAdmin} noMargin />
        <button disabled={!isAdmin} onClick={addSlide} className="h-10 rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white disabled:opacity-35">Dodaj slajd</button>
      </div>
      <div className="grid gap-4">
        {content.homeSlides.map((slide, index) => (
          <div key={slide.id} className="grid gap-4 rounded border border-white/10 bg-[#0b1728] p-4 xl:grid-cols-[180px_1fr_auto]">
            <ImageBox src={slide.image} alt={slide.title} />
            <div className="grid gap-3 md:grid-cols-2">
              <CMSInput label="Mały nagłówek" value={slide.eyebrow} onChange={(eyebrow) => updateSlide(slide.id, { eyebrow })} disabled={!isAdmin} />
              <CMSInput label="Tytuł" value={slide.title} onChange={(title) => updateSlide(slide.id, { title })} disabled={!isAdmin} />
              <CMSTextarea label="Opis" value={slide.description} onChange={(description) => updateSlide(slide.id, { description })} disabled={!isAdmin} />
              <ImagePicker label="Zdjęcie / grafika" value={slide.image} onChange={(image) => updateSlide(slide.id, { image }, true)} disabled={!isAdmin} />
              <CMSInput label="Tekst przycisku" value={slide.buttonText} onChange={(buttonText) => updateSlide(slide.id, { buttonText })} disabled={!isAdmin} />
              <CMSInput label="Link przycisku" value={slide.buttonHref} onChange={(buttonHref) => updateSlide(slide.id, { buttonHref })} disabled={!isAdmin} />
              <label className="flex items-center gap-3 text-sm font-black text-white/80">
                <input type="checkbox" checked={slide.visible} disabled={!isAdmin} onChange={(event) => updateSlide(slide.id, { visible: event.target.checked })} />
                Widoczny
              </label>
            </div>
            <div className="grid h-fit gap-2">
              <button disabled={!isAdmin || index === 0} onClick={() => moveSlide(slide.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
              <button disabled={!isAdmin || index === content.homeSlides.length - 1} onClick={() => moveSlide(slide.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
              <button disabled={!isAdmin} onClick={() => removeSlide(slide.id)} className="h-10 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200 disabled:opacity-35">Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function ContentTextsSection({ content, saveContent, isAdmin }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void; isAdmin: boolean }) {
  function updateText(key: keyof SiteContent["publicTexts"], value: string) {
    saveContent({ ...content, publicTexts: { ...content.publicTexts, [key]: value } }, "Zmieniono");
  }

  return (
    <PanelCard title="Treści strony" className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} disabled={!isAdmin} />
      <div className="grid gap-3 md:grid-cols-2">
        <CMSInput label="Kadra - etykieta" value={content.publicTexts.teamEyebrow} onChange={(value) => updateText("teamEyebrow", value)} disabled={!isAdmin} />
        <CMSInput label="Kadra - tytuł" value={content.publicTexts.teamTitle} onChange={(value) => updateText("teamTitle", value)} disabled={!isAdmin} />
        <CMSTextarea label="Kadra - opis" value={content.publicTexts.teamDescription} onChange={(value) => updateText("teamDescription", value)} disabled={!isAdmin} />
        <CMSInput label="Kadra - pusty stan" value={content.publicTexts.teamEmptyText} onChange={(value) => updateText("teamEmptyText", value)} disabled={!isAdmin} />
        <CMSInput label="Galeria - etykieta" value={content.publicTexts.galleryEyebrow} onChange={(value) => updateText("galleryEyebrow", value)} disabled={!isAdmin} />
        <CMSInput label="Galeria - tytuł" value={content.publicTexts.galleryTitle} onChange={(value) => updateText("galleryTitle", value)} disabled={!isAdmin} />
        <CMSTextarea label="Galeria - opis" value={content.publicTexts.galleryDescription} onChange={(value) => updateText("galleryDescription", value)} disabled={!isAdmin} />
        <CMSInput label="Galeria - pusty stan" value={content.publicTexts.galleryEmptyText} onChange={(value) => updateText("galleryEmptyText", value)} disabled={!isAdmin} />
        <CMSInput label="Sponsorzy - etykieta" value={content.publicTexts.sponsorsEyebrow} onChange={(value) => updateText("sponsorsEyebrow", value)} disabled={!isAdmin} />
        <CMSInput label="Sponsorzy - tytuł" value={content.publicTexts.sponsorsTitle} onChange={(value) => updateText("sponsorsTitle", value)} disabled={!isAdmin} />
        <CMSTextarea label="Sponsorzy - opis" value={content.publicTexts.sponsorsDescription} onChange={(value) => updateText("sponsorsDescription", value)} disabled={!isAdmin} />
        <CMSInput label="Sponsorzy - pusty stan" value={content.publicTexts.sponsorsEmptyText} onChange={(value) => updateText("sponsorsEmptyText", value)} disabled={!isAdmin} />
        <CMSInput label="Koszyk - etykieta" value={content.publicTexts.cartEyebrow} onChange={(value) => updateText("cartEyebrow", value)} disabled={!isAdmin} />
        <CMSInput label="Koszyk - tytuł" value={content.publicTexts.cartTitle} onChange={(value) => updateText("cartTitle", value)} disabled={!isAdmin} />
        <CMSTextarea label="Koszyk - opis" value={content.publicTexts.cartDescription} onChange={(value) => updateText("cartDescription", value)} disabled={!isAdmin} />
        <CMSTextarea label="Stopka - opis" value={content.footerText} onChange={(footerText) => saveContent({ ...content, footerText }, "Zmieniono")} disabled={!isAdmin} />
      </div>
    </PanelCard>
  );
}

function ClubSection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  return (
    <PanelCard title="Historia klubu i kontakt" className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} />
      <CMSTextarea label="Historia klubu" value={content.clubHistory} onChange={(clubHistory) => saveContent({ ...content, clubHistory })} />
      <div className="grid gap-3 md:grid-cols-3">
        <CMSInput label="Adres" value={content.contactAddress} onChange={(contactAddress) => saveContent({ ...content, contactAddress })} />
        <CMSInput label="Telefon" value={content.contactPhone} onChange={(contactPhone) => saveContent({ ...content, contactPhone })} />
        <CMSInput label="E-mail" value={content.contactEmail} onChange={(contactEmail) => saveContent({ ...content, contactEmail })} />
        <CMSInput label="Tekst odbioru osobistego" value={content.pickupText} onChange={(pickupText) => saveContent({ ...content, pickupText })} />
      </div>
    </PanelCard>
  );
}

function MatchesSection({ content, updateMatch, saveContent }: { content: SiteContent; updateMatch: (key: "nextMatch" | "lastResult" | "previousMatch", field: string, value: string, imageSave?: boolean) => void; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  return (
    <section className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} />
      <div className="mt-4 grid gap-4 2xl:grid-cols-3">
        {(["nextMatch", "lastResult", "previousMatch"] as const).map((key) => (
          <PanelCard key={key} title={key === "nextMatch" ? "Najbliższy mecz" : key === "lastResult" ? "Ostatni wynik" : "Poprzedni mecz"}>
            <div className="grid gap-4">
              <ImagePicker label="Herb Tempo Cmolas" value={content[key].tempoCrest} onChange={(tempoCrest) => updateMatch(key, "tempoCrest", tempoCrest, true)} />
              <ImagePicker label="Herb rywala" value={content[key].opponentCrest} onChange={(opponentCrest) => updateMatch(key, "opponentCrest", opponentCrest, true)} />
              <CMSInput label="Nazwa rywala" value={content[key].opponent} onChange={(value) => updateMatch(key, "opponent", value)} />
              <div className="grid gap-3 md:grid-cols-2">
                <CMSInput label="Data meczu" value={content[key].date} onChange={(value) => updateMatch(key, "date", value)} />
                <CMSInput label="Godzina meczu" value={content[key].time} onChange={(value) => updateMatch(key, "time", value)} />
              </div>
              <CMSInput label="Miejsce meczu" value={content[key].place} onChange={(value) => updateMatch(key, "place", value)} />
              <CMSInput label={key === "nextMatch" ? "Wynik / status" : key === "lastResult" ? "Wynik ostatniego meczu" : "Wynik poprzedniego meczu"} value={content[key].score} onChange={(value) => updateMatch(key, "score", value)} />
            </div>
          </PanelCard>
        ))}
      </div>
    </section>
  );
}

function ScheduleSection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  function updateMatchItem(id: string, patch: Partial<SiteContent["schedule"][number]>, imageSave = false) {
    saveContent({ ...content, schedule: content.schedule.map((match) => match.id === id ? { ...match, ...patch } : match) }, imageSave ? IMAGE_OPTIMIZED_SUCCESS : "Zmieniono", imageSave);
  }

  function addMatch() {
    saveContent({
      ...content,
      schedule: [...content.schedule, { id: `schedule-${Date.now()}`, date: new Date().toISOString().slice(0, 10), time: "17:00", homeTeam: "Tempo Cmolas", awayTeam: "Rywal", homeCrest: content.logoImage, awayCrest: "", stadium: "Stadion Tempo Cmolas", description: "", homeScore: "", awayScore: "" }]
    }, "Dodano");
  }

  return (
    <PanelCard title="Terminarz" className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={addMatch} className="min-h-11 rounded bg-[#0b63ce] px-5 py-3 text-sm font-black uppercase text-white">Dodaj mecz</button>
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} noMargin />
      </div>
      <div className="grid gap-4">
        {content.schedule.map((match) => {
          const finished = match.homeScore !== "" && match.awayScore !== "";
          return (
            <div key={match.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
              <div className="mb-3 rounded bg-white/8 p-3 text-sm font-black text-[#9ecbff]">{finished ? "Zakończony / wynik" : "Planowany / najbliższy jeśli data jest najbliższa"}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <CMSInput label="Data" type="date" value={match.date} onChange={(date) => updateMatchItem(match.id, { date })} />
                <CMSInput label="Godzina" type="time" value={match.time} onChange={(time) => updateMatchItem(match.id, { time })} />
                <CMSInput label="Gospodarz" value={match.homeTeam} onChange={(homeTeam) => updateMatchItem(match.id, { homeTeam })} />
                <CMSInput label="Gość" value={match.awayTeam} onChange={(awayTeam) => updateMatchItem(match.id, { awayTeam })} />
                <ImagePicker label="Herb gospodarza" value={match.homeCrest} onChange={(homeCrest) => updateMatchItem(match.id, { homeCrest }, true)} />
                <ImagePicker label="Herb gościa" value={match.awayCrest} onChange={(awayCrest) => updateMatchItem(match.id, { awayCrest }, true)} />
                <CMSInput label="Stadion" value={match.stadium} onChange={(stadium) => updateMatchItem(match.id, { stadium })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <CMSInput label="Gole gospodarza" type="number" value={match.homeScore} onChange={(homeScore) => updateMatchItem(match.id, { homeScore })} />
                  <CMSInput label="Gole gościa" type="number" value={match.awayScore} onChange={(awayScore) => updateMatchItem(match.id, { awayScore })} />
                </div>
                <CMSTextarea label="Opis" value={match.description} onChange={(description) => updateMatchItem(match.id, { description })} />
              </div>
              <button onClick={() => saveContent({ ...content, schedule: content.schedule.filter((item) => item.id !== match.id) }, "Usunięto")} className="mt-4 rounded border border-red-400/30 px-4 py-3 text-sm font-black uppercase text-red-200">Usuń mecz</button>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

function LeagueTableSection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  const sanitizedEmbed = sanitizeIframeEmbed(content.leagueTable.embedCode);
  const mode = content.leagueTable.mode ?? (content.leagueTable.visible ? "embed" : "hidden");

  function updateLeagueTable(patch: Partial<SiteContent["leagueTable"]>, message = "Zmieniono") {
    saveContent({ ...content, leagueTable: { ...content.leagueTable, ...patch } }, message);
  }

  function setMode(nextMode: SiteContent["leagueTable"]["mode"]) {
    updateLeagueTable({ mode: nextMode, visible: nextMode !== "hidden" }, "Zmieniono");
  }

  function addTeam() {
    const position = content.leagueTable.teams.length + 1;
    const baseStats: LeagueTableStats = { position, played: 0, wins: 0, draws: 0, losses: 0, goalDifference: "0", goals: "0:0", points: 0, form: "" };
    updateLeagueTable({
      teams: [
        ...content.leagueTable.teams,
        { id: `table-team-${Date.now()}`, name: "Nowa drużyna", crest: "", highlight: false, all: baseStats, home: baseStats, away: baseStats }
      ],
      mode: "custom",
      visible: true
    }, "Dodano");
  }

  function updateTeam(id: string, patch: Partial<LeagueTableTeam>, message = "Zmieniono") {
    updateLeagueTable({ teams: content.leagueTable.teams.map((team) => team.id === id ? { ...team, ...patch } : team) }, message);
  }

  function updateTeamStats(id: string, scope: LeagueTableScope, patch: Partial<LeagueTableStats>) {
    updateLeagueTable({
      teams: content.leagueTable.teams.map((team) => team.id === id ? { ...team, [scope]: { ...team[scope], ...patch } } : team)
    }, "Zmieniono");
  }

  function removeTeam(id: string) {
    updateLeagueTable({ teams: content.leagueTable.teams.filter((team) => team.id !== id) }, "Usunięto");
  }

  function moveTeam(id: string, direction: -1 | 1) {
    const index = content.leagueTable.teams.findIndex((team) => team.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= content.leagueTable.teams.length) return;
    const teams = [...content.leagueTable.teams];
    [teams[index], teams[nextIndex]] = [teams[nextIndex], teams[index]];
    updateLeagueTable({ teams: teams.map((team, teamIndex) => ({ ...team, all: { ...team.all, position: teamIndex + 1 } })) }, "Zmieniono");
  }

  function updateColumn(id: LeagueTableColumnId, patch: Partial<LeagueTableColumn>) {
    updateLeagueTable({
      columns: content.leagueTable.columns.map((column) => column.id === id ? { ...column, ...patch } : column)
    }, "Zmieniono");
  }

  function moveColumn(id: LeagueTableColumnId, direction: -1 | 1) {
    const columns = [...content.leagueTable.columns].sort((a, b) => a.order - b.order);
    const index = columns.findIndex((column) => column.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= columns.length) return;
    [columns[index], columns[nextIndex]] = [columns[nextIndex], columns[index]];
    updateLeagueTable({ columns: columns.map((column, order) => ({ ...column, order })) }, "Zmieniono");
  }

  function resetColumns() {
    updateLeagueTable({ columns: defaultLeagueTableColumns }, "Zmieniono");
  }

  function calculateFromSchedule() {
    updateLeagueTable({ teams: buildLeagueTeamsFromSchedule(content), mode: "custom", visible: true }, "Tabela przeliczona z terminarza");
  }

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.95fr]">
      <PanelCard title="Tabela ligowa">
        <SaveSectionButton onClick={() => saveContent(content, "Tabela zapisana")} />
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["custom", "Użyj własnej tabeli"],
            ["embed", "Użyj kodu iframe/embed"],
            ["hidden", "Ukryj tabelę"]
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value as SiteContent["leagueTable"]["mode"])} className={`h-10 rounded px-4 text-sm font-black uppercase transition ${mode === value ? "bg-white text-[#071b3a]" : "border border-white/14 text-white hover:bg-white/8"}`}>
              {label}
            </button>
          ))}
        </div>
        <CMSInput label="Tytuł tabeli" value={content.leagueTable.title} onChange={(title) => updateLeagueTable({ title })} />
        <CMSTextarea label="Opis opcjonalny" value={content.leagueTable.description} onChange={(description) => updateLeagueTable({ description })} />
        {mode === "embed" ? (
          <>
            <CMSTextarea label="Kod embed / iframe / html" value={content.leagueTable.embedCode} onChange={(embedCode) => updateLeagueTable({ embedCode })} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => saveContent(content, "Tabela zapisana")} className="h-10 rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white">Zapisz</button>
              <button onClick={() => updateLeagueTable({ embedCode: "", mode: "hidden", visible: false }, "Usunięto")} className="h-10 rounded border border-red-400/30 px-4 text-sm font-black uppercase text-red-200">Usuń kod</button>
            </div>
            {content.leagueTable.embedCode && !sanitizedEmbed ? (
              <p className="mt-4 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm font-black text-red-100">
                Kod nie został zaakceptowany. Dozwolony jest tylko bezpieczny iframe z adresem http/https. Tagi script nie są wykonywane.
              </p>
            ) : null}
          </>
        ) : null}
        {mode === "custom" ? (
          <div className="mt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={addTeam} className="h-10 rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white">Dodaj drużynę</button>
              <button type="button" onClick={() => saveContent(content, "Tabela zapisana")} className="h-10 rounded border border-white/14 px-4 text-sm font-black uppercase text-white">Zapisz</button>
              <button type="button" onClick={calculateFromSchedule} className="h-10 rounded border border-[#9ecbff]/40 px-4 text-sm font-black uppercase text-[#9ecbff]">Przelicz z wyników</button>
              <button type="button" onClick={resetColumns} className="h-10 rounded border border-white/14 px-4 text-sm font-black uppercase text-white">Domyślne kolumny</button>
            </div>
            <details className="mb-5 rounded border border-white/10 bg-white/[0.04] p-4" open>
              <summary className="cursor-pointer text-sm font-black uppercase text-white">Kolumny tabeli</summary>
              <div className="mt-4 grid gap-3">
                {[...content.leagueTable.columns].sort((a, b) => a.order - b.order).map((column, index) => (
                  <div key={column.id} className="grid gap-3 rounded border border-white/10 bg-[#07111f] p-3 md:grid-cols-[auto_1fr_auto_auto]">
                    <label className="flex items-center gap-3 text-sm font-black text-white/80">
                      <input type="checkbox" checked={column.visible} onChange={(event) => updateColumn(column.id, { visible: event.target.checked })} />
                      Pokaż
                    </label>
                    <CMSInput label="Nazwa kolumny" value={column.label} onChange={(label) => updateColumn(column.id, { label })} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button disabled={index === 0} onClick={() => moveColumn(column.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W lewo</button>
                      <button disabled={index === content.leagueTable.columns.length - 1} onClick={() => moveColumn(column.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W prawo</button>
                    </div>
                    <p className="self-center text-xs font-black uppercase text-white/40">{getLeagueColumnName(column.id)}</p>
                  </div>
                ))}
              </div>
            </details>
            <div className="grid gap-4">
              {content.leagueTable.teams.map((team, index) => (
                <div key={team.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr_auto]">
                    <ImagePicker label="Herb drużyny" value={team.crest} onChange={(crest) => updateTeam(team.id, { crest }, "Zdjęcie zapisane")} fullWidth={false} />
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <CMSInput label="Miejsce" type="number" value={String(team.all.position)} onChange={(position) => updateTeamStats(team.id, "all", { position: Number(position) })} />
                        <CMSInput label="Nazwa drużyny" value={team.name} onChange={(name) => updateTeam(team.id, { name })} />
                        <label className="mt-3 flex items-center gap-3 text-sm font-black text-white/80">
                          <input type="checkbox" checked={team.highlight} onChange={(event) => updateTeam(team.id, { highlight: event.target.checked })} />
                          Wyróżnij Tempo Cmolas
                        </label>
                      </div>
                      <LeagueStatsEditor label="Wszystkie" stats={team.all} onChange={(patch) => updateTeamStats(team.id, "all", patch)} />
                      <LeagueStatsEditor label="U siebie" stats={team.home} onChange={(patch) => updateTeamStats(team.id, "home", patch)} />
                      <LeagueStatsEditor label="Wyjazd" stats={team.away} onChange={(patch) => updateTeamStats(team.id, "away", patch)} />
                    </div>
                    <div className="grid h-fit gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <button disabled={index === 0} onClick={() => moveTeam(team.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
                      <button disabled={index === content.leagueTable.teams.length - 1} onClick={() => moveTeam(team.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
                      <button onClick={() => removeTeam(team.id)} className="h-10 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200">Usuń drużynę</button>
                    </div>
                  </div>
                </div>
              ))}
              {content.leagueTable.teams.length === 0 ? <EmptyState text="Dodaj pierwszą drużynę, żeby zbudować własną tabelę." /> : null}
            </div>
          </div>
        ) : null}
        {mode === "hidden" ? <EmptyState text="Tabela jest ukryta na stronie publicznej." /> : null}
      </PanelCard>
      <PanelCard title="Podgląd tabeli">
        {mode === "custom" && content.leagueTable.teams.length > 0 ? (
          <AdminLeagueTablePreview teams={content.leagueTable.teams} columns={content.leagueTable.columns} />
        ) : mode === "embed" && sanitizedEmbed ? (
          <div className="overflow-hidden rounded border border-white/10 bg-white p-3">
            <div className="max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: sanitizedEmbed }} />
          </div>
        ) : (
          <EmptyState text="Włącz własną tabelę albo wklej iframe, żeby zobaczyć podgląd." />
        )}
      </PanelCard>
    </section>
  );
}

function LeagueStatsEditor({ label, stats, onChange }: { label: string; stats: LeagueTableStats; onChange: (patch: Partial<LeagueTableStats>) => void }) {
  return (
    <details className="rounded border border-white/10 bg-white/[0.04] p-3" open={label === "Wszystkie"}>
      <summary className="cursor-pointer text-sm font-black uppercase text-white">{label}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CMSInput label="RM" type="number" value={String(stats.played)} onChange={(played) => onChange({ played: Number(played) })} />
        <CMSInput label="Z" type="number" value={String(stats.wins)} onChange={(wins) => onChange({ wins: Number(wins) })} />
        <CMSInput label="R" type="number" value={String(stats.draws)} onChange={(draws) => onChange({ draws: Number(draws) })} />
        <CMSInput label="P" type="number" value={String(stats.losses)} onChange={(losses) => onChange({ losses: Number(losses) })} />
        <CMSInput label="Różnica" value={stats.goalDifference} onChange={(goalDifference) => onChange({ goalDifference })} />
        <CMSInput label="Bramki" value={stats.goals} onChange={(goals) => onChange({ goals })} />
        <CMSInput label="Punkty" type="number" value={String(stats.points)} onChange={(points) => onChange({ points: Number(points) })} />
        <CMSInput label="Ostatnie 5 (Z/R/P lub W/D/L)" value={stats.form} onChange={(form) => onChange({ form: form.toUpperCase().slice(0, 5) })} />
      </div>
    </details>
  );
}

function AdminLeagueTablePreview({ teams, columns }: { teams: LeagueTableTeam[]; columns: LeagueTableColumn[] }) {
  const visibleColumns = getVisibleLeagueColumns(columns);
  return (
    <div className="overflow-hidden rounded border border-white/10 bg-white text-[#071b3a]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#f1f6fb] text-xs uppercase text-[#58708f]">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.id} className={`px-3 py-3 ${column.id === "team" ? "text-left" : "text-center"}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className={team.highlight ? "bg-[#e9f4ff] font-black" : "border-t border-[#dce8f5]"}>
                {visibleColumns.map((column) => <AdminLeagueCell key={column.id} team={team} column={column} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminLeagueCell({ team, column }: { team: LeagueTableTeam; column: LeagueTableColumn }) {
  const stats = team.all;
  if (column.id === "position") return <td className="px-3 py-3 text-center font-black">{stats.position}</td>;
  if (column.id === "crest") return <td className="px-3 py-3 text-center">{normalizeImageSource(team.crest) ? <img src={normalizeImageSource(team.crest)} alt={team.name} className="mx-auto h-7 w-7 object-contain" /> : "-"}</td>;
  if (column.id === "team") return <td className="px-3 py-3 text-left">{team.name}</td>;
  if (column.id === "form") return <td className="px-3 py-3 text-center"><FormBadges form={stats.form} /></td>;
  return <td className="px-3 py-3 text-center">{getLeagueValue(team, column.id)}</td>;
}

function FormBadges({ form }: { form: string }) {
  const values = form.split("").filter(Boolean).slice(0, 5);
  return (
    <div className="inline-flex overflow-hidden rounded bg-[#d8dde5]">
      {values.map((value, index) => {
        const upper = value.toUpperCase();
        const color = upper === "Z" || upper === "W" ? "bg-emerald-500" : upper === "R" || upper === "D" ? "bg-slate-400" : "bg-red-500";
        return <span key={`${value}-${index}`} className={`${color} grid h-7 w-7 place-items-center text-xs font-black text-white`}>{upper}</span>;
      })}
    </div>
  );
}

function getVisibleLeagueColumns(columns: LeagueTableColumn[]) {
  return (columns.length ? columns : defaultLeagueTableColumns)
    .filter((column) => column.visible)
    .sort((a, b) => a.order - b.order);
}

function getLeagueColumnName(id: LeagueTableColumnId) {
  return defaultLeagueTableColumns.find((column) => column.id === id)?.label ?? id;
}

function getLeagueValue(team: LeagueTableTeam, columnId: LeagueTableColumnId) {
  const stats = team.all;
  if (columnId === "played") return stats.played;
  if (columnId === "goals") return stats.goals;
  if (columnId === "points") return stats.points;
  if (columnId === "wins") return stats.wins;
  if (columnId === "draws") return stats.draws;
  if (columnId === "losses") return stats.losses;
  if (columnId === "goalDifference") return stats.goalDifference;
  if (columnId === "home") return `${team.home.played} / ${team.home.points} pkt`;
  if (columnId === "away") return `${team.away.played} / ${team.away.points} pkt`;
  return "";
}

function buildLeagueTeamsFromSchedule(content: SiteContent): LeagueTableTeam[] {
  const teams = new Map<string, LeagueTableTeam & { goalsFor: number; goalsAgainst: number; formItems: string[] }>();
  function ensureTeam(name: string, crest: string) {
    const key = name.trim() || "Drużyna";
    if (!teams.has(key)) {
      const base = { position: 1, played: 0, wins: 0, draws: 0, losses: 0, goalDifference: "0", goals: "0:0", points: 0, form: "" };
      teams.set(key, { id: `team-${key.toLowerCase().replace(/\s+/g, "-")}`, name: key, crest, highlight: key.toLowerCase().includes("tempo cmolas"), all: { ...base }, home: { ...base }, away: { ...base }, goalsFor: 0, goalsAgainst: 0, formItems: [] });
    }
    const team = teams.get(key)!;
    if (!team.crest && crest) team.crest = crest;
    return team;
  }

  content.schedule
    .filter((match) => match.homeScore !== "" && match.awayScore !== "")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .forEach((match) => {
      const homeScore = Number(match.homeScore);
      const awayScore = Number(match.awayScore);
      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) return;
      const home = ensureTeam(match.homeTeam, match.homeCrest);
      const away = ensureTeam(match.awayTeam, match.awayCrest);
      applyResult(home, homeScore, awayScore, "home");
      applyResult(away, awayScore, homeScore, "away");
    });

  return Array.from(teams.values()).map((team) => {
    finishStats(team.all, team.goalsFor, team.goalsAgainst, team.formItems);
    return team;
  }).sort((a, b) => b.all.points - a.all.points || Number(b.all.goalDifference) - Number(a.all.goalDifference) || b.goalsFor - a.goalsFor)
    .map((team, index) => {
      const { goalsFor, goalsAgainst, formItems, ...cleanTeam } = team;
      return { ...cleanTeam, all: { ...cleanTeam.all, position: index + 1 } };
    });
}

function applyResult(team: LeagueTableTeam & { goalsFor: number; goalsAgainst: number; formItems: string[] }, scored: number, conceded: number, scope: "home" | "away") {
  const points = scored > conceded ? 3 : scored === conceded ? 1 : 0;
  const form = scored > conceded ? "Z" : scored === conceded ? "R" : "P";
  team.all.played += 1;
  team.all.wins += scored > conceded ? 1 : 0;
  team.all.draws += scored === conceded ? 1 : 0;
  team.all.losses += scored < conceded ? 1 : 0;
  team.all.points += points;
  team[scope].played += 1;
  team[scope].wins += scored > conceded ? 1 : 0;
  team[scope].draws += scored === conceded ? 1 : 0;
  team[scope].losses += scored < conceded ? 1 : 0;
  team[scope].points += points;
  team.goalsFor += scored;
  team.goalsAgainst += conceded;
  team.formItems.push(form);
  finishStats(team[scope], scored, conceded, [form]);
}

function finishStats(stats: LeagueTableStats, goalsFor: number, goalsAgainst: number, formItems: string[]) {
  stats.goalDifference = String(goalsFor - goalsAgainst);
  stats.goals = `${goalsFor}:${goalsAgainst}`;
  stats.form = formItems.slice(-5).join("");
}

function NewsSection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  function addNews() {
    saveContent({ ...content, news: [{ id: `news-${Date.now()}`, title: "Nowy news", content: "", image: "", date: new Date().toISOString().slice(0, 10), category: "Klub", visible: true }, ...content.news] }, "Dodano");
  }

  return (
    <PanelCard title="Aktualności" className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={addNews} className="min-h-11 rounded bg-[#0b63ce] px-5 py-3 text-sm font-black uppercase text-white">Dodaj news</button>
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} noMargin />
      </div>
      <div className="grid gap-4">
        {content.news.map((news) => (
          <div key={news.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <CMSInput label="Tytuł" value={news.title} onChange={(title) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, title } : item) }, "Zmieniono")} />
              <CMSInput label="Data" type="date" value={news.date} onChange={(date) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, date } : item) }, "Zmieniono")} />
              <CMSInput label="Kategoria" value={news.category} onChange={(category) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, category } : item) }, "Zmieniono")} />
              <label className="mt-3 flex items-center gap-3 text-sm font-black text-white/80">
                <input type="checkbox" checked={news.visible} onChange={(event) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, visible: event.target.checked } : item) }, "Zmieniono")} />
                Widoczny
              </label>
              <ImagePicker label="Zdjęcie newsa" value={news.image} onChange={(image) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, image } : item) }, IMAGE_OPTIMIZED_SUCCESS, true)} />
              <CMSTextarea label="Treść" value={news.content} onChange={(nextContent) => saveContent({ ...content, news: content.news.map((item) => item.id === news.id ? { ...item, content: nextContent } : item) }, "Zmieniono")} />
            </div>
            <button onClick={() => saveContent({ ...content, news: content.news.filter((item) => item.id !== news.id) }, "Usunięto")} className="mt-4 rounded border border-red-400/30 px-4 py-3 text-sm font-black uppercase text-red-200">Usuń news</button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function SocialSection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  function addEmbed() {
    saveContent({ ...content, socialEmbeds: [{ id: `social-${Date.now()}`, title: "Nowa rolka", url: "", platform: "Instagram", visible: true, order: content.socialEmbeds.length }, ...content.socialEmbeds] }, "Dodano");
  }

  return (
    <PanelCard title="Social media / Rolki" className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} />
      <CMSInput label="Konto Instagram" value={content.instagramAccount} onChange={(instagramAccount) => saveContent({ ...content, instagramAccount }, "Zmieniono")} />
      <button onClick={addEmbed} className="mt-4 min-h-11 rounded bg-[#0b63ce] px-5 py-3 text-sm font-black uppercase text-white">Dodaj link do rolki/posta</button>
      <div className="mt-5 grid gap-4">
        {content.socialEmbeds.map((embed, index) => (
          <div key={embed.id} className="rounded border border-white/10 bg-[#0b1728] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <CMSInput label="Tytuł" value={embed.title} onChange={(title) => saveContent({ ...content, socialEmbeds: content.socialEmbeds.map((item) => item.id === embed.id ? { ...item, title } : item) }, "Zmieniono")} />
              <CMSSelect label="Platforma" value={embed.platform} options={["Instagram", "TikTok", "YouTube"]} onChange={(platform) => saveContent({ ...content, socialEmbeds: content.socialEmbeds.map((item) => item.id === embed.id ? { ...item, platform } : item) }, "Zmieniono")} />
              <CMSInput label="Link do posta / rolki / filmu" value={embed.url} onChange={(url) => saveContent({ ...content, socialEmbeds: content.socialEmbeds.map((item) => item.id === embed.id ? { ...item, url } : item) }, "Zmieniono")} />
              <label className="mt-3 flex items-center gap-3 text-sm font-black text-white/80">
                <input type="checkbox" checked={embed.visible} onChange={(event) => saveContent({ ...content, socialEmbeds: content.socialEmbeds.map((item) => item.id === embed.id ? { ...item, visible: event.target.checked } : item) }, "Zmieniono")} />
                Widoczny
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={index === 0} onClick={() => saveContent({ ...content, socialEmbeds: moveOrderedItem(content.socialEmbeds, index, -1) }, "Zmieniono")} className="rounded border border-white/14 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
              <button disabled={index === content.socialEmbeds.length - 1} onClick={() => saveContent({ ...content, socialEmbeds: moveOrderedItem(content.socialEmbeds, index, 1) }, "Zmieniono")} className="rounded border border-white/14 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
              <button onClick={() => saveContent({ ...content, socialEmbeds: content.socialEmbeds.filter((item) => item.id !== embed.id) }, "Usunięto")} className="rounded border border-red-400/30 px-4 py-2 text-xs font-black uppercase text-red-200">Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function moveOrderedItem<T extends { order: number }>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}

function TeamSection({ content, addPlayer, updatePlayer, removePlayer, movePlayer, saveContent }: { content: SiteContent; addPlayer: () => void; updatePlayer: (id: string, patch: Partial<Player>) => void; removePlayer: (id: string) => void; movePlayer: (id: string, direction: -1 | 1) => void; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  return (
    <PanelCard title="Skład drużyny" className="mt-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={addPlayer} className="h-11 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white">Dodaj zawodnika</button>
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} />
      </div>
      <div className="grid gap-3">
        {content.players.map((player, index) => (
          <div key={player.id} className="grid gap-4 rounded border border-white/10 bg-[#0b1728] p-4 xl:grid-cols-[1fr_auto]">
            <div className="grid gap-3 md:grid-cols-3">
              <CMSInput label="Numer" value={player.number} onChange={(number) => updatePlayer(player.id, { number })} />
              <CMSInput label="Imię i nazwisko" value={player.name} onChange={(name) => updatePlayer(player.id, { name })} />
              <CMSInput label="Pozycja" value={player.position} onChange={(position) => updatePlayer(player.id, { position })} />
              <ImagePicker label="Zdjęcie zawodnika" value={player.image} onChange={(image) => updatePlayer(player.id, { image })} />
              <CMSTextarea label="Opis" value={player.description} onChange={(description) => updatePlayer(player.id, { description })} />
            </div>
            <div className="grid h-fit gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <button disabled={index === 0} onClick={() => movePlayer(player.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
              <button disabled={index === content.players.length - 1} onClick={() => movePlayer(player.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
              <button onClick={() => removePlayer(player.id)} className="h-10 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200">Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function GallerySection({ content, saveContent }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [albumId, setAlbumId] = useState(content.galleryAlbums[0]?.id ?? "");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function addLink() {
    if (!url.trim()) return;
    const item: GalleryItem = { id: `gallery-${Date.now()}`, title: title || "Zdjęcie meczowe", image: url, source: url.includes("instagram.com") ? "instagram" : "url", albumId };
    saveContent({ ...content, gallery: [item, ...content.gallery] }, "Dodano zdjęcie do galerii.");
    setTitle("");
    setUrl("");
  }

  async function handleFiles(files?: FileList | null) {
    setError("");
    if (!files?.length) return;
    setUploading(true);
    const fileArray = Array.from(files);
    let processedIndex = 0;
    try {
      const items: GalleryItem[] = [];
      for (const file of fileArray) {
        const image = (await uploadImage(file)).src;
        items.push({ id: `gallery-${Date.now()}-${items.length}`, title: title || "Zdjęcie meczowe", image, source: "upload", albumId });
        processedIndex += 1;
      }
      saveContent({ ...content, gallery: [...items, ...content.gallery] }, IMAGE_OPTIMIZED_SUCCESS, true);
      setTitle("");
    } catch (uploadError) {
      const failedFile = fileArray[processedIndex];
      setError(formatImageUploadError(uploadError, failedFile));
    } finally {
      setUploading(false);
    }
  }

  return (
    <PanelCard title="Galeria zdjęć meczowych" className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} />
      <div className="mb-5 rounded border border-white/10 bg-[#0b1728] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => saveContent({ ...content, galleryAlbums: [...content.galleryAlbums, { id: `album-${Date.now()}`, name: "Nowy album", date: new Date().toISOString().slice(0, 10), description: "" }] }, "Dodano album")} className="min-h-10 rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white">Dodaj album</button>
        </div>
        <div className="grid gap-3">
          {content.galleryAlbums.map((album) => (
            <div key={album.id} className="grid gap-3 rounded border border-white/10 p-3 md:grid-cols-4">
              <CMSInput label="Nazwa albumu" value={album.name} onChange={(name) => saveContent({ ...content, galleryAlbums: content.galleryAlbums.map((item) => item.id === album.id ? { ...item, name } : item) }, "Zmieniono")} />
              <CMSInput label="Data" type="date" value={album.date} onChange={(date) => saveContent({ ...content, galleryAlbums: content.galleryAlbums.map((item) => item.id === album.id ? { ...item, date } : item) }, "Zmieniono")} />
              <CMSInput label="Opis" value={album.description} onChange={(description) => saveContent({ ...content, galleryAlbums: content.galleryAlbums.map((item) => item.id === album.id ? { ...item, description } : item) }, "Zmieniono")} />
              <button onClick={() => saveContent({ ...content, galleryAlbums: content.galleryAlbums.filter((item) => item.id !== album.id), gallery: content.gallery.map((photo) => photo.albumId === album.id ? { ...photo, albumId: "" } : photo) }, "Usunięto album")} className="mt-3 h-11 rounded border border-red-400/30 px-4 text-xs font-black uppercase text-red-200">Usuń album</button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="admin-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tytuł zdjęcia" />
        <input className="admin-input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="URL zdjęcia albo link z Instagrama" />
        <CMSSelect label="Album" value={albumId} options={["", ...content.galleryAlbums.map((album) => album.id)]} onChange={setAlbumId} />
      </div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
        className="mt-4 rounded border border-dashed border-[#0b63ce]/60 bg-[#0b63ce]/10 p-5 text-center"
      >
        <Upload className="mx-auto text-[#9ecbff]" />
        <p className="mt-2 font-black">Przeciągnij wiele zdjęć tutaj albo wybierz pliki z komputera</p>
        <p className="mt-1 text-sm font-bold text-white/52">JPG, PNG, WEBP z automatyczną optymalizacją do WEBP.</p>
        <label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white">
          Upload wielu zdjęć
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => handleFiles(event.target.files)} className="sr-only" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={addLink} className="h-10 rounded border border-white/14 px-4 text-sm font-black uppercase text-white">Dodaj link</button>
      </div>
      {uploading ? <p className="mt-3 rounded bg-[#0b63ce]/15 p-3 text-sm font-black text-[#9ecbff]">Optymalizacja zdjęcia...</p> : null}
      {error ? <p className="mt-3 text-sm font-black text-red-200">{error}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {content.gallery.map((item) => (
          <div key={item.id} className="rounded border border-white/10 bg-[#0b1728] p-3">
            <div className="grid h-40 max-h-60 w-full overflow-hidden rounded bg-white/8">
              {normalizeImageSource(item.image) ? <img src={normalizeImageSource(item.image)} alt={item.title} className="h-full max-h-60 w-full max-w-full object-cover" /> : <ImagePlus className="m-auto text-white/35" />}
            </div>
            <input className="admin-input mt-3" value={item.title} onChange={(event) => saveContent({ ...content, gallery: content.gallery.map((photo) => photo.id === item.id ? { ...photo, title: event.target.value } : photo) })} />
            <select className="admin-input mt-3" value={item.albumId} onChange={(event) => saveContent({ ...content, gallery: content.gallery.map((photo) => photo.id === item.id ? { ...photo, albumId: event.target.value } : photo) })}>
              <option value="">Bez albumu</option>
              {content.galleryAlbums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}
            </select>
            <button onClick={() => saveContent({ ...content, gallery: content.gallery.filter((photo) => photo.id !== item.id) }, "Usunięto zdjęcie.")} className="mt-2 text-xs font-black uppercase text-red-200">Usuń</button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function SponsorsSection({ content, addSponsor, updateSponsor, saveContent, isAdmin }: { content: SiteContent; addSponsor: () => void; updateSponsor: (id: string, patch: Partial<Sponsor>) => void; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void; isAdmin: boolean }) {
  function removeSponsor(id: string) {
    saveContent({
      ...content,
      sponsors: content.sponsors.filter((item) => item.id !== id).map((item, index) => ({ ...item, order: index }))
    }, "Usunięto");
  }

  function moveSponsor(id: string, direction: -1 | 1) {
    const index = content.sponsors.findIndex((sponsor) => sponsor.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= content.sponsors.length) return;
    const sponsors = [...content.sponsors];
    [sponsors[index], sponsors[nextIndex]] = [sponsors[nextIndex], sponsors[index]];
    saveContent({ ...content, sponsors: sponsors.map((item, order) => ({ ...item, order })) }, "Zmieniono");
  }

  return (
    <PanelCard title="Sponsorzy" className="mt-8">
      <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} disabled={!isAdmin} />
      {!isAdmin ? <RoleNote /> : null}
      <button disabled={!isAdmin} onClick={addSponsor} className="mb-5 h-11 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white disabled:opacity-35">Dodaj sponsora</button>
      <div className="grid gap-4">
        {content.sponsors.length === 0 ? <EmptyState text="Brak sponsorów. Dodaj sponsora, logo i link do strony." /> : null}
        {content.sponsors.map((sponsor, index) => (
          <div key={sponsor.id} className="grid gap-4 rounded border border-white/10 bg-[#0b1728] p-4 xl:grid-cols-[180px_1fr_auto]">
            <ImageBox src={sponsor.logo} alt={sponsor.name} />
            <div className="grid gap-3">
              <CMSInput label="Nazwa sponsora" value={sponsor.name} onChange={(name) => updateSponsor(sponsor.id, { name })} disabled={!isAdmin} />
              <CMSInput label="URL sponsora" value={sponsor.url} onChange={(url) => updateSponsor(sponsor.id, { url })} disabled={!isAdmin} />
              <ImagePicker label="Logo sponsora" value={sponsor.logo} onChange={(logo) => updateSponsor(sponsor.id, { logo })} disabled={!isAdmin} />
            </div>
            <div className="grid h-fit gap-2">
              <button disabled={!isAdmin || index === 0} onClick={() => moveSponsor(sponsor.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
              <button disabled={!isAdmin || index === content.sponsors.length - 1} onClick={() => moveSponsor(sponsor.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
              <button disabled={!isAdmin} onClick={() => removeSponsor(sponsor.id)} className="h-10 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200 disabled:opacity-35">Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function MenuSection({ content, saveContent, isAdmin }: { content: SiteContent; saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void; isAdmin: boolean }) {
  function updateItem(id: string, patch: Partial<SiteContent["navItems"][number]>) {
    saveContent({ ...content, navItems: content.navItems.map((item) => item.id === id ? { ...item, ...patch } : item) }, "Zmieniono");
  }

  function addItem() {
    saveContent({
      ...content,
      navItems: [...content.navItems, { id: `nav-${Date.now()}`, label: "Nowa pozycja", href: "#start", visible: true }]
    }, "Dodano");
  }

  function removeItem(id: string) {
    saveContent({ ...content, navItems: content.navItems.filter((item) => item.id !== id) }, "Usunięto");
  }

  function moveItem(id: string, direction: -1 | 1) {
    const index = content.navItems.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= content.navItems.length) return;
    const navItems = [...content.navItems];
    [navItems[index], navItems[nextIndex]] = [navItems[nextIndex], navItems[index]];
    saveContent({ ...content, navItems }, "Zmieniono");
  }

  return (
    <PanelCard title="Menu / Nawigacja" className="mt-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <SaveSectionButton onClick={() => saveContent(content, "Menu zapisane")} disabled={!isAdmin} noMargin />
        <button disabled={!isAdmin} onClick={addItem} className="h-10 rounded bg-[#0b63ce] px-4 text-sm font-black uppercase text-white disabled:opacity-35">Dodaj pozycję</button>
      </div>
      <div className="grid gap-3">
        {content.navItems.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded border border-white/10 bg-[#0b1728] p-4 xl:grid-cols-[1fr_1fr_auto_auto_auto]">
            <CMSInput label="Nazwa pozycji" value={item.label} onChange={(label) => updateItem(item.id, { label })} disabled={!isAdmin} />
            <CMSInput label="Link" value={item.href} onChange={(href) => updateItem(item.id, { href })} disabled={!isAdmin} />
            <label className="flex items-center gap-3 text-sm font-black text-white/80">
              <input type="checkbox" checked={item.visible} disabled={!isAdmin} onChange={(event) => updateItem(item.id, { visible: event.target.checked })} />
              Widoczna
            </label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button disabled={!isAdmin || index === 0} onClick={() => moveItem(item.id, -1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
              <button disabled={!isAdmin || index === content.navItems.length - 1} onClick={() => moveItem(item.id, 1)} className="h-10 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
            </div>
            <button disabled={!isAdmin} onClick={() => removeItem(item.id)} className="h-10 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200 disabled:opacity-35">Usuń</button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function SettingsSection({
  content,
  saveContent,
  users,
  saveUsers,
  credentials,
  setCredentials,
  isAdmin,
  products,
  categories,
  orders,
  siteContent,
  onImportBackup
}: {
  content: SiteContent;
  saveContent: (content: SiteContent, message?: string, imageSave?: boolean) => void;
  users: AdminUser[];
  saveUsers: (users: AdminUser[]) => void;
  credentials: { login: string; password: string };
  setCredentials: (credentials: { login: string; password: string }) => void;
  isAdmin: boolean;
  products: Product[];
  categories: ProductCategory[];
  orders: StoreOrder[];
  siteContent: SiteContent;
  onImportBackup: (backup: CmsBackup) => void;
}) {
  function exportBackup() {
    const backup: CmsBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      products,
      categories,
      orders,
      siteContent,
      users
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tempo-cmolas-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportBackup(JSON.parse(String(reader.result ?? "{}")) as CmsBackup);
      } catch {
        alert("Nie udało się wczytać pliku backupu JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <PanelCard title="Kolory, social media i stopka">
        <SaveSectionButton onClick={() => saveContent(content, "Zapisano")} disabled={!isAdmin} />
        {!isAdmin ? <RoleNote /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <CMSInput label="Kolor główny" type="color" value={content.primaryColor} onChange={(primaryColor) => saveContent({ ...content, primaryColor })} disabled={!isAdmin} />
          <CMSInput label="Kolor dodatkowy" type="color" value={content.secondaryColor} onChange={(secondaryColor) => saveContent({ ...content, secondaryColor, navyColor: secondaryColor })} disabled={!isAdmin} />
          <CMSInput label="Kolor tła" type="color" value={content.backgroundColor} onChange={(backgroundColor) => saveContent({ ...content, backgroundColor })} disabled={!isAdmin} />
          <CMSInput label="Kolor przycisków" type="color" value={content.buttonColor} onChange={(buttonColor) => saveContent({ ...content, buttonColor })} disabled={!isAdmin} />
          <CMSInput label="Jasny akcent" type="color" value={content.accentColor} onChange={(accentColor) => saveContent({ ...content, accentColor })} disabled={!isAdmin} />
        </div>
        <CMSInput label="Facebook" value={content.facebookUrl} onChange={(facebookUrl) => saveContent({ ...content, facebookUrl })} disabled={!isAdmin} />
        <CMSInput label="Instagram" value={content.instagramUrl} onChange={(instagramUrl) => saveContent({ ...content, instagramUrl })} disabled={!isAdmin} />
        <CMSTextarea label="Tekst stopki" value={content.footerText} onChange={(footerText) => saveContent({ ...content, footerText })} disabled={!isAdmin} />
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
            window.location.href = "/admin/login/";
          }}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded border border-white/14 px-5 text-sm font-black uppercase text-white hover:bg-white/8"
        >
          <LogOut size={18} />
          Wyloguj z konta admina
        </button>
      </PanelCard>

      <PanelCard title="Konta i hasła administratorów">
        <SaveSectionButton onClick={() => saveUsers(users)} disabled={!isAdmin} />
        {!isAdmin ? <RoleNote /> : null}
        <CMSInput label="Nowy login głównego admina" value={credentials.login} onChange={(login) => setCredentials({ ...credentials, login })} disabled={!isAdmin} />
        <CMSInput label="Nowe hasło głównego admina" value={credentials.password} onChange={(password) => setCredentials({ ...credentials, password })} disabled={!isAdmin} />
        <button
          disabled={!isAdmin}
          onClick={() => {
            const nextUsers = users.map((user, index) => index === 0 ? { ...user, login: credentials.login, password: credentials.password, role: "admin" as const } : user);
            saveUsers(nextUsers.length ? nextUsers : [{ login: credentials.login, password: credentials.password, role: "admin" }]);
          }}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white disabled:opacity-35"
        >
          <Save size={18} />
          Zmień login i hasło
        </button>
        <div className="mt-5 grid gap-2 text-sm font-bold text-white/60">
          {users.map((user) => <p key={`${user.login}-${user.role}`}>{user.login} / {user.role}</p>)}
        </div>
      </PanelCard>

      <PanelCard title="Backup i migracja CMS">
        <p className="mb-4 text-sm font-bold leading-6 text-white/60">
          Eksport JSON zapisuje produkty, galerię, sponsorów, kadrę, slider, mecze, tabelę, menu, kolory, zamówienia i ustawienia CMS. To awaryjny backup obok Supabase.
        </p>
        <div className="flex flex-wrap gap-2">
          <button disabled={!isAdmin} onClick={exportBackup} className="h-11 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white disabled:opacity-35">Eksport ustawień CMS</button>
          <label className={`inline-flex h-11 items-center rounded border border-white/14 px-5 text-sm font-black uppercase text-white ${isAdmin ? "cursor-pointer hover:bg-white/8" : "cursor-not-allowed opacity-35"}`}>
            Import ustawień CMS
            <input disabled={!isAdmin} type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} className="sr-only" />
          </label>
          <button disabled={!isAdmin} onClick={exportBackup} className="h-11 rounded border border-white/14 px-5 text-sm font-black uppercase text-white disabled:opacity-35">Backup jednym kliknięciem</button>
        </div>
      </PanelCard>
    </section>
  );
}

function ProductEditor({ product, categories, onChange, disabled = false }: { product: Product; categories: ProductCategory[]; onChange: (product: Product) => void; disabled?: boolean }) {
  const sizesText = product.sizes.join(", ");

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <CMSInput label="Nazwa" value={product.name} onChange={(name) => onChange({ ...product, name })} disabled={disabled} />
      <CMSSelect label="Kategoria" value={product.category} options={categories.map((category) => category.name)} onChange={(category) => onChange({ ...product, category })} disabled={disabled} />
      <CMSInput label="Cena" type="number" value={String(product.price)} onChange={(price) => onChange({ ...product, price: Number(price) })} disabled={disabled} />
      <CMSInput label="Etykieta" value={product.tag} onChange={(tag) => onChange({ ...product, tag })} disabled={disabled} />
      <CMSInput label="Kolor/wariant" value={product.color} onChange={(color) => onChange({ ...product, color })} disabled={disabled} />
      <ProductImagesEditor product={product} onChange={onChange} disabled={disabled} />
      <CMSTextarea label="Opis" value={product.description} onChange={(description) => onChange({ ...product, description })} disabled={disabled} />
      <CMSInput label="Dostępne rozmiary, oddzielone przecinkami" value={sizesText} onChange={(value) => onChange({ ...product, sizes: value.split(",").map((size) => size.trim()).filter(Boolean) })} disabled={disabled} />
      <label className="flex items-center gap-3 text-sm font-black text-white/80">
        <input
          type="checkbox"
          checked={product.allowNumber}
          disabled={disabled}
          onChange={(event) => {
            const allowNumber = event.target.checked;
            onChange({ ...product, allowNumber, customizable: allowNumber || product.allowSurname });
          }}
        />
        Pozwól klientowi wpisać numer
      </label>
      <label className="flex items-center gap-3 text-sm font-black text-white/80">
        <input
          type="checkbox"
          checked={product.allowSurname}
          disabled={disabled}
          onChange={(event) => {
            const allowSurname = event.target.checked;
            onChange({ ...product, allowSurname, customizable: product.allowNumber || allowSurname });
          }}
        />
        Pozwól klientowi wpisać nazwisko
      </label>
    </div>
  );
}

function ProductImagesEditor({ product, onChange, disabled = false }: { product: Product; onChange: (product: Product) => void; disabled?: boolean }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const images = getProductImages(product);

  function updateImages(nextImages: string[], mainImage = nextImages[0] ?? "") {
    onChange({ ...product, images: nextImages, image: mainImage });
  }

  async function handleFiles(files?: FileList | null) {
    setError("");
    setSuccess("");
    if (!files?.length || disabled) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadImage(file);
        uploaded.push(result.src);
      }
      updateImages([...images, ...uploaded], product.image || uploaded[0] || images[0] || "");
      setSuccess(uploaded.length > 1 ? "Zdjęcia zostały automatycznie zoptymalizowane" : IMAGE_OPTIMIZED_SUCCESS);
    } catch (uploadError) {
      setError(formatImageUploadError(uploadError, files[0]));
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
    const currentMainRemoved = images[index] === product.image;
    updateImages(nextImages, currentMainRemoved ? nextImages[0] ?? "" : product.image);
    setSuccess("Usunięto");
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const nextImages = [...images];
    [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
    updateImages(nextImages, product.image || nextImages[0] || "");
    setSuccess("Zmieniono");
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
      className="overflow-hidden rounded border border-white/10 bg-white/5 p-3 sm:p-4 md:col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/58">Zdjęcia produktu</p>
        <label className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#0b63ce] px-4 py-3 text-sm font-black uppercase text-white sm:w-auto ${disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}>
          <Upload size={16} />
          Dodaj zdjęcie produktu
          <input
            disabled={disabled}
            multiple
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.currentTarget.value = "";
            }}
            className="sr-only"
          />
        </label>
      </div>
      <p className="mt-3 rounded border border-dashed border-[#0b63ce]/55 bg-[#0b63ce]/10 p-3 text-sm font-bold text-white/70">
        Dodaj kilka zdjęć. Pierwsze lub wybrane zdjęcie główne pojawi się na karcie produktu, a pozostałe jako galeria.
      </p>
      {uploading ? <p className="mt-3 rounded bg-[#0b63ce]/15 p-3 text-sm font-black text-[#9ecbff]">Optymalizacja zdjęcia...</p> : null}
      {success ? <p className="mt-3 text-sm font-black text-[#9ecbff]">{success}</p> : null}
      {error ? <p className="mt-3 text-sm font-black text-red-200">{error}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image, index) => {
          const isMain = image === product.image || (!product.image && index === 0);
          return (
            <div key={`${image}-${index}`} className="overflow-hidden rounded border border-white/10 bg-[#07111f] p-3">
              <div className="grid h-40 place-items-center overflow-hidden rounded bg-white/8">
                {normalizeImageSource(image) ? <img src={normalizeImageSource(image)} alt={`${product.name || "Produkt"} ${index + 1}`} className="h-auto max-h-36 max-w-full object-contain" /> : <ImagePlus className="text-white/35" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={disabled || isMain} type="button" onClick={() => updateImages(images, image)} className="h-9 rounded bg-white px-3 text-xs font-black uppercase text-[#071b3a] disabled:opacity-35">Ustaw jako główne</button>
                <button disabled={disabled || index === 0} type="button" onClick={() => moveImage(index, -1)} className="h-9 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W górę</button>
                <button disabled={disabled || index === images.length - 1} type="button" onClick={() => moveImage(index, 1)} className="h-9 rounded border border-white/14 px-3 text-xs font-black uppercase text-white disabled:opacity-35">W dół</button>
                <button disabled={disabled} type="button" onClick={() => removeImage(index)} className="h-9 rounded border border-red-400/30 px-3 text-xs font-black uppercase text-red-200 disabled:opacity-35">Usuń</button>
              </div>
              {isMain ? <p className="mt-2 text-xs font-black uppercase text-[#9ecbff]">Główne zdjęcie</p> : null}
            </div>
          );
        })}
        {images.length === 0 ? <div className="grid h-40 place-items-center rounded border border-dashed border-white/12 text-sm font-black uppercase text-white/40">Brak zdjęć</div> : null}
      </div>
    </div>
  );
}

function ImagePicker({ label, value, onChange, disabled = false, fullWidth = true }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; fullWidth?: boolean }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageValue = normalizeImageSource(value);

  async function handleFile(file?: File) {
    setError("");
    setSuccess("");
    if (!file || disabled) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onChange(result.src);
      setSuccess(IMAGE_OPTIMIZED_SUCCESS);
    } catch (uploadError) {
      setError(formatImageUploadError(uploadError, file));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files?.[0]);
      }}
      className={`${fullWidth ? "md:col-span-2" : ""} overflow-hidden rounded border border-white/10 bg-white/5 p-3 sm:p-4`}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/58">{label}</p>
      <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-[minmax(120px,180px)_minmax(0,1fr)]">
        <ImageBox src={imageValue} alt={label} />
        <div className="grid gap-3">
          <p className="rounded border border-dashed border-[#0b63ce]/55 bg-[#0b63ce]/10 p-3 text-sm font-bold text-white/70">
            Przeciągnij zdjęcie tutaj albo wybierz plik. System automatycznie zmniejszy zdjęcie, zachowa proporcje i zapisze je jako WEBP.
          </p>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#0b63ce] px-4 py-3 text-sm font-black uppercase text-white sm:w-auto ${disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}>
              <Upload size={16} />
              Zmień zdjęcie
              <input
                disabled={disabled}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
                className="sr-only"
              />
            </label>
            <button
              disabled={disabled}
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                onChange("");
              }}
              className="min-h-11 w-full rounded border border-red-400/30 px-4 py-3 text-sm font-black uppercase text-red-200 disabled:opacity-35 sm:w-auto"
            >
              Usuń zdjęcie
            </button>
          </div>
          <CMSInput label="Albo wpisz URL ręcznie" value={imageValue.startsWith("data:") ? "" : imageValue} onChange={(nextValue) => {
            setError("");
            setSuccess(nextValue ? IMAGE_SAVE_SUCCESS : "");
            onChange(nextValue);
          }} disabled={disabled} />
          {uploading ? <p className="rounded bg-[#0b63ce]/15 p-3 text-sm font-black text-[#9ecbff]">Optymalizacja zdjęcia...</p> : null}
          {success ? <p className="text-sm font-black text-[#9ecbff]">{success}</p> : null}
          {error ? <p className="text-sm font-black text-red-200">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PanelCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/15 sm:p-5 ${className}`}>
      <h2 className="mb-4 text-lg font-black uppercase leading-tight sm:mb-5 sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function SaveSectionButton({ onClick, disabled = false, noMargin = false }: { onClick: () => void; disabled?: boolean; noMargin?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${noMargin ? "" : "mb-4"} inline-flex min-h-11 items-center gap-2 rounded bg-white px-4 py-2 text-sm font-black uppercase text-[#071b3a] transition hover:bg-[#e9f4ff] disabled:cursor-not-allowed disabled:opacity-35`}
    >
      <Save size={16} />
      Zapisz
    </button>
  );
}

function CMSInput({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="mt-3 block text-xs font-black uppercase tracking-[0.16em] text-white/58 first:mt-0">
      {label}
      <input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="admin-input mt-2" />
    </label>
  );
}

function CMSTextarea({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="mt-3 block text-xs font-black uppercase tracking-[0.16em] text-white/58 first:mt-0 md:col-span-2">
      {label}
      <textarea value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="admin-input mt-2 min-h-28 py-3" />
    </label>
  );
}

function CMSSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="mt-3 block text-xs font-black uppercase tracking-[0.16em] text-white/58 first:mt-0">
      {label}
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="admin-input mt-2">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AdminStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.06] p-5">
      <p className="text-4xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/50">{label}</p>
    </div>
  );
}

function ProductImagePreview({ product }: { product: Product }) {
  return <ImageBox src={product.image || getProductImages(product)[0]} alt={product.name || "Produkt"} />;
}

function ProductOrderImage({ src, name }: { src: string; name: string }) {
  return <ImageBox src={src} alt={name} small />;
}

function ImageBox({ src, alt, small = false }: { src: string; alt: string; small?: boolean }) {
  const imageSrc = normalizeImageSource(src);
  return (
    <div className={`grid ${small ? "h-16 w-16" : "h-36 max-h-40 w-full"} max-w-full place-items-center overflow-hidden rounded border border-white/10 bg-white/8 p-3`}>
      {imageSrc ? <img src={imageSrc} alt={alt} className="h-auto max-h-[120px] max-w-full object-contain" /> : <ImagePlus className="text-white/35" />}
    </div>
  );
}

function getProductImages(product: Product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return images.length > 0 ? images : [product.image].filter(Boolean);
}

function LivePreview({ content }: { content: SiteContent }) {
  return (
    <PanelCard title="Podgląd live">
      <div className="overflow-hidden rounded border border-white/10 bg-white text-[#071b3a]">
        <div className="grid min-h-64 gap-5 bg-[#f6fbff] p-5 md:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: content.primaryColor }}>Oficjalna strona</p>
            <h3 className="mt-3 text-4xl font-black uppercase" style={{ color: content.navyColor }}>{content.heroTitle}</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-[#405875]">{content.heroText}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded px-3 py-2 text-xs font-black uppercase text-white" style={{ background: content.primaryColor }}>{content.heroPrimaryCta}</span>
              <span className="rounded border px-3 py-2 text-xs font-black uppercase" style={{ borderColor: content.primaryColor, color: content.navyColor }}>{content.heroSecondaryCta}</span>
            </div>
          </div>
          <div className="grid place-items-center rounded bg-white p-4">
            {content.heroImage ? <img src={content.heroImage} alt="Podgląd hero" className="max-h-56 max-w-full object-contain" /> : <ImagePlus className="text-[#58708f]" />}
          </div>
        </div>
      </div>
    </PanelCard>
  );
}

function RoleNote() {
  return <div className="mb-4 rounded border border-amber-300/25 bg-amber-300/10 p-3 text-sm font-black text-amber-100">Ta sekcja wymaga roli admina.</div>;
}

function LockedPanel() {
  return (
    <div className="mt-8 rounded border border-amber-300/25 bg-amber-300/10 p-5 font-black text-amber-100">
      Moderator nie ma dostępu do edycji tej sekcji. Dostępne sekcje: Klub, Mecze, Kadra i Galeria.
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded border border-white/10 bg-white/6 p-5 text-sm font-bold text-white/55">{text}</div>;
}
