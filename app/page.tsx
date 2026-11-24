"use client";
import { t, useLanguage } from "../lib/language";
import { useEffect, useState, useRef } from "react";
import {
  MapPin,
  ShoppingBag,
  Store,
  Search,
  ArrowRight,
  Leaf,
  Truck,
  Heart,
  Plus,
  Minus,
  X,
  Check,
  Package,
  ChevronDown,
  LogOut,
  RefreshCw,
} from "lucide-react";
import LanguagePanel from "./language-panel";
import LocationPicker, { Point } from "./location-picker";
import { categories, transitions } from "../lib/domain";
type Shop = {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  radius: number;
  delivery: number;
  extra: number;
  distance?: number;
  product_count?: number;
};
type Product = {
  id: string;
  shop: string;
  name: string;
  price: number;
  unit: string;
  active: number;
  quantity?: number;
};
const icons = ["🛍️", "🥬", "🛒", "🍲", "🥛", "👕", "🧴", "🏪"];
const rupee = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n / 100);
async function api(query: string, body?: any) {
  const r = await fetch(
    "/api/market" + query,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  let d: any;
  try {
    d = await r.json();
  } catch {
    throw Error(t("Server se response nahi mila. Phir try karein."));
  }
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
function Field({ label, ...props }: any) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label={t("Close")} onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Home() {
  useLanguage();
  const [user, setUser] = useState<any>(null),
    [view, setView] = useState("browse"),
    [location, setLocation] = useState<(Point & { address: string }) | null>(
      null,
    ),
    [point, setPoint] = useState<Point | null>(null),
    [address, setAddress] = useState(""),
    [modal, setModal] = useState(""),
    [category, setCategory] = useState("Sabhi"),
    [query, setQuery] = useState(""),
    [radius, setRadius] = useState("10"),
    [shops, setShops] = useState<Shop[]>([]),
    [shop, setShop] = useState<Shop | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [cart, setCart] = useState<Product[]>([]),
    [cartShop, setCartShop] = useState<Shop | null>(null),
    [seller, setSeller] = useState<{ shops: Shop[]; products: Product[] }>({
      shops: [],
      products: [],
    }),
    [orders, setOrders] = useState<any[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [hydrated, setHydrated] = useState(false);
  const orderKey = useRef("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gb-cart") || "null");
      if (saved && Array.isArray(saved.items) && saved.shop) {
        setCart(saved.items);
        setCartShop(saved.shop);
      }
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(
          "gb-cart",
          JSON.stringify({ items: cart, shop: cartShop }),
        );
      } catch {}
    }
  }, [cart, cartShop, hydrated]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    api("?action=me")
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message));
    try {
      const saved = JSON.parse(localStorage.getItem("gb-location") || "null");
      if (
        saved &&
        Number.isFinite(saved.lat) &&
        Number.isFinite(saved.lng) &&
        typeof saved.address === "string"
      )
        setLocation(saved);
    } catch {}
  }, []);
  async function loadShops() {
    if (!location) return;
    setLoading(true);
    try {
      const d = await api(
        `?action=shops&lat=${location.lat}&lng=${location.lng}&radius=${radius}`,
      );
      setShops(d.shops);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadShops();
  }, [location, radius]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function loadSeller() {
    const d = await api("?action=seller");
    setSeller(d);
  }
  async function loadOrders(sell = view === "seller") {
    setOrders(
      (await api("?action=orders&seller=" + (sell ? "1" : "0"))).orders,
    );
  }
  useEffect(() => {
    if ((view === "orders" || view === "seller") && user) {
      const timer = setInterval(() => loadOrders().catch(() => {}), 20000);
      return () => clearInterval(timer);
    }
  }, [view, user]);
  const navigate = (v: string) =>
    run(async () => {
      setModal("");
      setView(v);
      setShop(null);
      if (v === "seller" && user) {
        await loadSeller();
        await loadOrders(true);
      }
      if (v === "orders" && user) await loadOrders(false);
    });
  const openLocation = () => {
    setPoint(location);
    setAddress(location?.address || "");
    setError("");
    setModal("location");
  };
  const openShop = (s: Shop) =>
    run(async () => {
      setProducts((await api("?action=products&shop=" + s.id)).products);
      setShop(s);
    });
  function add(p: Product) {
    if (!shop) return;
    if (cartShop && cartShop.id !== shop.id && cart.length) {
      setError(
        t(
          "Ek order mein ek hi dukaan ka samaan lein. Pehle purana cart clear karein.",
        ),
      );
      return;
    }
    setCartShop(shop);
    setCart((c) =>
      c.some((x) => x.id === p.id)
        ? c.map((x) =>
            x.id === p.id
              ? { ...x, quantity: Math.min(99, (x.quantity || 1) + 1) }
              : x,
          )
        : [...c, { ...p, quantity: 1 }],
    );
    setNotice(t("Samaan cart mein add ho gaya"));
    orderKey.current = "";
  }
  function quantity(id: string, delta: number) {
    setCart((c) =>
      c
        .map((p) =>
          p.id === id
            ? { ...p, quantity: Math.min(99, (p.quantity || 1) + delta) }
            : p,
        )
        .filter((p) => (p.quantity || 0) > 0),
    );
    orderKey.current = "";
  }
  const subtotal = cart.reduce(
      (sum, p) => sum + p.price * (p.quantity || 1),
      0,
    ),
    total =
      subtotal +
      (cart.length ? (cartShop?.delivery || 0) + (cartShop?.extra || 0) : 0),
    count = cart.reduce((s, p) => s + (p.quantity || 1), 0);
  const login = (
    <div className="empty">
      <span className="empty-icon">👋</span>
      <h2> {t("Pehle apna account kholein")} </h2>
      <p>
        {" "}
        {t(
          "Ek account se samaan mangwayein aur apni dukaan bhi chalayein.",
        )}{" "}
      </p>
      <a
        className="primary"
        href="/signin-with-chatgpt?return_to=/"
        target="_top"
      >
        {" "}
        {t("Login / Sign up")} <ArrowRight size={18} />
      </a>
      <p className="small muted">
        {process.env.NEXT_PUBLIC_STANDALONE === "true"
          ? t("Secure email / password login")
          : t("Secure sign-in with ChatGPT")}
      </p>
    </div>
  );
  const orderCards = (sell: boolean) =>
    orders.length ? (
      orders.map((o) => (
        <article className="order-card" key={o.id}>
          <div className="between">
            <div>
              <small className="muted">
                #{o.id.slice(0, 8)} ·{" "}
                {new Date(o.created).toLocaleString("en-IN")}
              </small>
              <h3>{o.shop_name}</h3>
            </div>
            <span
              className={"badge " + (o.status === "Cancelled" ? "red" : "")}
            >
              {t(o.status)}
            </span>
          </div>
          <div className="order-body">
            <div>
              {o.items.map((i: any) => (
                <p key={i.id}>
                  {i.quantity} × {i.name}{" "}
                  <span className="muted">({i.unit})</span>
                  <b>{rupee(i.price * i.quantity)}</b>
                </p>
              ))}
              <p className="muted">
                {" "}
                {t("Delivery")} {rupee(o.delivery)} + dukandaar charge{" "}
                {rupee(o.extra)}
              </p>
              <p className="total">
                {" "}
                {t("Total · Cash on Delivery")} <b>{rupee(o.total)}</b>
              </p>
            </div>
            <div>
              <strong>{o.recipient}</strong>
              <p>{o.address}</p>
              <p className="small">
                {" "}
                {t("Note:")} {o.note}
              </p>
              <a href={"tel:" + (sell ? o.phone : o.shop_phone)}>
                {sell ? t("Customer") : t("Dukaan")}{" "}
                {t("ko call karein ↗")}{" "}
              </a>
              {sell && (
                <p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {" "}
                    {t("Delivery location dekhein ↗")}{" "}
                  </a>
                </p>
              )}
            </div>
          </div>
          <div className="actions">
            {(sell
              ? transitions[o.status]
              : o.status === "Placed"
                ? ["Cancelled"]
                : []
            )?.map((status: string) => (
              <button
                key={status}
                disabled={busy}
                className={status === "Cancelled" ? "secondary" : "primary"}
                onClick={() => {
                  if (
                    status === "Cancelled" &&
                    !window.confirm(
                      t("Kya aap yeh order cancel karna chahte hain?"),
                    )
                  )
                    return;
                  run(async () => {
                    await api("", { action: "status", id: o.id, status });
                    await loadOrders(sell);
                    setNotice(t("Order updated"));
                  });
                }}
              >
                {status === "Cancelled"
                  ? t("Cancel order")
                  : status === "Accepted"
                    ? t("Order accept karein")
                    : status === "Out for delivery"
                      ? t("Delivery ke liye nikla")
                      : t("Delivered mark karein")}
              </button>
            ))}
          </div>
        </article>
      ))
    ) : (
      <div className="empty">
        <Package size={38} />
        <h3> {t("Abhi koi order nahi hai")} </h3>
        <p>
          {sell
            ? t("Customers ke orders yahan dikhenge.")
            : t("Apne paas ki dukaan se pehla order karein.")}
        </p>
      </div>
    );
  return (
    <>
      <LanguagePanel />
      <div className="topline">
        <Leaf size={14} /> {t("Apne log. Apni dukaan. Apna Gaon Bazaar.")}{" "}
        <span> {t("Gaon se, gaon ke liye.")} </span>
      </div>
      <header>
        <button className="brand" onClick={() => navigate("browse")}>
          <span className="brand-icon">
            <Store size={26} />
          </span>
          <span>
            gaon<span className="brand-light">bazaar</span>
            <small> {t("HAR GHAR, APNI DUKAAN")} </small>
          </span>
        </button>
        <button className="delivery-location" onClick={openLocation}>
          <MapPin size={21} />
          <span>
            <small> {t("DELIVERY KA PATA")} </small>
            <strong>
              {location ? location.address : t("Apna gaon / address chunein")}
            </strong>
          </span>
          <ChevronDown size={16} />
        </button>
        <nav>
          <button
            className={view === "orders" ? "nav-active" : ""}
            onClick={() => navigate("orders")}
          >
            {" "}
            {t("Mere orders")}{" "}
          </button>
          <button
            className={view === "seller" ? "nav-active" : ""}
            onClick={() => navigate("seller")}
          >
            <Store size={17} /> {t("Meri dukaan")}{" "}
          </button>
          {user ? (
            <a
              className="account"
              title={user.name}
              href="/signout-with-chatgpt?return_to=/"
              target="_top"
            >
              <LogOut size={17} />
              <span> {t("Logout")} </span>
            </a>
          ) : (
            <a href="/signin-with-chatgpt?return_to=/" target="_top">
              {" "}
              {t("Login")}{" "}
            </a>
          )}
          <button
            className="cart-button"
            onClick={() => {
              setError("");
              setModal("cart");
            }}
          >
            <ShoppingBag size={18} /> {t("Cart")} <span>{count}</span>
          </button>
        </nav>
      </header>
      {error && !modal && (
        <div role="alert" className="global-error">
          {error}
          <button aria-label={t("Dismiss error")} onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      <main>
        {view === "browse" && !shop && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span /> {t("AAPKE GAON KA ONLINE BAZAAR")}{" "}
                </span>
                <h1>
                  {" "}
                  {t("Apni dukaan ka samaan.")} <br />
                  <em> {t("Ab seedha ghar tak.")} </em>
                </h1>
                <p>
                  {" "}
                  {t(
                    "Taazi sabzi, ghar ka rashan ya roz ki zaroorat.",
                  )} <br />{" "}
                  {t(
                    "Apne aas-paas ke dukandaar se mangwayein, bina ghar se nikle.",
                  )}{" "}
                </p>
                <button className="primary large" onClick={openLocation}>
                  <MapPin size={19} />
                  {location
                    ? t("Delivery address badlein")
                    : t("Apna delivery address chunein")}
                  <ArrowRight size={19} />
                </button>
                <div className="hero-notes">
                  <span>
                    <Check size={15} /> {t("5–10 km ki local dukaan")}{" "}
                  </span>
                  <span>
                    <Check size={15} /> {t("Cash on Delivery")}{" "}
                  </span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="sun" />
                <div className="ground" />
                <div className="floating-label label-one">
                  <Heart size={16} />{" "}
                  {t("Apno ka khayal, door rehkar bhi")}{" "}
                </div>
                <div className="store-illustration">
                  <div className="roof-sign">
                    GAON BAZAAR <Leaf size={18} />
                  </div>
                  <div className="awning">
                    {Array.from({ length: 7 }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  <div className="store-front">
                    <div className="store-window">
                      <span>🥬</span>
                      <span>🥕</span>
                      <span>🍅</span>
                      <div className="produce-crate" />
                    </div>
                    <div className="store-door">
                      <span>OPEN</span>
                      <i />
                    </div>
                  </div>
                  <div className="store-step" />
                </div>
                <div className="plant">🪴</div>
                <div className="basket">🧺</div>
                <div className="floating-label label-two">
                  <span className="round-green">
                    <Truck size={20} />
                  </span>
                  <div>
                    {" "}
                    {t("Local dukandaar")}{" "}
                    <strong> {t("Aapke darwaze tak")} </strong>
                  </div>
                </div>
              </div>
            </section>
            <section className="benefits">
              <div>
                <span>
                  <MapPin />
                </span>
                <p>
                  <strong> {t("Aas-paas se kharidein")} </strong>
                  <small> {t("Apne ilaake ki dukaan, apna bharosa")} </small>
                </p>
              </div>
              <div>
                <span>
                  <Truck />
                </span>
                <p>
                  <strong> {t("Delivery dukandaar karwaye")} </strong>
                  <small> {t("Har charge order se pehle saaf dikhe")} </small>
                </p>
              </div>
              <div>
                <span>
                  <Heart />
                </span>
                <p>
                  <strong> {t("Apno ke liye mangwayein")} </strong>
                  <small> {t("Aap kahin bhi, samaan unke ghar")} </small>
                </p>
              </div>
            </section>
            <section className="category-section">
              <div className="section-title">
                <div>
                  <span className="eyebrow"> {t("ROZ KI ZAROORATEIN")} </span>
                  <h2> {t("Aaj kya mangwana hai?")} </h2>
                </div>
                <span className="muted small">
                  {" "}
                  {t("Chhoti dukaan, har zaroorat ka samaan.")}{" "}
                </span>
              </div>
              <div className="categories">
                {categories.map((c, i) => (
                  <button
                    className={"category " + (category === c ? "selected" : "")}
                    key={t(c)}
                    onClick={() => {
                      setCategory(c);
                      document.getElementById("shops")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    <span className={"category-art art-" + i}>{icons[i]}</span>
                    <strong>{t(c)}</strong>
                  </button>
                ))}
              </div>
            </section>
            <section id="shops">
              <div className="section-title">
                <div>
                  <h2> {t("Aapke aas-paas ki dukaan")} </h2>
                  <p className="muted">
                    {location
                      ? `${location.address} · ${shops.length} ${t("Dukaan")}`
                      : t(
                          "Apna delivery address chunein, phir nazdeeki dukaan dekhein.",
                        )}
                  </p>
                </div>
                <div className="filters">
                  <label className="search">
                    <Search size={18} />
                    <input
                      aria-label={t("Dukaan search karein")}
                      placeholder={t("Dukaan ka naam dhoondhein…")}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label={t("Search radius")}
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                  >
                    <option value="5"> {t("5 km ke andar")} </option>
                    <option value="10"> {t("10 km ke andar")} </option>
                  </select>
                  <button
                    className="icon-button"
                    aria-label={t("Refresh shops")}
                    onClick={() => run(loadShops)}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="empty" role="status">
                  {" "}
                  {t("Aapke paas ki dukaan dhoondh rahe hain…")}{" "}
                </div>
              ) : !location ? (
                <div className="location-empty">
                  <div className="empty-map">
                    <MapPin size={38} />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div>
                    <h3> {t("Aapka samaan kahan pahunchana hai?")} </h3>
                    <p>
                      {" "}
                      {t("Apna ghar ya apno ka ghar—ek location chunein.")}{" "}
                    </p>
                    <button className="primary" onClick={openLocation}>
                      {" "}
                      {t("Address select karein")} <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="shop-grid">
                  {shops
                    .filter(
                      (s) =>
                        (category === "Sabhi" || s.category === category) &&
                        s.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((s) => (
                      <button
                        className="shop-card"
                        key={s.id}
                        onClick={() => openShop(s)}
                      >
                        <div
                          className={
                            "shop-art art-" + categories.indexOf(s.category)
                          }
                        >
                          <span>
                            {icons[categories.indexOf(s.category)] || "🏪"}
                          </span>
                          <span className="distance">
                            <MapPin size={13} />
                            {s.distance?.toFixed(1)} {t("km door")}{" "}
                          </span>
                        </div>
                        <div className="shop-info">
                          <small>{t(s.category)}</small>
                          <h3>{s.name}</h3>
                          <p>{s.address}</p>
                          <div className="between">
                            <span>
                              <Truck size={14} /> {t("Delivery")}{" "}
                              {rupee(s.delivery)}
                            </span>
                            <b> {t("Dukaan dekhein ↗")} </b>
                          </div>
                        </div>
                      </button>
                    ))}
                  {!shops.some(
                    (s) =>
                      (category === "Sabhi" || s.category === category) &&
                      s.name.toLowerCase().includes(query.toLowerCase()),
                  ) && (
                    <div className="empty wide">
                      <Store size={36} />
                      <h3> {t("Yahan abhi koi matching dukaan nahi mili")} </h3>
                      <p>
                        {" "}
                        {t(
                          "10 km range try karein, filter badlein, ya apni pehli dukaan jodein.",
                        )}{" "}
                      </p>
                      <button
                        className="secondary"
                        onClick={() => navigate("seller")}
                      >
                        {" "}
                        {t("Apni dukaan kholein")}{" "}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
            <section className="seller-banner">
              <div className="banner-icon">
                <Store size={38} />
              </div>
              <div>
                <span className="eyebrow">
                  {" "}
                  {t("LOCAL BUSINESS, NAYI PEHCHAAN")}{" "}
                </span>
                <h2> {t("Aapki dukaan. Ab poore gaon tak.")} </h2>
                <p>
                  {" "}
                  {t(
                    "Kirana ho, sabzi ho ya kapde—apni dukaan kholein aur online orders lein.",
                  )}{" "}
                </p>
              </div>
              <button className="primary" onClick={() => navigate("seller")}>
                {" "}
                {t("Apni dukaan banayein")} <ArrowRight size={18} />
              </button>
            </section>
            <section className="how">
              <h2> {t("Samaan mangwana, ab bilkul aasaan.")} </h2>
              <div>
                {[
                  [
                    "01",
                    t("Ghar ka pata chunein"),
                    t("Jahan delivery chahiye, map par woh ghar chunein."),
                  ],
                  [
                    "02",
                    t("Apni dukaan se kharidein"),
                    t("Samaan aur saare charges dekh kar order karein."),
                  ],
                  [
                    "03",
                    t("Ghar par samaan paayein"),
                    t(
                      "Dukandaar delivery karwaye. Paise samaan milne par dein.",
                    ),
                  ],
                ].map(([n, title, d]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <h3>{t(title)}</h3>
                    <p>{t(d)}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {view === "browse" && shop && (
          <>
            <button className="back" onClick={() => setShop(null)}>
              {" "}
              {t("← Sabhi dukaan")}{" "}
            </button>
            <section className="shop-heading">
              <div className="shop-avatar">
                {icons[categories.indexOf(shop.category)]}
              </div>
              <div>
                <span className="eyebrow">
                  {t(shop.category)} · {shop.distance?.toFixed(1)}{" "}
                  {t("KM DOOR")}{" "}
                </span>
                <h1>{shop.name}</h1>
                <p>{shop.description}</p>
                <p className="muted">{shop.address}</p>
                <a href={"tel:" + shop.phone}>
                  {" "}
                  {t("Dukandaar se baat karein ↗")}{" "}
                </a>
              </div>
              <div className="charge-box">
                <p>
                  {" "}
                  {t("Delivery")} <b>{rupee(shop.delivery)}</b>
                </p>
                <p>
                  {" "}
                  {t("Dukandaar charge")} <b>{rupee(shop.extra)}</b>
                </p>
                <small>Cash on Delivery · {shop.radius} km service</small>
              </div>
            </section>
            <div className="section-title">
              <h2> {t("Dukaan ka samaan")} </h2>
              <button className="secondary" onClick={() => setModal("cart")}>
                {" "}
                {t("Cart dekhein (")} {count})
              </button>
            </div>
            <div className="product-grid">
              {products.map((p) => (
                <article className="product-card" key={p.id}>
                  <div className="product-icon">
                    {icons[categories.indexOf(shop.category)]}
                  </div>
                  <h3>{p.name}</h3>
                  <p className="muted">{p.unit}</p>
                  <div className="between">
                    <strong>{rupee(p.price)}</strong>
                    <button className="secondary" onClick={() => add(p)}>
                      <Plus size={16} /> {t("Add")}{" "}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!products.length && (
              <div className="empty">
                <h3> {t("Dukandaar abhi samaan jod rahe hain")} </h3>
                <p> {t("Thodi der baad phir dekhein.")} </p>
              </div>
            )}
          </>
        )}
        {view === "orders" && (
          <>
            <div className="section-title page-title">
              <div>
                <span className="eyebrow"> {t("APNE ORDERS KA HAAL")} </span>
                <h1> {t("Mere orders")} </h1>
                <p className="muted">
                  {" "}
                  {t("Status har 20 seconds mein refresh hota hai.")}{" "}
                </p>
              </div>
              {user && (
                <button
                  className="secondary"
                  onClick={() => run(() => loadOrders(false))}
                >
                  <RefreshCw size={17} /> {t("Refresh")}{" "}
                </button>
              )}
            </div>
            {user ? orderCards(false) : login}
          </>
        )}
        {view === "seller" && (
          <>
            <div className="section-title page-title">
              <div>
                <span className="eyebrow">
                  {" "}
                  {t("AAPKA BUSINESS, AAPKE HAATH")}{" "}
                </span>
                <h1> {t("Meri dukaan")} </h1>
                <p className="muted">
                  {" "}
                  {t("Apne products aur aaye hue orders manage karein.")}{" "}
                </p>
              </div>
              {user && (
                <button
                  className="primary"
                  onClick={() => {
                    setPoint(null);
                    setError("");
                    setModal("new-shop");
                  }}
                >
                  <Plus size={18} /> {t("Nayi dukaan")}{" "}
                </button>
              )}
            </div>
            {!user ? (
              login
            ) : (
              <>
                <div className="stats">
                  <div>
                    <small> {t("MERI DUKAAN")} </small>
                    <strong>{seller.shops.length}</strong>
                  </div>
                  <div>
                    <small> {t("ACTIVE PRODUCTS")} </small>
                    <strong>
                      {seller.products.filter((p) => p.active).length}
                    </strong>
                  </div>
                  <div>
                    <small> {t("NEW ORDERS")} </small>
                    <strong>
                      {orders.filter((o) => o.status === "Placed").length}
                    </strong>
                  </div>
                  <div>
                    <small> {t("DELIVERED SALES")} </small>
                    <strong>
                      {rupee(
                        orders
                          .filter((o) => o.status === "Delivered")
                          .reduce((s, o) => s + o.total, 0),
                      )}
                    </strong>
                    <small> {t("Latest 200 orders")} </small>
                  </div>
                </div>
                {!seller.shops.length ? (
                  <div className="empty">
                    <Store size={42} />
                    <h2> {t("Apni pehli dukaan kholein")} </h2>
                    <p>
                      {" "}
                      {t(
                        "Naam, category, location aur charges dein. Phir samaan jodna shuru karein.",
                      )}{" "}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setPoint(null);
                        setModal("new-shop");
                      }}
                    >
                      {" "}
                      {t("Dukaan banayein")} <Plus size={18} />
                    </button>
                  </div>
                ) : (
                  seller.shops.map((s) => (
                    <section className="seller-shop" key={s.id}>
                      <div className="between">
                        <div>
                          <h2>{s.name}</h2>
                          <p className="muted">
                            {t(s.category)} · {s.radius} km · Delivery{" "}
                            {rupee(s.delivery)} + charge {rupee(s.extra)}
                          </p>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => {
                            setShop(s);
                            setError("");
                            setModal("product");
                          }}
                        >
                          <Plus size={17} /> {t("Product jodein")}{" "}
                        </button>
                      </div>
                      <div className="inventory">
                        {seller.products
                          .filter((p) => p.shop === s.id)
                          .map((p) => (
                            <div key={p.id}>
                              <span>
                                <strong>{p.name}</strong>
                                <small>
                                  {p.unit} · {rupee(p.price)}
                                </small>
                              </span>
                              <button
                                disabled={busy}
                                className={
                                  "badge-button " +
                                  (!p.active ? "inactive" : "")
                                }
                                onClick={() =>
                                  run(async () => {
                                    await api("", {
                                      action: "toggle",
                                      shop: s.id,
                                      id: p.id,
                                      active: !p.active,
                                    });
                                    await loadSeller();
                                  })
                                }
                              >
                                {p.active ? t("Available ✓") : t("Unavailable")}{" "}
                                · badlein
                              </button>
                            </div>
                          ))}
                        {!seller.products.some((p) => p.shop === s.id) && (
                          <p className="muted">
                            {" "}
                            {t(
                              "Abhi koi product nahi hai. Pehla product jodein.",
                            )}{" "}
                          </p>
                        )}
                      </div>
                    </section>
                  ))
                )}
                <div className="section-title">
                  <h2> {t("Aaye hue orders")} </h2>
                  <button
                    className="secondary"
                    onClick={() => run(() => loadOrders(true))}
                  >
                    <RefreshCw size={17} /> {t("Refresh")}{" "}
                  </button>
                </div>
                {orderCards(true)}
              </>
            )}
          </>
        )}
      </main>
      {count > 0 && !modal && (
        <button
          className="mobile-cart"
          onClick={() => {
            setError("");
            setModal("cart");
          }}
        >
          <ShoppingBag size={20} />
          <span>
            {count} · {t("Aapka cart")}
          </span>
          <strong>{rupee(total)}</strong>
          <ArrowRight size={18} />
        </button>
      )}
      <footer>
        <div className="brand">
          <Store size={22} /> gaonbazaar
        </div>
        <span> {t("Gaon ki zaroorat. Gaon ka rozgaar.")} </span>
        <small>
          {" "}
          {t(
            "Delivery dukandaar arrange karte hain. Samay phone par confirm karein.",
          )}{" "}
        </small>
      </footer>
      {modal === "location" && (
        <Modal title={t("Delivery kahan chahiye?")} close={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!point) {
                setError(t("Map par ghar ka location chunein."));
                return;
              }
              const l = { ...point, address };
              setLocation(l);
              try {
                localStorage.setItem("gb-location", JSON.stringify(l));
              } catch {}
              setModal("");
              setError("");
              setShop(null);
              orderKey.current = "";
            }}
          >
            <p className="muted">
              {" "}
              {t("Door rehkar bhi apno ke ghar samaan bhej sakte hain.")}{" "}
            </p>
            <Field
              label={t("Ghar / gaon / landmark ka pata")}
              value={address}
              onChange={(e: any) => setAddress(e.target.value)}
              placeholder={t("Ghar no., mohalla, gaon, zila, PIN")}
              minLength={8}
              maxLength={500}
              required
            />
            <LocationPicker value={point} onChange={setPoint} />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary full">
              {" "}
              {t("Is address par dukaan dikhayein")} <ArrowRight size={18} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "new-shop" && (
        <Modal title={t("Apni dukaan banayein")} close={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(async () => {
                if (!point)
                  throw Error(t("Dukaan ki location map par select karein."));
                await api("", {
                  ...f,
                  ...point,
                  action: "shop",
                  delivery: Number(f.delivery),
                  extra: Number(f.extra),
                  radius: Number(f.radius),
                });
                await loadSeller();
                setModal("");
                setNotice(t("Aapki dukaan ban gayi! Ab products jodein."));
              });
            }}
          >
            <div className="two">
              <Field
                label={t("Dukaan ka naam")}
                name="name"
                minLength={2}
                maxLength={80}
                required
                placeholder={t("Jaise: Sharma Kirana")}
              />
              <label>
                {" "}
                {t("Category")}{" "}
                <select name="category">
                  {categories.slice(1).map((c) => (
                    <option key={t(c)}>{t(c)}</option>
                  ))}
                </select>
              </label>
            </div>
            <Field
              label={t("Dukaan ka poora address")}
              name="address"
              minLength={8}
              maxLength={500}
              required
            />
            <Field
              label={t("Dukandaar ka mobile")}
              name="phone"
              type="tel"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              required
            />
            <Field
              label={t("Dukaan ke baare mein")}
              name="description"
              maxLength={300}
              placeholder={t("Aap kya bechte hain?")}
            />
            <div className="two">
              <Field
                label={t("Delivery / kiraya (₹)")}
                name="delivery"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                defaultValue="20"
                required
              />
              <Field
                label={t("Extra dukandaar charge (₹)")}
                name="extra"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                defaultValue="5"
                required
              />
            </div>
            <label>
              {" "}
              {t("Kitni door delivery karenge?")}{" "}
              <select name="radius">
                <option value="5">5 km</option>
                <option value="10">10 km</option>
              </select>
            </label>
            <LocationPicker value={point} onChange={setPoint} />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="primary full">
              {busy ? t("Save ho raha hai…") : t("Dukaan create karein")}
            </button>
          </form>
        </Modal>
      )}
      {modal === "product" && shop && (
        <Modal
          title={shop.name + " · " + t("Product jodein")}
          close={() => setModal("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(async () => {
                await api("", {
                  ...f,
                  action: "product",
                  shop: shop.id,
                  price: Number(f.price),
                });
                await loadSeller();
                setModal("");
                setNotice(t("Product add ho gaya"));
              });
            }}
          >
            <Field
              label={t("Product ka naam")}
              name="name"
              minLength={2}
              maxLength={100}
              required
              placeholder={t("Jaise: Aloo")}
            />
            <div className="two">
              <Field
                label={t("Price (₹)")}
                name="price"
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                required
              />
              <Field
                label={t("Quantity / unit")}
                name="unit"
                maxLength={30}
                required
                placeholder={t("1 kg / 1 packet / 1 piece")}
              />
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? t("Save ho raha hai…") : t("Product save karein")}
            </button>
          </form>
        </Modal>
      )}
      {modal === "cart" && (
        <Modal title={t("Aapka cart")} close={() => setModal("")}>
          {!cart.length ? (
            <div className="empty">
              <ShoppingBag size={40} />
              <h3> {t("Cart abhi khaali hai")} </h3>
              <p> {t("Dukaan kholein aur apna samaan add karein.")} </p>
              <button
                className="primary"
                onClick={() => {
                  setModal("");
                  navigate("browse");
                }}
              >
                {" "}
                {t("Dukaan dekhein")}{" "}
              </button>
            </div>
          ) : (
            <>
              <div className="between">
                <strong>{cartShop?.name}</strong>
                <button
                  className="text-button"
                  onClick={() => {
                    setCart([]);
                    setCartShop(null);
                    orderKey.current = "";
                  }}
                >
                  {" "}
                  {t("Cart clear karein")}{" "}
                </button>
              </div>
              {cart.map((p) => (
                <div className="cart-line" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.unit} · {rupee(p.price)}
                    </small>
                  </div>
                  <div className="quantity">
                    <button
                      aria-label={p.name + " kam karein"}
                      onClick={() => quantity(p.id, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{p.quantity}</span>
                    <button
                      disabled={p.quantity === 99}
                      aria-label={p.name + " badhayein"}
                      onClick={() => quantity(p.id, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <b>{rupee(p.price * (p.quantity || 1))}</b>
                </div>
              ))}
              <div className="bill">
                <p>
                  {" "}
                  {t("Samaan ka total")} <b>{rupee(subtotal)}</b>
                </p>
                <p>
                  {" "}
                  {t("Delivery / kiraya")}{" "}
                  <b>{rupee(cartShop?.delivery || 0)}</b>
                </p>
                <p>
                  {" "}
                  {t("Dukandaar ka extra charge")}{" "}
                  <b>{rupee(cartShop?.extra || 0)}</b>
                </p>
                <p className="total">
                  {" "}
                  {t("Total dena hai")} <b>{rupee(total)}</b>
                </p>
              </div>
              {!user ? (
                login
              ) : !location ? (
                <button className="primary full" onClick={openLocation}>
                  {" "}
                  {t("Delivery address chunein")}{" "}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    run(async () => {
                      if (!orderKey.current)
                        orderKey.current = crypto.randomUUID();
                      await api("", {
                        ...f,
                        ...location,
                        action: "order",
                        id: orderKey.current,
                        shop: cartShop?.id,
                        expectedTotal: total,
                        items: cart.map((p) => ({
                          id: p.id,
                          quantity: p.quantity,
                        })),
                      });
                      setCart([]);
                      setCartShop(null);
                      orderKey.current = "";
                      setModal("");
                      setView("orders");
                      await loadOrders(false);
                      setNotice(
                        t(
                          "Order place ho gaya! Dukandaar acceptance ka wait karein.",
                        ),
                      );
                    });
                  }}
                >
                  <div className="address-review">
                    <MapPin size={20} />
                    <div>
                      <strong> {t("Yahan delivery hogi")} </strong>
                      <p>{location.address}</p>
                      <button
                        type="button"
                        className="text-button"
                        onClick={openLocation}
                      >
                        {" "}
                        {t("Address badlein")}{" "}
                      </button>
                    </div>
                  </div>
                  <div className="two">
                    <Field
                      label={t("Samaan lene wale ka naam")}
                      name="recipient"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                    <Field
                      label={t("Unka mobile number")}
                      name="phone"
                      type="tel"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      required
                    />
                  </div>
                  <Field
                    label={t("Delivery note (optional)")}
                    name="note"
                    maxLength={500}
                    placeholder={t("Jaise: gate par call karein")}
                  />
                  <p className="payment-note">
                    {" "}
                    {t(
                      "✓ Cash on Delivery — payment samaan milne par.",
                    )} <br />{" "}
                    {t(
                      "Dukandaar order accept karke delivery arrange karenge.",
                    )}{" "}
                  </p>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="primary full" disabled={busy}>
                    {busy
                      ? t("Order save ho raha hai…")
                      : `${rupee(total)} · ${t("Order place karein")}`}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
