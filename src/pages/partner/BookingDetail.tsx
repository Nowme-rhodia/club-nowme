import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Clock, CheckCircle2, XCircle, Calendar, User, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  partner_id: string;
  offer_id: string;
  user_id: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  offer?: { title: string; description: string };
  user?: { first_name: string; last_name: string; email: string };
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) fetchBooking(id);
  }, [id]);

  async function fetchBooking(bookingId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        offer:offers(title, description),
        user:user_profiles(first_name, last_name, email)
      `)
      .eq("id", bookingId)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement de la réservation");
    } else {
      setBooking(data as Booking);
    }
    setLoading(false);
  }

  async function cancelBooking() {
    if (!id || !booking) return;
    if (!window.confirm("Annuler cette réservation ?")) return;

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Impossible d'annuler");
    } else {
      toast.success("Réservation annulée ❌");
      navigate("/partner/dashboard");
    }
  }

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!booking) return <p className="p-6">Réservation introuvable.</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/partner/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour au tableau de bord
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Détails de la réservation</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-mono">
                <span>#{booking.id.slice(0, 8)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>{new Date(booking.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {booking.status === "pending" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  <Clock className="w-4 h-4 mr-2" /> En attente
                </span>
              )}
              {booking.status === "confirmed" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmée
                </span>
              )}
              {booking.status === "cancelled" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                  <XCircle className="w-4 h-4 mr-2" /> Annulée
                </span>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Client Info */}
            <div className="flex gap-4">
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Client</h3>
                <p className="text-xl font-semibold text-gray-900">
                  {booking.user
                    ? `${booking.user.first_name} ${booking.user.last_name}`
                    : booking.user_id}
                </p>
                {booking.user?.email && (
                  <a href={`mailto:${booking.user.email}`} className="text-primary hover:underline mt-1 block">
                    {booking.user.email}
                  </a>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Offer Info */}
            <div className="flex gap-4">
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Offre Réservée</h3>
                <p className="text-xl font-semibold text-gray-900">
                  {booking.offer ? booking.offer.title : booking.offer_id}
                </p>
                {booking.offer?.description && (
                  <p className="text-gray-600 mt-2 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                    {booking.offer.description}
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Date Info */}
            <div className="flex gap-4">
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Date du rendez-vous</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(booking.date).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-lg text-gray-500">
                  à {new Date(booking.date).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          {booking.status === "pending" && (
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={cancelBooking}
                className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
              >
                Annuler la réservation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
