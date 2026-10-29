import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "gpm_user_session";
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_MANUSCRIPT_BYTES = 2_500_000;
type Role = "buyer" | "author" | "editor" | "finance" | "admin" | "leadership";
type UserRow = { id: string; name: string; email: string; password_hash: string; roles: string; email_verified: boolean; active: boolean; created_at: string };
type SessionUser = { id: string; name: string; email: string; roles: Role[]; emailVerified: boolean };

function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return neon(url);
}

export async function ensurePlatformTables() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS gpm_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    roles TEXT NOT NULL DEFAULT '["buyer","author"]',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_email_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES gpm_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_author_submissions (
    id BIGSERIAL PRIMARY KEY,
    reference_code TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES gpm_users(id),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Umum',
    synopsis TEXT NOT NULL DEFAULT '',
    target_reader TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    format_preference TEXT NOT NULL DEFAULT 'Cetak dan digital',
    manuscript_filename TEXT NOT NULL,
    manuscript_mime TEXT NOT NULL,
    manuscript_data TEXT NOT NULL,
    declaration_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'submitted',
    editor_recommendation TEXT NOT NULL DEFAULT '',
    editorial_notes TEXT NOT NULL DEFAULT '',
    final_decision TEXT NOT NULL DEFAULT '',
    assigned_editor UUID REFERENCES gpm_users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_submission_events (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES gpm_author_submissions(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES gpm_users(id),
    old_status TEXT NOT NULL DEFAULT '',
    new_status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_publishing_contracts (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL UNIQUE REFERENCES gpm_author_submissions(id),
    user_id UUID NOT NULL REFERENCES gpm_users(id),
    contract_reference TEXT NOT NULL UNIQUE,
    royalty_percent NUMERIC(5,2) NOT NULL,
    net_revenue_definition TEXT NOT NULL,
    terms_summary TEXT NOT NULL DEFAULT '',
    document_filename TEXT NOT NULL DEFAULT '',
    document_data TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES gpm_users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL DEFAULT '',
    shipping_address TEXT NOT NULL DEFAULT '',
    shipping_city TEXT NOT NULL DEFAULT '',
    shipping_postal_code TEXT NOT NULL DEFAULT '',
    shipping_method TEXT NOT NULL DEFAULT '',
    shipping_cost BIGINT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL,
    total BIGINT NOT NULL,
    payment_provider TEXT NOT NULL DEFAULT '',
    payment_reference TEXT NOT NULL DEFAULT '',
    payment_status TEXT NOT NULL DEFAULT 'gateway_not_configured',
    order_status TEXT NOT NULL DEFAULT 'pending_payment',
    stock_released BOOLEAN NOT NULL DEFAULT FALSE,
    tracking_number TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE gpm_orders ADD COLUMN IF NOT EXISTS stock_released BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES gpm_orders(id) ON DELETE CASCADE,
    book_id BIGINT NOT NULL,
    title_snapshot TEXT NOT NULL,
    format_snapshot TEXT NOT NULL,
    unit_price BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    line_total BIGINT NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_royalty_periods (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES gpm_users(id),
    book_id BIGINT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    units_sold INTEGER NOT NULL DEFAULT 0,
    gross_revenue BIGINT NOT NULL DEFAULT 0,
    net_revenue BIGINT NOT NULL DEFAULT 0,
    royalty_percent NUMERIC(5,2) NOT NULL,
    royalty_amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    paid_at TIMESTAMPTZ,
    payment_reference TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, book_id, period_start, period_end)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gpm_audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES gpm_users(id),
    actor_label TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
function sessionSecret() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  return secret;
}
function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function userFromRow(row: UserRow): SessionUser {
  let roles: Role[] = ["buyer", "author"];
  try {
    const parsed = JSON.parse(row.roles);
    if (Array.isArray(parsed)) roles = parsed.filter((role): role is Role => ["buyer","author","editor","finance","admin","leadership"].includes(role));
  } catch { /* keep safe defaults */ }
  return { id: row.id, name: row.name, email: row.email, roles, emailVerified: row.email_verified };
}
async function currentUser(): Promise<SessionUser | null> {
  const value = getCookie(SESSION_COOKIE);
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresText, signature] = parts;
  const expiresAt = Number(expiresText);
  if (!userId || !expiresText || !signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  const payload = `${userId}.${expiresText}`;
  if (!safeEqual(signature, sign(payload))) return null;
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT id, name, email, password_hash, roles, email_verified, active, created_at FROM gpm_users WHERE id=${userId} AND active=TRUE LIMIT 1`;
  if (!rows.length) return null;
  return userFromRow(rows[0] as unknown as UserRow);
}
function requireRole(user: SessionUser | null, roles: Role[]) {
  if (!user || !roles.some((role) => user.roles.includes(role))) throw new Error("Akses ditolak. Silakan masuk dengan akun yang memiliki izin.");
}
function parseBookPrice(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}
function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export const registerUser = createServerFn({ method: "POST" as const })
  .validator((input: { name: string; email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 120) return { success: false as const, error: "Nama harus 2–120 karakter." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { success: false as const, error: "Format email tidak valid." };
    if (data.password.length < 10 || data.password.length > 128) return { success: false as const, error: "Kata sandi harus 10–128 karakter." };
    const sql = await ensurePlatformTables();
    const existing = await sql`SELECT id FROM gpm_users WHERE email=${email} LIMIT 1`;
    if (existing.length) return { success: false as const, error: "Email sudah terdaftar. Silakan masuk atau gunakan pemulihan akun." };
    const hashed = passwordHash(data.password);
    const created = await sql`INSERT INTO gpm_users (name,email,password_hash,roles,email_verified) VALUES (${name},${email},${hashed},'["buyer","author"]',FALSE) RETURNING id,name,email,roles,email_verified,active,created_at`;
    const user = created[0] as unknown as UserRow;
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHmac("sha256", sessionSecret()).update(token).digest("hex");
    await sql`INSERT INTO gpm_email_verifications (user_id,token_hash,expires_at) VALUES (${user.id},${tokenHash},NOW() + INTERVAL '24 hours')`;
    let verificationEmailSent = false;
    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["RESEND_FROM_EMAIL"];
    const siteUrl = process.env["PUBLIC_SITE_URL"];
    if (apiKey && from && siteUrl) {
      const verificationUrl = new URL("/verifikasi-email", siteUrl);
      verificationUrl.searchParams.set("token", token);
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [email], subject: "Verifikasi akun Griya Pustaka Mandiri", html: `<p>Halo ${name.replace(/[&<>"]/g, "")},</p><p>Verifikasi email Anda untuk mengaktifkan pengajuan naskah.</p><p><a href="${verificationUrl.toString()}">Verifikasi email</a></p><p>Tautan berlaku 24 jam.</p>` }),
        });
        verificationEmailSent = response.ok;
      } catch { verificationEmailSent = false; }
    }
    return { success: true as const, verificationEmailSent, message: verificationEmailSent ? "Akun dibuat. Silakan buka email untuk verifikasi." : "Akun dibuat, tetapi email verifikasi belum dapat dikirim. Pengajuan naskah akan tersedia setelah email terverifikasi dan layanan email dikonfigurasi." };
  });

export const verifyUserEmail = createServerFn({ method: "POST" as const })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{64}$/i.test(data.token)) return { success: false as const, error: "Tautan verifikasi tidak valid." };
    const sql = await ensurePlatformTables();
    const tokenHash = createHmac("sha256", sessionSecret()).update(data.token).digest("hex");
    const matches = await sql`SELECT id,user_id FROM gpm_email_verifications WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at>NOW() LIMIT 1`;
    if (!matches.length) return { success: false as const, error: "Tautan verifikasi kedaluwarsa atau sudah digunakan." };
    const item = matches[0] as { id: number; user_id: string };
    await sql`UPDATE gpm_users SET email_verified=TRUE, updated_at=NOW() WHERE id=${item.user_id}`;
    await sql`UPDATE gpm_email_verifications SET used_at=NOW() WHERE id=${item.id}`;
    return { success: true as const };
  });

