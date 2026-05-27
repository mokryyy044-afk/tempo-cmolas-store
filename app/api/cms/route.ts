import { NextRequest, NextResponse } from "next/server";

const DOCUMENT_KEYS = new Set(["products", "categories", "siteContent", "users"]);
const siteId = process.env.SUPABASE_SITE_ID || "tempo-cmolas";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/$/, ""), serviceKey };
}

function supabaseHeaders(serviceKey: string, prefer?: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Brak konfiguracji Supabase. Ustaw NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.");
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      ...supabaseHeaders(config.serviceKey, init.headers && "Prefer" in init.headers ? String((init.headers as Record<string, string>).Prefer) : undefined),
      ...init.headers
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Błąd Supabase.");
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function readDocuments() {
  const rows = await supabaseRequest(`/rest/v1/tempo_cms_documents?site_id=eq.${encodeURIComponent(siteId)}&select=key,data`) as Array<{ key: string; data: unknown }> | null;
  return Object.fromEntries((rows ?? []).map((row) => [row.key, row.data]));
}

async function readOrders() {
  const rows = await supabaseRequest(`/rest/v1/tempo_orders?site_id=eq.${encodeURIComponent(siteId)}&select=id,data,status,total,created_at&order=created_at.desc`) as Array<{ data: unknown }> | null;
  return (rows ?? []).map((row) => row.data);
}

async function upsertDocument(key: string, data: unknown) {
  await supabaseRequest("/rest/v1/tempo_cms_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      site_id: siteId,
      key,
      data,
      updated_at: new Date().toISOString()
    })
  });
}

async function replaceOrders(orders: Array<Record<string, unknown>>) {
  await supabaseRequest(`/rest/v1/tempo_orders?site_id=eq.${encodeURIComponent(siteId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  if (orders.length === 0) return;
  await supabaseRequest("/rest/v1/tempo_orders", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(orders.map((order) => ({
      site_id: siteId,
      id: String(order.id ?? crypto.randomUUID()),
      status: String(order.status ?? "nowe"),
      total: Number(order.total ?? 0),
      created_at: String(order.createdAt ?? new Date().toISOString()),
      data: order
    })))
  });
}

async function upsertOrders(orders: Array<Record<string, unknown>>) {
  if (orders.length === 0) return;
  await supabaseRequest("/rest/v1/tempo_orders", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(orders.map((order) => ({
      site_id: siteId,
      id: String(order.id ?? crypto.randomUUID()),
      status: String(order.status ?? "nowe"),
      total: Number(order.total ?? 0),
      created_at: String(order.createdAt ?? new Date().toISOString()),
      data: order
    })))
  });
}

export async function GET() {
  try {
    const documents = await readDocuments();
    const orders = await readOrders();
    return NextResponse.json({ ...documents, orders, remote: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Błąd odczytu CMS." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    if (key === "orders") {
      await replaceOrders(Array.isArray(body.data) ? body.data : []);
      return NextResponse.json({ ok: true });
    }
    if (!DOCUMENT_KEYS.has(key)) {
      return NextResponse.json({ error: "Nieznany klucz CMS." }, { status: 400 });
    }
    await upsertDocument(key, body.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Błąd zapisu CMS." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.order) {
      await upsertOrders([body.order]);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Brak danych do zapisu." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Błąd zapisu zamówienia." }, { status: 500 });
  }
}
