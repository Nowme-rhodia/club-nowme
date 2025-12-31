// src/pages/admin/Payouts.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Download, CheckCircle2, Clock, FileText, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface Payout {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  total_amount_collected: number;
  commission_amount: number;
  commission_tva: number;
  net_payout_amount: number;
  status: "pending" | "paid";
  created_at: string;
  statement_url: string | null;
  partner?: {
    business_name: string;
    contact_email: string;
  };
}

interface Partner {
  id: string;
  business_name: string;
}

export default function Payouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation Form State
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPayouts(), loadPartners()]);
    setLoading(false);
  };

  const loadPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(`
          *,
          partner:partners(business_name, contact_email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (err) {
      console.error("Erreur chargement payouts:", err);
      toast.error("Impossible de charger les reversements");
    }
  };

  const loadPartners = async () => {
    const { data } = await supabase.from("partners").select("id, business_name").eq('status', 'approved').order("business_name");
    setPartners(data || []);
  };

  const handleGenerate = async () => {
    if (!selectedPartner || !selectedMonth) {
      toast.error("Veuillez sélectionner un partenaire et un mois");
      return;
    }

    setGenerating(true);
    const [year, month] = selectedMonth.split("-");
    // Calculate start and end of month
    const start = `${selectedMonth}-01`;
    // Last day of month
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

    try {
      const { data, error } = await supabase.functions.invoke("generate-payout-statement", {
        body: {
          partner_id: selectedPartner,
          period_start: start,
          period_end: end
        }
      });

      if (error) throw new Error(error.message);
      if (data && data.error) throw new Error(data.error);

      toast.success("Relevé généré avec succès !");
      loadPayouts(); // Refresh list
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error("Erreur lors de la génération : " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Reversement marqué comme payé");
      loadPayouts();
    } catch (err) {
      console.error("Erreur update payout:", err);
      toast.error("Impossible de mettre à jour");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (loading && payouts.length === 0) {
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
          Reversements Partenaires
        </h1>
      </div>

      {/* 👉 Générateur */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Générer un nouveau relevé
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Partenaire</label>
            <select
              className="w-full border rounded-md p-2"
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.business_name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <input
              type="month"
              className="w-full border rounded-md p-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {generating ? "Génération..." : "Générer le relevé (PDF)"}
          </button>
        </div>
      </div>

      {/* 👉 Liste des reversements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partenaire</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Ventes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net à Reverser</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Aucun reversement généré.</td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{payout.partner?.business_name}</div>
                    <div className="text-sm text-gray-500">{payout.partner?.contact_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payout.period_start).toLocaleDateString("fr-FR")} - {new Date(payout.period_end).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">
                    {formatAmount(payout.total_amount_collected)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-700 text-right">
                    {formatAmount(payout.net_payout_amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
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
                  <td className="px-6 py-4 text-right space-x-2">
                    {payout.statement_url && (
                      <a
                        href={payout.statement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-3 h-3 mr-1" /> PDF
                      </a>
                    )}
                    {payout.status === "pending" && (
                      <button
                        onClick={() => markAsPaid(payout.id)}
                        className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Payer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
