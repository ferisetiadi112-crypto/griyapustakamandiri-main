import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { getAdminSession } from "@/lib/admin-auth";

export type CatalogBook = {
  id: number;
  title: string;
  author: string;
  authors: { name: string; doi: string }[];
  category: string;
  synopsis: string;
  isbn: string;
  status: "published" | "upcoming";
  coverUrl: string;
  backCoverUrl: string;
  price: string;
  format: string;
  orderInfo: string;
  createdAt: string;
};

function database() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL belum diatur di Environment Variables Vercel.");
  return neon(url);
}

async function ensureTable() {
  const sql = database();
  await sql`CREATE TABLE IF NOT EXISTS gpm_catalog_books (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    authors TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL DEFAULT 'Umum',
    synopsis TEXT NOT NULL DEFAULT '',
    isbn TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('published','upcoming')),
    cover_url TEXT NOT NULL DEFAULT '',
    back_cover_url TEXT NOT NULL DEFAULT '',
    price TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'Cetak',
    order_info TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE gpm_catalog_books ADD COLUMN IF NOT EXISTS back_cover_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE gpm_catalog_books ADD COLUMN IF NOT EXISTS authors TEXT NOT NULL DEFAULT '[]'`;
  await sql`ALTER TABLE gpm_catalog_books ADD COLUMN IF NOT EXISTS qrcbn TEXT NOT NULL DEFAULT ''`;
  return sql;
}

function mapBook(row: Record<string, unknown>): CatalogBook {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    author: String(row.author ?? ""),
    authors: (() => { try { const parsed = JSON.parse(String(row.authors ?? "[]")); return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string").map((item) => ({ name: String(item.name), doi: String(item.doi ?? "") })) : []; } catch { return []; } })(),
    category: String(row.category ?? "Umum"),
    synopsis: String(row.synopsis ?? ""),
    isbn: String(row.isbn ?? ""),
    status: row.status === "published" ? "published" : "upcoming",
    coverUrl: String(row.cover_url ?? ""),
    backCoverUrl: String(row.back_cover_url ?? ""),
    price: String(row.price ?? ""),
    format: String(row.format ?? "Cetak"),
    orderInfo: String(row.order_info ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export const getCatalogBooks = createServerFn({ method: "GET" as const }).handler(async () => {
  try {
    const sql = await ensureTable();
    // Include saved cover data so the public catalog can render uploaded covers.
    // Uploaded covers are resized/compressed in the admin form before being saved.
    const rows = await sql`SELECT id, title, author, category, synopsis, isbn, qrcbn, authors, status, cover_url, back_cover_url, price, format, order_info, created_at FROM gpm_catalog_books ORDER BY created_at DESC, id DESC`;
    return { success: true as const, books: rows.map((row) => mapBook(row as Record<string, unknown>)) };
  } catch (error) {
    console.error("getCatalogBooks failed", error);
    return { success: false as const, books: [] as CatalogBook[], error: error instanceof Error ? error.message : "Gagal memuat katalog." };
  }
});

export const getAdminCatalogBooks = createServerFn({ method: "GET" as const }).handler(async () => {
  const session = await getAdminSession();
  if (!session.authenticated) {
    return { success: false as const, books: [] as CatalogBook[], error: "Silakan masuk sebagai admin untuk melihat data katalog." };
  }
  try {
    const sql = await ensureTable();
    // Admin needs the original cover data to preview/edit existing uploads.
    // Public catalog uses getCatalogBooks(), which includes covers for public display.
    const rows = await sql`SELECT id, title, author, category, synopsis, isbn, status, cover_url, back_cover_url, price, format, order_info, created_at FROM gpm_catalog_books ORDER BY created_at DESC, id DESC`;
    return { success: true as const, books: rows.map((row) => mapBook(row as Record<string, unknown>)) };
  } catch (error) {
    console.error("getAdminCatalogBooks failed", error);
    return { success: false as const, books: [] as CatalogBook[], error: error instanceof Error ? error.message : "Gagal memuat katalog admin." };
  }
});

export const saveCatalogBook = createServerFn({ method: "POST" as const })
  .validator((input: Omit<CatalogBook, "id" | "createdAt"> & { id?: number }) => input)
  .handler(async ({ data }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { success: false as const, error: "Sesi admin berakhir. Silakan masuk kembali." };
    if (!data.title.trim() || !data.author.trim()) return { success: false as const, error: "Judul dan penulis wajib diisi." };
    try {
      const sql = await ensureTable();
      if (data.id) {
        await sql`UPDATE gpm_catalog_books SET title=${data.title.trim()}, author=${data.author.trim()}, authors=${JSON.stringify(data.authors ?? [])}, category=${data.category.trim() || "Umum"}, synopsis=${data.synopsis.trim()}, isbn=${data.isbn.trim()}, qrcbn=${data.qrcbn.trim()}, authors=${JSON.stringify(data.authors ?? [])}, status=${data.status}, cover_url=${data.coverUrl.trim()}, back_cover_url=${data.backCoverUrl.trim()}, price=${data.price.trim()}, format=${data.format.trim() || "Cetak"}, order_info=${data.orderInfo.trim()} WHERE id=${data.id}`;
      } else {
        await sql`INSERT INTO gpm_catalog_books (title, author, category, synopsis, isbn, qrcbn, authors, status, cover_url, back_cover_url, price, format, order_info) VALUES (${data.title.trim()}, ${data.author.trim()}, ${data.category.trim() || "Umum"}, ${data.synopsis.trim()}, ${data.isbn.trim()}, ${data.qrcbn.trim()}, ${JSON.stringify(data.authors ?? [])}, ${data.status}, ${data.coverUrl.trim()}, ${data.backCoverUrl.trim()}, ${data.price.trim()}, ${data.format.trim() || "Cetak"}, ${data.orderInfo.trim()})`;
      }
      return { success: true as const };
    } catch (error) {
      console.error("saveCatalogBook failed", error);
      return { success: false as const, error: error instanceof Error ? error.message : "Buku gagal disimpan." };
    }
  });

export const deleteCatalogBook = createServerFn({ method: "POST" as const })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { success: false as const, error: "Sesi admin berakhir. Silakan masuk kembali." };
    try {
      const sql = await ensureTable();
      await sql`DELETE FROM gpm_catalog_books WHERE id=${data.id}`;
      return { success: true as const };
    } catch (error) {
      console.error("deleteCatalogBook failed", error);
      return { success: false as const, error: error instanceof Error ? error.message : "Buku gagal dihapus." };
    }
  });
