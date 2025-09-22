import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface Offer {
  id: string;
  title: string;
  description: string;
  price?: number;
  promo_price?: number;
  requires_agenda?: boolean;
  calendly_url?: string | null;
  has_stock?: boolean;
  stock?: number | null;
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  // Charger l'offre
  useEffect(() => {
    const loadOffer = async () => {
      try {
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setOffer(data);
      } catch (error) {
        console.error("Erreur chargement offre:", error);
        toast.error("Impossible de charger cette offre");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadOffer();
  }, [id]);

  // Fonction de réservation sans agenda
  const handleBooking = async () => {
    if (!offer) return;

    if (offer.has_stock && offer.stock !== null && offer.stock <= 0) {
      toast.error("Stock épuisé !");
      return;
    }

    try {
      setReserving(true);

      // Enregistrer la réservation
      const { error: bookingError } = await supabase.from("bookings").insert({
        offer_id: offer.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (bookingError) throw bookingError;

      // Si stock, le décrémenter
      if (offer.has_stock) {
        const { error: stockError } = await supabase
          .from("offers")
          .update({ stock: (offer.stock || 0) - 1 })
          .eq("id", offer.id);

        if (stockError) throw stockError;

        setOffer({ ...offer, stock: (offer.stock || 0) - 1 });
      }

      toast.success("Réservation confirmée !");
    } catch (error) {
      console.error("Erreur réservation:", error);
      toast.error("Impossible de réserver");
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="mb-4">Offre introuvable.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          <ArrowLeft className="inline-block w-4 h-4 mr-2" />
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto p-6">
      {/* Bouton retour */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Retour
      </button>

      {/* Titre & description */}
      <h1 className="text-3xl font-bold mb-4">{offer.title}</h1>
      <p className="text-gray-600 mb-6">{offer.description}</p>

      {/* Prix */}
      <div className="text-2xl font-bold text-primary">
        {offer.promo_price ? (
          <>
            {offer.promo_price}€{" "}
            <span className="text-gray-400 line-through text-lg ml-2">
              {offer.price}€
            </span>
          </>
        ) : (
          <>{offer.price}€</>
        )}
      </div>

      {/* Bloc Stock */}
      {offer.has_stock && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Stock disponible :{" "}
            <span className="font-semibold text-primary">{offer.stock}</span>
          </p>
        </div>
      )}

      {/* Bloc Agenda */}
      {offer.requires_agenda && offer.calendly_url && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Réservez votre créneau</h2>
          <div className="w-full h-[700px] rounded-lg overflow-hidden border">
            <iframe
              src={offer.calendly_url}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Calendly"
            />
          </div>
        </div>
      )}

      {/* Bouton réservation si pas d'agenda */}
      {!offer.requires_agenda && (
        <div className="mt-8">
          <button
            onClick={handleBooking}
            disabled={reserving}
            className="w-full px-6 py-3 bg-primary text-white rounded-full font-medium transition-all duration-300 hover:bg-primary-dark disabled:opacity-50"
          >
            {reserving ? "Réservation..." : "Réserver"}
          </button>
        </div>
      )}
    </div>
  );
}
