"use client";

import Image from "next/image";
import {
  ArrowDownUp, ArrowRight, Bell, Check, ChevronDown, CircleHelp,
  ClipboardList, CloudSun, Filter, Flag, Leaf, LogOut, MapPin, Menu, MessageCircle,
  Pencil, Plus, Search, Send, ShieldCheck, ShoppingBasket, Sprout, Star, Sun, Trash2, Users, X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { messages, type Locale } from "@/lib/i18n";

type Role = "BUYER" | "FARMER" | "ADMIN";
type View = "market" | "weather" | "orders" | "messages" | "admin" | "reports" | "people" | "help";
type FarmerTrust = { id: string; completedOrders: number; averageRating: number | null; reviewCount: number };
type Listing = { id: string; crop: string; variety: string; grade: string; quantity: number; unit: string; price: number; place: string; farmer: string; farmerTrust: FarmerTrust; image: string; tone: string; harvestDate: string | null; availableUntil: string | null; status: "ACTIVE" | "PAUSED" | "REMOVED" };
type DemoOrder = {
  id: string;
  crop: string;
  person: string;
  quantity: number;
  unit: string;
  total: number;
  status: "PLACED" | "ACCEPTED" | "READY" | "COMPLETED" | "CANCELLED";
  date: string;
  paymentStatus: "INCOMPLETE" | "COMPLETED";
  buyerPaymentMarkedAt: string | null;
};
type SessionUser = { id: string; name: string; email: string; role: Role; locale: string };
type Conversation = { id: string; listingId: string; listing: { crop: string }; buyer: { id: string; name: string }; farmer: { id: string; name: string }; messages: { id: string; senderId: string; body: string; createdAt: string }[] };
type WeatherReport = { provider: string; location: string; country: string; localTime: string; current: { updatedAt: string; temperatureC: number; condition: string; humidity: number; rainfallMm: number; windKph: number }; forecast: { date: string; highC: number; lowC: number; chanceOfRain: number; condition: string }[] };
type ProductReport = {
  id: string;
  reporter: string;
  reporterId: string;
  farmer: string;
  farmerId: string | null;
  crop: string;
  reason: "FAKE_PRODUCT" | "INCORRECT_INFORMATION" | "MISLEADING_IMAGE" | "POOR_QUALITY" | "SUSPICIOUS_FARMER" | "PAYMENT_ISSUE" | "OTHER";
  details: string | null;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
};

const reportLabels = {
  en: { FAKE_PRODUCT: "Fake product", INCORRECT_INFORMATION: "Incorrect information", MISLEADING_IMAGE: "Misleading image", POOR_QUALITY: "Poor quality", SUSPICIOUS_FARMER: "Suspicious farmer", PAYMENT_ISSUE: "Payment issue", OTHER: "Other", OPEN: "Open", REVIEWING: "Reviewing", RESOLVED: "Resolved", DISMISSED: "Dismissed" },
  ta: { FAKE_PRODUCT: "போலி விளைபொருள்", INCORRECT_INFORMATION: "தவறான தகவல்", MISLEADING_IMAGE: "தவறாக வழிநடத்தும் படம்", POOR_QUALITY: "குறைந்த தரம்", SUSPICIOUS_FARMER: "சந்தேகமான விவசாயி", PAYMENT_ISSUE: "கட்டணச் சிக்கல்", OTHER: "மற்றவை", OPEN: "திறந்தது", REVIEWING: "ஆய்வில்", RESOLVED: "தீர்க்கப்பட்டது", DISMISSED: "நிராகரிக்கப்பட்டது" },
} as const;

const starterListings: Listing[] = [];
const tamilCropNames: Record<string, string> = { tomato: "தக்காளி", banana: "வாழைப்பழம்", paddy: "நெல்", rice: "அரிசி", onion: "வெங்காயம்" };
const cropImageTone = (crop: string) => {
  const normalizedCrop = crop.toLowerCase();
  if (normalizedCrop.includes("banana")) return "banana";
  if (normalizedCrop.includes("paddy") || normalizedCrop.includes("rice")) return "rice";
  if (normalizedCrop.includes("onion")) return "onion";
  if (normalizedCrop.includes("tomato")) return "tomato";
  return "produce";
};
const currency = (value: number, locale: Locale) => new Intl.NumberFormat(locale === "ta" ? "ta-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const formatDate = (value: string, locale: Locale) => new Date(`${value}T00:00:00`).toLocaleDateString(locale === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
const displayCrop = (crop: string, locale: Locale) => locale === "ta" ? tamilCropNames[crop.toLowerCase()] ?? crop : crop;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [role, setRole] = useState<Role>("BUYER");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [view, setView] = useState<View>("market");
  const [query, setQuery] = useState("");
  const [cropFilter, setCropFilter] = useState("All crops");
  const [sortLow, setSortLow] = useState(false);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState("Coimbatore");
  const [listings, setListings] = useState(starterListings);
  const [favoriteListingIds, setFavoriteListingIds] = useState<string[]>([]);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [listingImageFile, setListingImageFile] = useState<File | null>(null);
  const [listingImagePreview, setListingImagePreview] = useState("");
  const [listingImageError, setListingImageError] = useState("");
  const [listingSaving, setListingSaving] = useState(false);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [modal, setModal] = useState<"login" | "signup" | "listing" | "order" | "message" | "review" | "report" | "farmer" | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reportTarget, setReportTarget] = useState<"product" | "farmer">("product");
  const [selectedOrder, setSelectedOrder] = useState<DemoOrder | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: Role; isActive: boolean }>>([
    { id: "demo-farmer", name: "Malar Selvan", email: "farmer@vayal.test", role: "FARMER", isActive: true },
    { id: "demo-buyer", name: "Kovai Fresh Mart", email: "buyer@vayal.test", role: "BUYER", isActive: true },
  ]);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<Array<{ id: string; name: string; crop: string; text: string; rating: number; status: "PENDING" | "PUBLISHED" | "HIDDEN" }>>([{ id: "review-1", name: "Anbu Stores", crop: "Paddy", text: "Clean grain and the pickup was right on time.", rating: 5, status: "PENDING" }]);
  const [reports, setReports] = useState<ProductReport[]>([]);
  const t = messages[locale];

  const loadWeather = useCallback(async (location: string) => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      const result = await response.json() as { weather?: WeatherReport; error?: string };
      if (!response.ok || !result.weather) throw new Error(result.error ?? "Weather is unavailable.");
      setWeather(result.weather);
      setWeatherError("");
    } catch (error) {
      setWeather(null);
      setWeatherError(error instanceof Error ? error.message : locale === "ta" ? "வானிலைத் தகவலைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்." : "Weather is unavailable. Check your location or try again.");
    } finally {
      setWeatherLoading(false);
    }
  }, [locale]);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/messages");
    const result = await response.json() as { conversations?: Conversation[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Messages could not be loaded.");
    const loaded = result.conversations ?? [];
    setConversations(loaded);
    setSelectedConversationId((current) => current && loaded.some((conversation) => conversation.id === current)
      ? current
      : loaded[0]?.id ?? "");
  }, []);

  const loadOrders = useCallback(async (user: SessionUser) => {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const result = await response.json() as {
      orders?: Array<{
        id: string;
        listing: { crop: string; unit: string };
        buyer: { name: string };
        farmer: { name: string };
        quantity: number;
        total: number;
        status: DemoOrder["status"];
        paymentStatus: DemoOrder["paymentStatus"];
        buyerPaymentMarkedAt: string | null;
        createdAt: string;
      }>;
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? "Orders could not be loaded.");
    setOrders((result.orders ?? []).map((item) => ({
      id: item.id,
      crop: item.listing.crop,
      person: user.role === "FARMER" ? item.buyer.name : item.farmer.name,
      quantity: item.quantity,
      unit: item.listing.unit,
      total: item.total,
      status: item.status,
      date: new Date(item.createdAt).toLocaleString(user.locale === "ta" ? "ta-IN" : "en-IN"),
      paymentStatus: item.paymentStatus,
      buyerPaymentMarkedAt: item.buyerPaymentMarkedAt,
    })));
    setOrdersError("");
  }, []);

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const result = await response.json() as {
      reports?: Array<{
        id: string;
        reporter: { id: string; name: string };
        reportedFarmer: { id: string; name: string } | null;
        listing: { crop: string } | null;
        reason: ProductReport["reason"];
        details: string | null;
        status: ProductReport["status"];
        createdAt: string;
      }>;
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? "Reports could not be loaded.");
    setReports((result.reports ?? []).map((item) => ({
      id: item.id,
      reporter: item.reporter.name,
      reporterId: item.reporter.id,
      farmer: item.reportedFarmer?.name ?? "Unknown farmer",
      farmerId: item.reportedFarmer?.id ?? null,
      crop: item.listing?.crop ?? "Removed product",
      reason: item.reason,
      details: item.details,
      status: item.status,
      createdAt: item.createdAt,
    })));
  }, []);

  async function searchWeather(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = new FormData(event.currentTarget).get("weatherLocation");
    if (typeof location !== "string" || location.trim().length < 2) return;
    const requestedLocation = location.trim();
    setWeatherLocation(requestedLocation);
    await loadWeather(requestedLocation);
  }

  const loadWorkspaceData = useCallback(async (user: SessionUser) => {
    try {
      const [listingResponse, messageResponse] = await Promise.all([
        fetch("/api/listings"),
        fetch("/api/messages"),
      ]);
      const [listingData, messageData] = await Promise.all([listingResponse.json(), messageResponse.json()]);
      if (listingResponse.ok) setListings(listingData.listings.map((item: {
        id: string; crop: string; variety: string | null; grade: string | null; quantity: number; unit: string;
        pricePerKg: number; location: string; harvestDate: string | null; availableUntil: string | null;
        imageUrl: string | null; status: Listing["status"];
        farmer: {
          id: string; name: string;
          farmerReviews: { rating: number }[];
          _count: { farmerOrders: number };
        };
      }) => {
        const imageKey = cropImageTone(item.crop);
        const ratings = item.farmer.farmerReviews.map((review) => review.rating);
        const averageRating = ratings.length ? Number((ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)) : null;
        const farmerTrust: FarmerTrust = {
          id: item.farmer.id,
          completedOrders: item.farmer._count.farmerOrders,
          averageRating,
          reviewCount: ratings.length,
        };
        return {
          id: item.id, crop: item.crop, variety: item.variety ?? "Fresh harvest", grade: item.grade ?? "",
          quantity: item.quantity, unit: item.unit, price: item.pricePerKg, place: item.location,
          farmer: item.farmer.name, farmerTrust,
          image: item.imageUrl ?? "", tone: imageKey,
          harvestDate: item.harvestDate?.slice(0, 10) ?? null,
          availableUntil: item.availableUntil?.slice(0, 10) ?? null, status: item.status,
        };
      }));
      await loadOrders(user);
      await loadReports();
      if (messageResponse.ok) {
        const loaded: Conversation[] = messageData.conversations;
        setConversations(loaded);
        setSelectedConversationId((current) => current || loaded[0]?.id || "");
      }
      if (user.role === "ADMIN") {
        const reviewResponse = await fetch("/api/reviews");
        const reviewData = await reviewResponse.json();
        if (reviewResponse.ok) setReviews(reviewData.reviews.map((item: { id: string; buyer: { name: string }; order: { listing: { crop: string } }; body: string; rating: number; status: string }) => ({ id: item.id, name: item.buyer.name, crop: item.order.listing.crop, text: item.body, rating: item.rating, status: item.status })));
        const usersResponse = await fetch("/api/users");
        const usersData = await usersResponse.json();
        if (usersResponse.ok) setUsers(usersData.users);
      }
    } catch {
      setNotice(t.databasePreview);
    }
  }, [loadOrders, loadReports, t]);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("smartagri-locale");
    if (savedLocale === "en" || savedLocale === "ta") {
      document.documentElement.lang = savedLocale;
      if (savedLocale !== "en") window.requestAnimationFrame(() => setLocale(savedLocale));
    }
    fetch("/api/auth/me").then((response) => response.json()).then((result) => {
      void loadWeather("Coimbatore");
      if (result.user) { setSession(result.user); setRole(result.user.role); void loadWorkspaceData(result.user); }
    }).catch(() => {
      void loadWeather("Coimbatore");
    });
  }, [loadWeather, loadWorkspaceData]);

  useEffect(() => {
    const storageKey = `smartagri-favourites:${session?.id ?? "guest"}`;
    const loadFavourites = window.setTimeout(() => {
      try {
        const savedFavourites = window.localStorage.getItem(storageKey);
        if (!savedFavourites) {
          setFavoriteListingIds([]);
          return;
        }
        const parsed: unknown = JSON.parse(savedFavourites);
        if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
          throw new Error("Saved favourites are invalid.");
        }
        setFavoriteListingIds(parsed);
      } catch {
        setFavoriteListingIds([]);
        setNotice(locale === "ta" ? "பிடித்தவற்றை ஏற்ற முடியவில்லை." : "Saved favourites could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(loadFavourites);
  }, [locale, session?.id]);

  useEffect(() => () => {
    if (listingImagePreview.startsWith("blob:")) URL.revokeObjectURL(listingImagePreview);
  }, [listingImagePreview]);

  useEffect(() => {
    if (view !== "messages" || !session) return;
    const initialLoad = window.setTimeout(() => {
      void loadConversations().catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Messages could not be loaded.");
      });
    }, 0);
    const interval = window.setInterval(() => {
      void loadConversations().catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Messages could not be refreshed.");
      });
    }, 5_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadConversations, session, view]);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      void loadOrders(session).catch((error: unknown) => {
        setOrdersError(error instanceof Error ? error.message : "Orders could not be refreshed.");
      });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [loadOrders, session]);

  useEffect(() => {
    if (!session || view !== "reports") return;
    const interval = window.setInterval(() => {
      void loadReports().catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Reports could not be refreshed.");
      });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [loadReports, session, view]);

  const visibleListings = useMemo(() => {
    const found = listings.filter((listing) => listing.status === "ACTIVE" || (listing.status === "PAUSED" && role === "FARMER" && listing.farmer === (session?.name ?? "Malar Selvan")))
      .filter((listing) => cropFilter === "All crops" || listing.crop === cropFilter)
      .filter((listing) => `${listing.crop} ${listing.variety} ${listing.place} ${listing.farmer}`.toLowerCase().includes(query.toLowerCase()));
    return sortLow ? [...found].sort((a, b) => a.price - b.price) : found;
  }, [cropFilter, listings, query, role, session?.name, sortLow]);

  function switchLocale(next: Locale) {
    setLocale(next);
    document.documentElement.lang = next;
    window.localStorage.setItem("smartagri-locale", next);
  }

  function toggleFavourite(listing: Listing) {
    const isFavourite = favoriteListingIds.includes(listing.id);
    const nextFavourites = isFavourite
      ? favoriteListingIds.filter((id) => id !== listing.id)
      : [...favoriteListingIds, listing.id];
    const storageKey = `smartagri-favourites:${session?.id ?? "guest"}`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextFavourites));
    } catch {
      setNotice(locale === "ta" ? "பிடித்தவற்றைச் சேமிக்க முடியவில்லை." : "Favourite could not be saved. Check your browser storage settings.");
      return;
    }
    setFavoriteListingIds(nextFavourites);
    setNotice(isFavourite ? t.favouriteRemoved : t.favouriteAdded);
  }

  async function sendToApi(path: string, body: object, method: "POST" | "PATCH" = "POST") {
    if (!session) return { demo: true };
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t.actionFailed);
      return result;
    } catch (error) { setNotice(error instanceof Error ? error.message : t.actionFailed); return null; }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAuthError("");
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const result = await response.json() as { user?: SessionUser; error?: string };
      if (!response.ok) throw new Error(result.error ?? t.actionFailed);
      if (!result.user) throw new Error(t.actionFailed);
      setSession(result.user); setRole(result.user.role); setModal(null); setNotice(t.signedIn); void loadWorkspaceData(result.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAuthError("");
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          role: data.get("role"),
        }),
      });
      const result = await response.json() as { user?: SessionUser; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error ?? t.actionFailed);
      setSession(result.user);
      setRole(result.user.role);
      setModal(null);
      setNotice(locale === "ta" ? "கணக்கு உருவாக்கப்பட்டது." : "Your account has been created.");
      void loadWorkspaceData(result.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setAuthLoading(false);
    }
  }

  function openAuthModal(next: "login" | "signup") {
    setAuthError("");
    setModal(next);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession(null); setRole("BUYER"); setOrders([]); setNotice(t.signedOut);
  }

  async function uploadProductImage(image: File): Promise<string | null> {
    if (!session) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("The image preview could not be created."));
        }, { once: true });
        reader.addEventListener("error", () => reject(new Error("The image preview could not be created.")), { once: true });
        reader.readAsDataURL(image);
      }).catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "The image preview could not be created.");
        return null;
      });
    }

    const data = new FormData();
    data.set("image", image);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: data });
      const result = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !result.imageUrl) throw new Error(result.error ?? "The product image could not be uploaded.");
      return result.imageUrl;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The product image could not be uploaded.");
      return null;
    }
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (listingSaving) return;
    setListingSaving(true);
    setListingImageError("");
    const form = new FormData(event.currentTarget);
    const changes = {
      crop: String(form.get("crop")),
      variety: String(form.get("variety") || "Fresh harvest"),
      grade: String(form.get("grade") || "") || null,
      quantity: Number(form.get("quantity")),
      unit: String(form.get("unit")),
      pricePerKg: Number(form.get("pricePerKg")),
      location: String(form.get("location")),
      harvestDate: String(form.get("harvestDate") || "") || null,
      availableUntil: String(form.get("availableUntil") || "") || null,
    };
    try {
      let imageUrl = editingListing?.image ?? "";
      if (listingImageFile) {
        const uploadedImage = await uploadProductImage(listingImageFile);
        if (!uploadedImage) return;
        imageUrl = uploadedImage;
      } else if (!editingListing) {
        setListingImageError(locale === "ta" ? "விளைபொருள் படத்தைத் தேர்ந்தெடுக்கவும்." : "Choose a product image before publishing.");
        return;
      }

      if (editingListing) {
        const saved = await sendToApi("/api/listings", { id: editingListing.id, ...changes, imageUrl }, "PATCH");
        if (!saved) return;
        setListings((current) => current.map((item) => item.id === editingListing.id ? {
          ...item,
          crop: changes.crop,
          variety: changes.variety,
          grade: changes.grade ?? "",
          quantity: changes.quantity,
          unit: changes.unit,
          price: changes.pricePerKg,
          place: changes.location,
          harvestDate: changes.harvestDate,
          availableUntil: changes.availableUntil,
          image: imageUrl,
        } : item));
        setEditingListing(null); setModal(null); setNotice(session ? t.listingSaved : t.demoUpdated);
        return;
      }

      const imageKey = cropImageTone(changes.crop);
      const farmer = session?.name ?? (role === "FARMER" ? "Malar Selvan" : t.you);
      const listing: Listing = {
        id: `new-${crypto.randomUUID()}`, crop: changes.crop, variety: changes.variety, grade: changes.grade ?? "",
        quantity: changes.quantity, unit: changes.unit, price: changes.pricePerKg, place: changes.location,
        farmer, farmerTrust: {
          id: session?.id ?? "demo-malar", completedOrders: 0, averageRating: null, reviewCount: 0,
        },
        image: imageUrl, tone: imageKey,
        harvestDate: changes.harvestDate, availableUntil: changes.availableUntil, status: "ACTIVE",
      };
      const saved = await sendToApi("/api/listings", { ...changes, imageUrl });
      if (!saved) return;
      const persisted = "listing" in saved ? saved.listing as { id: string; status: Listing["status"] } : null;
      setListings((current) => [{ ...listing, id: persisted?.id ?? listing.id, status: persisted?.status ?? listing.status }, ...current]); setModal(null); setNotice(session ? t.listingSaved : t.demoSaved);
    } finally {
      setListingSaving(false);
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedListing) return;
    if (!session) {
      openAuthModal("login");
      setNotice(locale === "ta" ? "ஆர்டர் செய்ய வாங்குபவர் கணக்கில் உள்நுழையவும்." : "Sign in with a buyer account to place an order.");
      return;
    }
    if (session.role !== "BUYER") {
      setNotice(locale === "ta" ? "ஆர்டர் செய்ய வாங்குபவர் கணக்கு தேவை." : "A buyer account is required to place an order.");
      return;
    }
    const quantity = Number(new FormData(event.currentTarget).get("quantity"));
    const saved = await sendToApi("/api/orders", { listingId: selectedListing.id, quantity });
    if (!saved) return;
    setModal(null);
    setView("orders");
    setNotice(t.orderPlaced);
    try {
      await loadOrders(session);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Order placed, but the order list could not be refreshed.");
    }
  }

  async function updateOrder(order: DemoOrder, status: DemoOrder["status"]) {
    if (!session) {
      openAuthModal("login");
      setNotice(locale === "ta" ? "ஆர்டரை நிர்வகிக்க உள்நுழையவும்." : "Sign in to manage orders.");
      return;
    }
    setUpdatingOrderId(order.id);
    const saved = await sendToApi("/api/orders", { id: order.id, status }, "PATCH");
    if (!saved) {
      setUpdatingOrderId("");
      return;
    }
    try {
      await loadOrders(session);
      setNotice(t.orderUpdated);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Order updated, but the order list could not be refreshed.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function updatePayment(order: DemoOrder, paymentAction: "MARK_PAID" | "CONFIRM_PAYMENT") {
    if (!session) return;
    setUpdatingOrderId(order.id);
    const saved = await sendToApi("/api/orders", { id: order.id, paymentAction }, "PATCH");
    if (!saved) {
      setUpdatingOrderId("");
      return;
    }
    try {
      await loadOrders(session);
      setNotice(locale === "ta" ? "கட்டண நிலை புதுப்பிக்கப்பட்டது." : "Payment status updated.");
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Payment updated, but orders could not be refreshed.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    if (session) {
      if (!activeConversation) return;
      const saved = await sendToApi("/api/messages", {
        listingId: activeConversation.listingId,
        body: messageDraft.trim(),
        conversationId: activeConversation.id,
      });
      if (!saved) return;
      setMessageDraft("");
      try {
        await loadConversations();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Message sent, but the conversation could not be refreshed.");
        return;
      }
      setNotice(t.messageSent);
      return;
    }
    openAuthModal("login");
  }

  async function updateListing(listing: Listing, status: Listing["status"]) {
    if (session && !(await sendToApi("/api/listings", { id: listing.id, status }, "PATCH"))) return;
    setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item));
    setNotice(session ? t.listingSaved : t.demoUpdated);
  }

  async function updateUser(user: (typeof users)[number]) {
    if (!(await sendToApi("/api/users", { id: user.id, isActive: !user.isActive }, "PATCH"))) return;
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item));
    setNotice(session ? t.orderUpdated : t.demoUpdated);
  }

  async function moderateReview(review: (typeof reviews)[number]) {
    const status = review.status === "PENDING" ? "PUBLISHED" : "HIDDEN";
    if (session && !(await sendToApi("/api/reviews", { id: review.id, status }, "PATCH"))) return;
    setReviews((current) => current.map((item) => item.id === review.id ? { ...item, status } : item));
    setNotice(session ? t.decisionSaved : t.demoUpdated);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedListing) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason")) as ProductReport["reason"];
    const details = String(form.get("details") ?? "").trim() || null;
    const reportDetails = reportTarget === "farmer"
      ? { farmerId: selectedListing.farmerTrust.id, reason, details: details ?? undefined }
      : { listingId: selectedListing.id, reason, details: details ?? undefined };
    if (session && !(await sendToApi("/api/reports", reportDetails))) return;
    setModal(null);
    setNotice(locale === "ta" ? "புகார் நிர்வாகத்திற்கும் சம்பந்தப்பட்ட விவசாயிக்கும் அனுப்பப்பட்டது." : "Report sent to the admin team and the farmer concerned.");
    if (session) {
      try {
        await loadReports();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Report sent, but could not be refreshed.");
      }
    } else {
      setReports((current) => [{
        id: `report-${Date.now()}`, reporter: "Kovai Fresh Mart", reporterId: "demo-buyer",
        farmer: selectedListing.farmer, farmerId: selectedListing.farmerTrust.id,
        crop: selectedListing.crop, reason, details, status: "OPEN", createdAt: new Date().toISOString(),
      }, ...current]);
    }
  }

  async function updateReport(report: ProductReport, status: ProductReport["status"]) {
    if (session && !(await sendToApi("/api/reports", { id: report.id, status }, "PATCH"))) return;
    setReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item));
    setNotice(session ? t.decisionSaved : t.demoUpdated);
  }

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body || !selectedListing) return;
    if (!session) {
      openAuthModal("login");
      setNotice(locale === "ta" ? "செய்தி அனுப்ப உள்நுழையவும்." : "Sign in to send a message.");
      return;
    }
    const saved = await sendToApi("/api/messages", { listingId: selectedListing.id, body });
    if (!saved) return;
    if ("conversationId" in saved && typeof saved.conversationId === "string") setSelectedConversationId(saved.conversationId);
    try {
      await loadConversations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Conversation could not be loaded.");
      return;
    }
    setView("messages"); setModal(null); setNotice(t.conversationOpened);
  }

  function chooseView(next: View) { setView(next); setMobileOpen(false); }
  function openOrder(listing: Listing) { setSelectedListing(listing); setModal("order"); }
  function openEditListing(listing: Listing) { setListingImageFile(null); setListingImageError(""); setEditingListing(listing); setListingImagePreview(listing.image); setModal("listing"); }
  function openCreateListing() { setEditingListing(null); setListingImageFile(null); setListingImagePreview(""); setListingImageError(""); setModal("listing"); }
  function openMessage(listing: Listing) { setSelectedListing(listing); setModal("message"); }
  function openReport(listing: Listing) { setSelectedListing(listing); setReportTarget("product"); setModal("report"); }
  function openFarmerProfile(listing: Listing) { setSelectedListing(listing); setModal("farmer"); }
  function openFarmerReport() { setReportTarget("farmer"); setModal("report"); }
  function selectConversation(conversation: Conversation) {
    setSelectedConversationId(conversation.id);
    const listing = listings.find((item) => item.id === conversation.listingId);
    if (listing) setSelectedListing(listing);
  }

  const navItems = [
    { id: "market" as const, label: t.marketplace, icon: ShoppingBasket },
    { id: "weather" as const, label: locale === "ta" ? "வானிலை அறிக்கை" : "Weather report", icon: CloudSun },
    { id: "orders" as const, label: t.orders, icon: ClipboardList },
    { id: "messages" as const, label: t.messages, icon: MessageCircle },
    ...(role === "ADMIN" ? [{ id: "admin" as const, label: t.adminReview, icon: ShieldCheck }] : []),
    ...((session || role === "ADMIN") ? [{ id: "reports" as const, label: locale === "ta" ? "புகார்கள்" : "Reports", icon: Flag }] : []),
    ...(role === "ADMIN" ? [{ id: "people" as const, label: locale === "ta" ? "பயனர்கள்" : "People", icon: Users }] : []),
    { id: "help" as const, label: t.helpCenter, icon: CircleHelp },
  ];
  const isDemo = !session;
  const orderedConversations = [...conversations].sort((left, right) => {
    const leftTime = left.messages.at(-1)?.createdAt ?? "";
    const rightTime = right.messages.at(-1)?.createdAt ?? "";
    return rightTime.localeCompare(leftTime);
  });
  const filteredConversations = orderedConversations.filter((conversation) => {
    const partner = conversation.buyer.id === session?.id ? conversation.farmer.name : conversation.buyer.name;
    return `${partner} ${conversation.listing.crop}`.toLowerCase().includes(conversationQuery.toLowerCase());
  });
  const activeConversation = conversations.find((item) => item.id === selectedConversationId);
  const activeConversationPartner = activeConversation
    ? activeConversation.buyer.id === session?.id ? activeConversation.farmer.name : activeConversation.buyer.name
    : "";
  useEffect(() => {
    if (view === "messages") chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.messages.length, selectedConversationId, view]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#home" onClick={() => chooseView("market")}><span className="brand-mark"><Sprout size={21} strokeWidth={2.4} /></span><span className="brand-name">vayal<span>connect</span></span></a>
        <div className="workspace-label">{t.workspace}</div>
        <nav className="side-nav" aria-label={t.primaryNavigation}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "nav-active" : ""}`} onClick={() => chooseView(id)}><Icon size={18} /><span>{label}</span>{id === "orders" && role === "FARMER" && orders.filter((order) => order.status === "PLACED").length > 0 && <span className="nav-count">{orders.filter((order) => order.status === "PLACED").length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="weather-mini"><span className="weather-icon"><Sun size={17} /></span><span><b>{weather ? `${Math.round(weather.current.temperatureC)}°C · ${weather.location}` : t.weatherLabel}</b><small>{weather ? weather.current.condition : weatherLoading ? (locale === "ta" ? "ஏற்றுகிறது…" : "Loading weather…") : weatherError || (locale === "ta" ? "வானிலை கிடைக்கவில்லை" : "Weather unavailable")}</small></span>{weather ? <CloudSun size={15} /> : <CircleHelp size={15} />}</div><div className="profile-mini"><span className="avatar">{(session?.name ?? (role === "BUYER" ? "K" : role === "FARMER" ? "M" : "A")).slice(0, 1)}</span><span className="profile-name"><b>{session?.name ?? (role === "BUYER" ? "Kovai Fresh Mart" : role === "FARMER" ? "Malar Selvan" : "Platform admin")}</b><small>{t[role.toLowerCase() as "buyer" | "farmer" | "admin"]}</small></span>{session ? <button className="icon-button subtle" title={t.signOut} onClick={signOut}><LogOut size={16} /></button> : <button className="icon-button subtle" title={t.signIn} onClick={() => setModal("login")}><ArrowRight size={16} /></button>}</div></div>
      </aside>

      <div className="main-column">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label={t.openMenu} onClick={() => setMobileOpen((open) => !open)}><Menu size={20} /></button><div className="crumb"><span>{t.home}</span><span className="crumb-slash">/</span><b>{navItems.find((item) => item.id === view)?.label ?? t.marketplace}</b></div><div className="top-actions">{isDemo && <span className="demo-pill"><span />{t.previewMode}</span>}{!session && <select className="role-select" aria-label={t.previewRole} value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="BUYER">{t.buyerPreview}</option><option value="FARMER">{t.farmerPreview}</option><option value="ADMIN">{t.adminPreview}</option></select>}<div className="language-switch" aria-label={t.language}><button className={locale === "en" ? "language-active" : ""} onClick={() => switchLocale("en")}>EN</button><span /><button className={locale === "ta" ? "language-active" : ""} onClick={() => switchLocale("ta")}>தமிழ்</button></div><button className="icon-button notification-button" title={t.notifications} aria-label={t.notifications}><Bell size={18} /><i /></button>{!session && <><button className="auth-signup-button" onClick={() => setModal("signup")}>{locale === "ta" ? "பதிவு" : "Sign up"}</button><button className="sign-in-button" onClick={() => setModal("login")}>{t.signIn}<ArrowRight size={15} /></button></>}</div></header>

        <main className="content-area">
          {view === "people" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "நிர்வாகக் கட்டுப்பாடு" : "PLATFORM CONTROL"}</div><h1>{locale === "ta" ? "விவசாயிகள் மற்றும் வாங்குபவர்கள்" : "Farmers and buyers"}</h1><p className="view-intro">{locale === "ta" ? "பயனர் கணக்குகளை ஆய்வு செய்து, தேவையானபோது அணுகலை முடக்குங்கள்." : "Review registered farmers and buyers, and suspend or restore account access when needed."}</p><div className="subsection-title"><h2>{locale === "ta" ? "பதிவுசெய்த உறுப்பினர்கள்" : "Registered members"}</h2><span>{users.length}</span></div>{users.length === 0 ? <div className="empty-state"><Users size={24} /><b>{locale === "ta" ? "பயனர்கள் இல்லை" : "No members found"}</b></div> : users.map((user) => <article className="review-item" key={user.id}><span className="review-avatar"><Users size={17} /></span><div className="review-details"><div><b>{user.name}</b><span className={`status ${user.isActive ? "status-approved" : "status-rejected"}`}>{user.isActive ? (locale === "ta" ? "செயலில்" : "Active") : (locale === "ta" ? "இடைநிறுத்தப்பட்டது" : "Suspended")}</span></div><p>{user.email} · {user.role === "FARMER" ? t.farmer : t.buyer}</p></div><button className="row-action" onClick={() => void updateUser(user)}>{user.isActive ? (locale === "ta" ? "அணுகலை இடைநிறுத்து" : "Suspend access") : (locale === "ta" ? "அணுகலை மீட்டமை" : "Restore access")}</button></article>)}</section>}
          {view === "help" && <section className="workspace-view">
            <div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "வழிகாட்டி மற்றும் ஆதரவு" : "GUIDES & SUPPORT"}</div>
            <h1>{locale === "ta" ? "உதவி மையம்" : "Help center"}</h1>
            <p className="view-intro">{locale === "ta" ? "Vayal Connect-ஐப் பயன்படுத்துவது, ஆர்டர்கள் மற்றும் கட்டணங்கள் குறித்த பதில்களை இங்கே காணலாம்." : "Find answers about using Vayal Connect, managing orders, and confirming cash payments."}</p>
            <div className="help-grid">
              <article className="help-card">
                <span className="help-card-icon"><ShoppingBasket size={18} /></span>
                <div><h2>{locale === "ta" ? "சந்தை மற்றும் பட்டியல்கள்" : "Marketplace & listings"}</h2>
                  <details><summary>{locale === "ta" ? "விவசாயியாக எப்படிப் பட்டியலிடுவது?" : "How do I create a farmer listing?"}</summary><p>{locale === "ta" ? "விவசாயி கணக்கில் உள்நுழைந்து சந்தையில் “பட்டியல் சேர்” என்பதைத் தேர்ந்தெடுக்கவும். விளைபொருள் விவரங்கள், அளவு, விலை, இருப்பிடம் மற்றும் JPEG, PNG அல்லது WebP படத்தைச் சேர்த்து வெளியிடவும்." : "Sign in with a farmer account, choose Add listing in the marketplace, then enter the crop details, quantity, price, pickup location, and a JPEG, PNG, or WebP photo."}</p></details>
                  <details><summary>{locale === "ta" ? "ஒரு விளைபொருளைப் பற்றி எப்படி புகார் செய்வது?" : "How do I report a product or farmer?"}</summary><p>{locale === "ta" ? "சந்தையில் அந்த விளைபொருளின் “Report product” விருப்பத்தைப் பயன்படுத்தவும். புகார் நிர்வாகத்திற்கும் சம்பந்தப்பட்ட விவசாயிக்கும் காட்டப்படும்; உங்கள் Reports பகுதியில் நிலையைப் பார்க்கலாம்." : "Use Report product or Report farmer from the marketplace. The report is visible to the admin team and the farmer concerned; you can track its status in Reports."}</p></details>
                </div>
                <button className="help-link" onClick={() => chooseView("market")}>{locale === "ta" ? "சந்தைக்குச் செல்" : "Go to marketplace"}<ArrowRight size={14} /></button>
              </article>
              <article className="help-card">
                <span className="help-card-icon"><ClipboardList size={18} /></span>
                <div><h2>{locale === "ta" ? "ஆர்டர்கள் மற்றும் கட்டணங்கள்" : "Orders & payments"}</h2>
                  <details><summary>{locale === "ta" ? "என் ஆர்டரின் நிலையை எங்கே பார்க்கலாம்?" : "Where can I check my order status?"}</summary><p>{locale === "ta" ? "Orders பகுதியில் வாங்குபவர் தனது ஆர்டர்களையும், விவசாயி தனது பட்டியல்களுக்கான ஆர்டர்களையும் பார்க்கலாம். விவசாயி ஆர்டரை ஏற்றுக்கொண்டு, வாங்குபவர் எடுத்துச் செல்லத் தயாராக இருக்கும்போது Dispatch என்பதைத் தேர்வுசெய்வார். வாங்குபவர் எடுத்த பிறகு Confirm pickup அழுத்துவார்; அது விவசாயிக்கும் காட்டப்படும்." : "Open Orders to see orders you placed or, as a farmer, orders for your listings. Farmers accept and dispatch orders as ready for pickup. When the buyer confirms pickup, the farmer sees the completed status too."}</p></details>
                  <details><summary>{locale === "ta" ? "கட்டணம் எப்படி உறுதிப்படுத்தப்படும்?" : "How is cash payment confirmed?"}</summary><p>{locale === "ta" ? "கட்டணம் பெறும்போது பணமாகச் செலுத்தப்படுகிறது. வாங்குபவர் பணத்தை வழங்கியதாகக் குறிப்பிட்டதும், விவசாயி பணம் கிடைத்ததை உறுதிப்படுத்துவார். இருவருக்கும் கட்டணம் முடிந்தது அல்லது முடியவில்லை என்ற நிலை தெரியும்." : "Payment is cash on pickup. The buyer marks cash as handed over, then the farmer confirms receipt. Both accounts show whether payment is complete or incomplete."}</p></details>
                </div>
                <button className="help-link" onClick={() => chooseView("orders")}>{locale === "ta" ? "ஆர்டர்களைக் காண்க" : "Go to orders"}<ArrowRight size={14} /></button>
              </article>
              <article className="help-card">
                <span className="help-card-icon"><MessageCircle size={18} /></span>
                <div><h2>{locale === "ta" ? "செய்திகள் மற்றும் கணக்கு" : "Messages & account"}</h2>
                  <details><summary>{locale === "ta" ? "விவசாயியை அல்லது வாங்குபவரை எப்படித் தொடர்புகொள்வது?" : "How do I contact a farmer or buyer?"}</summary><p>{locale === "ta" ? "விளைபொருள் பட்டியலில் Message என்பதைத் தேர்ந்தெடுக்கவும். அனுப்பிய செய்திகளையும் பதில்களையும் Messages பகுதியில் காணலாம்." : "Choose Message on a product listing to start a conversation. Sent messages and replies appear in Messages."}</p></details>
                  <details><summary>{locale === "ta" ? "என் புகார்கள் எங்கே தெரியும்?" : "Where can I follow a complaint?"}</summary><p>{locale === "ta" ? "உள்நுழைந்த வாங்குபவர் தாம் அளித்த புகார்களை Reports பகுதியில் காணலாம். விவசாயி தமது விளைபொருள் அல்லது கணக்கு தொடர்பான புகார்களை அங்கே பார்க்கலாம்." : "Signed-in buyers see reports they submitted in Reports. Farmers can see complaints about their products or account there."}</p></details>
                </div>
                <button className="help-link" onClick={() => chooseView(session ? "messages" : "market")}>{session ? (locale === "ta" ? "செய்திகளுக்குச் செல்" : "Go to messages") : (locale === "ta" ? "கணக்கில் உள்நுழைக" : "Sign in to get started")}<ArrowRight size={14} /></button>
              </article>
              <article className="help-card">
                <span className="help-card-icon"><CloudSun size={18} /></span>
                <div><h2>{locale === "ta" ? "வானிலை அறிக்கை" : "Weather reports"}</h2>
                  <details><summary>{locale === "ta" ? "எனது ஊருக்கான வானிலையைப் பார்க்கலாமா?" : "Can I check weather for my location?"}</summary><p>{locale === "ta" ? "Weather report பகுதியில் ஊர் அல்லது இடத்தின் பெயரைத் தேடி தற்போதைய நிலை மற்றும் மூன்று நாள் முன்னறிவிப்பைப் பார்க்கவும்." : "Open Weather report, search for a village or town, and view current conditions with a three-day forecast."}</p></details>
                </div>
                <button className="help-link" onClick={() => chooseView("weather")}>{locale === "ta" ? "வானிலைக்குச் செல்" : "Go to weather"}<ArrowRight size={14} /></button>
              </article>
            </div>
            <p className="help-note">{locale === "ta" ? "மேலும் உதவி தேவையா? புகார் விருப்பத்தைப் பயன்படுத்தி நிர்வாகக் குழுவிற்குத் தகவல் தெரிவிக்கவும்." : "Need additional help? Use the report option on a listing to notify the admin team."}</p>
          </section>}
          {view === "weather" && <section className="workspace-view">
            <div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "பயிர் திட்டமிடலுக்கான நேரடி வானிலை" : "LIVE CONDITIONS FOR FARM PLANNING"}</div>
            <h1>{locale === "ta" ? "வானிலை அறிக்கை" : "Weather report"}</h1>
            <p className="view-intro">{locale === "ta" ? "இடத்தைத் தேடி தற்போதைய வானிலையையும் மூன்று நாள் முன்னறிவிப்பையும் காண்க." : "Search a village or town for current conditions and a three-day forecast."}</p>
            <section className="weather-detail">
              <div className="subsection-title"><h2>{locale === "ta" ? "தற்போதைய நிலை மற்றும் 3 நாள் முன்னறிவிப்பு" : "Current conditions and 3-day forecast"}</h2>{weather && <small>{locale === "ta" ? "வானிலை மூலம்" : "Source"}: {weather.provider}</small>}</div>
              <form className="weather-search" onSubmit={(event) => void searchWeather(event)}>
                <label htmlFor="weather-location">{locale === "ta" ? "ஊர் அல்லது இடம்" : "Village or location"}<input id="weather-location" name="weatherLocation" minLength={2} maxLength={100} value={weatherLocation} onChange={(event) => setWeatherLocation(event.target.value)} /></label>
                <button type="submit" className="primary-button" disabled={weatherLoading}>{weatherLoading ? (locale === "ta" ? "ஏற்றுகிறது…" : "Loading…") : (locale === "ta" ? "முன்னறிவிப்பைக் காண்க" : "Get forecast")}</button>
              </form>
              {weatherError && <div className="empty-state weather-error"><CloudSun size={23} /><b>{weatherError}</b><button className="text-button" onClick={() => void loadWeather(weatherLocation)}>{locale === "ta" ? "மீண்டும் முயற்சி" : "Retry"}</button></div>}
              {weatherLoading && !weather && <div className="empty-state"><CloudSun size={23} /><b>{locale === "ta" ? "நேரடி வானிலை ஏற்றப்படுகிறது…" : "Loading live weather…"}</b></div>}
              {weather && <>
                <div className="weather-current">
                  <span className="insight-icon"><CloudSun size={20} /></span>
                  <div><b>{weather.location}, {weather.country} · {Math.round(weather.current.temperatureC)}°C · {weather.current.condition}</b><span>{locale === "ta" ? "கடைசியாகப் புதுப்பிக்கப்பட்டது" : "Updated"} {new Date(weather.current.updatedAt).toLocaleString(locale === "ta" ? "ta-IN" : "en-IN")}</span></div>
                </div>
                <div className="weather-metrics"><span>{locale === "ta" ? "ஈரப்பதம்" : "Humidity"} <b>{weather.current.humidity}%</b></span><span>{locale === "ta" ? "மழைப்பொழிவு" : "Rainfall"} <b>{weather.current.rainfallMm} mm</b></span><span>{locale === "ta" ? "காற்று" : "Wind"} <b>{weather.current.windKph} km/h</b></span></div>
                <div className="weather-forecast">{weather.forecast.map((day) => <article key={day.date}><small>{new Date(`${day.date}T00:00:00`).toLocaleDateString(locale === "ta" ? "ta-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" })}</small><b>{day.highC}° / {day.lowC}°C</b><span>{day.condition}</span><span>{locale === "ta" ? "மழை வாய்ப்பு" : "Rain chance"}: {day.chanceOfRain}%</span></article>)}</div>
              </>}
              <div className="source-note"><span className="source-dot" />{locale === "ta" ? "நேரடி கணிப்பு Open-Meteo வழியாகப் பெறப்படுகிறது." : "Live forecast provided by Open-Meteo."}</div>
            </section>
          </section>}
          {notice && <div className="notice" role="status"><Check size={16} /><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}><X size={15} /></button></div>}
          {view === "market" && <>
            <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />{t.goodMorning}</div><h1>{role === "FARMER" ? t.farmerGreeting : role === "ADMIN" ? t.adminGreeting : t.buyerGreeting}</h1><p>{role === "FARMER" ? t.farmerSubhead : role === "ADMIN" ? t.adminSubhead : t.buyerSubhead}</p></div><div className="welcome-date"><span>{t.today}</span><b>{new Intl.DateTimeFormat(locale === "ta" ? "ta-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</b><small>{t.coimbatoreRegion}</small></div></section>
            <section className="insight-row" aria-label={t.marketInsights}><div className="insight-card weather-insight"><span className="insight-icon"><CloudSun size={19} /></span><div><small>{`${locale === "ta" ? "வானிலை" : "Weather"} · ${weather?.location ?? weatherLocation}`}</small><b>{weather ? `${Math.round(weather.current.temperatureC)}°C · ${weather.current.condition}` : weatherLoading ? (locale === "ta" ? "ஏற்றுகிறது…" : "Loading forecast…") : locale === "ta" ? "நேரடி வானிலை கிடைக்கவில்லை" : "Live weather unavailable"}</b><span>{weather ? `${locale === "ta" ? "மழை வாய்ப்பு" : "Rain chance"}: ${weather.forecast[0]?.chanceOfRain ?? 0}% · ${weather.current.humidity}% ${locale === "ta" ? "ஈரப்பதம்" : "humidity"}` : weatherError || (locale === "ta" ? "இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்" : "Check your connection or retry")}</span></div><button className="insight-state insight-link" onClick={() => chooseView("weather")}>{locale === "ta" ? "அறிக்கை" : "View report"}</button>{weatherError && <button className="insight-state insight-link" onClick={() => void loadWeather(weatherLocation)}>{locale === "ta" ? "மீண்டும்" : "Retry"}</button>}</div><div className="insight-note"><span className="note-sun"><Sun size={17} /></span><div><b>{t.planPickup}</b><span>{t.marketplaceAvailable}</span></div><ArrowRight size={16} /></div></section>
            <section className="section-head listing-section-head"><div><div className="eyebrow"><span className="eyebrow-line" />{role === "FARMER" ? t.yourNetwork : t.freshFromFarm}</div><h2>{role === "FARMER" ? (locale === "ta" ? "எனது விளைபொருட்கள்" : "My products") : t.findYourHarvest}</h2></div>{role === "FARMER" ? <button className="primary-button" onClick={openCreateListing}><Plus size={17} />{t.addListing}</button> : role === "BUYER" ? <div className="market-actions"><button className="text-button" onClick={() => setSortLow((value) => !value)}><ArrowDownUp size={16} />{sortLow ? t.priceLowHigh : t.sortByPrice}</button><button className="text-button" onClick={() => visibleListings[0] && openReport(visibleListings[0])}><Flag size={15} />{locale === "ta" ? "விளைபொருளைப் புகாரளி" : "Report product"}</button></div> : null}</section>
            <section className="market-tools" aria-label={t.marketFilters}><label className="search-field"><Search size={17} /><input aria-label={t.searchProduce} placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><label className="filter-field"><Filter size={16} /><select aria-label={t.filterByCrop} value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}><option>All crops</option><option>Tomato</option><option>Banana</option><option>Paddy</option><option>Onion</option></select><ChevronDown size={14} /></label><span className="result-count">{visibleListings.length} {t.availableLots}</span></section>
            <section className="listing-grid" aria-label={t.produceListings}>
              {visibleListings.map((listing) => {
                const isOwner = role === "FARMER" && listing.farmerTrust.id === session?.id;
                const canManageListing = isOwner || role === "ADMIN";
                return <article className="produce-card" key={listing.id}>
                  <div className={`produce-image image-${listing.tone}`} style={{ backgroundImage: `url("${listing.image}")` }}>
                    <span className="fresh-tag"><span />{listing.status === "ACTIVE" ? t.harvestReady : listing.status === "PAUSED" ? (locale === "ta" ? "இடைநிறுத்தப்பட்டது" : "PAUSED") : (locale === "ta" ? "நீக்கப்பட்டது" : "REMOVED")}</span>
                    <button className={`save-button ${favoriteListingIds.includes(listing.id) ? "save-button-active" : ""}`} aria-label={`${favoriteListingIds.includes(listing.id) ? t.removeFavourite : t.addFavourite} ${listing.crop}`} aria-pressed={favoriteListingIds.includes(listing.id)} title={favoriteListingIds.includes(listing.id) ? t.removeFavourite : t.addFavourite} onClick={() => toggleFavourite(listing)}><Star size={16} fill={favoriteListingIds.includes(listing.id) ? "currentColor" : "none"} /></button>
                  </div>
                  <div className="produce-copy">
                    <div className="crop-line">
                      <div><h3>{displayCrop(listing.crop, locale)}</h3><span>{listing.variety}{listing.grade ? ` · ${locale === "ta" ? "தரம்" : "Grade"} ${listing.grade}` : ""}</span></div>
                      <div className="price-label"><b>{currency(listing.price, locale)}</b><small>/{listing.unit}</small></div>
                    </div>
                    <div className="lot-detail"><span>{t.available}</span><b>{new Intl.NumberFormat(locale === "ta" ? "ta-IN" : "en-IN").format(listing.quantity)} {listing.unit}</b></div>
                    {(listing.harvestDate || listing.availableUntil) && <div className="listing-dates">
                      {listing.harvestDate && <span>{locale === "ta" ? "அறுவடை" : "Harvested"} · {formatDate(listing.harvestDate, locale)}</span>}
                      {listing.availableUntil && <span>{locale === "ta" ? "கிடைக்கும் கடைசி நாள்" : "Available until"} · {formatDate(listing.availableUntil, locale)}</span>}
                    </div>}
                    <div className="farmer-line">
                      <button className="farmer-profile-button" onClick={() => openFarmerProfile(listing)} aria-label={`${locale === "ta" ? "விவசாயி சுயவிவரத்தைக் காண்க" : "View farmer profile"}: ${listing.farmer}`}>
                        <span className="farmer-avatar">{listing.farmer.slice(0, 1)}</span>
                        <span><b>{listing.farmer}</b><small>{listing.farmerTrust.averageRating === null ? (locale === "ta" ? "புதிய விவசாயி" : "New farmer") : `★ ${listing.farmerTrust.averageRating} · ${listing.farmerTrust.reviewCount} ${locale === "ta" ? "மதிப்பீடுகள்" : "reviews"}`}</small></span>
                      </button>
                      <span className="place"><MapPin size={13} />{listing.place.split(",")[0]}</span>
                    </div>
                    <div className="card-actions">{canManageListing ? <><button className="message-action" onClick={() => openEditListing(listing)}><Pencil size={14} />{locale === "ta" ? "திருத்து" : "Edit"}</button><button className="buy-action" onClick={() => updateListing(listing, listing.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>{listing.status === "ACTIVE" ? t.pauseListing : listing.status === "PAUSED" ? (locale === "ta" ? "மீண்டும் வெளியிடு" : "Resume") : (locale === "ta" ? "மீட்டமை" : "Restore")}</button><button className="icon-button listing-remove" aria-label={locale === "ta" ? "பட்டியலை நீக்கு" : "Remove listing"} title={locale === "ta" ? "பட்டியலை நீக்கு" : "Remove listing"} onClick={() => updateListing(listing, "REMOVED")}><Trash2 size={15} /></button></> : <><button className="message-action" onClick={() => openMessage(listing)}><MessageCircle size={15} />{t.message}</button>{role === "BUYER" ? <button className="buy-action" onClick={() => openOrder(listing)}>{t.placeOrder}<ArrowRight size={15} /></button> : <button className="buy-action" onClick={() => openOrder(listing)}>{t.viewLot}<ArrowRight size={15} /></button>}</>}</div>
                  </div>
                </article>;
              })}
              {visibleListings.length === 0 && <div className="empty-state"><Search size={25} /><b>{t.noListings}</b><span>{query || cropFilter !== "All crops" ? t.tryAnotherSearch : locale === "ta" ? "புதிய விளைபொருட்களை விவசாயிகள் விரைவில் சேர்ப்பார்கள்." : "Farmers can add new products here whenever they are ready."}</span>{role === "FARMER" && <button className="primary-button" onClick={openCreateListing}><Plus size={16} />{t.addListing}</button>}</div>}
            </section>
            <div className="source-note"><span className="source-dot" />{locale === "ta" ? "பட்டியலிடும்போது விவசாயி விளைபொருள் படத்தைப் பதிவேற்றுவார்." : "Farmers upload the product photo when creating a listing."}</div>
          </>}

          {view === "orders" && <section className="workspace-view">
            <div className="orders-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" />{t.orderDesk}</div><h1>{role === "FARMER" ? t.incomingOrders : t.yourOrders}</h1></div>
              <button className="text-button" onClick={() => session ? void loadOrders(session).catch((error: unknown) => setOrdersError(error instanceof Error ? error.message : "Orders could not be refreshed.")) : openAuthModal("login")}>{locale === "ta" ? "புதுப்பி" : "Refresh orders"}</button>
            </div>
            <p className="view-intro">{role === "FARMER" ? (locale === "ta" ? "ஆர்டரை ஏற்கவும், ரத்து செய்யவும் அல்லது வாங்குபவர் எடுத்துச் செல்லத் தயாராக உள்ளதாகக் குறிக்கவும்." : "Accept or cancel incoming orders, then mark accepted orders ready for buyer pickup.") : t.orderDeskIntro}</p>
            {ordersError && <div className="auth-error" role="alert">{ordersError}</div>}
            <div className="order-summary"><div><span>{t.openOrders}</span><b>{orders.filter((order) => ["PLACED", "ACCEPTED", "READY"].includes(order.status)).length}</b></div><div><span>{t.completedThisMonth}</span><b>{orders.filter((order) => order.status === "COMPLETED").length}</b></div><div><span>{t.orderValue}</span><b>{currency(orders.reduce((sum, order) => sum + order.total, 0), locale)}</b></div></div>
            {orders.length === 0
              ? <div className="empty-state"><ClipboardList size={24} /><b>{!session ? (locale === "ta" ? "ஆர்டர்களைப் பார்க்க உள்நுழையவும்" : "Sign in to view orders") : locale === "ta" ? "ஆர்டர்கள் இன்னும் வரவில்லை" : "No orders yet"}</b><span>{!session ? (locale === "ta" ? "உங்கள் ஆர்டர்களையும் புதிய வாங்குபவர் ஆர்டர்களையும் பார்க்க உள்நுழையவும்." : "Sign in to see your orders and incoming buyer orders.") : role === "FARMER" ? (locale === "ta" ? "வாங்குபவர் உங்கள் விளைபொருளை ஆர்டர் செய்ததும் இங்கே தோன்றும்." : "Orders placed for your listings will appear here.") : (locale === "ta" ? "நீங்கள் ஆர்டர் செய்ததும் இங்கே தோன்றும்." : "Your orders will appear here after checkout.")}{!session && <button className="row-action" onClick={() => openAuthModal("login")}>{t.signIn}</button>}</span></div>
              : <div className="table-wrap"><table><thead><tr><th>{t.orderId}</th><th>{t.produce}</th><th>{role === "FARMER" ? t.buyer : t.farmer}</th><th>{t.quantity}</th><th>{t.total}</th><th>{t.status}</th><th>{locale === "ta" ? "கட்டணம்" : "Payment"}</th><th>{t.action}</th></tr></thead><tbody>{orders.map((order) => {
                const canMarkPaid = role === "BUYER"
                  && order.paymentStatus === "INCOMPLETE"
                  && !order.buyerPaymentMarkedAt
                  && order.status !== "CANCELLED"
                  && (order.status === "READY" || order.status === "COMPLETED");
                const canConfirmPayment = role === "FARMER"
                  && order.paymentStatus === "INCOMPLETE"
                  && Boolean(order.buyerPaymentMarkedAt)
                  && order.status !== "CANCELLED"
                  && (order.status === "READY" || order.status === "COMPLETED");
                const canCancel = order.paymentStatus === "INCOMPLETE" && !order.buyerPaymentMarkedAt;
                return <tr key={order.id}>
                  <td className="order-id">{order.id}<small>{order.date}</small></td>
                  <td><span className="table-crop">{order.crop}</span></td>
                  <td>{order.person}</td>
                  <td>{order.quantity} {order.unit}</td>
                  <td>{currency(order.total, locale)}</td>
                  <td>
                    <span className={`status status-${order.status.toLowerCase()}`}>
                      {order.status === "COMPLETED" && role === "FARMER"
                        ? (locale === "ta" ? "வாங்குபவர் எடுத்துக்கொண்டார்" : "Buyer confirmed pickup")
                        : order.status === "READY" && role !== "FARMER"
                          ? (locale === "ta" ? "வாங்குபவர் எடுத்துச் செல்லத் தயார்" : "Ready for buyer pickup")
                          : t[order.status.toLowerCase() as "placed" | "accepted" | "ready" | "completed" | "cancelled"]}
                    </span>
                  </td>
                  <td><div className="order-payment">
                    <b>{locale === "ta" ? "பெறும்போது பணம்" : "Cash on pickup"}</b>
                    <span className={`status status-${order.paymentStatus === "COMPLETED" ? "completed" : "pending"}`}>
                      {order.paymentStatus === "COMPLETED"
                        ? (locale === "ta" ? "கட்டணம் முடிந்தது" : "Payment completed")
                        : (locale === "ta" ? "கட்டணம் முடியவில்லை" : "Payment incomplete")}
                    </span>
                    {order.paymentStatus === "INCOMPLETE" && <small>{locale === "ta" ? "வாங்குபவர் பணம் வழங்கியதாகக் குறிப்பிட்டு, விவசாயி பெற்றதை உறுதிப்படுத்துவார்." : "Buyer marks cash handed over; farmer confirms receipt."}</small>}
                    {order.paymentStatus === "INCOMPLETE" && order.buyerPaymentMarkedAt && <small>{role === "FARMER"
                      ? (locale === "ta" ? "வாங்குபவர் பணம் செலுத்தியதாகக் குறிப்பிட்டார்" : "Buyer marked as paid · confirm receipt")
                      : (locale === "ta" ? "விவசாயி உறுதிப்படுத்த காத்திருக்கிறது" : "Waiting for farmer confirmation")}</small>}
                  </div></td>
                  <td><div className="order-action-stack">
                    {updatingOrderId === order.id
                      ? <span className="muted-cell">{locale === "ta" ? "சேமிக்கிறது…" : "Saving…"}</span>
                      : order.status === "PLACED" && role === "FARMER"
                        ? <><button className="row-action" onClick={() => void updateOrder(order, "ACCEPTED")}>{t.accept}</button>{canCancel ? <button className="reject-button" onClick={() => void updateOrder(order, "CANCELLED")}>{locale === "ta" ? "ரத்து" : "Cancel order"}</button> : <small className="muted-cell">{locale === "ta" ? "கட்டணம் குறிக்கப்பட்டதால் ரத்து செய்ய முடியாது" : "Payment marked; coordinate before cancelling"}</small>}</>
                        : order.status === "ACCEPTED" && role === "FARMER"
                          ? <><button className="row-action" onClick={() => void updateOrder(order, "READY")}>{locale === "ta" ? "வாங்குபவர் எடுக்கத் தயார்" : "Dispatch · ready for pickup"}</button>{canCancel ? <button className="reject-button" onClick={() => void updateOrder(order, "CANCELLED")}>{locale === "ta" ? "ரத்து" : "Cancel order"}</button> : <small className="muted-cell">{locale === "ta" ? "கட்டணம் குறிக்கப்பட்டதால் ரத்து செய்ய முடியாது" : "Payment marked; coordinate before cancelling"}</small>}</>
                          : order.status === "READY" && role === "FARMER"
                            ? canCancel ? <button className="reject-button" onClick={() => void updateOrder(order, "CANCELLED")}>{locale === "ta" ? "ரத்து" : "Cancel order"}</button> : <small className="muted-cell">{locale === "ta" ? "கட்டணம் குறிக்கப்பட்டதால் ரத்து செய்ய முடியாது" : "Payment marked; coordinate before cancelling"}</small>
                            : order.status === "READY" && role === "BUYER"
                              ? <button className="row-action" onClick={() => void updateOrder(order, "COMPLETED")}>{locale === "ta" ? "எடுத்துக்கொண்டேன்" : "Confirm pickup"}</button>
                              : order.status === "COMPLETED" && role === "BUYER"
                                ? <button className="row-action" onClick={() => { setSelectedOrder(order); setModal("review"); }}>{t.leaveReview}</button>
                                : role === "BUYER" && ["PLACED", "ACCEPTED", "READY"].includes(order.status)
                                    ? canCancel ? <button className="reject-button" onClick={() => void updateOrder(order, "CANCELLED")}>{locale === "ta" ? "ரத்து" : "Cancel order"}</button> : <small className="muted-cell">{locale === "ta" ? "கட்டணம் குறித்து விவசாயியிடம் பேசுங்கள்" : "Contact farmer before cancelling after payment"}</small>
                                  : <span className="muted-cell">{t.noAction}</span>}
                    {updatingOrderId === order.id
                      ? null
                      : canMarkPaid
                        ? <button className="row-action" onClick={() => void updatePayment(order, "MARK_PAID")}>{locale === "ta" ? "பணத்தை வழங்கினேன்" : "Cash handed over"}</button>
                        : canConfirmPayment
                          ? <button className="approve-button" onClick={() => void updatePayment(order, "CONFIRM_PAYMENT")}>{locale === "ta" ? "கட்டணம் பெற்றதை உறுதி செய்" : "Confirm payment received"}</button>
                          : null}
                  </div></td>
                </tr>;
              })}</tbody></table></div>}
          </section>}

          {view === "messages" && <section className="workspace-view">
            <div className="eyebrow"><span className="eyebrow-line" />{t.yourNetwork}</div>
            <h1>{t.messages}</h1>
            <p className="view-intro">{t.messagesIntro}</p>
            <div className="conversation-layout">
              <aside className="conversation-list">
                <div className="conversation-search"><Search size={15} /><input aria-label={t.searchConversations} placeholder={t.searchConversations} value={conversationQuery} onChange={(event) => setConversationQuery(event.target.value)} /></div>
                {session ? filteredConversations.map((conversation) => {
                  const partner = conversation.buyer.id === session.id ? conversation.farmer.name : conversation.buyer.name;
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  return <button key={conversation.id} className={`conversation-row ${conversation.id === selectedConversationId ? "conversation-selected" : ""}`} onClick={() => selectConversation(conversation)}>
                    <span className="conversation-avatar">{partner.slice(0, 1).toUpperCase()}</span>
                    <span><b>{partner}</b><small>{lastMessage?.body ?? conversation.listing.crop}</small></span>
                    {lastMessage && <time>{new Date(lastMessage.createdAt).toLocaleTimeString(locale === "ta" ? "ta-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}</time>}
                  </button>;
                }) : <div className="chat-empty"><MessageCircle size={23} /><b>{locale === "ta" ? "செய்திகளைப் பார்க்க உள்நுழையவும்" : "Sign in to view your chats"}</b><button className="text-button" onClick={() => setModal("login")}>{t.signIn}</button></div>}
                {session && filteredConversations.length === 0 && <div className="chat-empty"><MessageCircle size={23} /><b>{conversationQuery ? (locale === "ta" ? "பொருந்தும் உரையாடல் இல்லை" : "No matching chats") : (locale === "ta" ? "உரையாடல்கள் இன்னும் இல்லை" : "No conversations yet")}</b><small>{locale === "ta" ? "விளைபொருள் பட்டியலிலிருந்து விவசாயி அல்லது வாங்குபவரைத் தொடர்புகொள்ளுங்கள்." : "Start a chat from a product listing to contact its farmer."}</small></div>}
              </aside>
              <div className="conversation-main">
                {activeConversation && session ? <>
                  <header><span className="conversation-avatar">{activeConversationPartner.slice(0, 1).toUpperCase()}</span><span><b>{activeConversationPartner}</b><small>{activeConversation.listing.crop} · {locale === "ta" ? "Vayal Connect உரையாடல்" : "Vayal Connect chat"}</small></span><button className="icon-button" title={t.orderDetails} onClick={() => chooseView("orders")}><ClipboardList size={17} /></button></header>
                  <div className="chat-body" aria-live="polite">
                    <div className="date-divider"><span>{t.today}</span></div>
                    {activeConversation.messages.map((message) => <div key={message.id} className={`chat-bubble ${message.senderId === session.id ? "outgoing" : "incoming"}`}>
                      {message.body}<small>{new Date(message.createdAt).toLocaleTimeString(locale === "ta" ? "ta-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}{message.senderId === session.id && <Check size={11} />}</small>
                    </div>)}
                    {activeConversation.messages.length === 0 && <div className="chat-empty"><span>{locale === "ta" ? "இந்த உரையாடலின் முதல் செய்தியை அனுப்புங்கள்." : "Send the first message in this conversation."}</span></div>}
                    <div ref={chatEndRef} />
                  </div>
                  <form className="chat-compose" onSubmit={submitMessage}><input aria-label={t.writeMessage} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={t.messagePlaceholder} /><button type="submit" aria-label={t.sendMessage} disabled={!messageDraft.trim()}><Send size={17} /></button></form>
                </> : <div className="chat-empty chat-placeholder"><MessageCircle size={30} /><b>{locale === "ta" ? "உரையாடலைத் தேர்ந்தெடுக்கவும்" : "Select a conversation"}</b><span>{locale === "ta" ? "உங்கள் செய்திகள் இங்கே தோன்றும்." : "Your messages will appear here."}</span></div>}
              </div>
            </div>
            <p className="privacy-note"><ShieldCheck size={15} />{role === "FARMER" ? (locale === "ta" ? "செய்திகள் உரையாடலில் உள்ளவர்களுக்கு மட்டுமே தெரியும்." : "Messages are visible only to the conversation participants.") : t.messagePrivacy}</p>
          </section>}

          {view === "admin" && <section className="workspace-view">
            <div className="eyebrow"><span className="eyebrow-line" />{t.platformControl}</div>
            <h1>{t.adminReview}</h1>
            <p className="view-intro">{t.adminIntro}</p>
            <div className="admin-stats">
              <div><span>{t.marketActivity}</span><b>{listings.filter((item) => item.status === "ACTIVE").length}</b><small>{t.activeListings}</small></div>
              <div><span>{t.orderVolume}</span><b>{orders.length}</b><small>{t.trackedOrders}</small></div>
            </div>
            <div className="subsection-title review-title"><h2>{t.reviewModeration}</h2><span>{reviews.filter((review) => review.status === "PENDING").length} {t.needReview}</span></div>
            {reviews.map((review) => <div className="moderation-row" key={review.id}><span className="stars"><Star size={14} fill="currentColor" /> {review.rating.toFixed(1)}</span><div><b>{review.name} · {review.crop}</b><p>{review.text}</p></div><button className="row-action" onClick={() => void moderateReview(review)}>{review.status === "PENDING" ? t.publish : t.hide}</button></div>)}
          </section>}

          {view === "reports" && <section className="workspace-view">
            <div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "பாதுகாப்பு" : "SAFETY & TRUST"}</div>
            <h1>{locale === "ta" ? "புகார்கள்" : "Complaints & reports"}</h1>
            <p className="view-intro">{role === "ADMIN"
              ? (locale === "ta" ? "வாங்குபவர்கள் சமர்ப்பித்த புகார்களை ஆய்வு செய்து தீர்வு நிலையை புதுப்பிக்கவும்." : "Review submitted complaints and update their resolution status.")
              : role === "FARMER"
                ? (locale === "ta" ? "உங்கள் விளைபொருட்கள் அல்லது கணக்கைப் பற்றிய புகார்கள் இங்கே தோன்றும்." : "Complaints about your products or account appear here.")
                : (locale === "ta" ? "நீங்கள் சமர்ப்பித்த புகார்களின் நிலையை இங்கே பார்க்கலாம்." : "Track complaints you have submitted here.")}</p>
            <div className="subsection-title"><h2>{role === "ADMIN" ? (locale === "ta" ? "புகார் வரிசை" : "Report queue") : (locale === "ta" ? "புகார் நிலை" : "Your complaint updates")}</h2><span className="queue-count">{reports.filter((report) => report.status === "OPEN" || report.status === "REVIEWING").length} {locale === "ta" ? "திறந்தவை" : "open"}</span></div>
            {reports.length === 0
              ? <div className="empty-state"><Flag size={24} /><b>{locale === "ta" ? "புகார்கள் இல்லை" : "No complaints to show"}</b></div>
              : reports.map((report) => <article className="review-item" key={report.id}>
                <span className="review-avatar"><Flag size={16} /></span>
                <div className="review-details">
                  <div><b>{report.crop}</b><span className={`status status-${report.status.toLowerCase()}`}>{reportLabels[locale][report.status]}</span></div>
                  <p>{reportLabels[locale][report.reason]} · {report.farmer}</p>
                  <small>{role === "FARMER"
                    ? `${locale === "ta" ? "புகார் அளித்தவர்" : "Raised by"} ${report.reporter}`
                    : role === "BUYER"
                      ? `${locale === "ta" ? "புகார் அனுப்பியவர்" : "You reported"} ${report.farmer}`
                      : `${locale === "ta" ? "அறிவித்தவர்" : "Reported by"} ${report.reporter}`}
                    {report.details ? ` · ${report.details}` : ""} · {new Date(report.createdAt).toLocaleDateString(locale === "ta" ? "ta-IN" : "en-IN")}
                  </small>
                </div>
                {role === "ADMIN" && (report.status === "OPEN" || report.status === "REVIEWING")
                  ? <div className="review-actions"><button className="reject-button" onClick={() => updateReport(report, "DISMISSED")}>{locale === "ta" ? "நிராகரி" : "Dismiss"}</button><button className="approve-button" onClick={() => updateReport(report, "RESOLVED")}><Check size={15} />{locale === "ta" ? "தீர்வு" : "Resolve"}</button></div>
                  : <span className="muted-cell">{reportLabels[locale][report.status]}</span>}
              </article>)}
          </section>}
          <footer className="page-footer"><span>© 2026 Vayal Connect</span><span>{t.footerMessage}</span><button type="button" onClick={() => chooseView("help")}>{t.helpCenter}<ArrowRight size={13} /></button></footer>
        </main>
      </div>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !authLoading && !listingSaving) setModal(null); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="icon-button modal-close" aria-label={t.close} disabled={authLoading || listingSaving} onClick={() => setModal(null)}><X size={18} /></button>
        {(modal === "login" || modal === "signup") && authError && <div className="auth-error" role="alert">{authError}</div>}
        {modal === "login" && <><div className="modal-icon"><Leaf size={20} /></div><h2 id="modal-title">{t.welcomeBack}</h2><p>{t.signInCopy}</p><form className="form-stack" onSubmit={handleLogin}><label>{t.email}<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label><label>{t.password}<input required type="password" name="password" autoComplete="current-password" placeholder="••••••••" /></label><button className="primary-button full-button" type="submit" disabled={authLoading}>{authLoading ? (locale === "ta" ? "உள்நுழைகிறது…" : "Signing in…") : t.signIn}<ArrowRight size={16} /></button></form><small className="demo-credentials">{t.demoCredentials}</small><button className="auth-switch" disabled={authLoading} onClick={() => openAuthModal("signup")}>{locale === "ta" ? "புதியவரா? கணக்கை உருவாக்குங்கள்" : "New here? Create an account"}</button></>}
        {modal === "signup" && <><div className="modal-icon"><Leaf size={20} /></div><h2 id="modal-title">{locale === "ta" ? "கணக்கை உருவாக்குங்கள்" : "Create your account"}</h2><p>{locale === "ta" ? "விவசாயி அல்லது வாங்குபவராக Vayal Connect-இல் சேருங்கள்." : "Join Vayal Connect as a farmer or buyer."}</p><form className="form-stack" onSubmit={handleSignup}><label>{locale === "ta" ? "முழுப் பெயர்" : "Full name"}<input required name="name" autoComplete="name" minLength={2} maxLength={80} /></label><label>{t.email}<input required type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label><label>{t.password}<input required type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder={locale === "ta" ? "குறைந்தது 8 எழுத்துகள்" : "At least 8 characters"} /></label><label>{locale === "ta" ? "கணக்கு வகை" : "Account type"}<select name="role" defaultValue="BUYER"><option value="BUYER">{t.buyer}</option><option value="FARMER">{t.farmer}</option></select></label><button className="primary-button full-button" type="submit" disabled={authLoading}>{authLoading ? (locale === "ta" ? "கணக்கு உருவாக்கப்படுகிறது…" : "Creating account…") : (locale === "ta" ? "கணக்கை உருவாக்கு" : "Create account")}<ArrowRight size={16} /></button></form><button className="auth-switch" disabled={authLoading} onClick={() => openAuthModal("login")}>{locale === "ta" ? "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக" : "Already have an account? Sign in"}</button></>}
        {modal === "listing" && <><div className="modal-icon"><Sprout size={20} /></div><h2 id="modal-title">{editingListing ? (locale === "ta" ? "விளைபொருளைத் திருத்து" : "Edit product") : t.createListing}</h2><p>{t.createListingCopy}</p><form className="form-stack" onSubmit={createListing}>
          <label>{t.cropName}<input required name="crop" placeholder={t.cropPlaceholder} defaultValue={editingListing?.crop} /></label>
          <label>{locale === "ta" ? "விளைபொருள் படம்" : "Product photo"}<input required={!editingListing} name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              setListingImageError(locale === "ta" ? "JPEG, PNG அல்லது WebP படத்தைத் தேர்ந்தெடுக்கவும்." : "Choose a JPEG, PNG, or WebP image.");
              event.target.value = "";
              setListingImageFile(null);
              setListingImagePreview(editingListing?.image ?? "");
              return;
            }
            if (file && file.size > 5 * 1024 * 1024) {
              setListingImageError(locale === "ta" ? "5 MB-க்கு குறைவான படத்தைத் தேர்ந்தெடுக்கவும்." : "Choose an image smaller than 5 MB.");
              event.target.value = "";
              setListingImageFile(null);
              setListingImagePreview(editingListing?.image ?? "");
              return;
            }
            setListingImageError("");
            setListingImageFile(file);
            setListingImagePreview(file ? URL.createObjectURL(file) : editingListing?.image ?? "");
          }} /><small>{editingListing ? (locale === "ta" ? "JPEG, PNG அல்லது WebP; 5 MB வரை. மாற்ற வேண்டாம் என்றால் காலியாக விடவும்." : "JPEG, PNG, or WebP up to 5 MB. Leave empty to keep the current photo.") : (locale === "ta" ? "JPEG, PNG அல்லது WebP படத்தைப் பதிவேற்றவும் (அதிகபட்சம் 5 MB)." : "Upload a JPEG, PNG, or WebP image (up to 5 MB).")}</small></label>
          {listingImageError && <small className="crop-image-error" role="alert">{listingImageError}</small>}
          {listingImagePreview && <Image className="crop-image-preview" src={listingImagePreview} alt={`${editingListing?.crop ?? "Product"} photo preview`} width={800} height={450} unoptimized />}
          <div className="form-pair"><label>{t.variety}<input name="variety" placeholder={t.varietyPlaceholder} defaultValue={editingListing?.variety} /></label><label>{locale === "ta" ? "தரம்" : "Quality / grade"}<input name="grade" placeholder={locale === "ta" ? "எ.கா. தரம் A" : "e.g. Grade A"} defaultValue={editingListing?.grade} /></label></div>
          <div className="form-pair"><label>{t.quantity}<input required name="quantity" type="number" min="1" step="1" placeholder="100" defaultValue={editingListing?.quantity} /></label><label>{t.unit}<select name="unit" defaultValue={editingListing?.unit ?? "kg"}><option value="kg">kg</option><option value="crate">crate</option><option value="tonne">tonne</option></select></label></div>
          <label>{t.pricePerUnit}<input required name="pricePerKg" type="number" min="1" step="0.5" placeholder="32" defaultValue={editingListing?.price} /></label>
          <label>{t.pickupLocation}<input required name="location" placeholder={t.locationPlaceholder} defaultValue={editingListing?.place} /></label>
          <div className="form-pair"><label>{locale === "ta" ? "அறுவடை நாள்" : "Harvest date"}<input name="harvestDate" type="date" defaultValue={editingListing?.harvestDate ?? ""} /></label><label>{locale === "ta" ? "கிடைக்கும் கடைசி நாள்" : "Available until"}<input name="availableUntil" type="date" min={editingListing?.harvestDate ?? undefined} defaultValue={editingListing?.availableUntil ?? ""} /></label></div>
          <button className="primary-button full-button" type="submit" disabled={listingSaving}>{listingSaving ? (locale === "ta" ? "சேமிக்கிறது…" : "Saving…") : editingListing ? (locale === "ta" ? "மாற்றங்களைச் சேமி" : "Save changes") : t.publishListing}<ArrowRight size={16} /></button></form></>}
        {modal === "order" && selectedListing && <><div className="modal-icon"><ShoppingBasket size={20} /></div><h2 id="modal-title">{t.placeOrder}</h2><p>{selectedListing.crop} · {currency(selectedListing.price, locale)}/{selectedListing.unit} · {selectedListing.farmer}</p><form className="form-stack" onSubmit={placeOrder}>
          <label>{t.quantity}<input required name="quantity" type="number" min="1" max={selectedListing.quantity} defaultValue="10" /></label>
          <div className="order-total"><span>{locale === "ta" ? "கட்டண முறை · பெறும்போது பணம்" : "Payment method · Cash on pickup"}</span><b>{currency(selectedListing.price * 10, locale)}</b><small>{locale === "ta" ? "வாங்குபவர் பணம் வழங்கியதாகக் குறிப்பிட்டு, விவசாயி பெற்றதை உறுதிப்படுத்துவார்." : "Buyer marks cash handed over; farmer confirms receipt in Orders."}</small></div>
          <button className="primary-button full-button" type="submit">{t.confirmOrder}<ArrowRight size={16} /></button></form></>}
        {modal === "message" && selectedListing && <><div className="modal-icon"><MessageCircle size={20} /></div><h2 id="modal-title">{t.messageFarmer}</h2><p>{selectedListing.farmer} · {selectedListing.crop}</p><form className="form-stack" onSubmit={startConversation}><label>{t.yourMessage}<textarea required name="body" rows={4} defaultValue={t.messageStarter} /></label><button className="primary-button full-button" type="submit">{t.openConversation}<ArrowRight size={16} /></button></form></>}
        {modal === "review" && selectedOrder && <><div className="modal-icon"><Star size={20} /></div><h2 id="modal-title">{t.reviewOrder}</h2><p>{selectedOrder.crop} · {selectedOrder.id}</p><form className="form-stack" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const saved = await sendToApi("/api/reviews", { orderId: selectedOrder.id, rating: Number(form.get("rating")), body: form.get("body") }); if (!saved) return; setNotice(session ? t.reviewSubmitted : t.demoSaved); setModal(null); }}><label>{t.rating}<select name="rating"><option value="5">5 · {t.excellent}</option><option value="4">4 · {t.good}</option><option value="3">3 · {t.average}</option><option value="2">2 · {t.poor}</option><option value="1">1 · {t.veryPoor}</option></select></label><label>{t.yourReview}<textarea required name="body" rows={4} placeholder={t.reviewPlaceholder} /></label><button className="primary-button full-button" type="submit">{t.submitReview}<ArrowRight size={16} /></button></form></>}
        {modal === "report" && selectedListing && <><div className="modal-icon"><Flag size={20} /></div><h2 id="modal-title">{locale === "ta" ? (reportTarget === "farmer" ? "விவசாயியைப் புகாரளி" : "விளைபொருளைப் புகாரளி") : (reportTarget === "farmer" ? "Report farmer" : "Report product")}</h2><p>{locale === "ta" ? "இந்தப் புகார் நிர்வாகத்திற்கும் சம்பந்தப்பட்ட விவசாயிக்கும் அனுப்பப்படும்." : "Your report will be shared with the admin team and the farmer concerned."}</p><form className="form-stack" onSubmit={submitReport}>
          {reportTarget === "farmer"
            ? <label>{locale === "ta" ? "விவசாயி" : "Farmer"}<input value={selectedListing.farmer} readOnly /></label>
            : <label>{locale === "ta" ? "விளைபொருள்" : "Product"}<select value={selectedListing.id} onChange={(event) => { const selected = listings.find((listing) => listing.id === event.target.value); if (selected) setSelectedListing(selected); }}>{listings.filter((listing) => listing.status === "ACTIVE").map((listing) => <option key={listing.id} value={listing.id}>{displayCrop(listing.crop, locale)} · {listing.farmer}</option>)}</select></label>}
          <label>{locale === "ta" ? "காரணம்" : "Reason"}<select name="reason" required>{(["FAKE_PRODUCT", "INCORRECT_INFORMATION", "MISLEADING_IMAGE", "POOR_QUALITY", "SUSPICIOUS_FARMER", "PAYMENT_ISSUE", "OTHER"] as const).map((reason) => <option key={reason} value={reason}>{reportLabels[locale][reason]}</option>)}</select></label>
          <label>{locale === "ta" ? "கூடுதல் விவரங்கள்" : "Additional details"}<textarea name="details" rows={3} maxLength={1200} /></label>
          <button className="primary-button full-button" type="submit">{locale === "ta" ? "புகாரை அனுப்பு" : "Submit report"}<ArrowRight size={16} /></button></form></>}
        {modal === "farmer" && selectedListing && <><div className="modal-icon"><Sprout size={20} /></div><h2 id="modal-title">{selectedListing.farmer}</h2><p>{locale === "ta" ? "விவசாயி சுயவிவரம்" : "Farmer profile"} · {selectedListing.place}</p>
          <div className="trust-stats"><div><b>{selectedListing.farmerTrust.averageRating === null ? "—" : `${selectedListing.farmerTrust.averageRating} / 5`}</b><span>{locale === "ta" ? "வெளியிடப்பட்ட மதிப்பீடு" : `Published rating · ${selectedListing.farmerTrust.reviewCount} reviews`}</span></div><div><b>{selectedListing.farmerTrust.completedOrders}</b><span>{locale === "ta" ? "நிறைவு செய்யப்பட்ட ஆர்டர்கள்" : "Completed orders"}</span></div></div>
          <div className="trust-farm"><span>{locale === "ta" ? "இருப்பிடம்" : "Location"}</span><b>{selectedListing.place}</b></div>
          <div className="card-actions trust-actions">{selectedListing.farmerTrust.id !== session?.id && role !== "ADMIN" && <button className="message-action" onClick={() => { setModal("message"); }}>{locale === "ta" ? "விவசாயியைத் தொடர்புகொள்" : "Contact farmer"}<MessageCircle size={15} /></button>}{role === "BUYER" && selectedListing.farmerTrust.id !== session?.id && <button className="message-action" onClick={openFarmerReport}><Flag size={14} />{locale === "ta" ? "விவசாயியைப் புகாரளி" : "Report farmer"}</button>}</div>
          <button className="primary-button full-button" onClick={() => { setQuery(selectedListing.farmer); setModal(null); }}>{locale === "ta" ? "விவசாயியின் விளைபொருட்களைக் காண்க" : "View farmer products"}<ArrowRight size={16} /></button></>}
      </section></div>}
      <nav className="mobile-nav" aria-label={t.primaryNavigation}>{navItems.slice(0, role === "ADMIN" ? 6 : 4).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "mobile-nav-active" : ""} onClick={() => chooseView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    </div>
  );
}
