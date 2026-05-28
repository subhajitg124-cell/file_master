import React from "react";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DatabaseZap,
  Eye,
  FileClock,
  FileCog,
  Gauge,
  Languages,
  LockKeyhole,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Users,
} from "lucide-react";
import { eventRules } from "@/lib/document-automation";

const stats = [
  { label: "Uploads today", value: "12,840", trend: "+18%", icon: UploadCloud },
  { label: "Compression saved", value: "42.8 GB", trend: "+31%", icon: DatabaseZap },
  { label: "Avg processing", value: "8.4 sec", trend: "-22%", icon: Gauge },
  { label: "Failed uploads", value: "1.8%", trend: "-9%", icon: AlertTriangle },
];

const logs = [
  "Scholarship ZIP job completed with 67% size reduction",
  "PAN signature auto-resized and renamed",
  "Lakshmir Bhandar rule version v12 published",
  "Virus scan hook blocked 3 suspicious uploads",
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">FileNova AI Console</p>
            <h1 className="text-xl font-black">Super Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">
              View app
            </Link>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              <Plus className="h-4 w-4" />
              New event
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2 rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20 lg:h-fit">
          {[
            ["Overview", BarChart3],
            ["Event rules", FileCog],
            ["Upload monitor", Activity],
            ["Users and roles", Users],
            ["Language manager", Languages],
            ["Feature toggles", SlidersHorizontal],
            ["Security guard", LockKeyhole],
          ].map(([label, Icon]) => (
            <button key={label as string} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
              {React.createElement(Icon as typeof BarChart3, { className: "h-4 w-4" })}
              {label as string}
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, trend, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500">{trend}</span>
                </div>
                <p className="mt-4 text-2xl font-black">{value}</p>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-black">Dynamic Event Rules</h2>
                  <p className="text-xs text-muted-foreground">Create schemes with accepted formats, dimensions, size limits, merge order and ZIP folders.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">
                  <Eye className="h-4 w-4" />
                  Audit
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">Event</th>
                      <th className="px-3 py-3">Docs</th>
                      <th className="px-3 py-3">Naming</th>
                      <th className="px-3 py-3">Popularity</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRules.map((rule) => (
                      <tr key={rule.id} className="border-t border-border">
                        <td className="px-3 py-3 font-bold">{rule.title}</td>
                        <td className="px-3 py-3 text-muted-foreground">{rule.documents.length} rules</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{rule.namingPattern}</td>
                        <td className="px-3 py-3">{rule.popularity}%</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Live
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-black">Security Controls</h2>
                <div className="mt-4 space-y-3">
                  {["MIME validation", "Rate limiting", "Admin guard", "Secure deletion", "Virus scan hook"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-semibold">{item}</span>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="font-black">Processing Logs</h2>
                <div className="mt-4 space-y-3">
                  {logs.map((log) => (
                    <div key={log} className="flex gap-2 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                      <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
