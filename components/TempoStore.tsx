"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  ShoppingBag,
  Trophy,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { sanitizeIframeEmbed } from "@/lib/embed";
import {
  defaultProducts,
  defaultCategories,
  defaultSiteContent,
  CATEGORIES_STORAGE_KEY,
  CMS_BACKUP_STORAGE_KEY,
  normalizeProducts,
  normalizeCategories,
  normalizeSiteContent,
  ORDERS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
  SITE_CONTENT_STORAGE_KEY,
  type ProductCategory,
  type Product,
  type LeagueTableColumn,
  type LeagueTableColumnId,
  type LeagueTableScope,
  type LeagueTableTeam,
  type MatchInfo,
  type SiteContent,
  type StoreOrder
} from "@/lib/products";
import { normalizeImageSource } from "@/lib/imageUpload";
import { addRemoteOrder, loadRemoteCmsData } from "@/lib/remoteCms";
import { safeSetLocalJson } from "@/lib/localCache";

export type PublicView = "home" | "shop" | "categories" | "club" | "team" | "matches" | "gallery" | "news" | "contact" | "cart";

type CartItem = {
  id: string;
  productId: number;
  name: string;
  image: string;
  price: number;
  size: string;
  number?: string;
  surname?: string;
  qty: number;
};

type CheckoutForm = {
  fullName: string;
  phone: string;
  email: string;
  delivery: "pickup" | "shipping";
  address: string;
  notes: string;
};

const initialForm: CheckoutForm = {
  fullName: "",
  phone: "",
  email: "",
  delivery: "pickup",
  address: "",
  notes: ""
};
const CART_STORAGE_KEY = "tempo-cmolas-cart";

const navLinks: Array<[string, string, PublicView]> = [
  ["Strona główna", "/", "home"],
  ["Sklep", "/sklep", "shop"],
  ["Kategorie", "/kategorie", "categories"],
  ["O klubie", "/o-klubie", "club"],
  ["Kadra", "/kadra", "team"],
  ["Mecze", "/mecze", "matches"],
  ["Galeria", "/galeria", "gallery"],
  ["Aktualności", "/aktualnosci", "news"],
  ["Koszyk", "/koszyk", "cart"],
  ["Kontakt", "/kontakt", "contact"]
];

