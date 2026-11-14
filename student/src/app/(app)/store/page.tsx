import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader, Metric, Surface, BlankState, formatLkr } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import OrderButton from "@/components/commerce/OrderButton";

export const metadata: Metadata = { title: "Mentora Store" };
type Product = { id: string; name: string; description: string | null; price: number; status: string };

export default async function StorePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "all" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const {data: contact} = await supabase.from('profiles').select('full_name,phone').eq('id',user.id).maybeSingle();
  const registration = membership ? await supabase.from('student_registration_details')
    .select('address').eq('organisation_id',membership.organisation_id).eq('user_id',user.id).maybeSingle() : null;
  const sources = [
    { table: "mm_tutes", title: "Study notes & tutes", key: "tutes", icon: "file" },
    { table: "mm_products", title: "Merchandise", key: "merchandise", icon: "cash" },
    { table: "mm_videos", title: "Video on demand", key: "videos", icon: "video" }
  ] as const;

  const groups = await Promise.all(
    sources.map(async source => {
      if (!membership) return { ...source, items: [] as Product[], ready: false };
      const { data, error } = await supabase
        .from(source.table)
        .select("id,name,description,price,status")
        .eq("organisation_id", membership.organisation_id)
        .in("status", ["active", "published"])
        .order("created_at", { ascending: false })
        .limit(80);
      return { ...source, items: (data ?? []) as Product[], ready: !error };
    })
  );

  const visible = groups
    .filter(group => category === "all" || group.key === category)
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        `${item.name} ${item.description ?? ""}`.toLowerCase().includes(q.toLowerCase())
      )
    }));

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MARKETPLACE / CATALOG"
        title="Explore Mentora Store"
        subtitle="Discover study tutes, merchandise and on-demand learning published by your academy."
        action={{ href: "/purchases", label: "My purchases" }}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Published products" value={total} detail="Across all categories" icon="cash" />
        <Metric label="Study tutes" value={groups[0].items.length} detail="Learning materials" icon="file" />
        <Metric label="Merchandise" value={groups[1].items.length} detail="Academy products" icon="school" />
        <Metric label="Video on demand" value={groups[2].items.length} detail="Premium video catalog" icon="video" />
      </div>

      <div className="student-card p-4 sm:p-5">
        <form action="/store" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "tutes", label: "Study tutes" },
              { key: "merchandise", label: "Merchandise" },
              { key: "videos", label: "Videos" }
            ].map(c => (
              <Link
                key={c.key}
                href={`/store?category=${c.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                aria-current={category === c.key ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-xs font-bold ${
                  category === c.key ? "bg-deep text-mint" : "bg-mist text-slate-text hover:text-ink"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="hidden" name="category" value={category} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              aria-label="Search store"
              placeholder="Search products..."
              className="student-search min-w-0 flex-1"
            />
            <button type="submit" className="student-action student-action-primary">
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[#b7dbe4] bg-[#e7f4f8] px-4 py-3 text-xs leading-5 text-[#28596a]">
        Catalog orders and requests are active. Place your order with bank transfer slip or cash option. Your order status and access will appear under{" "}
        <Link href="/purchases" className="font-bold underline">
          My Purchases
        </Link>
        .
      </div>

      {visible.map(group => (
        <Surface key={group.key} title={group.title} description={`${group.items.length} published items`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map(item => (
              <article key={item.id} className="flex flex-col justify-between rounded-xl border border-line bg-page p-4">
                <div>
                  <span className="mb-3 inline-flex rounded-xl bg-mint/10 p-3 text-[#0a9874]">
                    <Icon name={group.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-[13px] font-extrabold text-ink">{item.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-text">
                    {item.description || "Mentora academy product"}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
                  <strong className="text-sm font-extrabold text-ink">{formatLkr(item.price)}</strong>
                  <OrderButton
                    productId={item.id}
                    productName={item.name}
                    price={item.price}
                    contact={group.key === "tutes" ? {...contact, address: registration?.data?.address} : undefined}
                    category={group.key as "tutes" | "merchandise" | "videos"}
                  />
                </div>
              </article>
            ))}
            {!group.ready && (
              <div className="col-span-full">
                <BlankState
                  icon="cash"
                  title="Catalog not configured"
                  description="This store section becomes available after the optional Mentora Manager commerce schema is enabled."
                />
              </div>
            )}
            {group.ready && group.items.length === 0 && (
              <div className="col-span-full">
                <BlankState
                  icon="cash"
                  title="No products to show"
                  description="Published products from Mentora Manager will appear here."
                />
              </div>
            )}
          </div>
        </Surface>
      ))}
    </div>
  );
}
