// src/pages/admin/Payouts.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Download, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface PartnerPayout {
  id: string;
  partner_id: string;
  amount: number;
  currency: string;
  status: "pending" | "paid";
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  partner?: {
    business_name: string;
    contact_email: string;
  };
}

interface Report {
  total_bookings: number;
  gross_total: number;
  commission: number;
  net_total: number;
}

export default function Payouts() {
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [globalReport, setGlobalReport] = useState<Report | null>(null);
  const [partnerReports, setPartnerReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayouts();
    loadGlobalReport();
    loadPartnerReports();
  }, []);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_payouts")
        .select(
          `
          *,
          partner:partners(business_name, contact_email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (err) {
      console.error("Erreur chargement payouts:", err);
      toast.error("Impossible de charger les reversements");
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalReport = async () => {
    try {
      const { data, error } = await supabase.rpc("admin_payouts_report");
      if (error) throw error;
      if (data && data.length > 0) {
        setGlobalReport({
          total_bookings: data[0].total_bookings || 0,
          gross_total: data[0].gross_total || 0,
          commission: data[0].commission || 0,
          net_total: data[0].net_total || 0,
        });
      }
    } catch (err) {
      console.error("Erreur chargement rapport global:", err);
      toast.error("Impossible de charger le rapport global");
    }
  };

  const loadPartnerReports = async () => {
    try {
      const { data: partners, error } = await supabase
        .from("partners")
        .select("id, business_name, contact_email");

      if (error) throw error;
      if (!partners) return;

      const reports: any[] = [];
      for (const p of partners) {
        const { data, error: repError } = await supabase.rpc(
          "admin_payouts_report_by_partner",
          { partner_uuid: p.id }
        );
        if (!repError && data && data.length > 0) {
          reports.push({
            partner: p,
            ...data[0],
          });
        }
      }

      setPartnerReports(reports);
    } catch (err) {
      console.error("Erreur chargement rapports partenaires:", err);
      toast.error("Impossible de charger les rapports partenaires");
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("partner_payouts")
        .update({ status: "paid" })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Reversement marqué comme payé");
      await loadPayouts();
    } catch (err) {
      console.error("Erreur update payout:", err);
      toast.error("Impossible de mettre à jour");
    }
  };

  const exportCSV = (type: "pending" | "all") => {
    let exportData = payouts;
    if (type === "pending") {
      exportData = payouts.filter((p) => p.status === "pending");
    }

    if (exportData.length === 0) {
      toast.error(
        type === "pending"
          ? "Aucun reversement en attente à exporter"
          : "Aucun reversement trouvé à exporter"
      );
      return;
    }

    const headers = [
      "ID",
      "Partenaire",
      "Email",
      "Montant",
      "Devise",
      "Période début",
      "Période fin",
      "Statut",
      "Créé le",
    ];

    const rows = exportData.map((p) => [
      p.id,
      p.partner?.business_name || "",
      p.partner?.contact_email || "",
      p.amount,
      p.currency,
      p.period_start || "",
      p.period_end || "",
      p.status,
      p.created_at,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payouts-${type}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (amount: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Chargement des reversements...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Reversements partenaires
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => exportCSV("pending")}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV (en attente)
          </button>
          <button
            onClick={() => exportCSV("all")}
            className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-900"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV (tous)
          </button>
        </div>
      </div>

      {/* 👉 Rapport global */}
      {globalReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Réservations confirmées</p>
            <p className="text-xl font-bold">{globalReport.total_bookings}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Revenu brut</p>
            <p className="text-xl font-bold">
              {formatAmount(globalReport.gross_total)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Commission Nowme</p>
            <p className={`text-xl font-bold ${globalReport.commission > 0 ? 'text-red-600' : ''}`}>
              -{formatAmount(globalReport.commission)}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Revenu net</p>
            <p className="text-xl font-bold text-green-600">
              {formatAmount(globalReport.net_total)}
            </p>
          </div>
        </div>
      )}

      {/* 👉 Rapports par partenaire */}
      <div className="bg-white rounded-lg shadow p-6 mb-10">
        <h2 className="text-xl font-bold mb-4">Rapports financiers par partenaire</h2>
        {partnerReports.length === 0 ? (
          <p className="text-gray-500">Aucun rapport trouvé.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Partenaire</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Réservations</th>
                <th className="px-4 py-2 text-left">Brut</th>
                <th className="px-4 py-2 text-left">Commission</th>
                <th className="px-4 py-2 text-left">Net</th>
              </tr>
            </thead>
            <tbody>
              {partnerReports.map((r) => (
                <tr key={r.partner.id} className="border-t">
                  <td className="px-4 py-2">{r.partner.business_name}</td>
                  <td className="px-4 py-2">{r.partner.contact_email}</td>
                  <td className="px-4 py-2">{r.total_bookings}</td>
                  <td className="px-4 py-2">{formatAmount(r.gross_total)}</td>
                  <td className="px-4 py-2 text-red-600">-{formatAmount(r.commission)}</td>
                  <td className="px-4 py-2 text-green-600">{formatAmount(r.net_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 👉 Liste des reversements */}
      {payouts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Aucun reversement trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Partenaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {payout.partner?.business_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {payout.partner?.contact_email}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    {formatAmount(payout.amount, payout.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payout.period_start
                      ? new Date(payout.period_start).toLocaleDateString("fr-FR")
                      : "-"}{" "}
                    →{" "}
                    {payout.period_end
                      ? new Date(payout.period_end).toLocaleDateString("fr-FR")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {payout.status === "pending" ? (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        <Clock className="w-3 h-3 mr-1" /> En attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Payé
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {payout.status === "pending" && (
                      <button
                        onClick={() => markAsPaid(payout.id)}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Marquer payé
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
