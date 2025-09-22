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
    <div className="p-6 space-y-6 max-w-3xl mx-auto bg-white rounded-lg shadow">
      <Link
        to="/partner/dashboard"
        className="flex items-center text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </Link>

      <h1 className="text-2xl font-bold">Détails de la réservation</h1>

      <div className="space-y-4">
        <div>
          <p className="text-gray-500 text-sm">Client</p>
          <p className="text-lg font-medium">
            {booking.user
              ? `${booking.user.first_name} ${booking.user.last_name}`
              : booking.user_id}
          </p>
          {booking.user?.email && (
            <p className="text-sm text-gray-600">{booking.user.email}</p>
          )}
        </div>

        <div>
          <p className="text-gray-500 text-sm">Offre réservée</p>
          <p className="text-lg font-medium">
            {booking.offer ? booking.offer.title : booking.offer_id}
          </p>
          {booking.offer?.description && (
            <p className="text-sm text-gray-600">{booking.offer.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-lg font-medium">
            {new Date(booking.date).toLocaleString("fr-FR")}
          </span>
        </div>

        <div>
          <p className="text-gray-500 text-sm">Statut</p>
          {booking.status === "pending" && (
            <span className="flex items-center text-yellow-600 font-medium">
              <Clock className="w-4 h-4 mr-1" /> En attente
            </span>
          )}
          {booking.status === "confirmed" && (
            <span className="flex items-center text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmée
            </span>
          )}
          {booking.status === "cancelled" && (
            <span className="flex items-center text-red-600 font-medium">
              <XCircle className="w-4 h-4 mr-1" /> Annulée
            </span>
          )}
        </div>
      </div>

      {booking.status === "pending" && (
        <button
          onClick={cancelBooking}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Annuler la réservation
        </button>
      )}
    </div>
  );
}
