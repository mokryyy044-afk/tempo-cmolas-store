import { NextRequest, NextResponse } from "next/server";

const siteId = process.env.SUPABASE_SITE_ID || "tempo-cmolas";
const bucket = "cms";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/$/, ""), serviceKey };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Nieprawidłowy format zdjęcia.");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export async function POST(request: NextRequest) {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: "Brak konfiguracji Supabase Storage." }, { status: 503 });
    }

    const body = await request.json();
    const { mimeType, buffer } = parseDataUrl(String(body.dataUrl ?? ""));
    const extension = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : "webp";
    const path = `${siteId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const uploadUrl = `${config.url}/storage/v1/object/${bucket}/${path}`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: buffer
    });

    if (!response.ok) {
      const message = await response.text();
      if (message.toLowerCase().includes("bucket not found")) {
        throw new Error(`Bucket Storage "cms" nie został znaleziony w projekcie ${new URL(config.url).host}. Sprawdź NEXT_PUBLIC_SUPABASE_URL i czy bucket nazywa się dokładnie cms.`);
      }
      throw new Error(message || `Nie udało się zapisać zdjęcia w bucket "${bucket}".`);
    }

    return NextResponse.json({
      url: `${config.url}/storage/v1/object/public/${bucket}/${path}`,
      bucket
    }, { headers: corsHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Błąd uploadu zdjęcia.", bucket }, { status: 500, headers: corsHeaders() });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function GET() {
  const config = getSupabaseConfig();
  return NextResponse.json({
    configured: Boolean(config),
    bucket,
    projectHost: config ? new URL(config.url).host : ""
  }, { headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
