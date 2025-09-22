// src/pages/admin/Payouts.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Download, CheckCircle2, Clock, XCircle } from "lucide-react";
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

export default function Payouts() {
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayouts();
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

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("partner_payouts")
        .update({ status: "paid" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Payout marqué comme payé");
      await loadPayouts();
    } catch (err) {
      console.error("Erreur update payout:", err);
      toast.error("Impossible de mettre à jour");
    }
  };

  const exportCSV = () => {
    const pending = payouts.filter((p) => p.status === "pending");

    if (pending.length === 0) {
      toast.error("Aucun payout en attente à exporter");
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
      "Créé le",
    ];

    const rows = pending.map((p) => [
      p.id,
      p.partner?.business_name || "",
      p.partner?.contact_email || "",
      p.amount,
      p.currency,
      p.period_start || "",
      p.period_end || "",
      p.created_at,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payouts-pending-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Chargement des reversements...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reversements partenaires</h1>
        <button
          onClick={exportCSV}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV (pending)
        </button>
      </div>

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
                    {payout.amount} {payout.currency}
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
