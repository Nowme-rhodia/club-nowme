
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const sig = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Erreur de vérification de la signature Stripe", err);
    return new Response("Signature invalide", { status: 400 });
  }

  const evtType = event.type;
  const data = event.data.object;

  // Log dans stripe_webhook_events
  await supabase.from("stripe_webhook_events").insert({
    event_type: evtType,
    payload: data,
  });

  const findUserByCustomerId = async (customerId: string) => {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return profile;
  };

  switch (evtType) {
    case "checkout.session.completed": {
      const email = data.customer_email;
      const customerId = data.customer;

      if (!email || !customerId) break;

      // Vérifie si l'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!existingUser) {
        // Crée le compte dans Supabase Auth
        const { data: createdUser } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
        });

        if (createdUser?.user?.id) {
          await supabase.from("user_profiles").insert({
            id: createdUser.user.id,
            email,
            stripe_customer_id: customerId,
            subscription_status: "active",
            subscription_type: "premium",
          });

          // Envoie du lien de création de mot de passe
          await supabase.auth.admin.generateLink({
            type: "signup",
            email,
            options: {
              redirectTo: "https://club.nowme.fr/auth/update-password",
            },
          });
        }
      } else {
        await supabase
          .from("user_profiles")
          .update({
            stripe_customer_id: customerId,
            subscription_status: "active",
            subscription_type: "premium",
          })
          .eq("email", email);
      }

      break;
    }

    case "customer.subscription.created": {
      const customerId = data.customer;
      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          subscription_type: data.items?.data?.[0]?.price?.nickname || "premium",
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.deleted": {
      const customerId = data.customer;
      await supabase
        .from("user_profiles")
        .update({ subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.paused": {
      const customerId = data.customer;
      await supabase
        .from("user_profiles")
        .update({ subscription_status: "paused" })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "invoice.payment_failed": {
      const customerId = data.customer;
      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "past_due",
          payment_failed_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "invoice.payment_succeeded": {
      const customerId = data.customer;
      await supabase
        .from("user_profiles")
        .update({ subscription_status: "active" })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return new Response("OK", { status: 200 });
});
