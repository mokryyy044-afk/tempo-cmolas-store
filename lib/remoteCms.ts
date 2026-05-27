import {
  type AdminUser,
  type Product,
  type ProductCategory,
  type SiteContent,
  type StoreOrder
} from "@/lib/products";

export type RemoteCmsData = {
  products?: unknown;
  categories?: unknown;
  siteContent?: Partial<SiteContent>;
  orders?: unknown;
  users?: unknown;
};

export type RemoteCmsKey = "products" | "categories" | "siteContent" | "orders" | "users";

async function cmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Nie udało się połączyć z Supabase.");
  }
  return payload as T;
}

export async function loadRemoteCmsData() {
  return cmsFetch<RemoteCmsData & { remote: boolean }>("/api/cms");
}

export async function saveRemoteDocument(key: Exclude<RemoteCmsKey, "orders">, data: unknown) {
  await cmsFetch("/api/cms", {
    method: "PUT",
    body: JSON.stringify({ key, data })
  });
}

export async function saveRemoteProducts(products: Product[]) {
  await saveRemoteDocument("products", products);
}

export async function saveRemoteCategories(categories: ProductCategory[]) {
  await saveRemoteDocument("categories", categories);
}

export async function saveRemoteSiteContent(siteContent: SiteContent) {
  await saveRemoteDocument("siteContent", siteContent);
}

export async function saveRemoteUsers(users: AdminUser[]) {
  await saveRemoteDocument("users", users);
}

export async function saveRemoteOrders(orders: StoreOrder[]) {
  await cmsFetch("/api/cms", {
    method: "PUT",
    body: JSON.stringify({ key: "orders", data: orders })
  });
}

export async function addRemoteOrder(order: StoreOrder) {
  await cmsFetch("/api/cms", {
    method: "POST",
    body: JSON.stringify({ order })
  });
}

export async function uploadRemoteImage(dataUrl: string) {
  const payload = await cmsFetch<{ url: string; configured?: boolean }>("/api/cms/upload", {
    method: "POST",
    body: JSON.stringify({ dataUrl })
  });
  return payload.url;
}