export const loginUser = createServerFn({ method: "POST" as const })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const sql = await ensurePlatformTables();
    const rows = await sql`SELECT id,name,email,password_hash,roles,email_verified,active,created_at FROM gpm_users WHERE email=${email} LIMIT 1`;
    if (!rows.length) return { success: false as const, error: "Email atau kata sandi tidak sesuai." };
    const row = rows[0] as unknown as UserRow;
    if (!row.active || !verifyPassword(data.password, row.password_hash)) return { success: false as const, error: "Email atau kata sandi tidak sesuai." };
    const expiresAt = Date.now() + SESSION_SECONDS * 1000;
    const payload = `${row.id}.${expiresAt}`;
    setCookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env["NODE_ENV"] === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
    return { success: true as const, user: userFromRow(row), message: row.email_verified ? "Berhasil masuk." : "Berhasil masuk. Verifikasi email diperlukan sebelum mengajukan naskah." };
  });

export const logoutUser = createServerFn({ method: "POST" as const }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { success: true as const };
});

export const getUserSession = createServerFn({ method: "GET" as const }).handler(async () => {
  try { return { success: true as const, user: await currentUser() }; }
  catch { return { success: false as const, user: null, error: "Sesi belum dapat diperiksa." }; }
});

export const getMySubmissions = createServerFn({ method: "GET" as const }).handler(async () => {
  const user = await currentUser();
  requireRole(user, ["author"]);
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT id,reference_code,title,category,status,editorial_notes,final_decision,submitted_at,updated_at FROM gpm_author_submissions WHERE user_id=${user!.id} ORDER BY submitted_at DESC`;
  return { success: true as const, submissions: rows };
});

export const submitManuscript = createServerFn({ method: "POST" as const })
  .validator((input: { title: string; subtitle?: string; category: string; synopsis: string; targetReader: string; wordCount: number; formatPreference: string; filename: string; mime: string; fileData: string; declarationAccepted: boolean }) => input)
  .handler(async ({ data }) => {
    const user = await currentUser();
    requireRole(user, ["author"]);
    if (!user!.emailVerified) return { success: false as const, error: "Verifikasi email terlebih dahulu sebelum mengajukan naskah." };
    const title = data.title.trim();
    if (title.length < 3 || title.length > 250) return { success: false as const, error: "Judul harus 3–250 karakter." };
    if (!data.declarationAccepted) return { success: false as const, error: "Pernyataan orisinalitas dan hak penggunaan materi wajib disetujui." };
    if (!["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword","application/vnd.oasis.opendocument.text"].includes(data.mime)) return { success: false as const, error: "Format naskah harus PDF, DOC, DOCX, atau ODT." };
    if (!/^[^/\\]+\.(pdf|doc|docx|odt)$/i.test(data.filename) || data.filename.length > 180) return { success: false as const, error: "Nama file tidak valid." };
    if (!data.fileData.startsWith("data:") || data.fileData.length > Math.ceil(MAX_MANUSCRIPT_BYTES * 4 / 3) + 500) return { success: false as const, error: "Ukuran naskah maksimal 2,5 MB untuk tahap awal." };
    const sql = await ensurePlatformTables();
    const code = reference("GPM-NASKAH");
    const rows = await sql`INSERT INTO gpm_author_submissions (reference_code,user_id,title,subtitle,category,synopsis,target_reader,word_count,format_preference,manuscript_filename,manuscript_mime,manuscript_data,declaration_accepted,status) VALUES (${code},${user!.id},${title},${(data.subtitle ?? "").trim()},${data.category.trim() || "Umum"},${data.synopsis.trim()},${data.targetReader.trim()},${Math.max(0,Math.floor(data.wordCount || 0))},${data.formatPreference},${data.filename},${data.mime},${data.fileData},TRUE,'submitted') RETURNING id`;
    await sql`INSERT INTO gpm_submission_events (submission_id,actor_user_id,old_status,new_status,note) VALUES (${rows[0].id},${user!.id},'','submitted','Naskah diajukan oleh penulis')`;
    await sql`INSERT INTO gpm_audit_log (actor_user_id,actor_label,action,entity_type,entity_id,details) VALUES (${user!.id},${user!.email},'submission.created','submission',${String(rows[0].id)},${code})`;
    return { success: true as const, referenceCode: code };
  });

export const listSubmissionsForStaff = createServerFn({ method: "GET" as const }).handler(async () => {
  const user = await currentUser();
  const adminSession = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
  if (!adminSession.authenticated) requireRole(user, ["editor","admin","leadership"]);
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT s.id,s.reference_code,s.title,s.category,s.status,s.editorial_notes,s.editor_recommendation,s.final_decision,s.submitted_at,u.name AS author_name,u.email AS author_email FROM gpm_author_submissions s JOIN gpm_users u ON u.id=s.user_id ORDER BY s.submitted_at DESC`;
  return { success: true as const, submissions: rows };
});

