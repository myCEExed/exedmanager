/**
 * Utility to translate Supabase auth error messages to French
 */

const AUTH_ERROR_TRANSLATIONS: Record<string, string> = {
  // Sign up errors
  "User already registered": "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
  "Email already registered": "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
  "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
  "Password should be at least 8 characters": "Le mot de passe doit contenir au moins 8 caractères.",
  "Signup requires a valid password": "Veuillez entrer un mot de passe valide.",
  "Email rate limit exceeded": "Trop de tentatives. Veuillez réessayer plus tard.",
  
  // Sign in errors
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter.",
  "Invalid email or password": "Email ou mot de passe incorrect.",
  
  // Token/session errors
  "Invalid Refresh Token: Refresh Token Not Found": "Session expirée. Veuillez vous reconnecter.",
  "Token has expired or is invalid": "Session expirée. Veuillez vous reconnecter.",
  
  // Rate limiting
  "For security purposes, you can only request this once every 60 seconds": "Pour des raisons de sécurité, veuillez attendre 60 secondes avant de réessayer.",
  "Too many requests": "Trop de tentatives. Veuillez réessayer plus tard.",
  
  // Generic errors
  "Unable to validate email address: invalid format": "Format d'adresse email invalide.",
  "A user with this email address has already been registered": "Un compte existe déjà avec cette adresse email. Veuillez vous connecter.",
};

/**
 * Translates an auth error message to French
 * @param errorMessage - The original error message from Supabase
 * @returns The translated message in French, or the original if no translation exists
 */
export function translateAuthError(errorMessage: string): string {
  // Check for exact match first
  if (AUTH_ERROR_TRANSLATIONS[errorMessage]) {
    return AUTH_ERROR_TRANSLATIONS[errorMessage];
  }
  
  // Check for partial matches (some errors have dynamic parts)
  for (const [key, translation] of Object.entries(AUTH_ERROR_TRANSLATIONS)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }
  
  // Return original message if no translation found
  return errorMessage;
}

/**
 * Checks if the error indicates the user already exists
 * @param errorMessage - The error message to check
 * @returns true if the error indicates an existing user
 */
export function isUserAlreadyExistsError(errorMessage: string): boolean {
  const existsPatterns = [
    "User already registered",
    "Email already registered",
    "has already been registered",
  ];
  
  return existsPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}
