
export const translateError = (error: any): string => {
    const message = error?.message || error?.error_description || String(error);

    if (message.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères.";
    if (message.includes("Password is known to be weak")) return "Ce mot de passe est trop facile à deviner. Veuillez en choisir un plus sécurisé.";
    if (message.includes("User already registered")) return "Un utilisateur avec cette adresse email existe déjà.";
    if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
    if (message.includes("Email not confirmed")) return "Veuillez confirmer votre adresse email avant de vous connecter.";
    if (message.includes("Rate limit exceeded")) return "Trop de tentatives. Veuillez réessayer plus tard.";
    if (message.includes("unique violation")) return "Cette information (email ou pseudo) est déjà utilisée.";

    return "Une erreur est survenue. Veuillez réessayer.";
};