export const downloadManuscript = createServerFn({ method: "POST" as const })
  .validator((input: { submissionId: number }) => input)
  .handler(async ({ data }) => {
    const user = await currentUser();
    const adminSession = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
    if (!adminSession.authenticated) requireRole(user, ["editor","admin","leadership"]);
    const sql = await ensurePlatformTables();
    const rows = await sql`SELECT id,reference_code,manuscript_filename,manuscript_mime,manuscript_data FROM gpm_author_submissions WHERE id=${data.submissionId} LIMIT 1`;
    if (!rows.length) return { success: false as const, error: "Naskah tidak ditemukan." };
    const row = rows[0] as { reference_code: string; manuscript_filename: string; manuscript_mime: string; manuscript_data: string };
    return { success: true as const, referenceCode: row.reference_code, filename: row.manuscript_filename, mime: row.manuscript_mime, fileData: row.manuscript_data };
  });

export const reviewSubmission = createServerFn({ method: "POST" as const })
  .validator((input: { submissionId: number; status: string; recommendation: string; notes: string; finalDecision?: string }) => input)
  .handler(async ({ data }) => {
    const user = await currentUser();
    requireRole(user, ["editor","admin","leadership"]);
    const allowed = ["administrative_review","editorial_review","revision_requested","recommended_for_negotiation","rejected","contracted","in_production","published"];
    if (!allowed.includes(data.status)) return { success: false as const, error: "Status pengajuan tidak valid." };
    const canMakeFinalDecision = adminSession.authenticated || Boolean(user?.roles.some((role) => role === "admin" || role === "leadership"));
    if ((data.status === "rejected" || data.status === "contracted") && !canMakeFinalDecision) return { success: false as const, error: "Keputusan akhir hanya dapat dilakukan admin atau pimpinan." };
    const sql = await ensurePlatformTables();
    const existing = await sql`SELECT status,reference_code FROM gpm_author_submissions WHERE id=${data.submissionId} LIMIT 1`;
    if (!existing.length) return { success: false as const, error: "Pengajuan tidak ditemukan." };
    await sql`UPDATE gpm_author_submissions SET status=${data.status},editor_recommendation=${data.recommendation.trim()},editorial_notes=${data.notes.trim()},final_decision=${(data.finalDecision ?? "").trim()},updated_at=NOW() WHERE id=${data.submissionId}`;
    await sql`INSERT INTO gpm_submission_events (submission_id,actor_user_id,old_status,new_status,note) VALUES (${data.submissionId},${user?.id ?? null},${String((existing[0] as {status:string}).status)},${data.status},${data.notes.trim()})`;
    await sql`INSERT INTO gpm_audit_log (actor_user_id,actor_label,action,entity_type,entity_id,details) VALUES (${user?.id ?? null},${user?.email ?? adminSession.username ?? "admin"},'submission.status_changed','submission',${String(data.submissionId)},${data.status})`;
    return { success: true as const };
  });

