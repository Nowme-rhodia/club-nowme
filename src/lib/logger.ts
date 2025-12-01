// Système de logging centralisé pour debug
// Active/désactive avec la variable d'environnement ou en dev

const isDev = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true';

export const logger = {
  // 🔵 Logs d'authentification
  auth: {
    sessionCheck: (session: any) => {
      if (isDev) console.log('🔐 [AUTH] Session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        timestamp: new Date().toISOString()
      });
    },
    
    signUp: (step: string, data?: any) => {
      if (isDev) console.log(`📝 [AUTH] SignUp - ${step}:`, data);
    },
    
    signIn: (step: string, data?: any) => {
      if (isDev) console.log(`🔓 [AUTH] SignIn - ${step}:`, data);
    },
    
    signOut: () => {
      if (isDev) console.log('👋 [AUTH] User signed out');
    },
    
    profileLoad: (profile: any) => {
      if (isDev) console.log('👤 [AUTH] Profile loaded:', {
        userId: profile?.user_id,
        firstName: profile?.first_name,
        role: profile?.role,
        subscriptionStatus: profile?.subscription_status,
        isAdmin: profile?.is_admin
      });
    },
    
    stateChange: (event: string, session: any) => {
      if (isDev) console.log(`🔄 [AUTH] State change - ${event}:`, {
        hasSession: !!session,
        userId: session?.user?.id
      });
    }
  },

  // 💳 Logs de paiement
  payment: {
    checkoutStart: (plan: string, email: string) => {
      if (isDev) console.log('💳 [PAYMENT] Checkout started:', { plan, email });
    },
    
    stripeRedirect: (sessionId: string) => {
      if (isDev) console.log('🔀 [PAYMENT] Redirecting to Stripe:', { sessionId });
    },
    
    verification: (step: string, data?: any) => {
      if (isDev) console.log(`✅ [PAYMENT] Verification - ${step}:`, data);
    },
    
    webhookReceived: (event: string, data?: any) => {
      if (isDev) console.log(`🪝 [PAYMENT] Webhook - ${event}:`, data);
    }
  },

  // 🧭 Logs de navigation
  navigation: {
    redirect: (from: string, to: string, reason: string) => {
      if (isDev) console.log(`🧭 [NAV] Redirect: ${from} → ${to}`, { reason });
    },
    
    pageLoad: (page: string, params?: any) => {
      if (isDev) console.log(`📄 [NAV] Page loaded: ${page}`, params);
    },
    
    userAction: (action: string, details?: any) => {
      if (isDev) console.log(`👆 [NAV] User action: ${action}`, details);
    }
  },

  // 🗄️ Logs de données
  data: {
    fetch: (resource: string, params?: any) => {
      if (isDev) console.log(`📥 [DATA] Fetching ${resource}:`, params);
    },
    
    update: (resource: string, data?: any) => {
      if (isDev) console.log(`📤 [DATA] Updating ${resource}:`, data);
    },
    
    error: (resource: string, error: any) => {
      console.error(`❌ [DATA] Error with ${resource}:`, error);
    }
  },

  // ⚠️ Logs d'erreurs (toujours actifs)
  error: (context: string, error: any, details?: any) => {
    console.error(`❌ [ERROR] ${context}:`, error, details);
  },

  // ⚠️ Logs d'avertissement
  warn: (context: string, message: string, details?: any) => {
    if (isDev) console.warn(`⚠️ [WARN] ${context}: ${message}`, details);
  },

  // ℹ️ Logs d'info généraux
  info: (context: string, message: string, details?: any) => {
    if (isDev) console.log(`ℹ️ [INFO] ${context}: ${message}`, details);
  }
};
