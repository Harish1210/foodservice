"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  CheckCircle, XCircle, Clock, MapPin, Phone, Mail,
  ChefHat, Loader2, RefreshCw, ShieldCheck,
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
  createdAt: string;
  _count: { menuItems: number };
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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

  const act = async (vendorId: string, action: "approve" | "reject") => {
    setActionId(vendorId);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "✅ Vendor approved!" : "❌ Vendor rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const pending = vendors.filter((v) => !v.isApproved);
  const approved = vendors.filter((v) => v.isApproved);

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
              <h1 className="text-2xl font-bold text-[#1A0A00]">Vendor Approvals</h1>
              <p className="text-gray-500 text-sm">Review and approve vendor registrations</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-[#E8D5C0] rounded-xl text-sm text-gray-600 hover:bg-white transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending Approval", value: pending.length, color: "bg-amber-50 border-amber-200 text-amber-700", icon: Clock },
            { label: "Approved Vendors", value: approved.length, color: "bg-green-50 border-green-200 text-green-700", icon: CheckCircle },
            { label: "Total Vendors", value: vendors.length, color: "bg-blue-50 border-blue-200 text-blue-700", icon: ChefHat },
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
            <section className="mb-10">
              <h2 className="font-bold text-[#1A0A00] mb-4 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                Pending Approval
                {pending.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                )}
              </h2>

              {pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8D5C0] p-8 text-center text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-300" />
                  <p className="font-medium">No pending approvals</p>
                  <p className="text-sm">All vendor registrations have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      actionId={actionId}
                      onApprove={() => act(vendor.id, "approve")}
                      onReject={() => act(vendor.id, "reject")}
                      showActions
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Approved Vendors */}
            <section>
              <h2 className="font-bold text-[#1A0A00] mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Approved Vendors ({approved.length})
              </h2>
              {approved.length === 0 ? (
                <p className="text-gray-400 text-sm">No approved vendors yet.</p>
              ) : (
                <div className="space-y-3">
                  {approved.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor}
                      actionId={actionId}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function VendorCard({
  vendor,
  actionId,
  onApprove,
  onReject,
  showActions,
}: {
  vendor: Vendor;
  actionId: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  showActions: boolean;
}) {
  const name = vendor.businessName ?? (`${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim() || "Unnamed Kitchen");
  const isBusy = actionId === vendor.id;

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 transition-all ${
      vendor.isApproved ? "border-[#E8D5C0]" : "border-amber-200 bg-amber-50/30"
    }`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
          {name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-[#1A0A00]">{name}</h3>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                vendor.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}>
                {vendor.isApproved ? <CheckCircle size={10} /> : <Clock size={10} />}
                {vendor.isApproved ? "Approved" : "Pending Approval"}
              </span>
            </div>

            {showActions && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={onApprove}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Approve
                </button>
                <button
                  onClick={onReject}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  <XCircle size={13} />
                  Reject
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 grid sm:grid-cols-2 gap-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Mail size={11} className="text-gray-400" /> {vendor.email}
            </span>
            {vendor.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={11} className="text-gray-400" /> {vendor.phone}
              </span>
            )}
            {vendor.businessAddress && (
              <span className="flex items-center gap-1.5 sm:col-span-2">
                <MapPin size={11} className="text-gray-400" /> {vendor.businessAddress}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ChefHat size={11} className="text-gray-400" /> {vendor._count.menuItems} menu items
            </span>
            <span className="text-gray-400">
              Registered {new Date(vendor.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