export const createCheckoutOrder = createServerFn({ method: "POST" as const })
  .validator((input: { customerName: string; email: string; phone: string; address: string; city: string; postalCode: string; shippingMethod: string; items: { bookId: number; quantity: number }[] }) => input)
  .handler(async ({ data }) => {
    if (!data.customerName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) return { success: false as const, error: "Nama dan email pembeli wajib valid." };
    if (!data.address.trim() || !data.city.trim()) return { success: false as const, error: "Alamat dan kota pengiriman wajib diisi." };
    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 20) return { success: false as const, error: "Keranjang kosong atau terlalu banyak jenis buku." };
    const sql = await ensurePlatformTables();
    const orderItems: { bookId: number; title: string; format: string; unitPrice: number; quantity: number; lineTotal: number }[] = [];
    for (const item of data.items) {
      const quantity = Math.max(1, Math.min(20, Math.floor(item.quantity)));
      const books = await sql`SELECT id,title,format,price,status,stock_quantity FROM gpm_catalog_books WHERE id=${item.bookId} AND status='published' LIMIT 1`;
      if (!books.length) return { success: false as const, error: "Salah satu buku tidak ditemukan atau belum tersedia untuk dibeli." };
      const book = books[0] as { id: number; title: string; format: string; price: string; status: string; stock_quantity: number };
      const unitPrice = parseBookPrice(book.price);
      if (unitPrice <= 0) return { success: false as const, error: `Harga buku "${book.title}" belum ditetapkan.` };
      if (quantity > Number(book.stock_quantity ?? 0)) return { success: false as const, error: `Stok buku "${book.title}" tidak mencukupi.` };
      orderItems.push({ bookId: Number(book.id), title: String(book.title), format: String(book.format), unitPrice, quantity, lineTotal: unitPrice * quantity });
    }
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const user = await currentUser().catch(() => null);
    const orderNumber = reference("GPM-ORD");
    const paymentConfigured = false; // No provider adapter is active until a real gateway is selected and tested.
    const paymentStatus = paymentConfigured ? "pending" : "gateway_not_configured";
    const created = await sql`INSERT INTO gpm_orders (order_number,user_id,customer_name,customer_email,customer_phone,shipping_address,shipping_city,shipping_postal_code,shipping_method,subtotal,total,payment_provider,payment_status,order_status) VALUES (${orderNumber},${user?.id ?? null},${data.customerName.trim()},${data.email.trim().toLowerCase()},${data.phone.trim()},${data.address.trim()},${data.city.trim()},${data.postalCode.trim()},${data.shippingMethod.trim()},${subtotal},${subtotal},${process.env["PAYMENT_GATEWAY_PROVIDER"] ?? ""},${paymentStatus},'pending_payment') RETURNING id`;
    const reservedItems: { bookId: number; quantity: number }[] = [];
    for (const item of orderItems) {
      const reserved = await sql`UPDATE gpm_catalog_books SET stock_quantity=stock_quantity-${item.quantity} WHERE id=${item.bookId} AND stock_quantity >= ${item.quantity} RETURNING id`;
      if (!reserved.length) {
        for (const previous of reservedItems) await sql`UPDATE gpm_catalog_books SET stock_quantity=stock_quantity+${previous.quantity} WHERE id=${previous.bookId}`;
        await sql`UPDATE gpm_orders SET order_status='cancelled',payment_status='failed',admin_note='Stok tidak mencukupi saat reservasi.' WHERE id=${created[0].id}`;
        return { success: false as const, error: "Stok berubah saat checkout. Periksa keranjang dan coba kembali." };
      }
      reservedItems.push({ bookId: item.bookId, quantity: item.quantity });
      await sql`INSERT INTO gpm_order_items (order_id,book_id,title_snapshot,format_snapshot,unit_price,quantity,line_total) VALUES (${created[0].id},${item.bookId},${item.title},${item.format},${item.unitPrice},${item.quantity},${item.lineTotal})`;
    }
    await sql`INSERT INTO gpm_audit_log (actor_user_id,actor_label,action,entity_type,entity_id,details) VALUES (${user?.id ?? null},${data.email.trim().toLowerCase()},'order.created','order',${String(created[0].id)},${orderNumber})`;
    return { success: true as const, orderNumber, subtotal, total: subtotal, paymentConfigured, message: paymentConfigured ? "Pesanan tercatat. Gateway harus dikonfigurasi dan diuji sebelum pembayaran diaktifkan." : "Pesanan tercatat, tetapi pembayaran online belum aktif karena konfigurasi payment gateway belum tersedia." };
  });

