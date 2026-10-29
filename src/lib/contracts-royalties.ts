import { createServerFn } from "@tanstack/react-start";
import { ensurePlatformTables, getUserSession } from "@/lib/publishing-platform";
import { getAdminSession } from "@/lib/admin-auth";

export const listContractsForAdmin = createServerFn({ method: "GET" as const }).handler(async () => {
  const admin = await getAdminSession();
  if (!admin.authenticated) throw new Error("Akses admin diperlukan.");
  const sql = await ensurePlatformTables();
  const contracts = await sql`SELECT c.id,c.submission_id,c.user_id,c.book_id,c.contract_reference,c.royalty_percent,c.net_revenue_definition,c.terms_summary,c.document_filename,c.status,c.signed_at,c.created_at,s.title AS book_title,s.reference_code,u.name AS author_name,u.email AS author_email FROM gpm_publishing_contracts c JOIN gpm_author_submissions s ON s.id=c.submission_id JOIN gpm_users u ON u.id=c.user_id ORDER BY c.created_at DESC`;
  const eligible = await sql`SELECT s.id,s.reference_code,s.title,s.user_id,u.name AS author_name FROM gpm_author_submissions s JOIN gpm_users u ON u.id=s.user_id WHERE s.status IN ('recommended_for_negotiation','contracted') AND NOT EXISTS (SELECT 1 FROM gpm_publishing_contracts c WHERE c.submission_id=s.id) ORDER BY s.updated_at DESC`;
  const books = await sql`SELECT id,title FROM gpm_catalog_books ORDER BY title`;
  return { success: true as const, contracts, eligible, books };
});

export const createContractForAdmin = createServerFn({ method: "POST" as const })
  .validator((input: { submissionId: number; royaltyPercent: number; netRevenueDefinition: string; termsSummary: string }) => input)
  .handler(async ({ data }) => {
    const admin = await getAdminSession();
    if (!admin.authenticated) return { success: false as const, error: "Akses admin diperlukan." };
    if (!Number.isFinite(data.royaltyPercent) || data.royaltyPercent < 0 || data.royaltyPercent > 100) return { success: false as const, error: "Persentase royalti harus antara 0 dan 100." };
    if (data.netRevenueDefinition.trim().length < 10) return { success: false as const, error: "Definisi pendapatan bersih harus dijelaskan dalam kontrak." };
    const sql = await ensurePlatformTables();
    const rows = await sql`SELECT id,user_id,status,title FROM gpm_author_submissions WHERE id=${data.submissionId} LIMIT 1`;
    if (!rows.length) return { success: false as const, error: "Pengajuan tidak ditemukan." };
    const submission = rows[0] as { id: number; user_id: string; status: string; title: string };
    if (!["recommended_for_negotiation","contracted"].includes(submission.status)) return { success: false as const, error: "Naskah harus disetujui untuk negosiasi sebelum kontrak dibuat." };
    const ref = "GPM-KONTRAK-" + Date.now().toString(36).toUpperCase();
    try {
      await sql`INSERT INTO gpm_publishing_contracts (submission_id,user_id,contract_reference,royalty_percent,net_revenue_definition,terms_summary,status) VALUES (${data.submissionId},${submission.user_id},${ref},${data.royaltyPercent},${data.netRevenueDefinition.trim()},${data.termsSummary.trim()},'draft')`;
      await sql`INSERT INTO gpm_audit_log (actor_label,action,entity_type,entity_id,details) VALUES (${admin.username},'contract.created','contract',${ref},${submission.title})`;
      return { success: true as const, contractReference: ref };
    } catch { return { success: false as const, error: "Kontrak sudah ada atau gagal dibuat." }; }
  });

export const updateContractForAdmin = createServerFn({ method: "POST" as const })
  .validator((input: { contractId: number; status: string; documentFilename: string; documentData: string; bookId?: number }) => input)
  .handler(async ({ data }) => {
    const admin = await getAdminSession();
    if (!admin.authenticated) return { success: false as const, error: "Akses admin diperlukan." };
    if (!["draft","proposed","signed","terminated"].includes(data.status)) return { success: false as const, error: "Status kontrak tidak valid." };
    if (data.documentData.length > 2_000_000) return { success: false as const, error: "Dokumen kontrak maksimal 1,5 MB untuk tahap awal." };
    const sql = await ensurePlatformTables();
    if (data.bookId && data.bookId > 0) {
      const book = await sql`SELECT id FROM gpm_catalog_books WHERE id=${data.bookId} LIMIT 1`;
      if (!book.length) return { success: false as const, error: "Buku katalog tidak ditemukan." };
    }
    await sql`UPDATE gpm_publishing_contracts SET book_id=CASE WHEN ${data.bookId ?? 0}>0 THEN ${data.bookId ?? 0} ELSE book_id END,status=${data.status},document_filename=CASE WHEN ${data.documentData}<>'' THEN ${data.documentFilename.slice(0,180)} ELSE document_filename END,document_data=CASE WHEN ${data.documentData}<>'' THEN ${data.documentData} ELSE document_data END,signed_at=CASE WHEN ${data.status}='signed' THEN COALESCE(signed_at,NOW()) ELSE signed_at END,updated_at=NOW() WHERE id=${data.contractId}`;
    await sql`INSERT INTO gpm_audit_log (actor_label,action,entity_type,entity_id,details) VALUES (${admin.username},'contract.updated','contract',${String(data.contractId)},${data.status})`;
    return { success: true as const };
  });

async function staffAllowed() {
  const admin = await getAdminSession();
  if (admin.authenticated) return { allowed: true, adminName: admin.username, user: null as null | { id: string; email: string; roles: string[] } };
  const session = await getUserSession();
  const user = session.user;
  const allowed = Boolean(user && user.roles.some((role) => ["finance","admin","leadership"].includes(role)));
  return { allowed, adminName: "", user };
}

