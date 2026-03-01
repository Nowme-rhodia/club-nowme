import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const EMAILS = {
  STEP_1: {
    subject: "On s'est manqué de peu ? ✨",
    heading: "On s'est manqué de peu ?",
    body: (name, link) => `
            <p>Hello ${name},</p>
            <p>J'ai vu que tu avais commencé à pousser la porte du Club mais que tu t'es arrêtée en chemin.</p>
            <p>Un imprévu ? Ton café qui a débordé ? Pas d'inquiétude, ta place est toujours au chaud.</p>
            <p>On a hâte de t'accueillir !</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">
                    Je finalise mon inscription
                </a>
            </div>
        `
  },
  STEP_2: {
    subject: "Prête à vivre ton premier kiff ? 🌈",
    heading: "Les nouveaux kiffs sont là !",
    body: (name, link) => `
            <p>Coucou ${name},</p>
            <p>Les nouveaux kiffs de la semaine viennent de tomber et ils sont canons ! Ce serait dommage de rater ça.</p>
            <p>En rejoignant le club aujourd'hui, tu accèdes immédiatement à tous nos tarifs préf' et aux événements.</p>
            <p>On t'attend ?</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">
                    Je rejoins le Club
                </a>
            </div>
        `
  },
  STEP_3: {
    subject: "Une dernière petite chose... ❤️",
    heading: "Une dernière petite chose...",
    body: (name, link) => `
            <p>Hello ${name},</p>
            <p>C'est la dernière fois que je viens titiller ta boîte mail. Je voulais juste te dire que Nowme, c'est bien plus qu'un abonnement, c'est ton nouveau QG pour prendre soin de toi.</p>
            <p>Si tu as la moindre question ou un blocage, réponds-moi juste ici !</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">
                    Allez, je me lance !
                </a>
            </div>
        `
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const debugLogs: string[] = [] // Store logs for response
  const log = (msg: string) => {
    console.log(msg)
    debugLogs.push(msg)
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    log("🚀 Starting 3-step sequence check (Debug Enhanced)...")

    // FETCHING BROADLY to avoid silent filter issues
    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, user_id, email, first_name, selected_plan, created_at, reminder_step, last_reminder_sent_at, is_admin, partner_id, subscriptions(status)')
      // We removed strict 'is null' checks to catch 'false' or other cases
      .not('selected_plan', 'is', null)
      .limit(50)

    if (fetchError) {
      throw fetchError
    }

    log(`🔎 Found ${users?.length || 0} total potential candidates. Filtering now...`)

    const now = new Date()
    const results = []

    for (const user of users || []) {
      const email = user.email || 'no-email';

      // FILTER: Admin / Partner in JS
      if (user.is_admin === true || !!user.partner_id) {
        log(`Skipped ${email}: Is Admin or Partner`)
        continue; // Skip silently (or log in debug)
      }

      // 1. Check Subscription Status
      const subs = user.subscriptions
      const hasActiveSub = Array.isArray(subs)
        ? subs.some(s => s.status === 'active' || s.status === 'trialing')
        : (subs?.status === 'active' || subs?.status === 'trialing')

      if (hasActiveSub) {
        log(`Skipped ${email}: Has active subscription`)
        continue;
      }

      // 2. Check Timing & Determine Step
      const createdAt = new Date(user.created_at)
      // Fix: if created_at is invalid
      if (isNaN(createdAt.getTime())) {
        log(`Skipped ${email}: Invalid created_at`)
        continue
      }

      const currentStep = user.reminder_step || 0

      let emailConfig = null
      let nextStep = 0

      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      const daysSinceCreation = hoursSinceCreation / 24

      log(`Checking ${email}: Step=${currentStep}, Hours=${hoursSinceCreation.toFixed(1)}, Days=${daysSinceCreation.toFixed(1)}`)

      // LOGIC
      // Step 1: > 1 hour after creation, if step is 0
      if (currentStep === 0 && hoursSinceCreation >= 1) {
        emailConfig = EMAILS.STEP_1
        nextStep = 1
      }
      // Step 2: > 3 days after creation, if step is 1
      else if (currentStep === 1 && daysSinceCreation >= 3) {
        emailConfig = EMAILS.STEP_2
        nextStep = 2
      }
      // Step 3: > 15 days after creation, if step is 2
      else if (currentStep === 2 && daysSinceCreation >= 15) {
        emailConfig = EMAILS.STEP_3
        nextStep = 3
      } else {
        log(`Skipped ${email}: No timing match next step.`)
      }

      if (!emailConfig) continue;

      // Send Email
      try {
        if (!user.email) continue

        log(`📧 SENDING Step ${nextStep} to ${user.email}...`)

        // Fallback URL if env var is missing
        const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://club.nowme.fr"
        if (!Deno.env.get("PUBLIC_SITE_URL")) {
          log("⚠️ WARNING: PUBLIC_SITE_URL is missing. Using fallback: " + baseUrl)
        }

        // SMART LINK: Send to SignIn with email pre-filled + next redirect to checkout
        // This avoids the "Signup" redirection loop and bad UX
        const encodedEmail = encodeURIComponent(user.email);
        const nextUrl = encodeURIComponent(`/checkout?plan=${user.selected_plan || 'monthly'}`);
        const checkoutLink = `${baseUrl}/auth/signin?email=${encodedEmail}&next=${nextUrl}`

        const firstName = user.first_name || "Future membre"

        const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
                        <h1 style="color: #BE185D;">${emailConfig.heading}</h1>
                        ${emailConfig.body(firstName, checkoutLink)}
                         <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
                            <a href="${baseUrl}" style="color: #9ca3af; text-decoration: none;">club.nowme.fr</a>
                        </p>
                    </div>
                `

        const { error: sendError } = await resend.emails.send({
          from: "Nowme <contact@nowme.fr>",
          to: [user.email],
          subject: emailConfig.subject,
          html: html,
        })

        if (sendError) {
          log(`❌ Send Error ${user.email}: ${sendError.message}`)
          results.push({ email: user.email, status: 'failed', step: nextStep, error: sendError })
        } else {
          // Update DB
          await supabase.from('user_profiles').update({
            reminder_step: nextStep,
            last_reminder_sent_at: new Date().toISOString()
          }).eq('id', user.id)

          log(`✅ Success ${user.email} -> Step ${nextStep}`)
          results.push({ email: user.email, status: 'sent', step: nextStep })
        }

      } catch (err) {
        log(`❌ Critical Error ${user.email}: ${err.message}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      candidatesFound: users?.length,
      results,
      debug_logs: debugLogs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