export const listMyOrders = createServerFn({ method: "GET" as const }).handler(async () => {
  const user = await currentUser();
  requireRole(user, ["buyer","author"]);
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT id,order_number,subtotal,total,payment_status,order_status,created_at FROM gpm_orders WHERE user_id=${user!.id} ORDER BY created_at DESC`;
  return { success: true as const, orders: rows };
});

export const listOrdersForStaff = createServerFn({ method: "GET" as const }).handler(async () => {
  const user = await currentUser();
  const adminSession = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
  if (!adminSession.authenticated) requireRole(user, ["admin","finance","leadership"]);
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT id,order_number,customer_name,customer_email,customer_phone,shipping_address,shipping_city,shipping_postal_code,shipping_method,shipping_cost,subtotal,total,payment_status,order_status,tracking_number,created_at FROM gpm_orders ORDER BY created_at DESC LIMIT 500`;
  return { success: true as const, orders: rows };
});

export const updateOrderForStaff = createServerFn({ method: "POST" as const })
  .validator((input: { orderId: number; orderStatus: string; paymentStatus: string; shippingMethod: string; shippingCost: number; trackingNumber: string; adminNote: string }) => input)
  .handler(async ({ data }) => {
    const user = await currentUser();
    const adminSession = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
    if (!adminSession.authenticated) requireRole(user, ["admin","finance","leadership"]);
    const allowedOrder = ["pending_payment","processing","shipped","completed","cancelled","refunded"];
    const allowedPayment = ["gateway_not_configured","pending","paid","failed","refunded"];
    if (!allowedOrder.includes(data.orderStatus) || !allowedPayment.includes(data.paymentStatus)) return { success: false as const, error: "Status pesanan atau pembayaran tidak valid." };
    if (!Number.isFinite(data.shippingCost) || data.shippingCost < 0 || data.shippingCost > 10000000) return { success: false as const, error: "Biaya pengiriman tidak valid." };
    if (data.paymentStatus === "paid") return { success: false as const, error: "Pembayaran online belum terintegrasi. Status lunas harus berasal dari callback payment gateway yang tervalidasi." };
    const sql = await ensurePlatformTables();
    const existing = await sql`SELECT order_status,stock_released FROM gpm_orders WHERE id=${data.orderId} LIMIT 1`;
    if (!existing.length) return { success: false as const, error: "Pesanan tidak ditemukan." };
    const previous = existing[0] as { order_status: string; stock_released: boolean };
    if (["cancelled","refunded"].includes(data.orderStatus) && !previous.stock_released) {
      const items = await sql`SELECT book_id,quantity FROM gpm_order_items WHERE order_id=${data.orderId}`;
      for (const item of items as { book_id: number; quantity: number }[]) await sql`UPDATE gpm_catalog_books SET stock_quantity=stock_quantity+${item.quantity} WHERE id=${item.book_id}`;
      await sql`UPDATE gpm_orders SET stock_released=TRUE WHERE id=${data.orderId}`;
    }
    await sql`UPDATE gpm_orders SET order_status=${data.orderStatus},payment_status=${data.paymentStatus},shipping_method=${data.shippingMethod.trim()},tracking_number=${data.trackingNumber.trim()},admin_note=${data.adminNote.trim()},updated_at=NOW() WHERE id=${data.orderId}`;
    await sql`INSERT INTO gpm_audit_log (actor_user_id,actor_label,action,entity_type,entity_id,details) VALUES (${user?.id ?? null},${user?.email ?? adminSession.username ?? "admin"},'order.updated','order',${String(data.orderId)},${data.orderStatus + '/' + data.paymentStatus})`;
    return { success: true as const };
  });

