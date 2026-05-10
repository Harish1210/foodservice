"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  CheckCircle, XCircle, Clock, MapPin, Phone, Mail,
  ChefHat, Loader2, RefreshCw, ShieldCheck, PauseCircle,
  PlayCircle, Trash2, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

type Vendor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  isApproved: boolean;
  isOnHold: boolean;
  createdAt: string;
  _count: { menuItems: number };
};

type Action = "approve" | "disapprove" | "hold" | "unhold" | "delete";

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vendor | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vendors");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setVendors(data.vendors ?? []);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (vendorId: string, action: Action) => {
    setActionId(vendorId);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const messages: Record<Action, string> = {
        approve:    "✅ Vendor approved!",
        disapprove: "↩️ Approval revoked",
        hold:       "⏸️ Vendor put on hold",
        unhold:     "▶️ Hold removed",
        delete:     "🗑️ Vendor permanently deleted",
      };
      toast.success(messages[action]);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const pending  = vendors.filter((v) => !v.isApproved && !v.isOnHold);
  const onHold   = vendors.filter((v) => v.isOnHold);
  const approved = vendors.filter((v) => v.isApproved && !v.isOnHold);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A0A00] rounded-2xl flex items-center justify-center">
              <ShieldCheck size={22} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A0A00]">Vendor Management</h1>
              <p className="text-gray-500 text-sm">Approve, hold, or remove vendor accounts</p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-[#E8D5C0] rounded-xl text-sm text-gray-600 hover:bg-white transition-colors disabled:opacity-60">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Pending",   value: pending.length,  color: "bg-amber-50 border-amber-200 text-amber-700",   icon: Clock },
            { label: "On Hold",   value: onHold.length,   color: "bg-orange-50 border-orange-200 text-orange-700", icon: PauseCircle },
            { label: "Approved",  value: approved.length, color: "bg-green-50 border-green-200 text-green-700",   icon: CheckCircle },
            { label: "Total",     value: vendors.length,  color: "bg-blue-50 border-blue-200 text-blue-700",      icon: ChefHat },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
              <Icon size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
          </div>
        ) : (
          <>
            {/* Pending Vendors */}
            <Section title="Pending Approval" icon={<Clock size={16} className="text-amber-500" />} badge={pending.length}>
              {pending.length === 0 ? (
                <EmptyState icon={<CheckCircle size={32} className="text-green-300" />} title="No pending approvals" sub="All vendor registrations have been reviewed." />
              ) : (
                pending.map((v) => (
                  <VendorCard key={v.id} vendor={v} actionId={actionId}
                    onDelete={() => setConfirmDelete(v)}
                    actions={[
                      { label: "Approve", icon: <CheckCircle size={13} />, color: "bg-green-600 hover:bg-green-700 text-white", action: "approve" },
                      { label: "Reject & Delete", icon: <Trash2 size={13} />, color: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", action: "delete", confirm: true },
                    ]}
                    act={act}
                    setConfirmDelete={setConfirmDelete}
                  />
                ))
              )}
            </Section>

            {/* On Hold Vendors */}
            {onHold.length > 0 && (
              <Section title="On Hold" icon={<PauseCircle size={16} className="text-orange-500" />} badge={onHold.length}>
                {onHold.map((v) => (
                  <VendorCard key={v.id} vendor={v} actionId={actionId}
                    onDelete={() => setConfirmDelete(v)}
                    actions={[
                      { label: "Reinstate", icon: <PlayCircle size={13} />, color: "bg-green-600 hover:bg-green-700 text-white", action: "unhold" },
                      { label: "Delete", icon: <Trash2 size={13} />, color: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", action: "delete", confirm: true },
                    ]}
                    act={act}
                    setConfirmDelete={setConfirmDelete}
                  />
                ))}
              </Section>
            )}

            {/* Approved Vendors */}
            <Section title={`Approved Vendors (${approved.length})`} icon={<CheckCircle size={16} className="text-green-500" />}>
              {approved.length === 0 ? (
                <EmptyState icon={<ChefHat size={32} className="text-gray-300" />} title="No approved vendors yet." sub="" />
              ) : (
                approved.map((v) => (
                  <VendorCard key={v.id} vendor={v} actionId={actionId}
                    onDelete={() => setConfirmDelete(v)}
                    actions={[
                      { label: "Disapprove", icon: <XCircle size={13} />, color: "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200", action: "disapprove" },
                      { label: "Put on Hold", icon: <PauseCircle size={13} />, color: "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200", action: "hold" },
                      { label: "Delete", icon: <Trash2 size={13} />, color: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200", action: "delete", confirm: true },
                    ]}
                    act={act}
                    setConfirmDelete={setConfirmDelete}
                  />
                ))
              )}
            </Section>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A0A00]">Permanently Delete?</h3>
                <p className="text-xs text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              You are about to permanently delete{" "}
              <span className="font-semibold text-[#1A0A00]">
                {confirmDelete.businessName ?? `${confirmDelete.firstName ?? ""} ${confirmDelete.lastName ?? ""}`.trim() || confirmDelete.email}
              </span>
              . All their data will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => act(confirmDelete.id, "delete")}
                disabled={actionId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {actionId === confirmDelete.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, badge, children }: { title: string; icon: React.ReactNode; badge?: number; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-bold text-[#1A0A00] mb-4 flex items-center gap-2">
        {icon}
        {title}
        {badge != null && badge > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8D5C0] p-8 text-center text-gray-400">
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="font-medium">{title}</p>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}

type ActionDef = { label: string; icon: React.ReactNode; color: string; action: Action; confirm?: boolean };

function VendorCard({
  vendor, actionId, actions, act, setConfirmDelete,
}: {
  vendor: Vendor;
  actionId: string | null;
  actions: ActionDef[];
  act: (id: string, action: Action) => void;
  setConfirmDelete: (v: Vendor) => void;
  onDelete: () => void;
}) {
  const fullName      = `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim();
  const name          = vendor.businessName ?? fullName || vendor.email ?? "Unnamed Kitchen";
  const profileIncomplete = !vendor.businessName;
  const isBusy = actionId === vendor.id;

  const statusBadge = vendor.isOnHold
    ? { label: "On Hold", cls: "bg-orange-100 text-orange-700", icon: <PauseCircle size={10} /> }
    : vendor.isApproved
    ? { label: "Approved", cls: "bg-green-100 text-green-700", icon: <CheckCircle size={10} /> }
    : { label: "Pending", cls: "bg-amber-100 text-amber-700", icon: <Clock size={10} /> };

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 transition-all ${
      vendor.isOnHold ? "border-orange-200 bg-orange-50/20" :
      vendor.isApproved ? "border-[#E8D5C0]" : "border-amber-200 bg-amber-50/20"
    }`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
          {name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-[#1A0A00]">{name}</h3>
                {profileIncomplete && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                    <AlertTriangle size={10} /> Kitchen details not set
                  </span>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${statusBadge.cls}`}>
                {statusBadge.icon} {statusBadge.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {actions.map((a) => (
                <button
                  key={a.action}
                  onClick={() => a.confirm ? setConfirmDelete(vendor) : act(vendor.id, a.action)}
                  disabled={isBusy}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors ${a.color}`}>
                  {isBusy && !a.confirm ? <Loader2 size={12} className="animate-spin" /> : a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 grid sm:grid-cols-2 gap-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><Mail size={11} className="text-gray-400" />{vendor.email}</span>
            {vendor.phone && <span className="flex items-center gap-1.5"><Phone size={11} className="text-gray-400" />{vendor.phone}</span>}
            {vendor.businessAddress && (
              <span className="flex items-center gap-1.5 sm:col-span-2"><MapPin size={11} className="text-gray-400" />{vendor.businessAddress}</span>
            )}
            <span className="flex items-center gap-1.5"><ChefHat size={11} className="text-gray-400" />{vendor._count.menuItems} menu items</span>
            <span className="text-gray-400">Registered {new Date(vendor.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}