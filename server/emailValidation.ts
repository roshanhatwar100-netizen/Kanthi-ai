// Disposable and temporary email domain blacklist
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'mailinator.net',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'fakeinbox.com',
  'getnada.com',
  'dispostable.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'inboxkitten.com',
  'crazymailing.com',
  'fakemailgenerator.com',
  'mohmal.com',
  'burnermail.io',
  'mytemp.email',
  'generator.email',
  'emailfake.com',
  'tempail.com',
  'dropmail.me',
  'nada.ltd',
  'getairmail.com',
  'zillamail.com',
  'discard.email',
  'disdiscard.com',
  'spambog.com',
  'tempr.email',
  'trash-mail.com',
  'byom.de',
  'minutemail.com',
  'mytempmail.com',
  'oneoffmail.com',
  'maildrop.cc',
  'harakirimail.com',
  'tmail.ws',
  'tmpmail.net',
  'tmpmail.org'
]);

// Strict RFC-compliant regex for valid real emails
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  domain?: string;
}

export function validateRealEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic syntax check
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address format.' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address structure.' };
  }

  const [localPart, domain] = parts;

  // Minimum lengths
  if (localPart.length < 1 || domain.length < 3) {
    return { isValid: false, error: 'Email address is too short.' };
  }

  // TLD check (must have dot and at least 2 char TLD)
  if (!domain.includes('.') || domain.endsWith('.')) {
    return { isValid: false, error: 'Email address must contain a valid top-level domain.' };
  }

  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) {
    return { isValid: false, error: 'Invalid domain extension.' };
  }

  // Check against known disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      domain,
      error: 'Temporary or disposable email addresses are not permitted. Please use your genuine Google, work, or personal email address (e.g. Gmail, Outlook, iCloud, Yahoo, or corporate email).'
    };
  }

  // Check disposable subdomains or suspicious disposable keywords
  if (
    domain.includes('disposable') ||
    domain.includes('temporary') ||
    domain.includes('throwaway') ||
    domain.includes('fakeinbox') ||
    domain.includes('trashmail') ||
    domain.includes('10min') ||
    domain.includes('guerrilla') ||
    localPart.endsWith('+temp')
  ) {
    return {
      isValid: false,
      domain,
      error: 'Temporary or disposable email providers are blocked. Please sign in with your permanent real email address.'
    };
  }

  return { isValid: true, domain };
}