export const listUsersForAdmin = createServerFn({ method: "GET" as const }).handler(async () => {
  const admin = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
  if (!admin.authenticated) throw new Error("Akses admin diperlukan.");
  const sql = await ensurePlatformTables();
  const rows = await sql`SELECT id,name,email,roles,email_verified,active,created_at FROM gpm_users ORDER BY created_at DESC LIMIT 500`;
  return { success: true as const, users: rows };
});

export const updateUserForAdmin = createServerFn({ method: "POST" as const })
  .validator((input: { userId: string; emailVerified: boolean; active: boolean; roles: Role[] }) => input)
  .handler(async ({ data }) => {
    const admin = await import("@/lib/admin-auth").then((m) => m.getAdminSession());
    if (!admin.authenticated) return { success: false as const, error: "Akses admin diperlukan." };
    const allowed: Role[] = ["buyer","author","editor","finance","admin","leadership"];
    if (!Array.isArray(data.roles) || data.roles.some((role) => !allowed.includes(role))) return { success: false as const, error: "Peran tidak valid." };
    const sql = await ensurePlatformTables();
    await sql`UPDATE gpm_users SET email_verified=${data.emailVerified},active=${data.active},roles=${JSON.stringify([...new Set(data.roles)])},updated_at=NOW() WHERE id=${data.userId}`;
    await sql`INSERT INTO gpm_audit_log (actor_label,action,entity_type,entity_id,details) VALUES (${admin.username},'user.updated','user',${data.userId},${JSON.stringify({ emailVerified: data.emailVerified, active: data.active, roles: data.roles })})`;
    return { success: true as const };
  });