export const listRoyaltyForStaff = createServerFn({ method: "GET" as const }).handler(async () => {
  const access = await staffAllowed();
  if (!access.allowed) throw new Error("Akses keuangan atau pimpinan diperlukan.");
  const sql = await ensurePlatformTables();
  const royalties = await sql`SELECT r.id,r.user_id,r.book_id,r.period_start,r.period_end,r.units_sold,r.gross_revenue,r.net_revenue,r.royalty_percent,r.royalty_amount,r.status,r.paid_at,r.payment_reference,u.name AS author_name,b.title AS book_title FROM gpm_royalty_periods r JOIN gpm_users u ON u.id=r.user_id LEFT JOIN gpm_catalog_books b ON b.id=r.book_id ORDER BY r.period_start DESC LIMIT 500`;
  const authors = await sql`SELECT id,name,email FROM gpm_users WHERE active=TRUE AND roles LIKE '%author%' ORDER BY name`;
  const books = await sql`SELECT id,title,author FROM gpm_catalog_books ORDER BY title`;
  const contracts = await sql`SELECT c.id,c.contract_reference,c.user_id,c.book_id,c.royalty_percent,c.net_revenue_definition,b.title AS book_title,u.name AS author_name FROM gpm_publishing_contracts c JOIN gpm_users u ON u.id=c.user_id JOIN gpm_catalog_books b ON b.id=c.book_id WHERE c.status=${"signed"} AND c.book_id IS NOT NULL ORDER BY c.contract_reference`;
  return { success: true as const, royalties, authors, books, contracts };
});

export const saveRoyaltyPeriod = createServerFn({ method: "POST" as const })
  .validator((input: { contractId: number; periodStart: string; periodEnd: string; unitsSold: number; grossRevenue: number; netRevenue: number; status: string; paymentReference: string }) => input)
  .handler(async ({ data }) => {
    const access = await staffAllowed();
    if (!access.allowed) return { success: false as const, error: "Akses keuangan atau pimpinan diperlukan." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(data.periodEnd) || data.periodStart > data.periodEnd) return { success: false as const, error: "Periode tanggal tidak valid." };
    if (![data.unitsSold,data.grossRevenue,data.netRevenue].every(Number.isFinite) || data.unitsSold < 0 || data.grossRevenue < 0 || data.netRevenue < 0 || data.netRevenue > data.grossRevenue) return { success: false as const, error: "Nilai penjualan atau royalti tidak valid." };
    if (!["draft","approved","paid"].includes(data.status)) return { success: false as const, error: "Status royalti tidak valid." };
    const sql = await ensurePlatformTables();
    const contracts = await sql`SELECT id,user_id,book_id,royalty_percent FROM gpm_publishing_contracts WHERE id=${data.contractId} AND status=${"signed"} AND book_id IS NOT NULL LIMIT 1`;
    if (!contracts.length) return { success: false as const, error: "Pilih kontrak yang sudah ditandatangani dan terhubung ke buku katalog." };
    const contract = contracts[0] as { id: number; user_id: string; book_id: number; royalty_percent: number | string };
    const userId = contract.user_id;
    const bookId = Number(contract.book_id);
    const royaltyPercent = Number(contract.royalty_percent);
    if (data.status === "paid" && !access.adminName && !access.user?.roles.some((role) => role === "finance" || role === "admin")) return { success: false as const, error: "Hanya admin atau keuangan yang dapat mencatat pembayaran." };
    const amount = Math.round(data.netRevenue * royaltyPercent / 100);
    await sql`INSERT INTO gpm_royalty_periods (user_id,book_id,period_start,period_end,units_sold,gross_revenue,net_revenue,royalty_percent,royalty_amount,status,paid_at,payment_reference) VALUES (${userId},${bookId},${data.periodStart},${data.periodEnd},${Math.floor(data.unitsSold)},${Math.round(data.grossRevenue)},${Math.round(data.netRevenue)},${royaltyPercent},${amount},${data.status},CASE WHEN ${data.status}='paid' THEN NOW() ELSE NULL END,${data.paymentReference.trim()}) ON CONFLICT (user_id,book_id,period_start,period_end) DO UPDATE SET units_sold=EXCLUDED.units_sold,gross_revenue=EXCLUDED.gross_revenue,net_revenue=EXCLUDED.net_revenue,royalty_percent=EXCLUDED.royalty_percent,royalty_amount=EXCLUDED.royalty_amount,status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,payment_reference=EXCLUDED.payment_reference`;
    await sql`INSERT INTO gpm_audit_log (actor_user_id,actor_label,action,entity_type,entity_id,details) VALUES (${access.user?.id ?? null},${access.user?.email ?? access.adminName},'royalty.saved','royalty',${String(bookId)},${data.periodStart + "/" + data.periodEnd + "/" + amount})`;
    return { success: true as const, royaltyAmount: amount };
  });

export const getMyRoyaltyPeriods = createServerFn({ method: "GET" as const }).handler(async () => {
  const session = await getUserSession();
  const user = session.user;
  if (!user || !user.roles.includes("author")) throw new Error("Akun penulis diperlukan.");
  const sql = await ensurePlatformTables();
  const royalties = await sql`SELECT r.id,r.book_id,r.period_start,r.period_end,r.units_sold,r.net_revenue,r.royalty_percent,r.royalty_amount,r.status,r.paid_at,b.title AS book_title FROM gpm_royalty_periods r LEFT JOIN gpm_catalog_books b ON b.id=r.book_id WHERE r.user_id=${user.id} ORDER BY r.period_start DESC`;
  return { success: true as const, royalties };
});
