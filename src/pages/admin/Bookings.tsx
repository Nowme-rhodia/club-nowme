import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  partner_id: string;
  offer_id: string;
  user_id: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  offer?: { title: string };
  user?: { first_name: string; last_name: string; email: string };
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        offer:offers(title),
        user:user_profiles(first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      setBookings((data || []) as Booking[]);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: "confirmed" | "cancelled") {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        status === "confirmed"
          ? "Réservation confirmée ✅ (payout créé)"
          : "Réservation annulée ❌"
      );
      fetchBookings();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Réservations</h1>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : bookings.length === 0 ? (
        <p className="text-gray-500">Aucune réservation trouvée.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Client
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Offre
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Statut
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 text-gray-900">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {b.user
                          ? `${b.user.first_name} ${b.user.last_name}`
                          : b.user_id}
                      </span>
                      {b.user?.email && (
                        <span className="text-xs text-gray-500">
                          {b.user.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {b.offer ? b.offer.title : b.offer_id}
                  </td>
                  <td className="px-4 py-2 flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {new Date(b.date).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2">
                    {b.status === "pending" && (
                      <span className="flex items-center text-yellow-600">
                        <Clock className="w-4 h-4 mr-1" /> En attente
                      </span>
                    )}
                    {b.status === "confirmed" && (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmée
                      </span>
                    )}
                    {b.status === "cancelled" && (
                      <span className="flex items-center text-red-600">
                        <XCircle className="w-4 h-4 mr-1" /> Annulée
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    {b.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(b.id, "confirmed")}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => updateStatus(b.id, "cancelled")}
                          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Annuler
                        </button>
                      </>
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
