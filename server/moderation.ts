export interface ModerationResult {
  status: 'safe' | 'review' | 'blocked';
  reason?: string;
  flaggedCategories?: string[];
}

// Prohibited terms for severe safety categories
const BLOCKED_PATTERNS = [
  /\b(csam|child\s*abuse|child\s*sexual|pedophil|pedo)\b/i,
  /\b(suicide|self-harm|cutting\s*veins|hang\s*myself)\b/i,
  /\b(bomb\s*making|explosives\s*blueprint|terrorist\s*attack|assassinate\s*president)\b/i,
  /\b(beheading|gore\s*decapitation|snuff\s*film)\b/i,
  /\b(deepfake\s*nude|non-consensual\s*sexual)\b/i,
  // Safe filter: sexually explicit generations are never allowed.
  /\b(nude|naked|nsfw|explicit|erotic|porn|pornograph\w*|hentai|blowjob|orgasm|masturbat\w*|sexual\s*(content|act|intercourse|arousal)|sex\s*(scene|act|position))\b/i,
];

const REVIEW_PATTERNS = [
  /\b(blood|weapons|gun|knife)\b/i
];

export function checkContentSafety(prompt: string, negativePrompt?: string): ModerationResult {
  const fullText = `${prompt || ''} ${negativePrompt || ''}`.toLowerCase();

  // Check hard blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullText)) {
      return {
        status: 'blocked',
        reason: 'Prompt violates safety policy. Generation prohibited.',
        flaggedCategories: ['severe_harm_prevention']
      };
    }
  }

  // Check review/sensitive patterns
  for (const pattern of REVIEW_PATTERNS) {
    if (pattern.test(fullText)) {
      return {
        status: 'review',
        reason: 'Prompt contains sensitive keywords. Please ensure creative context.',
        flaggedCategories: ['sensitive_content']
      };
    }
  }

  return { status: 'safe' };
}
