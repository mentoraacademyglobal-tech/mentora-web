import { one } from "@/lib/relations";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader, Metric, BlankState, Pill, formatLkr } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";

export const metadata: Metadata = { title: "My Purchases" };

type PurchaseItem = {
  id: string;
  type: string;
  categoryKey: string;
  reference: string;
  amount: number;
  status: string;
  dispatch_status?: string | null;
  tracking_number?: string | null;
  delivery_method?: string | null;
  created_at: string;
  payment_method?: string | null;
  payment_proof_path?: string | null;
  rejection_reason?: string | null;
  item_name?: string | null;
  action_href?: string | null;
  action_label?: string | null;
};

export default async function PurchasesPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type = "all" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: member } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .limit(1)
    .maybeSingle();

  const items: PurchaseItem[] = [];

  if (member) {
    const orgId = member.organisation_id;

    // 1. Invoices
    const { data: invoices } = await supabase
      .from("mm_invoices")
      .select("id, invoice_no, course_id, amount, status, payment_method, payment_proof_path, rejection_reason, created_at, classes(name)")
      .eq("student_id", user.id)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    (invoices ?? []).forEach((inv) => {
      const clsName = one(inv.classes)?.name;
      items.push({
        id: inv.id,
        type: "Class invoice",
        categoryKey: "classes",
        reference: inv.invoice_no || inv.id.slice(0, 8).toUpperCase(),
        amount: Number(inv.amount ?? 0),
        status: inv.status,
        created_at: inv.created_at,
        payment_method: inv.payment_method,
        payment_proof_path: inv.payment_proof_path,
        rejection_reason: inv.rejection_reason,
        item_name: clsName ? `Course: ${clsName}` : "Course enrollment",
        action_href: inv.status === "approved" && inv.course_id ? `/classes/${inv.course_id}` : null,
        action_label: "Open class",
      });
    });

    // 2. Recording orders
    const { data: recOrders } = await supabase
      .from("mm_recording_orders")
      .select("id, order_no, recording_id, amount, status, rejection_reason, created_at, recordings(title, class_id)")
      .eq("student_id", user.id)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    (recOrders ?? []).forEach((ro) => {
      const rec = Array.isArray(ro.recordings) ? ro.recordings[0] : ro.recordings;
      items.push({
        id: ro.id,
        type: "Recording",
        categoryKey: "recordings",
        reference: ro.order_no || ro.id.slice(0, 8).toUpperCase(),
        amount: Number(ro.amount ?? 0),
        status: ro.status,
        created_at: ro.created_at,
        payment_method: "bank_deposit",
        rejection_reason: ro.rejection_reason,
        item_name: rec?.title ? `Lesson recording: ${rec.title}` : "Session recording",
        action_href: ro.status === "approved" && rec?.class_id ? `/classes/${rec.class_id}/recordings` : null,
        action_label: "Watch recording",
      });
    });

    // 3. Video tickets
    const { data: tickets } = await supabase
      .from("mm_video_tickets")
      .select("id, ticket_no, video_id, amount, status, rejection_reason, created_at, mm_videos(name)")
      .eq("student_id", user.id)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    (tickets ?? []).forEach((t) => {
      const vid = Array.isArray(t.mm_videos) ? t.mm_videos[0] : t.mm_videos;
      items.push({
        id: t.id,
        type: "Video on demand",
        categoryKey: "videos",
        reference: t.ticket_no || t.id.slice(0, 8).toUpperCase(),
        amount: Number(t.amount ?? 0),
        status: t.status,
        created_at: t.created_at,
        payment_method: "bank_deposit",
        rejection_reason: t.rejection_reason,
        item_name: vid?.name ? `Video: ${vid.name}` : "VOD pass",
        action_href: t.status === "approved" ? "/store?category=videos" : null,
        action_label: "Open video",
      });
    });

    // 4. Study tutes
    const { data: tuteOrders } = await supabase
      .from("mm_tute_orders")
      .select(`
        id, order_no, amount, status, delivery_method, dispatch_status, tracking_number,
        payment_method, payment_proof_path, rejection_reason, created_at,
        mm_tute_order_items (
          tute_id,
          quantity,
          unit_price,
          mm_tutes ( id, name, file_path )
        )
      `)
      .eq("student_id", user.id)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    (tuteOrders ?? []).forEach((to) => {
      const itemsList = Array.isArray(to.mm_tute_order_items) ? to.mm_tute_order_items : [];
      const firstTute = one(itemsList[0]?.mm_tutes);
      const tuteName = itemsList.map((i) => one(i.mm_tutes)?.name).filter(Boolean).join(", ") || "Study tute";
      const hasDownload = to.status === "approved" && to.delivery_method === "download" && firstTute?.file_path;

      items.push({
        id: to.id,
        type: "Study tute",
        categoryKey: "tutes",
        reference: to.order_no || to.id.slice(0, 8).toUpperCase(),
        amount: Number(to.amount ?? 0),
        status: to.status,
        dispatch_status: to.dispatch_status,
        tracking_number: to.tracking_number,
        delivery_method: to.delivery_method,
        created_at: to.created_at,
        payment_method: to.payment_method ?? "bank_deposit",
        payment_proof_path: to.payment_proof_path,
        rejection_reason: to.rejection_reason,
        item_name: tuteName,
        action_href: hasDownload ? `/api/student/tutes/${firstTute.id}/download` : null,
        action_label: "Download PDF",
      });
    });

    // 5. Merchandise
    const { data: merchOrders } = await supabase
      .from("mm_merchandise_orders")
      .select(`
        id, order_no, amount, status, dispatch_status, tracking_number,
        payment_method, payment_proof_path, rejection_reason, created_at,
        mm_merchandise_order_items (
          product_id,
          quantity,
          unit_price,
          mm_products ( name )
        )
      `)
      .eq("student_id", user.id)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    (merchOrders ?? []).forEach((mo) => {
      const itemsList = Array.isArray(mo.mm_merchandise_order_items) ? mo.mm_merchandise_order_items : [];
      const prodNames = itemsList.map((i) => `${one(i.mm_products)?.name ?? 'Item'} (x${i.quantity})`).join(", ") || "Academy merchandise";

      items.push({
        id: mo.id,
        type: "Merchandise",
        categoryKey: "merchandise",
        reference: mo.order_no || mo.id.slice(0, 8).toUpperCase(),
        amount: Number(mo.amount ?? 0),
        status: mo.status,
        dispatch_status: mo.dispatch_status,
        tracking_number: mo.tracking_number,
        created_at: mo.created_at,
        payment_method: mo.payment_method ?? "bank_deposit",
        payment_proof_path: mo.payment_proof_path,
        rejection_reason: mo.rejection_reason,
        item_name: prodNames,
        action_href: null,
      });
    });
  }

  // Sort newest first
  items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const filtered = type === "all" ? items : items.filter(it => it.categoryKey === type);
  const approved = items.filter(p => ["approved", "completed", "paid"].includes(p.status.toLowerCase())).length;
  const pending = items.filter(p => p.status.toLowerCase() === "pending").length;
  const rejected = items.filter(p => p.status.toLowerCase() === "rejected").length;

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "classes", label: "Class Invoices" },
    { key: "recordings", label: "Recordings" },
    { key: "videos", label: "Video Tickets" },
    { key: "tutes", label: "Study Tutes" },
    { key: "merchandise", label: "Merchandise" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MARKETPLACE / ORDERS"
        title="My Purchases"
        subtitle="Track class fee invoices, recording access, study tutes and academy orders."
        action={{ href: "/store", label: "Browse store" }}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Total orders" value={items.length} detail="Across all categories" icon="cash" />
        <Metric label="Approved" value={approved} detail="Active access & confirmed" icon="check" />
        <Metric label="Pending verification" value={pending} detail="Awaiting review" icon="clock" />
        <Metric label="Declined / Rejected" value={rejected} detail="Requires attention" icon="warning" />
      </div>

      <section className="student-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Transaction history</h2>
            <p className="mt-1 text-xs text-slate-text">
              Showing {filtered.length} of {items.length} total transactions
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterTabs.map(tab => (
              <Link
                key={tab.key}
                href={`/purchases?type=${tab.key}`}
                className={`rounded-full px-3 py-2 text-[11px] font-bold ${
                  type === tab.key ? "bg-deep text-mint" : "bg-mist text-slate-text hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <BlankState
            icon="cash"
            title="No transactions found"
            description="When you enroll in a class or order study materials, your invoices and access status will appear here."
            action={{ href: "/classes", label: "Explore classes" }}
          />
        ) : filtered.length === 0 ? (
          <BlankState
            icon="cash"
            title="No matching transactions"
            description="There are no transactions in this category."
            action={{ href: "/purchases", label: "Show all transactions" }}
          />
        ) : (
          <div className="student-table-scroll !rounded-none !border-0">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item / Description</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Action / Access</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td className="whitespace-nowrap font-bold text-ink">{row.type}</td>
                    <td>
                      <p className="text-xs font-bold text-ink">{row.item_name ?? "Academy product"}</p>
                      {row.delivery_method && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-text">
                          Delivery: {row.delivery_method}
                        </p>
                      )}
                      {row.tracking_number && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#e8f4f8] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1f667d]">
                          <Icon name="link" className="h-3 w-3" /> Track: {row.tracking_number}
                        </span>
                      )}
                      {row.rejection_reason && (
                        <p className="mt-1 rounded-md bg-danger/10 p-1.5 text-[11px] font-medium text-danger">
                          Rejection note: {row.rejection_reason}
                        </p>
                      )}
                      {row.payment_proof_path && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#0ba178]">
                          <Icon name="check" className="h-3 w-3" /> Slip attached
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-[11px] text-slate-text">
                      {row.reference}
                    </td>
                    <td className="whitespace-nowrap text-slate-text">
                      {new Date(row.created_at).toLocaleDateString("en-LK")}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <Pill status={row.status} />
                        {row.dispatch_status && row.dispatch_status !== "pending" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#1b6b80]">
                            <Icon name="check" className="h-2.5 w-2.5" /> {row.dispatch_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right font-extrabold text-ink">
                      {formatLkr(row.amount)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {row.action_href ? (
                        <Link
                          href={row.action_href}
                          className="inline-flex items-center gap-1 rounded-lg bg-mint/15 px-2.5 py-1.5 text-xs font-bold text-[#0a8664] hover:bg-mint/25"
                        >
                          {row.action_label} <Icon name="arrow-right" className="h-3.5 w-3.5" />
                        </Link>
                      ) : row.status === "pending" ? (
                        <span className="text-xs italic text-slate-text">Awaiting manager</span>
                      ) : (
                        <span className="text-xs text-slate-text">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-xl border border-line bg-page p-4 text-xs text-slate-text">
        <p>
          Bank deposit transfers are reviewed by your academy administrator. Upon approval, access to class sessions, recordings, or video tickets is granted instantly.
        </p>
      </div>
    </div>
  );
}
