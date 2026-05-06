// Disposable email domain blocklist
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "maildrop.cc",
  "trashmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "spam4.me",
  "getnada.com",
  "temp-mail.org",
  "fakeinbox.com",
  "emailondeck.com",
  "mailcatch.com",
  "dispostable.com",
  "spamgourmet.com",
  "mintemail.com",
  "mytemp.email",
  "moakt.com",
  "tempr.email",
  "emailtemporary.com",
  "mohmal.com",
];

const SUSPICIOUS_PREFIXES = ["test", "fake", "spam", "asdf", "qwerty", "temp"];
const BLOCKED_TLDS = [".test", ".invalid", ".example"];

export function isValidEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: "Please enter a valid email address." };
  }

  const [local, domain] = email.toLowerCase().split("@");

  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, reason: "Please use a real email address. Disposable emails are not allowed." };
  }

  if (BLOCKED_TLDS.some((tld) => domain.endsWith(tld))) {
    return { valid: false, reason: "Please use a real email address." };
  }

  if (SUSPICIOUS_PREFIXES.some((p) => local.startsWith(p))) {
    return { valid: false, reason: "Please use your real email address." };
  }

  if (local.length < 3) {
    return { valid: false, reason: "Email address looks invalid." };
  }

  return { valid: true };
}

// Password strength
export interface PasswordCheck {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function checkPassword(pw: string): PasswordCheck {
  return {
    minLength: pw.length >= 8,
    hasNumber: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  const c = checkPassword(pw);
  return c.minLength && c.hasNumber && c.hasSpecial;
}

export function passwordStrength(pw: string): "Weak" | "Medium" | "Strong" {
  const c = checkPassword(pw);
  const met = [c.minLength, c.hasNumber, c.hasSpecial].filter(Boolean).length;
  if (met <= 1) return "Weak";
  if (met === 2) return "Medium";
  return pw.length >= 12 ? "Strong" : "Strong";
}
