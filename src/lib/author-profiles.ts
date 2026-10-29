import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { getAdminSession } from "@/lib/admin-auth";
import { getUserSession } from "@/lib/publishing-platform";

export type AuthorProfile = {
  id: number; name: string; photo_data: string; expertise: string; bio: string;
  active: boolean; sort_order: number; created_at: string; updated_at: string;
};

function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return neon(url);
}
async function ensureAuthorsTable() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS gpm_author_profiles (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, photo_data TEXT NOT NULL DEFAULT '',
    expertise TEXT NOT NULL, bio TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}
async function requireAuthorAdmin() {
  const admin = await getAdminSession();
  if (admin.authenticated) return;
  const session = await getUserSession();
  if (session.success && session.user?.roles.some((role) => role === "admin" || role === "editor")) return;
  throw new Error("Akses ditolak. Masuk sebagai admin atau editor terlebih dahulu.");
}
export const getPublicAuthorProfiles = createServerFn({ method: "GET" as const }).handler(async () => {
  try {
    const sql = await ensureAuthorsTable();
    const rows = await sql`SELECT id,name,photo_data,expertise,bio,active,sort_order,created_at,updated_at FROM gpm_author_profiles WHERE active=TRUE ORDER BY sort_order ASC, name ASC`;
    return { success: true as const, authors: rows as unknown as AuthorProfile[] };
  } catch {
    return { success: false as const, authors: [] as AuthorProfile[] };
  }
});
export const getAdminAuthorProfiles = createServerFn({ method: "GET" as const }).handler(async () => {
  await requireAuthorAdmin();
  const sql = await ensureAuthorsTable();
  const rows = await sql`SELECT id,name,photo_data,expertise,bio,active,sort_order,created_at,updated_at FROM gpm_author_profiles ORDER BY sort_order ASC, name ASC`;
  return { success: true as const, authors: rows as unknown as AuthorProfile[] };
});
export const saveAuthorProfile = createServerFn({ method: "POST" as const })
  .validator((input: { id?: number; name: string; photoData: string; expertise: string; bio: string; active: boolean; sortOrder: number }) => input)
  .handler(async ({ data }) => {
    await requireAuthorAdmin();
    const name = data.name.trim(), expertise = data.expertise.trim(), bio = data.bio.trim();
    if (name.length < 2 || name.length > 120) return { success: false as const, error: "Nama harus 2–120 karakter." };
    if (expertise.length < 3 || expertise.length > 180) return { success: false as const, error: "Bidang keahlian harus 3–180 karakter." };
    if (bio.length < 10 || bio.length > 360) return { success: false as const, error: "Latar belakang harus 10–360 karakter." };
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data.photoData) || data.photoData.length > 550_000) return { success: false as const, error: "Unggah foto JPG, PNG, atau WebP maksimal 400 KB." };
    const sortOrder = Number.isFinite(data.sortOrder) ? Math.max(0, Math.min(9999, Math.floor(data.sortOrder))) : 0;
    const sql = await ensureAuthorsTable();
    if (data.id) {
      const rows = await sql`UPDATE gpm_author_profiles SET name=${name},photo_data=${data.photoData},expertise=${expertise},bio=${bio},active=${Boolean(data.active)},sort_order=${sortOrder},updated_at=NOW() WHERE id=${data.id} RETURNING id`;
      if (!rows.length) return { success: false as const, error: "Profil penulis tidak ditemukan." };
    } else {
      await sql`INSERT INTO gpm_author_profiles (name,photo_data,expertise,bio,active,sort_order) VALUES (${name},${data.photoData},${expertise},${bio},${Boolean(data.active)},${sortOrder})`;
    }
    return { success: true as const };
  });
export const deleteAuthorProfile = createServerFn({ method: "POST" as const })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    await requireAuthorAdmin();
    if (!Number.isInteger(data.id) || data.id < 1) return { success: false as const, error: "ID penulis tidak valid." };
    const sql = await ensureAuthorsTable();
    const rows = await sql`DELETE FROM gpm_author_profiles WHERE id=${data.id} RETURNING id`;
    return rows.length ? { success: true as const } : { success: false as const, error: "Profil penulis tidak ditemukan." };
  });