export function TempoStore({ view = "home" }: { view?: PublicView }) {
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
  const [storeProducts, setStoreProducts] = useState<Product[]>(defaultProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [numbers, setNumbers] = useState<Record<number, string>>({});
  const [surnames, setSurnames] = useState<Record<number, string>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productErrors, setProductErrors] = useState<Record<number, string>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [orderSent, setOrderSent] = useState(false);
  const [lastOrder, setLastOrder] = useState<StoreOrder | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeNewsId, setActiveNewsId] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");
  const [galleryAlbum, setGalleryAlbum] = useState("all");
  const [galleryVisibleCount, setGalleryVisibleCount] = useState(12);
  const [productImageIndexes, setProductImageIndexes] = useState<Record<number, number>>({});
  const [activeHash, setActiveHash] = useState("#start");

  const theme = useMemo(() => ({
    primary: siteContent.primaryColor,
    secondary: siteContent.secondaryColor,
    background: siteContent.backgroundColor,
    button: siteContent.buttonColor,
    accent: siteContent.accentColor
  }), [siteContent]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const navItems = useMemo(() => {
    const cmsItems = siteContent.navItems.filter((item) => item.visible && item.href !== "/admin/" && !item.label.toLowerCase().includes("admin"));
    return cmsItems.map((item) => {
      const href = normalizeNavHref(item.href);
      const linkView = viewFromHref(href);
      return [item.label, href, linkView] as const;
    }).filter(([, href]) => href !== "/admin" && href !== "/admin/");
  }, [siteContent.navItems]);
  const visibleSlides = useMemo(() => siteContent.homeSlides.filter((slide) => slide.visible), [siteContent.homeSlides]);
  const filteredProducts = useMemo(
    () => selectedCategory === "Wszystkie" ? storeProducts : storeProducts.filter((product) => product.category === selectedCategory),
    [selectedCategory, storeProducts]
  );
  const matchHighlights = useMemo(() => getScheduleHighlights(siteContent), [siteContent]);
  const isHome = view === "home";
  const showShop = view === "shop" || view === "categories";
  const showClub = view === "club" || view === "matches";
  const showTeam = view === "team";
  const showGallery = view === "gallery";
  const showNews = view === "home" || view === "news";
  const showSocial = view === "matches";
  const showCart = view === "cart";
  const showContactOnly = view === "contact";

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

    function cacheStoreData(products: Product[], nextCategories: ProductCategory[], content: SiteContent) {
      safeSetLocalJson(PRODUCTS_STORAGE_KEY, products);
      safeSetLocalJson(CATEGORIES_STORAGE_KEY, nextCategories);
      safeSetLocalJson(SITE_CONTENT_STORAGE_KEY, content);
    }

    function loadStoreData() {
      const localBackup = readStorage(CMS_BACKUP_STORAGE_KEY) as { products?: unknown; categories?: unknown; siteContent?: Partial<SiteContent> } | null;
      const normalizedProducts = normalizeProducts(readStorage(PRODUCTS_STORAGE_KEY) ?? localBackup?.products ?? defaultProducts);
      setStoreProducts(normalizedProducts);

      const normalizedCategories = normalizeCategories(readStorage(CATEGORIES_STORAGE_KEY) ?? localBackup?.categories ?? defaultCategories);
      setCategories(normalizedCategories);

      const normalizedContent = normalizeSiteContent((readStorage(SITE_CONTENT_STORAGE_KEY) ?? localBackup?.siteContent) as Partial<SiteContent> | undefined);
      setSiteContent(normalizedContent);
      cacheStoreData(normalizedProducts, normalizedCategories, normalizedContent);

      loadRemoteCmsData()
        .then((remote) => {
          const remoteProducts = normalizeProducts(remote.products ?? normalizedProducts);
          const remoteCategories = normalizeCategories(remote.categories ?? normalizedCategories);
          const remoteContent = normalizeSiteContent(remote.siteContent ?? normalizedContent);
          setStoreProducts(remoteProducts);
          setCategories(remoteCategories);
          setSiteContent(remoteContent);
          cacheStoreData(remoteProducts, remoteCategories, remoteContent);
        })
        .catch(() => {
          // Public page remains available from local cache/defaults when Supabase is not configured.
        });
    }

    loadStoreData();

    function syncHash() {
      setActiveHash(window.location.hash || "#start");
    }

    function syncProducts(event: StorageEvent) {
      if (event.key === PRODUCTS_STORAGE_KEY && event.newValue) {
        try {
          setStoreProducts(normalizeProducts(JSON.parse(event.newValue)));
        } catch {
          setStoreProducts(defaultProducts);
        }
      }
      if (event.key === CATEGORIES_STORAGE_KEY && event.newValue) {
        try {
          setCategories(normalizeCategories(JSON.parse(event.newValue)));
        } catch {
          setCategories(defaultCategories);
        }
      }
      if (event.key === SITE_CONTENT_STORAGE_KEY && event.newValue) {
        try {
          setSiteContent(normalizeSiteContent(JSON.parse(event.newValue) as Partial<SiteContent>));
        } catch {
          setSiteContent(defaultSiteContent);
        }
      }
    }

    window.addEventListener("storage", syncProducts);
    window.addEventListener("focus", loadStoreData);
    window.addEventListener("hashchange", syncHash);
    syncHash();
    return () => {
      window.removeEventListener("storage", syncProducts);
      window.removeEventListener("focus", loadStoreData);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart) as CartItem[]);
    } catch {}
  }, []);

  useEffect(() => {
    safeSetLocalJson(CART_STORAGE_KEY, cart);
  }, [cart]);

  function selectSize(productId: number, size: string) {
    setSelectedSizes((current) => ({ ...current, [productId]: size }));
    setProductErrors((current) => ({ ...current, [productId]: "" }));
  }

  function addToCart(product: Product) {
    const size = selectedSizes[product.id];

    if (product.sizes.length > 0 && !size) {
      setProductErrors((current) => ({ ...current, [product.id]: "Wybierz rozmiar przed dodaniem produktu do koszyka." }));
      return;
    }

    const number = product.allowNumber ? numbers[product.id]?.trim() : undefined;
    const surname = product.allowSurname ? surnames[product.id]?.trim() : undefined;
    const cartId = `${product.id}-${size}-${number ?? ""}-${surname ?? ""}`;
    const productImages = getProductImages(product);

    setCart((current) => {
      const existing = current.find((item) => item.id === cartId);
      if (existing) {
        return current.map((item) => (item.id === cartId ? { ...item, qty: item.qty + 1 } : item));
      }

      return [
        ...current,
        {
          id: cartId,
          productId: product.id,
          name: product.name,
          image: product.image || productImages[0] || "",
          price: product.price,
          size: size || "Brak",
          number,
          surname,
          qty: 1
        }
      ];
    });
  }

  function changeQty(id: string, direction: 1 | -1) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty + direction } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function openCheckout() {
    if (cart.length === 0) {
      return;
    }
    setCheckoutOpen(true);
    setOrderSent(false);
    setLastOrder(null);
    setTimeout(() => document.getElementById("formularz-zamowienia")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function validateForm() {
    const errors: Partial<Record<keyof CheckoutForm, string>> = {};
    if (!checkoutForm.fullName.trim()) errors.fullName = "Podaj imie i nazwisko.";
    if (!/^[0-9 +()-]{7,}$/.test(checkoutForm.phone.trim())) errors.phone = "Podaj poprawny numer telefonu.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutForm.email.trim())) errors.email = "Podaj poprawny e-mail.";
    if (checkoutForm.delivery === "shipping" && !checkoutForm.address.trim()) errors.address = "Podaj adres wysylki.";
    return errors;
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const order: StoreOrder = {
      id: `TC-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: { ...checkoutForm },
      items: cart.map(({ productId, name, image, price, size, number, surname, qty }) => ({ productId, name, image, price, size, number, surname, qty })),
      total,
      status: "nowe"
    };
    const savedOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const orders = savedOrders ? (JSON.parse(savedOrders) as StoreOrder[]) : [];
    safeSetLocalJson(ORDERS_STORAGE_KEY, [order, ...orders]);
    await addRemoteOrder(order).catch((error) => {
      console.error("Nie udało się zapisać zamówienia w Supabase", error);
    });
    setLastOrder(order);
    setOrderSent(true);
    setCart([]);
    setCheckoutForm(initialForm);
    setSelectedSizes({});
    setNumbers({});
    setSurnames({});
  }

  return (
    <main
      id="start"
      className="min-h-screen overflow-hidden bg-white text-[#071b3a]"
      style={{
        "--tempo-blue": theme.primary,
        "--tempo-navy": theme.secondary,
        "--tempo-sky": theme.accent,
        backgroundColor: theme.background,
        color: theme.secondary
      } as React.CSSProperties}
    >
      <header className="fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl" style={{ backgroundColor: `${theme.background}ee`, borderColor: theme.accent }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Tempo Cmolas Store">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded text-sm font-black text-white shadow-sm" style={{ backgroundColor: theme.button }}>
              {normalizeImageSource(siteContent.logoImage) ? <img src={normalizeImageSource(siteContent.logoImage)} alt={siteContent.logoText} className="h-8 w-8 object-contain" /> : "TC"}
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.2em]" style={{ color: theme.secondary }}>{siteContent.logoText}</span>
              <span className="block text-xs font-bold uppercase text-[#58708f]">Oficjalny sklep</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(([label, href, linkView]) => (
              <a
                key={label}
                href={href}
                style={view === linkView ? { backgroundColor: theme.accent, color: theme.primary } : { color: theme.secondary }}
                className="whitespace-nowrap rounded px-3 py-2 text-sm font-bold transition hover:brightness-95"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="/koszyk" className="relative grid h-10 w-10 place-items-center rounded text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-90" style={{ backgroundColor: theme.button }} aria-label="Koszyk">
              <ShoppingBag size={18} />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e9f4ff] px-1 text-[11px] font-black text-[#0b63ce] ring-1 ring-[#0b63ce]/20">
                {cartCount}
              </span>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded border border-[#d7e7f8] lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <nav className="border-t px-4 py-3 shadow-lg lg:hidden" style={{ backgroundColor: theme.background, borderColor: theme.accent }}>
            <div className="mx-auto grid max-w-7xl gap-1">
              {navItems.map(([label, href, linkView]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={view === linkView ? { backgroundColor: theme.accent, color: theme.primary } : { color: theme.secondary }}
                  className="whitespace-nowrap rounded px-3 py-3 text-sm font-black uppercase transition hover:brightness-95"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      {isHome ? <section className="tempo-grid relative overflow-hidden pt-16" style={{ backgroundColor: theme.accent }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 78% 10%, ${theme.primary}29, transparent 32%), linear-gradient(135deg, ${theme.secondary}14, transparent 46%)` }} />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl gap-8 px-4 py-10 sm:min-h-[690px] sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="mb-5 flex w-fit items-center gap-2 rounded border bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-sm" style={{ borderColor: theme.primary, color: theme.primary }}>
              <Trophy size={14} />
              Oficjalny sklep i klub
            </div>
            <div className="flex max-w-4xl items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border bg-white p-2 shadow-sm sm:h-24 sm:w-24" style={{ borderColor: theme.accent }}>
                {normalizeImageSource(siteContent.logoImage) ? <img src={normalizeImageSource(siteContent.logoImage)} alt="Herb Tempo Cmolas" className="h-auto max-h-full max-w-full object-contain" /> : <span className="font-black" style={{ color: theme.primary }}>TC</span>}
              </div>
              <h1 className="min-w-0 text-3xl font-black uppercase leading-[0.98] sm:text-7xl lg:text-8xl" style={{ color: theme.secondary }}>
                {siteContent.heroTitle}
              </h1>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#405875] sm:mt-6 sm:text-xl sm:leading-8">
              {siteContent.heroText}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="/sklep" style={{ backgroundColor: theme.button }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded px-5 py-3 text-sm font-black uppercase text-white shadow-lg shadow-[#0b63ce]/18 transition hover:-translate-y-1 hover:brightness-90">
                {siteContent.heroPrimaryCta}
                <ArrowRight size={18} />
              </a>
              <a href="/mecze" className="inline-flex min-h-12 items-center justify-center gap-2 rounded border bg-white px-5 py-3 text-sm font-black uppercase transition hover:-translate-y-1" style={{ borderColor: theme.primary, color: theme.secondary }}>
                {siteContent.heroSecondaryCta}
                <Trophy size={18} />
              </a>
            </div>
          </div>

          <div className="flex min-w-0 items-center">
            <div className="relative w-full overflow-hidden rounded border border-[#d7e7f8] bg-white shadow-2xl shadow-[#071b3a]/12">
              <div className="hero-slider flex" style={{ width: `${Math.max(visibleSlides.length, 1) * 100}%` }}>
                {(visibleSlides.length ? visibleSlides : siteContent.homeSlides.slice(0, 1)).map((slide) => (
                  <article key={slide.id} className="grid min-w-0 shrink-0 gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_1fr]" style={{ width: `${100 / Math.max(visibleSlides.length || siteContent.homeSlides.slice(0, 1).length, 1)}%` }}>
                    <div className="flex min-h-[260px] flex-col justify-between rounded p-5 text-white sm:min-h-[320px]" style={{ backgroundColor: theme.secondary }}>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9ecbff]">{slide.eyebrow}</p>
                        <h2 className="mt-4 text-3xl font-black uppercase leading-tight sm:text-4xl">{slide.title}</h2>
                        {slide.description ? <p className="mt-4 leading-7 text-white/70">{slide.description}</p> : null}
                      </div>
                      {slide.buttonText ? <a href={slide.buttonHref || "#sklep"} className="mt-6 w-fit rounded bg-white px-4 py-3 text-sm font-black uppercase text-[#071b3a] transition hover:bg-[#e9f4ff]">{slide.buttonText}</a> : null}
                      <div className="mt-8 flex gap-2">
                        {Array.from({ length: Math.max(visibleSlides.length, 1) }).map((_, index) => <span key={index} className={`h-2 rounded-full ${index === 0 ? "w-10 bg-white" : "w-5 bg-white/35"}`} />)}
                      </div>
                    </div>
                    <div className="grid min-h-[240px] place-items-center overflow-hidden rounded p-4 sm:min-h-[320px] sm:p-6" style={{ backgroundColor: theme.accent }}>
                      {normalizeImageSource(slide.image || siteContent.heroImage) ? <img src={normalizeImageSource(slide.image || siteContent.heroImage)} alt={slide.title} className="h-full max-h-[300px] w-full object-contain drop-shadow-xl" /> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section> : <PageIntro title={getViewTitle(view)} content={siteContent} />}

      {showNews ? <NewsSection content={siteContent} onOpen={setActiveNewsId} compact={isHome} /> : null}

      {showShop ? <section id="sklep" className="px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: theme.background }}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Sklep" title="Produkty Tempo Cmolas" copy="Wybierz rozmiar, a przy koszulkach dopisz numer i nazwisko. Bez rozmiaru produkt nie trafi do koszyka." />
          <div id="kategorie" className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {["Wszystkie", ...categories.map((category) => category.name)].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                style={selectedCategory === category ? { backgroundColor: theme.button, color: "#ffffff" } : { borderColor: theme.accent, color: theme.secondary }}
                className={`h-10 shrink-0 rounded border px-4 text-sm font-black uppercase transition ${selectedCategory === category ? "" : "bg-white hover:brightness-95"}`}
              >
                {category}
              </button>
            ))}
          </div>
          <div id="produkty" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(isHome ? filteredProducts.slice(0, 6) : filteredProducts).map((product) => {
              const productImages = getProductImages(product);
              const activeImageIndex = Math.min(productImageIndexes[product.id] ?? 0, Math.max(productImages.length - 1, 0));
              const activeImage = productImages[activeImageIndex] || product.image;

              return (
              <article key={product.id} className="motion-card group rounded border bg-white p-4 shadow-sm" style={{ borderColor: theme.accent }}>
                <div className="relative grid aspect-square place-items-center overflow-hidden rounded" style={{ backgroundColor: theme.accent }}>
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}14, transparent 55%)` }} />
                  <span className="absolute left-3 top-3 rounded px-2 py-1 text-xs font-black uppercase text-white" style={{ backgroundColor: theme.secondary }}>{product.tag}</span>
                  {activeImage ? (
                    <img src={normalizeImageSource(activeImage)} alt={product.name} className="relative h-4/5 w-4/5 object-contain transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="relative grid h-4/5 w-4/5 place-items-center rounded border border-dashed border-[#b8d7f6] text-center text-xs font-black uppercase text-[#58708f]">
                      Brak zdjecia
                    </div>
                  )}
                </div>
                {productImages.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {productImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setProductImageIndexes((current) => ({ ...current, [product.id]: index }))}
                        className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded border bg-white p-1 transition ${activeImageIndex === index ? "ring-2 ring-[#0b63ce]" : "hover:-translate-y-0.5"}`}
                        style={{ borderColor: activeImageIndex === index ? theme.button : theme.accent }}
                        aria-label={`Pokaż zdjęcie ${index + 1}`}
                      >
                        <img src={normalizeImageSource(image)} alt={`${product.name} ${index + 1}`} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: theme.primary }}>{product.category}</p>
                    <h3 className="mt-1 text-xl font-black" style={{ color: theme.secondary }}>{product.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#58708f]">{product.color}</p>
                    <p className="mt-2 text-sm leading-6 text-[#405875]">{product.description}</p>
                  </div>
                  <p className="text-xl font-black" style={{ color: theme.secondary }}>{product.price} zl</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#405875]">Rozmiar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const active = selectedSizes[product.id] === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => selectSize(product.id, size)}
                          style={active ? { borderColor: theme.button, backgroundColor: theme.button, color: "#ffffff" } : { borderColor: theme.accent, backgroundColor: theme.background, color: theme.secondary }}
                          className="h-9 min-w-10 rounded border px-3 text-xs font-black transition hover:brightness-95"
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {product.allowNumber || product.allowSurname ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {product.allowNumber ? <label className="block text-xs font-black uppercase tracking-[0.14em] text-[#405875]">
                      Numer
                      <input
                        value={numbers[product.id] ?? ""}
                        onChange={(event) => setNumbers((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, "").slice(0, 2) }))}
                        inputMode="numeric"
                        placeholder="10"
                        className="mt-2 h-11 w-full rounded border border-[#b8d7f6] bg-white px-3 text-base font-black text-[#071b3a] outline-none transition focus:border-[#0b63ce] focus:ring-4 focus:ring-[#0b63ce]/10"
                      />
                    </label> : null}
                    {product.allowSurname ? <label className="block text-xs font-black uppercase tracking-[0.14em] text-[#405875]">
                      Nazwisko
                      <input
                        value={surnames[product.id] ?? ""}
                        onChange={(event) => setSurnames((current) => ({ ...current, [product.id]: event.target.value.toUpperCase().slice(0, 18) }))}
                        placeholder="KOWALSKI"
                        className="mt-2 h-11 w-full rounded border border-[#b8d7f6] bg-white px-3 text-base font-black text-[#071b3a] outline-none transition focus:border-[#0b63ce] focus:ring-4 focus:ring-[#0b63ce]/10"
                      />
                    </label> : null}
                  </div>
                ) : null}

                {productErrors[product.id] ? <p className="mt-3 text-sm font-bold text-red-600">{productErrors[product.id]}</p> : null}

                <button
                  type="button"
                  onClick={() => setActiveProduct(product)}
                  className="mt-4 flex h-10 w-full items-center justify-center rounded border border-[#b8d7f6] text-sm font-black uppercase text-[#071b3a] transition hover:bg-[#e9f4ff]"
                >
                  Zobacz szczegoly
                </button>

                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.sizes.length > 0 && !selectedSizes[product.id]}
                  style={{ backgroundColor: product.sizes.length > 0 && !selectedSizes[product.id] ? undefined : theme.button }}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0b63ce] text-sm font-black uppercase text-white transition hover:-translate-y-0.5 hover:brightness-90 disabled:cursor-not-allowed disabled:bg-[#b8c8da]"
                >
                  Dodaj do koszyka
                  <Plus size={18} />
                </button>
              </article>
              );
            })}
          </div>
          {isHome ? <div className="mt-8 text-center"><a href="/sklep" className="inline-flex min-h-11 items-center rounded px-5 py-3 text-sm font-black uppercase text-white" style={{ backgroundColor: theme.button }}>Zobacz cały sklep</a></div> : null}
        </div>
      </section> : null}

      {showClub ? <section id="o-klubie" className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: theme.accent }}>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Tempo Cmolas" title="O klubie" copy={siteContent.clubHistory} />
          <div id="mecze" className="grid gap-4 sm:grid-cols-3">
            <MatchCard title="Najbliższy mecz" match={matchHighlights.next} />
            <MatchCard title="Ostatni wynik" match={matchHighlights.last} />
            <MatchCard title="Poprzedni mecz" match={matchHighlights.previous} />
          </div>
        </div>
        {view === "matches" ? <LeagueStandings content={siteContent} /> : null}
      </section> : null}

      {view === "matches" ? <SchedulePublicSection content={siteContent} /> : null}

      {showTeam ? <section id="kadra" className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: theme.background }}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={siteContent.publicTexts.teamEyebrow} title={siteContent.publicTexts.teamTitle} copy={siteContent.publicTexts.teamDescription} />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {siteContent.players.length === 0 && siteContent.publicTexts.teamEmptyText ? <div className="rounded border p-5 text-sm font-bold text-[#58708f] sm:col-span-2 lg:col-span-4" style={{ borderColor: theme.accent, backgroundColor: theme.accent }}>{siteContent.publicTexts.teamEmptyText}</div> : null}
            {siteContent.players.map((player) => (
              <div key={player.id} className="overflow-hidden rounded border" style={{ borderColor: theme.accent, backgroundColor: theme.accent }}>
                {normalizeImageSource(player.image) ? (
                  <img src={normalizeImageSource(player.image)} alt={player.name} className="h-48 w-full object-cover" />
                ) : null}
                <div className="p-4">
                <p className="text-3xl font-black" style={{ color: theme.primary }}>{player.number}</p>
                <h3 className="mt-2 font-black">{player.name}</h3>
                <p className="mt-1 text-sm font-bold text-[#58708f]">{player.position}</p>
                {player.description ? <p className="mt-3 text-sm leading-6 text-[#405875]">{player.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> : null}

      {showGallery ? (
        <GalleryPublicSection
          content={siteContent}
          compact={isHome}
          selectedAlbum={galleryAlbum}
          visibleCount={galleryVisibleCount}
          onAlbumChange={(album) => {
            setGalleryAlbum(album);
            setGalleryVisibleCount(12);
          }}
          onShowMore={() => setGalleryVisibleCount((count) => count + 12)}
          onOpen={setLightboxImage}
        />
      ) : null}

      {(isHome || view === "club") ? <section className="px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: theme.background }}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={siteContent.publicTexts.sponsorsEyebrow} title={siteContent.publicTexts.sponsorsTitle} copy={siteContent.publicTexts.sponsorsDescription} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {siteContent.sponsors.length === 0 && siteContent.publicTexts.sponsorsEmptyText ? <div className="rounded border p-5 text-sm font-bold text-[#58708f] sm:col-span-2 lg:col-span-4" style={{ borderColor: theme.accent, backgroundColor: theme.accent }}>{siteContent.publicTexts.sponsorsEmptyText}</div> : null}
            {siteContent.sponsors.map((sponsor) => (
              <a key={sponsor.id} href={sponsor.url || "#"} className="grid min-h-36 place-items-center rounded border p-4 text-center transition hover:-translate-y-1" style={{ borderColor: theme.accent, backgroundColor: theme.accent }}>
                {normalizeImageSource(sponsor.logo) ? <img src={normalizeImageSource(sponsor.logo)} alt={sponsor.name} className="max-h-[120px] max-w-full object-contain" /> : <span className="font-black uppercase" style={{ color: theme.primary }}>{sponsor.name}</span>}
              </a>
            ))}
          </div>
        </div>
      </section> : null}

      {showSocial ? <SocialPublicSection content={siteContent} /> : null}

      {showCart ? <section id="koszyk" className="px-4 py-20 text-white sm:px-6 lg:px-8" style={{ backgroundColor: theme.secondary }}>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.78fr]">
          <div>
            <SectionHeader dark eyebrow={siteContent.publicTexts.cartEyebrow} title={siteContent.publicTexts.cartTitle} copy={siteContent.publicTexts.cartDescription} />
            <div className="mt-8 space-y-3">
              {cart.length === 0 ? (
                <div className="rounded border border-white/12 bg-white/8 p-5 text-white/70">Koszyk jest pusty. Wybierz produkt i rozmiar w sklepie.</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="grid gap-4 rounded border border-white/12 bg-white/8 p-4 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex gap-3">
                      <ProductThumb src={item.image} name={item.name} dark />
                      <div>
                        <h3 className="font-black">{item.name}</h3>
                        <p className="mt-1 text-sm text-white/60">
                          Rozmiar: {item.size}
                          {item.number ? ` / Numer: ${item.number}` : ""}
                          {item.surname ? ` / Nazwisko: ${item.surname}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => changeQty(item.id, -1)} className="grid h-8 w-8 place-items-center rounded border border-white/16 transition hover:bg-white/10" aria-label="Zmniejsz">
                        <X size={14} />
                      </button>
                      <span className="font-black">x{item.qty}</span>
                      <span className="w-20 text-right font-black">{item.price * item.qty} zl</span>
                      <button type="button" onClick={() => changeQty(item.id, 1)} className="grid h-8 w-8 place-items-center rounded bg-white text-[#071b3a] transition hover:bg-[#e9f4ff]" aria-label="Zwieksz">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="h-fit rounded bg-white p-5 text-[#071b3a] shadow-xl">
            <h3 className="text-2xl font-black">Podsumowanie</h3>
            <div className="mt-5 space-y-3 text-sm">
              <SummaryRow label="Produkty" value={`${total} zl`} />
              <SummaryRow label="Dostawa" value="do ustalenia" />
              <SummaryRow label="Odbior osobisty" value="0 zl" />
            </div>
            <div className="my-5 border-t border-[#d7e7f8]" />
            <SummaryRow label="Razem" value={`${total} zl`} strong />
            <button
              type="button"
              onClick={openCheckout}
              disabled={cart.length === 0}
              style={{ backgroundColor: cart.length === 0 ? undefined : theme.button }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded bg-[#0b63ce] text-sm font-black uppercase text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:bg-[#b8c8da]"
            >
              Sfinalizuj zamowienie
              <ChevronRight size={18} />
            </button>
            <div className="mt-5 grid gap-2 text-sm font-bold text-[#405875]">
              <p className="flex items-center gap-2"><Truck size={16} className="text-[#0b63ce]" /> Odbior osobisty lub wysylka</p>
            </div>
          </aside>
        </div>
      </section> : null}

      {checkoutOpen ? (
        <section id="formularz-zamowienia" className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: theme.accent }}>
          <div className="mx-auto max-w-7xl">
            <SectionHeader eyebrow="Finalizacja" title="Formularz zamowienia" copy="Podaj dane kontaktowe. Klub skontaktuje sie w sprawie platnosci i odbioru." />
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={submitOrder} className="rounded border border-[#d7e7f8] bg-white p-5 shadow-sm">
                <Field label="Imie i nazwisko" error={formErrors.fullName}>
                  <input value={checkoutForm.fullName} onChange={(event) => setCheckoutForm((current) => ({ ...current, fullName: event.target.value }))} className="input" />
                </Field>
                <Field label="Numer telefonu" error={formErrors.phone}>
                  <input value={checkoutForm.phone} onChange={(event) => setCheckoutForm((current) => ({ ...current, phone: event.target.value }))} className="input" />
                </Field>
                <Field label="E-mail" error={formErrors.email}>
                  <input value={checkoutForm.email} onChange={(event) => setCheckoutForm((current) => ({ ...current, email: event.target.value }))} className="input" />
                </Field>

                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#405875]">Sposob odbioru</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      ["pickup", "Odbior osobisty"],
                      ["shipping", "Wysylka"]
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCheckoutForm((current) => ({ ...current, delivery: value as CheckoutForm["delivery"] }))}
                        style={checkoutForm.delivery === value ? { borderColor: theme.button, backgroundColor: theme.button, color: "#ffffff" } : { borderColor: theme.accent, backgroundColor: theme.background, color: theme.secondary }}
                        className="h-11 rounded border px-3 text-sm font-black transition hover:brightness-95"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {checkoutForm.delivery === "shipping" ? (
                  <Field label="Adres wysylki" error={formErrors.address}>
                    <textarea value={checkoutForm.address} onChange={(event) => setCheckoutForm((current) => ({ ...current, address: event.target.value }))} className="input min-h-24 py-3" />
                  </Field>
                ) : null}

                <Field label="Uwagi do zamowienia">
                  <textarea value={checkoutForm.notes} onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))} className="input min-h-24 py-3" />
                </Field>

                <button type="submit" style={{ backgroundColor: theme.button }} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-black uppercase text-white transition hover:brightness-90">
                  Wyslij zamowienie
                  <Check size={18} />
                </button>
              </form>

              <OrderSummary cart={cart} total={total} form={checkoutForm} orderSent={orderSent} lastOrder={lastOrder} />
            </div>
          </div>
        </section>
      ) : null}

      {(isHome || showContactOnly) ? <footer id="kontakt" className="px-4 py-16 text-white sm:px-6 lg:px-8" style={{ backgroundColor: theme.secondary }}>
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            {normalizeImageSource(siteContent.logoImage) ? <img src={normalizeImageSource(siteContent.logoImage)} alt="Herb Tempo Cmolas" className="mb-5 h-16 w-16 object-contain" /> : null}
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#9ecbff]">Kontakt</p>
            <h2 className="mt-3 text-4xl font-black uppercase">{siteContent.logoText}</h2>
            {siteContent.footerText ? <p className="mt-4 max-w-xl leading-7 text-white/62">{siteContent.footerText}</p> : null}
            <div className="mt-5 flex flex-wrap gap-3">
              {siteContent.facebookUrl ? <a href={siteContent.facebookUrl} className="text-sm font-black uppercase text-[#9ecbff]">Facebook</a> : null}
              {siteContent.instagramUrl ? <a href={siteContent.instagramUrl} className="text-sm font-black uppercase text-[#9ecbff]">Instagram</a> : null}
            </div>
          </div>
          <div className="grid gap-3">
            <ContactLine icon={<MapPin size={18} />} text={siteContent.contactAddress} />
            <ContactLine icon={<Phone size={18} />} text={siteContent.contactPhone} />
            <ContactLine icon={<Mail size={18} />} text={siteContent.contactEmail} />
            <ContactLine icon={<UserRound size={18} />} text={siteContent.pickupText} />
          </div>
        </div>
      </footer> : null}

      {activeProduct ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#071b3a]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded bg-white p-5 text-[#071b3a] shadow-2xl">
            <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="grid min-h-72 place-items-center rounded bg-[#f6fbff] p-5">
                {(getProductImages(activeProduct)[productImageIndexes[activeProduct.id] ?? 0] || activeProduct.image) ? (
                  <img src={normalizeImageSource(getProductImages(activeProduct)[productImageIndexes[activeProduct.id] ?? 0] || activeProduct.image)} alt={activeProduct.name} className="max-h-80 max-w-full object-contain" />
                ) : (
                  <div className="text-center text-sm font-black uppercase text-[#58708f]">Brak zdjecia</div>
                )}
                </div>
                {getProductImages(activeProduct).length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {getProductImages(activeProduct).map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setProductImageIndexes((current) => ({ ...current, [activeProduct.id]: index }))}
                        className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border bg-white p-1 transition ${(productImageIndexes[activeProduct.id] ?? 0) === index ? "ring-2 ring-[#0b63ce]" : "hover:-translate-y-0.5"}`}
                        style={{ borderColor: (productImageIndexes[activeProduct.id] ?? 0) === index ? "#0b63ce" : "#b8d7f6" }}
                      >
                        <img src={normalizeImageSource(image)} alt={`${activeProduct.name} ${index + 1}`} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b63ce]">{activeProduct.category}</p>
                <h2 className="mt-2 text-4xl font-black uppercase">{activeProduct.name}</h2>
                <p className="mt-3 text-lg leading-8 text-[#405875]">{activeProduct.description}</p>
                <p className="mt-5 text-3xl font-black">{activeProduct.price} zl</p>
                <p className="mt-3 text-sm font-bold text-[#58708f]">Rozmiary: {activeProduct.sizes.join(", ") || "brak"}</p>
                <p className="mt-1 text-sm font-bold text-[#58708f]">
                  {activeProduct.allowNumber || activeProduct.allowSurname ? `Personalizacja: ${[activeProduct.allowNumber ? "numer" : "", activeProduct.allowSurname ? "nazwisko" : ""].filter(Boolean).join(" i ")}` : "Bez personalizacji"}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveProduct(null)}
                  className="mt-6 h-11 rounded bg-[#0b63ce] px-5 text-sm font-black uppercase text-white transition hover:bg-[#084da3]"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {activeNewsId ? <NewsModal content={siteContent} newsId={activeNewsId} onClose={() => setActiveNewsId("")} /> : null}
      {lightboxImage ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/85 p-4" role="dialog" aria-modal="true" onClick={() => setLightboxImage("")}>
          <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded bg-white text-[#071b3a]" aria-label="Zamknij"><X size={20} /></button>
          <img src={normalizeImageSource(lightboxImage)} alt="Podgląd zdjęcia" className="max-h-[88vh] max-w-full rounded object-contain" />
        </div>
      ) : null}
    </main>
  );
}

function SectionHeader({ eyebrow, title, copy, dark = false }: { eyebrow: string; title: string; copy: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: dark ? "var(--tempo-sky)" : "var(--tempo-blue)" }}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl ${dark ? "text-white" : ""}`} style={dark ? undefined : { color: "var(--tempo-navy)" }}>{title}</h2>
      {copy ? <p className={`mt-4 text-base leading-7 sm:text-lg sm:leading-8 ${dark ? "text-white/62" : "text-[#405875]"}`}>{copy}</p> : null}
    </div>
  );
}

function PageIntro({ title, content }: { title: string; content: SiteContent }) {
  return (
    <section className="px-4 pb-10 pt-28 sm:px-6 lg:px-8" style={{ backgroundColor: content.accentColor }}>
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: content.primaryColor }}>KS Tempo Cmolas</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-tight sm:text-6xl" style={{ color: content.secondaryColor }}>{title}</h1>
      </div>
    </section>
  );
}

function getViewTitle(view: PublicView) {
  const titles: Record<PublicView, string> = {
    home: "KS Tempo Cmolas",
    shop: "Sklep",
    categories: "Kategorie produktów",
    club: "O klubie",
    team: "Skład drużyny",
    matches: "Mecze i wyniki",
    gallery: "Galeria",
    news: "Aktualności",
    contact: "Kontakt",
    cart: "Koszyk"
  };
  return titles[view];
}

function NewsSection({ content, onOpen, compact = false }: { content: SiteContent; onOpen: (id: string) => void; compact?: boolean }) {
  const news = content.news.filter((item) => item.visible).slice(0, compact ? 3 : undefined);
  if (news.length === 0) return null;
  return (
    <section id="aktualnosci" className="px-4 py-14 sm:px-6 lg:px-8" style={{ backgroundColor: content.backgroundColor }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Aktualności" title="Newsy klubowe" copy="" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {news.map((item) => (
            <article key={item.id} className="motion-card overflow-hidden rounded border bg-white shadow-sm" style={{ borderColor: content.accentColor }}>
              {normalizeImageSource(item.image) ? <img src={normalizeImageSource(item.image)} alt={item.title} className="h-52 w-full object-cover" /> : null}
              <div className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: content.primaryColor }}>{item.category} / {item.date}</p>
                <h3 className="mt-2 text-xl font-black" style={{ color: content.secondaryColor }}>{item.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#405875]">{item.content}</p>
                <button onClick={() => onOpen(item.id)} className="mt-4 min-h-11 rounded px-4 py-2 text-sm font-black uppercase text-white" style={{ backgroundColor: content.buttonColor }}>Czytaj</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryPublicSection({
  content,
  compact,
  selectedAlbum,
  visibleCount,
  onAlbumChange,
  onShowMore,
  onOpen
}: {
  content: SiteContent;
  compact: boolean;
  selectedAlbum: string;
  visibleCount: number;
  onAlbumChange: (album: string) => void;
  onShowMore: () => void;
  onOpen: (image: string) => void;
}) {
  const allPhotos = selectedAlbum === "all" ? content.gallery : content.gallery.filter((item) => item.albumId === selectedAlbum);
  const photos = compact ? content.gallery.slice(0, 6) : allPhotos.slice(0, visibleCount);
  return (
    <section id="galeria" className="px-4 py-16 text-white sm:px-6 lg:px-8" style={{ backgroundColor: content.secondaryColor }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeader dark eyebrow={content.publicTexts.galleryEyebrow} title={content.publicTexts.galleryTitle} copy={content.publicTexts.galleryDescription} />
        {!compact && content.galleryAlbums.length > 0 ? (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => onAlbumChange("all")} className={`min-h-10 shrink-0 rounded px-4 text-sm font-black uppercase ${selectedAlbum === "all" ? "bg-white text-[#071b3a]" : "border border-white/18 text-white"}`}>Wszystkie</button>
            {content.galleryAlbums.map((album) => (
              <button key={album.id} onClick={() => onAlbumChange(album.id)} className={`min-h-10 shrink-0 rounded px-4 text-sm font-black uppercase ${selectedAlbum === album.id ? "bg-white text-[#071b3a]" : "border border-white/18 text-white"}`}>{album.name}</button>
            ))}
          </div>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.length === 0 && content.publicTexts.galleryEmptyText ? <div className="rounded border border-white/12 bg-white/8 p-5 text-sm font-bold text-white/70 sm:col-span-2 lg:col-span-3">{content.publicTexts.galleryEmptyText}</div> : null}
          {photos.map((item) => (
            <button key={item.id} onClick={() => onOpen(item.image)} className="motion-card overflow-hidden rounded border border-white/12 bg-white/8 text-left">
              {normalizeImageSource(item.image) ? <img src={normalizeImageSource(item.image)} alt={getPublicGalleryTitle(item) || "Zdjęcie Tempo Cmolas"} className="h-64 w-full object-cover" /> : <div className="grid h-64 place-items-center bg-white/10 text-sm font-black uppercase text-white/60">Brak zdjęcia</div>}
              {getPublicGalleryTitle(item) ? <div className="p-4"><h3 className="font-black">{getPublicGalleryTitle(item)}</h3></div> : null}
            </button>
          ))}
        </div>
        {compact ? <div className="mt-8 text-center"><a href="/galeria" className="inline-flex min-h-11 items-center rounded bg-white px-5 py-3 text-sm font-black uppercase text-[#071b3a]">Zobacz całą galerię</a></div> : photos.length < allPhotos.length ? <div className="mt-8 text-center"><button onClick={onShowMore} className="inline-flex min-h-11 items-center rounded bg-white px-5 py-3 text-sm font-black uppercase text-[#071b3a]">Pokaż więcej</button></div> : null}
      </div>
    </section>
  );
}

function NewsModal({ content, newsId, onClose }: { content: SiteContent; newsId: string; onClose: () => void }) {
  const news = content.news.find((item) => item.id === newsId);
  if (!news) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#071b3a]/70 p-4 backdrop-blur-sm">
      <article className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded bg-white text-[#071b3a] shadow-2xl">
        {normalizeImageSource(news.image) ? <img src={normalizeImageSource(news.image)} alt={news.title} className="max-h-[360px] w-full object-cover" /> : null}
        <div className="p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b63ce]">{news.category} / {news.date}</p>
          <h2 className="mt-3 text-3xl font-black uppercase">{news.title}</h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-[#405875]">{news.content}</p>
          <button onClick={onClose} className="mt-6 min-h-11 rounded bg-[#0b63ce] px-5 py-3 text-sm font-black uppercase text-white">Zamknij</button>
        </div>
      </article>
    </div>
  );
}

function SchedulePublicSection({ content, compact = false }: { content: SiteContent; compact?: boolean }) {
  if (content.schedule.length === 0) return null;
  const now = new Date();
  const matches = compact ? content.schedule.slice(0, 2) : content.schedule;
  return (
    <section id="terminarz" className="px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: content.accentColor }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Mecze" title="Terminarz i wyniki" copy="" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {matches.map((match) => {
            const finished = match.homeScore !== "" && match.awayScore !== "";
            const upcoming = !finished && new Date(`${match.date}T${match.time || "00:00"}`) >= now;
            return (
              <article key={match.id} className="rounded border bg-white p-4 shadow-sm" style={{ borderColor: content.primaryColor }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded px-3 py-1 text-xs font-black uppercase text-white" style={{ backgroundColor: finished ? content.secondaryColor : content.buttonColor }}>{finished ? "Zakończony" : upcoming ? "Najbliższy" : "Planowany"}</span>
                  <span className="text-sm font-black text-[#58708f]">{match.date}{match.time ? `, ${match.time}` : ""}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <TeamCrest src={match.homeCrest} name={match.homeTeam} />
                  <span className="text-2xl font-black">{finished ? `${match.homeScore}:${match.awayScore}` : "vs"}</span>
                  <TeamCrest src={match.awayCrest} name={match.awayTeam} />
                </div>
                {match.stadium ? <p className="mt-4 text-sm font-bold text-[#58708f]">{match.stadium}</p> : null}
                {match.description ? <p className="mt-2 text-sm leading-6 text-[#405875]">{match.description}</p> : null}
              </article>
            );
          })}
        </div>
        {compact ? <div className="mt-8 text-center"><a href="/mecze" className="inline-flex min-h-11 items-center rounded bg-white px-5 py-3 text-sm font-black uppercase text-[#071b3a]">Zobacz terminarz</a></div> : null}
      </div>
    </section>
  );
}

function SocialPublicSection({ content }: { content: SiteContent }) {
  const embeds = content.socialEmbeds.filter((item) => item.visible && item.url);
  if (embeds.length === 0 && !content.instagramAccount) return null;
  return (
    <section id="social" className="px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: content.backgroundColor }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Social media" title="Rolki i posty" copy={content.instagramAccount ? `Instagram: @${content.instagramAccount.replace("@", "")}` : ""} />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {embeds.map((embed) => (
            <article key={embed.id} className="overflow-hidden rounded border bg-white p-4 shadow-sm" style={{ borderColor: content.accentColor }}>
              <h3 className="font-black" style={{ color: content.secondaryColor }}>{embed.title}</h3>
              <div className="mt-4 aspect-[9/12] overflow-hidden rounded bg-[#f1f6fb]">
                <iframe src={toEmbedUrl(embed.url, embed.platform)} title={embed.title} className="h-full w-full" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function toEmbedUrl(url: string, platform: string) {
  if (platform === "YouTube") {
    const id = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (platform === "TikTok") return url;
  if (url.includes("instagram.com") && !url.endsWith("/embed")) return `${url.replace(/\/$/, "")}/embed`;
  return url;
}

function getScheduleHighlights(content: SiteContent) {
  const sorted = [...content.schedule].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const now = new Date();
  const finished = sorted.filter((match) => match.homeScore !== "" && match.awayScore !== "");
  const upcoming = sorted.find((match) => match.homeScore === "" && match.awayScore === "" && new Date(`${match.date}T${match.time || "00:00"}`) >= now);
  const toMatchInfo = (match: SiteContent["schedule"][number] | undefined, fallback: MatchInfo): MatchInfo => {
    if (!match) return fallback;
    const tempoIsHome = match.homeTeam.toLowerCase().includes("tempo cmolas");
    return {
      opponent: tempoIsHome ? match.awayTeam : match.homeTeam,
      date: match.date,
      time: match.time,
      place: match.stadium,
      score: match.homeScore !== "" && match.awayScore !== "" ? `${match.homeScore}:${match.awayScore}` : "-",
      tempoCrest: tempoIsHome ? match.homeCrest : match.awayCrest,
      opponentCrest: tempoIsHome ? match.awayCrest : match.homeCrest
    };
  };

  return {
    next: toMatchInfo(upcoming, content.nextMatch),
    last: toMatchInfo(finished[finished.length - 1], content.lastResult),
    previous: toMatchInfo(finished[finished.length - 2], content.previousMatch)
  };
}

function normalizeNavHref(href: string) {
  const map: Record<string, string> = {
    "#start": "/",
    "#sklep": "/sklep",
    "#produkty": "/sklep",
    "#kategorie": "/kategorie",
    "#o-klubie": "/o-klubie",
    "#kadra": "/kadra",
    "#mecze": "/mecze",
    "#terminarz": "/mecze",
    "#tabela": "/mecze",
    "#galeria": "/galeria",
    "#aktualnosci": "/aktualnosci",
    "#koszyk": "/koszyk",
    "#kontakt": "/kontakt",
    "#social": "/mecze"
  };
  return map[href] ?? href;
}

function viewFromHref(href: string): PublicView {
  const match = navLinks.find(([, linkHref]) => linkHref === href);
  return match?.[2] ?? "home";
}

function MatchCard({ title, match }: { title: string; match: MatchInfo }) {
  return (
    <article className="rounded border bg-white p-5 shadow-sm" style={{ borderColor: "var(--tempo-sky)" }}>
      <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: "var(--tempo-blue)" }}>{title}</p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamCrest src={match.tempoCrest} name="Tempo Cmolas" />
        <span className="text-sm font-black uppercase text-[#58708f]">vs</span>
        <TeamCrest src={match.opponentCrest} name={match.opponent} />
      </div>
      <h3 className="mt-4 text-2xl font-black">Tempo Cmolas vs {match.opponent}</h3>
      <p className="mt-2 text-sm font-bold text-[#58708f]">{match.date}{match.time ? `, ${match.time}` : ""}</p>
      <p className="mt-1 text-sm font-bold text-[#58708f]">{match.place}</p>
      <p className="mt-4 text-3xl font-black" style={{ color: "var(--tempo-navy)" }}>{match.score}</p>
    </article>
  );
}

function LeagueStandings({ content }: { content: SiteContent }) {
  const [scope, setScope] = useState<LeagueTableScope>("all");
  const mode = content.leagueTable.mode ?? (content.leagueTable.visible ? "embed" : "hidden");
  if (mode === "hidden") return null;
  const sanitizedEmbed = sanitizeIframeEmbed(content.leagueTable.embedCode);
  const teams = [...content.leagueTable.teams].sort((a, b) => a[scope].position - b[scope].position);
  const visibleColumns = getVisibleLeagueColumns(content.leagueTable.columns);
  if (mode === "embed" && !sanitizedEmbed) return null;
  if (mode === "custom" && teams.length === 0) return null;

  return (
    <div id="tabela" className="standings-enter mx-auto mt-12 max-w-[900px]">
      <div className="mb-5 text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: "var(--tempo-blue)" }}>Mecze i wyniki</p>
        <h2 className="mt-3 text-4xl font-black uppercase" style={{ color: "var(--tempo-navy)" }}>{content.leagueTable.title || "Tabela ligowa"}</h2>
        {content.leagueTable.description ? <p className="mx-auto mt-3 max-w-2xl text-base font-bold leading-7 text-[#405875]">{content.leagueTable.description}</p> : null}
      </div>
      <div className="overflow-hidden rounded border bg-white shadow-xl shadow-[#071b3a]/10" style={{ borderColor: "var(--tempo-sky)" }}>
        {mode === "embed" ? (
          <div className="overflow-x-auto p-3 sm:p-5">
            <div className="mx-auto min-w-[320px] max-w-full" dangerouslySetInnerHTML={{ __html: sanitizedEmbed }} />
          </div>
        ) : (
          <div>
            <div className="flex gap-2 overflow-x-auto border-b border-[#dce8f5] p-4">
              {[
                ["all", "Wszystkie"],
                ["home", "U siebie"],
                ["away", "Wyjazd"]
              ].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setScope(value as LeagueTableScope)} className={`h-10 shrink-0 rounded-full px-5 text-sm font-black transition ${scope === value ? "bg-[#1b1d22] text-white" : "bg-[#f1f4f8] text-[#405875] hover:bg-[#e4edf7]"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-xs uppercase text-[#8a97a8]">
                  <tr className="border-b border-[#e5edf5]">
                    {visibleColumns.map((column) => (
                      <th key={column.id} className={`px-3 py-4 ${column.id === "team" ? "text-left" : "text-center"}`}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => <LeagueTeamRow key={team.id} team={team} scope={scope} columns={visibleColumns} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeagueTeamRow({ team, scope, columns }: { team: LeagueTableTeam; scope: LeagueTableScope; columns: LeagueTableColumn[] }) {
  const stats = team[scope];
  const highlighted = team.highlight || team.name.toLowerCase().includes("tempo cmolas");
  return (
    <tr className={`border-b border-[#edf2f8] last:border-b-0 ${highlighted ? "bg-[#e9f4ff]" : "bg-white"}`}>
      {columns.map((column) => <LeagueCell key={column.id} team={team} stats={stats} column={column} />)}
    </tr>
  );
}

function LeagueCell({ team, stats, column }: { team: LeagueTableTeam; stats: LeagueTableTeam["all"]; column: LeagueTableColumn }) {
  const cellClass = "px-3 py-4 text-center font-bold text-[#405875]";
  if (column.id === "position") return <td className="px-3 py-4 text-center text-lg font-black text-[#1b2737]">{stats.position}</td>;
  if (column.id === "crest") {
    return (
      <td className="px-3 py-4 text-center">
        <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f1f6fb]">
          {normalizeImageSource(team.crest) ? <img src={normalizeImageSource(team.crest)} alt={team.name} className="h-full w-full object-contain p-1" /> : <span className="text-xs font-black text-[#0b63ce]">TC</span>}
        </span>
      </td>
    );
  }
  if (column.id === "team") return <td className="px-3 py-4 text-left text-base font-black text-[#1b2737]">{team.name}</td>;
  if (column.id === "form") return <td className="px-3 py-4 text-center"><PublicFormBadges form={stats.form} /></td>;
  return <td className={cellClass}>{getLeagueValue(team, column.id, stats)}</td>;
}

function PublicFormBadges({ form }: { form: string }) {
  const values = form.split("").filter(Boolean).slice(0, 5);
  if (values.length === 0) return <span className="text-sm font-bold text-[#9aa8b8]">-</span>;
  return (
    <div className="inline-flex min-w-36 overflow-hidden rounded bg-[#d8dde5] align-middle">
      {values.map((value, index) => {
        const upper = value.toUpperCase();
        const color = upper === "Z" || upper === "W" ? "bg-emerald-500" : upper === "R" || upper === "D" ? "bg-slate-400" : "bg-red-500";
        return <span key={`${value}-${index}`} className={`${color} grid h-8 w-8 place-items-center text-sm font-black text-white`}>{upper}</span>;
      })}
    </div>
  );
}

function getVisibleLeagueColumns(columns: LeagueTableColumn[]) {
  return columns.filter((column) => column.visible).sort((a, b) => a.order - b.order);
}

function getLeagueValue(team: LeagueTableTeam, columnId: LeagueTableColumnId, stats: LeagueTableTeam["all"]) {
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

function TeamCrest({ src, name }: { src: string; name: string }) {
  const imageSrc = normalizeImageSource(src);
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center overflow-hidden rounded border p-2" style={{ borderColor: "var(--tempo-sky)", backgroundColor: "var(--tempo-sky)" }}>
        {imageSrc ? <img src={imageSrc} alt={name} className="h-auto max-h-full max-w-full object-contain" /> : <span className="text-xs font-black" style={{ color: "var(--tempo-blue)" }}>TC</span>}
      </div>
      <span className="text-[11px] font-black uppercase leading-tight" style={{ color: "var(--tempo-navy)" }}>{name}</span>
    </div>
  );
}

function getProductImages(product: Product) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return images.length > 0 ? images : [product.image].filter(Boolean);
}

function getPublicGalleryTitle(item: { title: string; source: string }) {
  const title = item.title.trim();
  if (!title) return "";
  const lower = title.toLowerCase();
  const technicalWords = ["upload", "url", "image", "img_", "dsc_", "screenshot", ".jpg", ".jpeg", ".png", ".webp", ".heic"];
  if (technicalWords.some((word) => lower.includes(word))) return "";
  if (item.source === "upload" && /^\d+[-_]\d+/.test(lower)) return "";
  return title;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#405875] first:mt-0">
      {label}
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-sm normal-case tracking-normal text-red-600">{error}</p> : null}
    </label>
  );
}

function OrderSummary({
  cart,
  total,
  form,
  orderSent,
  lastOrder
}: {
  cart: CartItem[];
  total: number;
  form: CheckoutForm;
  orderSent: boolean;
  lastOrder: StoreOrder | null;
}) {
  const visibleItems = lastOrder?.items ?? cart;
  const visibleTotal = lastOrder?.total ?? total;
  const visibleCustomer = lastOrder?.customer ?? form;

  return (
    <aside className="rounded border border-[#d7e7f8] bg-white p-5 shadow-sm">
      <h3 className="text-2xl font-black">Podsumowanie zamowienia</h3>
      <div className="mt-5 space-y-3">
        {visibleItems.map((item, index) => (
          <div key={`summary-${item.productId}-${item.size}-${index}`} className="rounded bg-[#f6fbff] p-3">
            <div className="flex gap-3">
              <ProductThumb src={item.image} name={item.name} />
              <div>
                <p className="font-black">{item.name} x{item.qty}</p>
                <p className="mt-1 text-sm font-medium text-[#58708f]">
                  Rozmiar: {item.size}
                  {item.number ? ` / Numer: ${item.number}` : ""}
                  {item.surname ? ` / Nazwisko: ${item.surname}` : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="my-5 border-t border-[#d7e7f8]" />
      <SummaryRow label="Razem" value={`${visibleTotal} zl`} strong />
      {visibleCustomer.fullName || visibleCustomer.email || visibleCustomer.phone ? (
        <div className="mt-5 rounded bg-[#f6fbff] p-3 text-sm font-bold text-[#405875]">
          <p>{visibleCustomer.fullName}</p>
          <p>{visibleCustomer.phone}</p>
          <p>{visibleCustomer.email}</p>
          <p>{visibleCustomer.delivery === "shipping" ? "Wysylka" : "Odbior osobisty"}</p>
          {visibleCustomer.delivery === "shipping" && visibleCustomer.address ? <p>{visibleCustomer.address}</p> : null}
        </div>
      ) : null}
      {orderSent ? (
        <>
          <div className="mt-5 rounded border border-[#0b63ce]/20 bg-[#e9f4ff] p-4 font-black text-[#0b63ce]">
            Dziękujemy za zamówienie. Skontaktujemy się w sprawie płatności i odbioru.
          </div>
          {lastOrder ? <p className="mt-3 text-sm font-bold text-[#405875]">Numer zamowienia: {lastOrder.id}</p> : null}
        </>
      ) : null}
    </aside>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-xl font-black" : "font-bold text-[#405875]"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ContactLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded border border-white/12 bg-white/8 p-4 text-white/78">
      <span className="text-[#9ecbff]">{icon}</span>
      <span className="font-bold">{text}</span>
    </div>
  );
}

function ProductThumb({ src, name, dark = false }: { src: string; name: string; dark?: boolean }) {
  const imageSrc = normalizeImageSource(src);
  return (
    <div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded ${dark ? "bg-white/10" : "bg-white"} p-2`}>
      {imageSrc ? <img src={imageSrc} alt={name} className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] font-black uppercase text-[#58708f]">Brak</span>}
    </div>
  );
}
