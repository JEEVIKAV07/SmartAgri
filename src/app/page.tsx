"use client";

import {
  ArrowDownUp, ArrowRight, BadgeCheck, Bell, Check, ChevronDown, CircleHelp,
  ClipboardList, CloudSun, Filter, Flag, Leaf, LogOut, MapPin, Menu, MessageCircle,
  Pencil, Plus, Search, ShieldCheck, ShoppingBasket, Sprout, Star, Sun, Trash2, Users, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { messages, type Locale } from "@/lib/i18n";

type Role = "BUYER" | "FARMER" | "ADMIN";
type View = "market" | "orders" | "messages" | "verification" | "admin" | "reports" | "people";
type FarmerTrust = { id: string; verified: boolean; farmName: string | null; district: string | null; completedOrders: number; averageRating: number | null; reviewCount: number };
type Listing = { id: string; crop: string; variety: string; grade: string; quantity: number; unit: string; price: number; place: string; farmer: string; farmerTrust: FarmerTrust; verified: boolean; image: string; tone: string; harvestDate: string | null; availableUntil: string | null; status: "ACTIVE" | "PAUSED" | "REMOVED" };
type DemoOrder = { id: string; crop: string; person: string; quantity: number; total: number; status: "PLACED" | "ACCEPTED" | "READY" | "COMPLETED" | "CANCELLED"; date: string };
type SessionUser = { id: string; name: string; email: string; role: Role; locale: string };
type Conversation = { id: string; listingId: string; listing: { crop: string }; buyer: { id: string; name: string }; farmer: { id: string; name: string }; messages: { id: string; senderId: string; body: string; createdAt: string }[] };
type ProductReport = { id: string; reporter: string; farmer: string; crop: string; reason: "FAKE_PRODUCT" | "INCORRECT_INFORMATION" | "MISLEADING_IMAGE" | "POOR_QUALITY" | "SUSPICIOUS_FARMER" | "PAYMENT_ISSUE" | "OTHER"; details: string | null; status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED" };

const reportLabels = {
  en: { FAKE_PRODUCT: "Fake product", INCORRECT_INFORMATION: "Incorrect information", MISLEADING_IMAGE: "Misleading image", POOR_QUALITY: "Poor quality", SUSPICIOUS_FARMER: "Suspicious farmer", PAYMENT_ISSUE: "Payment issue", OTHER: "Other", OPEN: "Open", REVIEWING: "Reviewing", RESOLVED: "Resolved", DISMISSED: "Dismissed" },
  ta: { FAKE_PRODUCT: "போலி விளைபொருள்", INCORRECT_INFORMATION: "தவறான தகவல்", MISLEADING_IMAGE: "தவறாக வழிநடத்தும் படம்", POOR_QUALITY: "குறைந்த தரம்", SUSPICIOUS_FARMER: "சந்தேகமான விவசாயி", PAYMENT_ISSUE: "கட்டணச் சிக்கல்", OTHER: "மற்றவை", OPEN: "திறந்தது", REVIEWING: "ஆய்வில்", RESOLVED: "தீர்க்கப்பட்டது", DISMISSED: "நிராகரிக்கப்பட்டது" },
} as const;

const starterListings: Listing[] = [
  { id: "listing-tomato", crop: "Tomato", variety: "Hybrid", grade: "A", quantity: 420, unit: "kg", price: 28, place: "Thondamuthur, Coimbatore", farmer: "Malar Selvan", farmerTrust: { id: "demo-malar", verified: true, farmName: "Thondamuthur Growers", district: "Coimbatore", completedOrders: 24, averageRating: 4.8, reviewCount: 38 }, verified: true, image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=85", tone: "tomato", harvestDate: "2026-09-22", availableUntil: "2026-10-30", status: "ACTIVE" },
  { id: "listing-banana", crop: "Banana", variety: "Poovan", grade: "Freshly cut", quantity: 860, unit: "kg", price: 42, place: "Pollachi, Coimbatore", farmer: "Kannan Farms", farmerTrust: { id: "demo-kannan", verified: true, farmName: "Kannan Farms", district: "Coimbatore", completedOrders: 16, averageRating: 4.7, reviewCount: 21 }, verified: true, image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=85", tone: "banana", harvestDate: "2026-09-25", availableUntil: null, status: "ACTIVE" },
  { id: "listing-rice", crop: "Paddy", variety: "CO 51", grade: "A", quantity: 1200, unit: "kg", price: 31, place: "Kumbakonam, Thanjavur", farmer: "R. Murugan", farmerTrust: { id: "demo-murugan", verified: true, farmName: "Kaveri Valley Farm", district: "Thanjavur", completedOrders: 38, averageRating: 4.6, reviewCount: 32 }, verified: true, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=85", tone: "rice", harvestDate: "2026-09-18", availableUntil: null, status: "ACTIVE" },
  { id: "listing-onion", crop: "Onion", variety: "Small onion", grade: "Cured", quantity: 275, unit: "kg", price: 56, place: "Palladam, Tiruppur", farmer: "Thenmozhi Collective", farmerTrust: { id: "demo-thenmozhi", verified: false, farmName: null, district: null, completedOrders: 0, averageRating: null, reviewCount: 0 }, verified: false, image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=85", tone: "onion", harvestDate: "2026-09-24", availableUntil: null, status: "ACTIVE" },
];

const starterOrders: DemoOrder[] = [
  { id: "SA-2048", crop: "Tomato", person: "Kovai Fresh Mart", quantity: 60, total: 1680, status: "PLACED", date: "Today, 9:42 AM" },
  { id: "SA-2031", crop: "Paddy", person: "Anbu Stores", quantity: 200, total: 6200, status: "ACCEPTED", date: "Yesterday" },
  { id: "SA-1988", crop: "Banana", person: "Green Basket Co-op", quantity: 40, total: 1680, status: "COMPLETED", date: "18 Sep 2026" },
];

const cropImages = { tomato: starterListings[0].image, banana: starterListings[1].image, rice: starterListings[2].image, onion: starterListings[3].image };
const sampleMarketPrices: Record<string, number> = { tomato: 32, banana: 45, paddy: 31, onion: 60 };
const tamilCropNames: Record<string, string> = { tomato: "தக்காளி", banana: "வாழைப்பழம்", paddy: "நெல்", rice: "அரிசி", onion: "வெங்காயம்" };
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
  const [listings, setListings] = useState(starterListings);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [orders, setOrders] = useState(starterOrders);
  const [verifications, setVerifications] = useState([{ id: "verification-1", name: "R. Murugan", farm: "Kaveri Valley Farm", district: "Thanjavur", sent: "2 hours ago", status: "PENDING" }, { id: "verification-2", name: "Thenmozhi Collective", farm: "Palladam Growers", district: "Tiruppur", sent: "Yesterday", status: "PENDING" }]);
  const [modal, setModal] = useState<"login" | "listing" | "verification" | "order" | "message" | "review" | "report" | "farmer" | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reportTarget, setReportTarget] = useState<"product" | "farmer">("product");
  const [selectedOrder, setSelectedOrder] = useState<DemoOrder | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: Role; isActive: boolean }>>([
    { id: "demo-farmer", name: "Malar Selvan", email: "farmer@vayal.test", role: "FARMER", isActive: true },
    { id: "demo-buyer", name: "Kovai Fresh Mart", email: "buyer@vayal.test", role: "BUYER", isActive: true },
  ]);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [messagesSent, setMessagesSent] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; name: string; crop: string; text: string; rating: number; status: "PENDING" | "PUBLISHED" | "HIDDEN" }>>([{ id: "review-1", name: "Anbu Stores", crop: "Paddy", text: "Clean grain and the pickup was right on time.", rating: 5, status: "PENDING" }]);
  const [reports, setReports] = useState<ProductReport[]>([]);
  const t = messages[locale];

  async function loadWorkspaceData(user: SessionUser) {
    try {
      const [listingResponse, orderResponse, messageResponse] = await Promise.all([
        fetch("/api/listings"),
        fetch("/api/orders"),
        fetch("/api/messages"),
      ]);
      const [listingData, orderData, messageData] = await Promise.all([listingResponse.json(), orderResponse.json(), messageResponse.json()]);
      if (listingResponse.ok) setListings(listingData.listings.map((item: {
        id: string; crop: string; variety: string | null; grade: string | null; quantity: number; unit: string;
        pricePerKg: number; location: string; harvestDate: string | null; availableUntil: string | null;
        imageUrl: string | null; status: Listing["status"];
        farmer: {
          id: string; name: string; village: string | null;
          verifications: { farmName: string; district: string }[];
          farmerReviews: { rating: number }[];
          _count: { farmerOrders: number };
        };
      }) => {
        const imageKey = item.crop.toLowerCase().includes("banana") ? "banana" : item.crop.toLowerCase().includes("paddy") ? "rice" : item.crop.toLowerCase().includes("onion") ? "onion" : "tomato";
        const approvedFarm = item.farmer.verifications[0] ?? null;
        const ratings = item.farmer.farmerReviews.map((review) => review.rating);
        const averageRating = ratings.length ? Number((ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)) : null;
        const farmerTrust: FarmerTrust = {
          id: item.farmer.id,
          verified: approvedFarm !== null,
          farmName: approvedFarm?.farmName ?? null,
          district: approvedFarm?.district ?? item.farmer.village,
          completedOrders: item.farmer._count.farmerOrders,
          averageRating,
          reviewCount: ratings.length,
        };
        return {
          id: item.id, crop: item.crop, variety: item.variety ?? "Fresh harvest", grade: item.grade ?? "",
          quantity: item.quantity, unit: item.unit, price: item.pricePerKg, place: item.location,
          farmer: item.farmer.name, farmerTrust, verified: farmerTrust.verified,
          image: item.imageUrl ?? cropImages[imageKey], tone: imageKey,
          harvestDate: item.harvestDate?.slice(0, 10) ?? null,
          availableUntil: item.availableUntil?.slice(0, 10) ?? null, status: item.status,
        };
      }));
      if (orderResponse.ok) setOrders(orderData.orders.map((item: { id: string; listing: { crop: string }; buyer: { name: string }; farmer: { name: string }; quantity: number; total: number; status: DemoOrder["status"]; createdAt: string }) => ({ id: item.id, crop: item.listing.crop, person: user.role === "FARMER" ? item.buyer.name : item.farmer.name, quantity: item.quantity, total: item.total, status: item.status, date: new Date(item.createdAt).toLocaleString(user.locale === "ta" ? "ta-IN" : "en-IN") })));
      if (messageResponse.ok) {
        const loaded: Conversation[] = messageData.conversations;
        setConversations(loaded);
        setSelectedConversationId((current) => current || loaded[0]?.id || "");
      }
      if (user.role === "ADMIN" || user.role === "FARMER") {
        const verificationResponse = await fetch("/api/verification");
        const verificationData = await verificationResponse.json();
        if (verificationResponse.ok) setVerifications(verificationData.submissions.map((item: { id: string; farmer: { name: string }; farmName: string; district: string; createdAt: string; status: string }) => ({ id: item.id, name: item.farmer.name, farm: item.farmName, district: item.district, sent: new Date(item.createdAt).toLocaleDateString(user.locale === "ta" ? "ta-IN" : "en-IN"), status: item.status })));
      }
      if (user.role === "ADMIN") {
        const reportsResponse = await fetch("/api/reports");
        const reportsData = await reportsResponse.json();
        if (reportsResponse.ok) setReports(reportsData.reports.map((item: { id: string; reporter: { name: string }; reportedFarmer: { name: string } | null; listing: { crop: string } | null; reason: ProductReport["reason"]; details: string | null; status: ProductReport["status"] }) => ({ id: item.id, reporter: item.reporter.name, farmer: item.reportedFarmer?.name ?? "Unknown farmer", crop: item.listing?.crop ?? "Removed product", reason: item.reason, details: item.details, status: item.status })));
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
  }

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("smartagri-locale");
    if (savedLocale === "en" || savedLocale === "ta") {
      document.documentElement.lang = savedLocale;
      if (savedLocale !== "en") window.requestAnimationFrame(() => setLocale(savedLocale));
    }
    fetch("/api/auth/me").then((response) => response.json()).then((result) => {
      if (result.user) { setSession(result.user); setRole(result.user.role); void loadWorkspaceData(result.user); }
    }).catch(() => undefined);
  }, []);

  const visibleListings = useMemo(() => {
    const found = listings.filter((listing) => listing.status === "ACTIVE" || role === "ADMIN" || (role === "FARMER" && listing.farmer === (session?.name ?? "Malar Selvan") && listing.status === "PAUSED"))
      .filter((listing) => cropFilter === "All crops" || listing.crop === cropFilter)
      .filter((listing) => `${listing.crop} ${listing.variety} ${listing.place} ${listing.farmer}`.toLowerCase().includes(query.toLowerCase()));
    return sortLow ? [...found].sort((a, b) => a.price - b.price) : found;
  }, [cropFilter, listings, query, role, session?.name, sortLow]);

  function switchLocale(next: Locale) {
    setLocale(next);
    document.documentElement.lang = next;
    window.localStorage.setItem("smartagri-locale", next);
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
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t.actionFailed);
      setSession(result.user); setRole(result.user.role); setModal(null); setNotice(t.signedIn); void loadWorkspaceData(result.user);
    } catch (error) { setNotice(error instanceof Error ? error.message : t.actionFailed); }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession(null); setRole("BUYER"); setNotice(t.signedOut);
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      imageUrl: String(form.get("imageUrl") || "") || null,
    };
    if (editingListing) {
      const saved = await sendToApi("/api/listings", { id: editingListing.id, ...changes }, "PATCH");
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
        image: changes.imageUrl ?? cropImages[item.tone as keyof typeof cropImages] ?? item.image,
      } : item));
      setEditingListing(null); setModal(null); setNotice(session ? t.listingSaved : t.demoUpdated);
      return;
    }
    const imageKey = changes.crop.toLowerCase().includes("banana") ? "banana" : changes.crop.toLowerCase().includes("paddy") ? "rice" : changes.crop.toLowerCase().includes("onion") ? "onion" : "tomato";
    const farmer = session?.name ?? (role === "FARMER" ? "Malar Selvan" : t.you);
    const listing: Listing = {
      id: `new-${Date.now()}`, crop: changes.crop, variety: changes.variety, grade: changes.grade ?? "",
      quantity: changes.quantity, unit: changes.unit, price: changes.pricePerKg, place: changes.location,
      farmer, farmerTrust: {
        id: session?.id ?? "demo-malar", verified: false, farmName: null, district: null,
        completedOrders: 0, averageRating: null, reviewCount: 0,
      },
      verified: false, image: changes.imageUrl ?? cropImages[imageKey], tone: imageKey,
      harvestDate: changes.harvestDate, availableUntil: changes.availableUntil, status: "ACTIVE",
    };
    const saved = await sendToApi("/api/listings", changes);
    if (!saved) return;
    const persisted = "listing" in saved ? saved.listing as { id: string; status: Listing["status"] } : null;
    setListings((current) => [{ ...listing, id: persisted?.id ?? listing.id, status: persisted?.status ?? listing.status }, ...current]); setModal(null); setNotice(session ? t.listingSaved : t.demoSaved);
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedListing) return;
    const quantity = Number(new FormData(event.currentTarget).get("quantity"));
    const saved = session ? await sendToApi("/api/orders", { listingId: selectedListing.id, quantity }) : { demo: true };
    if (!saved) return;
    const persisted = "order" in saved ? saved.order as { id: string; status: DemoOrder["status"] } : null;
    const nextOrder: DemoOrder = { id: persisted?.id ?? `SA-${Date.now().toString().slice(-4)}`, crop: selectedListing.crop, person: selectedListing.farmer, quantity, total: quantity * selectedListing.price, status: persisted?.status ?? "PLACED", date: locale === "ta" ? "இன்று" : "Just now" };
    setOrders((current) => [nextOrder, ...current]); setModal(null); setView("orders"); setNotice(session ? t.orderPlaced : t.demoOrderPlaced);
  }

  async function updateOrder(order: DemoOrder, status: DemoOrder["status"]) {
    if (session && !(await sendToApi("/api/orders", { id: order.id, status }, "PATCH"))) return;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item)); setNotice(session ? t.orderUpdated : t.demoUpdated);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    if (session && selectedListing && !(await sendToApi("/api/messages", { listingId: selectedListing.id, body: messageDraft.trim(), conversationId: selectedConversationId || undefined }))) return;
    setMessagesSent((current) => [...current, messageDraft.trim()]); setMessageDraft(""); setNotice(session ? t.messageSent : t.demoMessageSent);
  }

  async function sendVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submission = { farmName: String(form.get("farmName")), district: String(form.get("district")), documentRef: String(form.get("documentRef")) };
    if (session && !(await sendToApi("/api/verification", submission))) return;
    setVerifications((current) => [{ id: `verification-${Date.now()}`, name: session?.name ?? t.you, farm: submission.farmName, district: submission.district, sent: t.justNow, status: "PENDING" }, ...current]); setModal(null); setNotice(session ? t.verificationSent : t.demoVerificationSent);
  }

  async function decideVerification(id: string, decision: "APPROVED" | "REJECTED") {
    if (session && !(await sendToApi("/api/verification", { id, decision }, "PATCH"))) return;
    setVerifications((current) => current.map((item) => item.id === id ? { ...item, status: decision } : item)); setNotice(session ? t.decisionSaved : t.demoUpdated);
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
    setReports((current) => [{ id: `report-${Date.now()}`, reporter: session?.name ?? "Kovai Fresh Mart", farmer: selectedListing.farmer, crop: selectedListing.crop, reason, details, status: "OPEN" }, ...current]);
    setModal(null); setNotice(locale === "ta" ? "புகார் நிர்வாகத்திற்கு அனுப்பப்பட்டது" : "Report sent to the admin team");
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
    if (session) {
      const saved = await sendToApi("/api/messages", { listingId: selectedListing.id, body });
      if (!saved) return;
      if ("conversationId" in saved && typeof saved.conversationId === "string") setSelectedConversationId(saved.conversationId);
      void loadWorkspaceData(session);
    } else {
      setMessagesSent((current) => [...current, body]);
    }
    setView("messages"); setModal(null); setNotice(t.conversationOpened);
  }

  function chooseView(next: View) { setView(next); setMobileOpen(false); }
  function openOrder(listing: Listing) { setSelectedListing(listing); setModal("order"); }
  function openEditListing(listing: Listing) { setEditingListing(listing); setModal("listing"); }
  function openCreateListing() { setEditingListing(null); setModal("listing"); }
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
    { id: "orders" as const, label: t.orders, icon: ClipboardList },
    { id: "messages" as const, label: t.messages, icon: MessageCircle },
    ...(role === "FARMER" ? [{ id: "verification" as const, label: t.farmVerification, icon: BadgeCheck }] : []),
    ...(role === "ADMIN" ? [{ id: "admin" as const, label: t.adminReview, icon: ShieldCheck }] : []),
    ...(role === "ADMIN" ? [{ id: "reports" as const, label: locale === "ta" ? "புகார்கள்" : "Reports", icon: Flag }] : []),
    ...(role === "ADMIN" ? [{ id: "people" as const, label: locale === "ta" ? "பயனர்கள்" : "People", icon: Users }] : []),
  ];
  const isDemo = !session;
  const activeConversation = conversations.find((item) => item.id === selectedConversationId);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#home" onClick={() => chooseView("market")}><span className="brand-mark"><Sprout size={21} strokeWidth={2.4} /></span><span className="brand-name">vayal<span>connect</span></span></a>
        <div className="workspace-label">{t.workspace}</div>
        <nav className="side-nav" aria-label={t.primaryNavigation}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "nav-active" : ""}`} onClick={() => chooseView(id)}><Icon size={18} /><span>{label}</span>{id === "orders" && role === "FARMER" && <span className="nav-count">2</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="weather-mini"><span className="weather-icon"><Sun size={17} /></span><span><b>{t.weatherLabel}</b><small>{t.providerMissing}</small></span><CircleHelp size={15} /></div><div className="profile-mini"><span className="avatar">{(session?.name ?? (role === "BUYER" ? "K" : role === "FARMER" ? "M" : "A")).slice(0, 1)}</span><span className="profile-name"><b>{session?.name ?? (role === "BUYER" ? "Kovai Fresh Mart" : role === "FARMER" ? "Malar Selvan" : "Platform admin")}</b><small>{t[role.toLowerCase() as "buyer" | "farmer" | "admin"]}</small></span>{session ? <button className="icon-button subtle" title={t.signOut} onClick={signOut}><LogOut size={16} /></button> : <button className="icon-button subtle" title={t.signIn} onClick={() => setModal("login")}><ArrowRight size={16} /></button>}</div></div>
      </aside>

      <div className="main-column">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label={t.openMenu} onClick={() => setMobileOpen((open) => !open)}><Menu size={20} /></button><div className="crumb"><span>{t.home}</span><span className="crumb-slash">/</span><b>{navItems.find((item) => item.id === view)?.label ?? t.marketplace}</b></div><div className="top-actions">{isDemo && <span className="demo-pill"><span />{t.previewMode}</span>}{!session && <select className="role-select" aria-label={t.previewRole} value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="BUYER">{t.buyerPreview}</option><option value="FARMER">{t.farmerPreview}</option><option value="ADMIN">{t.adminPreview}</option></select>}<div className="language-switch" aria-label={t.language}><button className={locale === "en" ? "language-active" : ""} onClick={() => switchLocale("en")}>EN</button><span /><button className={locale === "ta" ? "language-active" : ""} onClick={() => switchLocale("ta")}>தமிழ்</button></div><button className="icon-button notification-button" title={t.notifications} aria-label={t.notifications}><Bell size={18} /><i /></button>{!session && <button className="sign-in-button" onClick={() => setModal("login")}>{t.signIn}<ArrowRight size={15} /></button>}</div></header>

        <main className="content-area">
          {view === "people" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "நிர்வாகக் கட்டுப்பாடு" : "PLATFORM CONTROL"}</div><h1>{locale === "ta" ? "விவசாயிகள் மற்றும் வாங்குபவர்கள்" : "Farmers and buyers"}</h1><p className="view-intro">{locale === "ta" ? "பயனர் கணக்குகளை ஆய்வு செய்து, தேவையானபோது அணுகலை முடக்குங்கள்." : "Review registered farmers and buyers, and suspend or restore account access when needed."}</p><div className="subsection-title"><h2>{locale === "ta" ? "பதிவுசெய்த உறுப்பினர்கள்" : "Registered members"}</h2><span>{users.length}</span></div>{users.length === 0 ? <div className="empty-state"><Users size={24} /><b>{locale === "ta" ? "பயனர்கள் இல்லை" : "No members found"}</b></div> : users.map((user) => <article className="review-item" key={user.id}><span className="review-avatar"><Users size={17} /></span><div className="review-details"><div><b>{user.name}</b><span className={`status ${user.isActive ? "status-approved" : "status-rejected"}`}>{user.isActive ? (locale === "ta" ? "செயலில்" : "Active") : (locale === "ta" ? "இடைநிறுத்தப்பட்டது" : "Suspended")}</span></div><p>{user.email} · {user.role === "FARMER" ? t.farmer : t.buyer}</p></div><button className="row-action" onClick={() => void updateUser(user)}>{user.isActive ? (locale === "ta" ? "அணுகலை இடைநிறுத்து" : "Suspend access") : (locale === "ta" ? "அணுகலை மீட்டமை" : "Restore access")}</button></article>)}</section>}
          {notice && <div className="notice" role="status"><Check size={16} /><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}><X size={15} /></button></div>}
          {view === "market" && <>
            <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" />{t.goodMorning}</div><h1>{role === "FARMER" ? t.farmerGreeting : role === "ADMIN" ? t.adminGreeting : t.buyerGreeting}</h1><p>{role === "FARMER" ? t.farmerSubhead : role === "ADMIN" ? t.adminSubhead : t.buyerSubhead}</p></div><div className="welcome-date"><span>{t.today}</span><b>{new Intl.DateTimeFormat(locale === "ta" ? "ta-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</b><small>{t.coimbatoreRegion}</small></div></section>
            <section className="insight-row" aria-label={t.marketInsights}><div className="insight-card price-insight"><span className="insight-icon"><ArrowDownUp size={18} /></span><div><small>{t.cropPrices}</small><b>{t.providerNotConnected}</b><span>{t.providerHint}</span></div><span className="insight-state">{t.unavailable}</span></div><div className="insight-card weather-insight"><span className="insight-icon"><CloudSun size={19} /></span><div><small>{t.localWeather}</small><b>{t.providerNotConnected}</b><span>{t.providerHint}</span></div><span className="insight-state">{t.unavailable}</span></div><div className="insight-note"><span className="note-sun"><Sun size={17} /></span><div><b>{t.planPickup}</b><span>{t.marketplaceAvailable}</span></div><ArrowRight size={16} /></div></section>
            <section className="section-head listing-section-head"><div><div className="eyebrow"><span className="eyebrow-line" />{role === "FARMER" ? t.yourNetwork : t.freshFromFarm}</div><h2>{role === "FARMER" ? (locale === "ta" ? "எனது விளைபொருட்கள்" : "My products") : t.findYourHarvest}</h2></div>{role === "FARMER" ? <button className="primary-button" onClick={openCreateListing}><Plus size={17} />{t.addListing}</button> : role === "BUYER" ? <div className="market-actions"><button className="text-button" onClick={() => setSortLow((value) => !value)}><ArrowDownUp size={16} />{sortLow ? t.priceLowHigh : t.sortByPrice}</button><button className="text-button" onClick={() => visibleListings[0] && openReport(visibleListings[0])}><Flag size={15} />{locale === "ta" ? "விளைபொருளைப் புகாரளி" : "Report product"}</button></div> : null}</section>
            <section className="market-tools" aria-label={t.marketFilters}><label className="search-field"><Search size={17} /><input aria-label={t.searchProduce} placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><label className="filter-field"><Filter size={16} /><select aria-label={t.filterByCrop} value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}><option>All crops</option><option>Tomato</option><option>Banana</option><option>Paddy</option><option>Onion</option></select><ChevronDown size={14} /></label><span className="result-count">{visibleListings.length} {t.availableLots}</span></section>
            <section className="listing-grid" aria-label={t.produceListings}>
              {visibleListings.map((listing) => {
                const marketPrice = listing.unit === "kg" ? sampleMarketPrices[listing.crop.toLowerCase()] : undefined;
                const isOwner = role === "FARMER" && listing.farmer === (session?.name ?? "Malar Selvan");
                const canManageListing = isOwner || role === "ADMIN";
                const priceDifference = marketPrice === undefined ? 0 : Math.abs(marketPrice - listing.price);
                return <article className="produce-card" key={listing.id}>
                  <div className={`produce-image image-${listing.tone}`} style={{ backgroundImage: `url("${listing.image}")` }}>
                    <span className="fresh-tag"><span />{listing.status === "ACTIVE" ? t.harvestReady : listing.status === "PAUSED" ? (locale === "ta" ? "இடைநிறுத்தப்பட்டது" : "PAUSED") : (locale === "ta" ? "நீக்கப்பட்டது" : "REMOVED")}</span>
                    <button className="save-button" aria-label={`${t.save} ${listing.crop}`} title={t.save}><Star size={16} /></button>
                  </div>
                  <div className="produce-copy">
                    <div className="crop-line">
                      <div><h3>{displayCrop(listing.crop, locale)}</h3><span>{listing.variety}{listing.grade ? ` · ${locale === "ta" ? "தரம்" : "Grade"} ${listing.grade}` : ""}</span></div>
                      <div className="price-label"><b>{currency(listing.price, locale)}</b><small>/{listing.unit}</small></div>
                    </div>
                    {marketPrice !== undefined && <div className="market-reference">
                      <span>{locale === "ta" ? "தற்போதைய சந்தை விலை · மாதிரி" : "Market price · sample"}</span>
                      <b>{currency(marketPrice, locale)}/{listing.unit}</b>
                      <small>{priceDifference === 0
                        ? (locale === "ta" ? "சந்தை விலைக்கு சமம்" : "At market price")
                        : locale === "ta"
                          ? `விவசாயி விலை ${currency(priceDifference, locale)} ${marketPrice > listing.price ? "குறைவு" : "அதிகம்"}`
                          : `${currency(priceDifference, locale)} ${marketPrice > listing.price ? "below" : "above"} market`}</small>
                    </div>}
                    <div className="lot-detail"><span>{t.available}</span><b>{new Intl.NumberFormat(locale === "ta" ? "ta-IN" : "en-IN").format(listing.quantity)} {listing.unit}</b></div>
                    {(listing.harvestDate || listing.availableUntil) && <div className="listing-dates">
                      {listing.harvestDate && <span>{locale === "ta" ? "அறுவடை" : "Harvested"} · {formatDate(listing.harvestDate, locale)}</span>}
                      {listing.availableUntil && <span>{locale === "ta" ? "கிடைக்கும் கடைசி நாள்" : "Available until"} · {formatDate(listing.availableUntil, locale)}</span>}
                    </div>}
                    <div className="farmer-line">
                      <button className="farmer-profile-button" onClick={() => openFarmerProfile(listing)} aria-label={`${locale === "ta" ? "விவசாயி சுயவிவரத்தைக் காண்க" : "View farmer profile"}: ${listing.farmer}`}>
                        <span className="farmer-avatar">{listing.farmer.slice(0, 1)}</span>
                        <span><b>{listing.farmer}</b><small>{listing.verified && <><BadgeCheck size={12} />{locale === "ta" ? "பண்ணை சரிபார்க்கப்பட்டது" : "Farm verified"}</>}</small></span>
                      </button>
                      <span className="place"><MapPin size={13} />{listing.place.split(",")[0]}</span>
                    </div>
                    <div className="card-actions">{canManageListing ? <><button className="message-action" onClick={() => openEditListing(listing)}><Pencil size={14} />{locale === "ta" ? "திருத்து" : "Edit"}</button><button className="buy-action" onClick={() => updateListing(listing, listing.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>{listing.status === "ACTIVE" ? t.pauseListing : listing.status === "PAUSED" ? (locale === "ta" ? "மீண்டும் வெளியிடு" : "Resume") : (locale === "ta" ? "மீட்டமை" : "Restore")}</button><button className="icon-button listing-remove" aria-label={locale === "ta" ? "பட்டியலை நீக்கு" : "Remove listing"} title={locale === "ta" ? "பட்டியலை நீக்கு" : "Remove listing"} onClick={() => updateListing(listing, "REMOVED")}><Trash2 size={15} /></button></> : <><button className="message-action" onClick={() => openMessage(listing)}><MessageCircle size={15} />{t.message}</button>{role === "BUYER" ? <button className="buy-action" onClick={() => openOrder(listing)}>{t.placeOrder}<ArrowRight size={15} /></button> : <button className="buy-action" onClick={() => openOrder(listing)}>{t.viewLot}<ArrowRight size={15} /></button>}</>}</div>
                  </div>
                </article>;
              })}
              {visibleListings.length === 0 && <div className="empty-state"><Search size={25} /><b>{t.noListings}</b><span>{t.tryAnotherSearch}</span></div>}
            </section>
            <div className="source-note"><span className="source-dot" />{t.demoListingsNote}<span>{locale === "ta" ? "மாதிரி சந்தை விலை; நேரடி தரவு அல்ல" : "Sample reference only; not live market data"}</span></div>
          </>}

          {view === "orders" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{t.orderDesk}</div><h1>{role === "FARMER" ? t.incomingOrders : t.yourOrders}</h1><p className="view-intro">{t.orderDeskIntro}</p><div className="order-summary"><div><span>{t.openOrders}</span><b>{orders.filter((order) => ["PLACED", "ACCEPTED", "READY"].includes(order.status)).length}</b></div><div><span>{t.completedThisMonth}</span><b>{orders.filter((order) => order.status === "COMPLETED").length}</b></div><div><span>{t.orderValue}</span><b>{currency(orders.reduce((sum, order) => sum + order.total, 0), locale)}</b></div></div><div className="table-wrap"><table><thead><tr><th>{t.orderId}</th><th>{t.produce}</th><th>{role === "FARMER" ? t.buyer : t.farmer}</th><th>{t.quantity}</th><th>{t.total}</th><th>{t.status}</th><th>{t.action}</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="order-id">{order.id}<small>{order.date}</small></td><td><span className="table-crop">{order.crop}</span></td><td>{order.person}</td><td>{order.quantity} kg</td><td>{currency(order.total, locale)}</td><td><span className={`status status-${order.status.toLowerCase()}`}>{t[order.status.toLowerCase() as "placed" | "accepted" | "ready" | "completed" | "cancelled"]}</span></td><td>{order.status === "PLACED" && role !== "BUYER" ? <button className="row-action" onClick={() => updateOrder(order, "ACCEPTED")}>{t.accept}</button> : order.status === "ACCEPTED" && role !== "BUYER" ? <button className="row-action" onClick={() => updateOrder(order, "READY")}>{t.markReady}</button> : order.status === "READY" && role === "BUYER" ? <button className="row-action" onClick={() => updateOrder(order, "COMPLETED")}>{t.complete}</button> : order.status === "COMPLETED" && role === "BUYER" ? <button className="row-action" onClick={() => { setSelectedOrder(order); setModal("review"); }}>{t.leaveReview}</button> : <span className="muted-cell">{t.noAction}</span>}</td></tr>)}</tbody></table></div></section>}

          {view === "messages" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{t.yourNetwork}</div><h1>{t.messages}</h1><p className="view-intro">{t.messagesIntro}</p><div className="conversation-layout"><aside className="conversation-list"><div className="conversation-search"><Search size={15} /><input aria-label={t.searchConversations} placeholder={t.searchConversations} /></div><button className="conversation-row conversation-selected"><span className="conversation-avatar">M</span><span><b>{role === "BUYER" ? "Malar Selvan" : "Kovai Fresh Mart"}</b><small>{t.tomatoConversation}</small></span><time>10:12</time></button><button className="conversation-row"><span className="conversation-avatar avatar-yellow">A</span><span><b>Anbu Stores</b><small>{t.paddyConversation}</small></span><time>Yesterday</time></button></aside><div className="conversation-main"><header><span className="conversation-avatar">{role === "BUYER" ? "M" : "K"}</span><span><b>{role === "BUYER" ? "Malar Selvan" : "Kovai Fresh Mart"}</b><small><span className="online-dot" />{t.aboutTomatoes}</small></span><button className="icon-button" title={t.orderDetails}><ClipboardList size={17} /></button></header><div className="chat-body"><div className="date-divider"><span>{t.today}</span></div><div className="chat-bubble incoming">{t.chatGreeting}<small>9:38 AM</small></div><div className="chat-bubble outgoing">{t.chatReply}<small>9:46 AM</small></div>{messagesSent.map((text, index) => <div className="chat-bubble outgoing" key={`${text}-${index}`}>{text}<small>{t.justNow}</small></div>)}</div><form className="chat-compose" onSubmit={submitMessage}><input aria-label={t.writeMessage} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={t.messagePlaceholder} /><button type="submit" aria-label={t.sendMessage}><ArrowRight size={18} /></button></form></div></div><p className="privacy-note"><ShieldCheck size={15} />{t.messagePrivacy}</p></section>}

          {view === "verification" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{t.farmerTools}</div><h1>{t.farmVerification}</h1><p className="view-intro">{t.verificationIntro}</p><div className="verification-banner"><span><BadgeCheck size={23} /></span><div><b>{t.buildTrust}</b><p>{t.buildTrustCopy}</p></div><button className="primary-button" onClick={() => setModal("verification")}><Plus size={16} />{t.submitFarmDetails}</button></div><div className="subsection-title"><h2>{t.submissionHistory}</h2><span>{verifications.length} {t.submissions}</span></div>{verifications.filter((item) => item.name === (session?.name ?? "Malar Selvan") || item.name === t.you).map((item) => <div className="verification-row" key={item.id}><div className="verification-file"><ShieldCheck size={19} /></div><div className="verification-copy"><b>{item.farm}</b><span>{item.district} · {item.sent}</span></div><span className={`status status-${item.status.toLowerCase()}`}>{t[item.status.toLowerCase() as "pending" | "approved" | "rejected"]}</span></div>)}<div className="private-doc-note"><ShieldCheck size={16} />{t.privateDocNote}</div></section>}

          {view === "admin" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{t.platformControl}</div><h1>{t.adminReview}</h1><p className="view-intro">{t.adminIntro}</p><div className="admin-stats"><div><span>{t.pendingVerification}</span><b>{verifications.filter((item) => item.status === "PENDING").length}</b><small>{t.farmerApplications}</small></div><div><span>{t.marketActivity}</span><b>{listings.filter((item) => item.status === "ACTIVE").length}</b><small>{t.activeListings}</small></div><div><span>{t.orderVolume}</span><b>{orders.length}</b><small>{t.trackedOrders}</small></div></div><div className="subsection-title"><h2>{t.verificationQueue}</h2><span className="queue-count">{verifications.filter((item) => item.status === "PENDING").length} {t.needReview}</span></div><div className="review-queue">{verifications.map((item) => <article className="review-item" key={item.id}><span className="review-avatar">{item.name.slice(0, 1)}</span><div className="review-details"><div><b>{item.farm}</b><span className={`status status-${item.status.toLowerCase()}`}>{t[item.status.toLowerCase() as "pending" | "approved" | "rejected"]}</span></div><p>{item.name} · {item.district}</p><small>{t.submitted} {item.sent} · {t.documentRef}: <a href="#verification-file" onClick={(event) => event.preventDefault()}>{t.privateReference}</a></small></div>{item.status === "PENDING" ? <div className="review-actions"><button className="reject-button" onClick={() => decideVerification(item.id, "REJECTED")}>{t.reject}</button><button className="approve-button" onClick={() => decideVerification(item.id, "APPROVED")}><Check size={15} />{t.approve}</button></div> : <span className="muted-cell">{t.reviewed}</span>}</article>)}</div><div className="subsection-title review-title"><h2>{t.reviewModeration}</h2><span>{reviews.filter((review) => review.status === "PENDING").length} {t.needReview}</span></div>{reviews.map((review) =>           <div className="moderation-row" key={review.id}><span className="stars"><Star size={14} fill="currentColor" /> {review.rating.toFixed(1)}</span><div><b>{review.name} · {review.crop}</b><p>{review.text}</p></div><button className="row-action" onClick={() => void moderateReview(review)}>{review.status === "PENDING" ? t.publish : t.hide}</button></div>)}</section>}

          {view === "reports" && <section className="workspace-view"><div className="eyebrow"><span className="eyebrow-line" />{locale === "ta" ? "பாதுகாப்பு" : "SAFETY & TRUST"}</div><h1>{locale === "ta" ? "புகார் மேலாண்மை" : "Product reports"}</h1><p className="view-intro">{locale === "ta" ? "வாங்குபவர்கள் அனுப்பிய விளைபொருள் புகார்களை ஆய்வு செய்யுங்கள்." : "Review product concerns submitted by buyers."}</p><div className="subsection-title"><h2>{locale === "ta" ? "புகார் வரிசை" : "Report queue"}</h2><span className="queue-count">{reports.filter((report) => report.status === "OPEN" || report.status === "REVIEWING").length} {locale === "ta" ? "திறந்தவை" : "open"}</span></div>{reports.length === 0 ? <div className="empty-state"><Flag size={24} /><b>{locale === "ta" ? "புகார்கள் இல்லை" : "No product reports"}</b></div> : reports.map((report) => <article className="review-item" key={report.id}><span className="review-avatar"><Flag size={16} /></span><div className="review-details"><div><b>{report.crop}</b><span className={`status status-${report.status.toLowerCase()}`}>{reportLabels[locale][report.status]}</span></div><p>{reportLabels[locale][report.reason]} · {report.farmer}</p><small>{locale === "ta" ? "அறிவித்தவர்" : "Reported by"} {report.reporter}{report.details ? ` · ${report.details}` : ""}</small></div>{report.status === "OPEN" || report.status === "REVIEWING" ? <div className="review-actions"><button className="reject-button" onClick={() => updateReport(report, "DISMISSED")}>{locale === "ta" ? "நிராகரி" : "Dismiss"}</button><button className="approve-button" onClick={() => updateReport(report, "RESOLVED")}><Check size={15} />{locale === "ta" ? "தீர்வு" : "Resolve"}</button></div> : <span className="muted-cell">{reportLabels[locale][report.status]}</span>}</article>)}</section>}
          <footer className="page-footer"><span>© 2026 Vayal Connect</span><span>{t.footerMessage}</span><a href="#help">{t.helpCenter}<ArrowRight size={13} /></a></footer>
        </main>
      </div>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="icon-button modal-close" aria-label={t.close} onClick={() => setModal(null)}><X size={18} /></button>
        {modal === "login" && <><div className="modal-icon"><Leaf size={20} /></div><h2 id="modal-title">{t.welcomeBack}</h2><p>{t.signInCopy}</p><form className="form-stack" onSubmit={handleLogin}><label>{t.email}<input required type="email" name="email" placeholder="you@example.com" /></label><label>{t.password}<input required type="password" name="password" placeholder="••••••••" /></label><button className="primary-button full-button" type="submit">{t.signIn}<ArrowRight size={16} /></button></form><small className="demo-credentials">{t.demoCredentials}</small></>}
        {modal === "listing" && <><div className="modal-icon"><Sprout size={20} /></div><h2 id="modal-title">{editingListing ? (locale === "ta" ? "விளைபொருளைத் திருத்து" : "Edit product") : t.createListing}</h2><p>{t.createListingCopy}</p><form className="form-stack" onSubmit={createListing}>
          <label>{t.cropName}<input required name="crop" placeholder={t.cropPlaceholder} defaultValue={editingListing?.crop} /></label>
          <div className="form-pair"><label>{t.variety}<input name="variety" placeholder={t.varietyPlaceholder} defaultValue={editingListing?.variety} /></label><label>{locale === "ta" ? "தரம்" : "Quality / grade"}<input name="grade" placeholder={locale === "ta" ? "எ.கா. தரம் A" : "e.g. Grade A"} defaultValue={editingListing?.grade} /></label></div>
          <div className="form-pair"><label>{t.quantity}<input required name="quantity" type="number" min="1" step="1" placeholder="100" defaultValue={editingListing?.quantity} /></label><label>{t.unit}<select name="unit" defaultValue={editingListing?.unit ?? "kg"}><option value="kg">kg</option><option value="crate">crate</option><option value="tonne">tonne</option></select></label></div>
          <label>{t.pricePerUnit}<input required name="pricePerKg" type="number" min="1" step="0.5" placeholder="32" defaultValue={editingListing?.price} /></label>
          <label>{t.pickupLocation}<input required name="location" placeholder={t.locationPlaceholder} defaultValue={editingListing?.place} /></label>
          <div className="form-pair"><label>{locale === "ta" ? "அறுவடை நாள்" : "Harvest date"}<input name="harvestDate" type="date" defaultValue={editingListing?.harvestDate ?? ""} /></label><label>{locale === "ta" ? "கிடைக்கும் கடைசி நாள்" : "Available until"}<input name="availableUntil" type="date" min={editingListing?.harvestDate ?? undefined} defaultValue={editingListing?.availableUntil ?? ""} /></label></div>
          <label>{locale === "ta" ? "விளைபொருள் படத்தின் HTTPS இணைப்பு" : "Product image HTTPS URL"}<input name="imageUrl" type="url" pattern="https://.*" placeholder="https://example.com/tomatoes.jpg" defaultValue={editingListing?.image.startsWith("https://") ? editingListing.image : ""} /><small>{locale === "ta" ? "வெளிப்புறப் படம் விருப்பமானது; HTTPS இணைப்பைப் பயன்படுத்தவும்." : "Optional. Use a secure HTTPS link to the product image."}</small></label>
          <button className="primary-button full-button" type="submit">{editingListing ? (locale === "ta" ? "மாற்றங்களைச் சேமி" : "Save changes") : t.publishListing}<ArrowRight size={16} /></button></form></>}
        {modal === "order" && selectedListing && <><div className="modal-icon"><ShoppingBasket size={20} /></div><h2 id="modal-title">{t.placeOrder}</h2><p>{selectedListing.crop} · {currency(selectedListing.price, locale)}/{selectedListing.unit} · {selectedListing.farmer}</p><form className="form-stack" onSubmit={placeOrder}><label>{t.quantity}<input required name="quantity" type="number" min="1" max={selectedListing.quantity} defaultValue="10" /></label><div className="order-total"><span>{t.estimatedTotal}</span><b>{currency(selectedListing.price * 10, locale)}</b><small>{t.settlementNote}</small></div><button className="primary-button full-button" type="submit">{t.confirmOrder}<ArrowRight size={16} /></button></form></>}
        {modal === "message" && selectedListing && <><div className="modal-icon"><MessageCircle size={20} /></div><h2 id="modal-title">{t.messageFarmer}</h2><p>{selectedListing.farmer} · {selectedListing.crop}</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setView("messages"); setModal(null); setNotice(t.conversationOpened); }}><label>{t.yourMessage}<textarea required rows={4} defaultValue={t.messageStarter} /></label><button className="primary-button full-button" type="submit">{t.openConversation}<ArrowRight size={16} /></button></form></>}
        {modal === "verification" && <><div className="modal-icon"><ShieldCheck size={20} /></div><h2 id="modal-title">{t.submitFarmDetails}</h2><p>{t.verificationFormCopy}</p><form className="form-stack" onSubmit={sendVerification}><label>{t.farmName}<input required name="farmName" placeholder={t.farmPlaceholder} /></label><label>{t.district}<input required name="district" placeholder={t.districtPlaceholder} /></label><label>{t.privateDocumentReference}<input required name="documentRef" placeholder={t.documentPlaceholder} /><small>{t.privateDocNote}</small></label><button className="primary-button full-button" type="submit">{t.sendForReview}<ArrowRight size={16} /></button></form></>}
        {modal === "review" && selectedOrder && <><div className="modal-icon"><Star size={20} /></div><h2 id="modal-title">{t.reviewOrder}</h2><p>{selectedOrder.crop} · {selectedOrder.id}</p><form className="form-stack" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const saved = await sendToApi("/api/reviews", { orderId: selectedOrder.id, rating: Number(form.get("rating")), body: form.get("body") }); if (!saved) return; setNotice(session ? t.reviewSubmitted : t.demoSaved); setModal(null); }}><label>{t.rating}<select name="rating"><option value="5">5 · {t.excellent}</option><option value="4">4 · {t.good}</option><option value="3">3 · {t.average}</option><option value="2">2 · {t.poor}</option><option value="1">1 · {t.veryPoor}</option></select></label><label>{t.yourReview}<textarea required name="body" rows={4} placeholder={t.reviewPlaceholder} /></label><button className="primary-button full-button" type="submit">{t.submitReview}<ArrowRight size={16} /></button></form></>}
        {modal === "report" && selectedListing && <><div className="modal-icon"><Flag size={20} /></div><h2 id="modal-title">{locale === "ta" ? (reportTarget === "farmer" ? "விவசாயியைப் புகாரளி" : "விளைபொருளைப் புகாரளி") : (reportTarget === "farmer" ? "Report farmer" : "Report product")}</h2><p>{locale === "ta" ? "இந்தப் புகார் நிர்வாக ஆய்வுக்காக அனுப்பப்படும்." : "Your report will be sent to the admin team for review."}</p><form className="form-stack" onSubmit={submitReport}>
          {reportTarget === "farmer"
            ? <label>{locale === "ta" ? "விவசாயி" : "Farmer"}<input value={selectedListing.farmer} readOnly /></label>
            : <label>{locale === "ta" ? "விளைபொருள்" : "Product"}<select value={selectedListing.id} onChange={(event) => { const selected = listings.find((listing) => listing.id === event.target.value); if (selected) setSelectedListing(selected); }}>{listings.filter((listing) => listing.status === "ACTIVE").map((listing) => <option key={listing.id} value={listing.id}>{displayCrop(listing.crop, locale)} · {listing.farmer}</option>)}</select></label>}
          <label>{locale === "ta" ? "காரணம்" : "Reason"}<select name="reason" required>{(["FAKE_PRODUCT", "INCORRECT_INFORMATION", "MISLEADING_IMAGE", "POOR_QUALITY", "SUSPICIOUS_FARMER", "PAYMENT_ISSUE", "OTHER"] as const).map((reason) => <option key={reason} value={reason}>{reportLabels[locale][reason]}</option>)}</select></label>
          <label>{locale === "ta" ? "கூடுதல் விவரங்கள்" : "Additional details"}<textarea name="details" rows={3} maxLength={1200} /></label>
          <button className="primary-button full-button" type="submit">{locale === "ta" ? "புகாரை அனுப்பு" : "Submit report"}<ArrowRight size={16} /></button></form></>}
        {modal === "farmer" && selectedListing && <><div className="modal-icon"><BadgeCheck size={20} /></div><h2 id="modal-title">{selectedListing.farmer}</h2><p>{locale === "ta" ? "விவசாயி நம்பிக்கை சுயவிவரம்" : "Farmer trust profile"} · {selectedListing.place}</p>
          <div className="trust-status"><BadgeCheck size={16} /><span><b>{selectedListing.farmerTrust.verified ? (locale === "ta" ? "பண்ணை விவரங்கள் சரிபார்க்கப்பட்டன" : "Farm details verified") : (locale === "ta" ? "சரிபார்ப்பு நிலுவையில் உள்ளது" : "Farm verification pending")}</b><small>{locale === "ta" ? "சரிபார்க்கப்பட்ட பண்ணை விவரங்கள் மட்டுமே இந்தக் குறியீட்டைக் காட்டும்." : "This badge confirms the platform reviewed the submitted farm details; it is not a quality guarantee."}</small></span></div>
          <div className="trust-stats"><div><b>{selectedListing.farmerTrust.averageRating === null ? "—" : `${selectedListing.farmerTrust.averageRating} / 5`}</b><span>{locale === "ta" ? "வெளியிடப்பட்ட மதிப்பீடு" : `Published rating · ${selectedListing.farmerTrust.reviewCount} reviews`}</span></div><div><b>{selectedListing.farmerTrust.completedOrders}</b><span>{locale === "ta" ? "நிறைவு செய்யப்பட்ட ஆர்டர்கள்" : "Completed orders"}</span></div></div>
          <div className="trust-farm"><span>{locale === "ta" ? "பண்ணை" : "Farm"}</span><b>{selectedListing.farmerTrust.farmName ?? (locale === "ta" ? "சரிபார்க்கப்படவில்லை" : "Not verified")}</b><span>{locale === "ta" ? "மாவட்டம் / இருப்பிடம்" : "District / location"}</span><b>{selectedListing.farmerTrust.district ?? selectedListing.place}</b></div>
          <div className="card-actions trust-actions"><button className="message-action" onClick={() => { setModal("message"); }}>{locale === "ta" ? "விவசாயியைத் தொடர்புகொள்" : "Contact farmer"}<MessageCircle size={15} /></button>{role === "BUYER" && <button className="message-action" onClick={openFarmerReport}><Flag size={14} />{locale === "ta" ? "விவசாயியைப் புகாரளி" : "Report farmer"}</button>}</div>
          <button className="primary-button full-button" onClick={() => { setQuery(selectedListing.farmer); setModal(null); }}>{locale === "ta" ? "விவசாயியின் விளைபொருட்களைக் காண்க" : "View farmer products"}<ArrowRight size={16} /></button></>}
      </section></div>}
      <nav className="mobile-nav" aria-label={t.primaryNavigation}>{navItems.slice(0, role === "ADMIN" ? 6 : 4).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "mobile-nav-active" : ""} onClick={() => chooseView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    </div>
  );
}
