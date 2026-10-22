import { useEffect, useState } from 'react';

// Approximate display-only conversion rate for showing USD equivalents
// next to INR prices. The actual charge is always in INR via Razorpay;
// the customer's bank handles the conversion.
const INR_PER_USD = 83;

interface CountryInfo {
  country: string | null;
  /** True for Indian visitors, or when geo lookup is unavailable (safe default). */
  isIndia: boolean;
  loaded: boolean;
}

let cached: CountryInfo | null = null;
let inflight: Promise<CountryInfo> | null = null;

function fetchCountry(): Promise<CountryInfo> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch('/api/config')
    .then(r => (r.ok ? r.json() : {}))
    .then(d => {
      const country = typeof d.country === 'string' ? d.country : null;
      cached = {
        country,
        isIndia: typeof d.isIndia === 'boolean' ? d.isIndia : true,
        loaded: true,
      };
      return cached;
    })
    .catch(() => {
      cached = { country: null, isIndia: true, loaded: true };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Visitor's country (from server geo headers) for country-aware payment UX. */
export function useCountry(): CountryInfo {
  const [info, setInfo] = useState<CountryInfo>(
    cached || { country: null, isIndia: true, loaded: false }
  );
  useEffect(() => {
    fetchCountry().then(setInfo);
  }, []);
  return info;
}

/** e.g. 299 -> "≈ $3.60" (display only; charge stays in INR). */
export function usdApprox(inr: number): string {
  return `\u2248 $${(inr / INR_PER_USD).toFixed(2)}`;
}

/** e.g. 299 -> "₹299" */
export function inr(inrAmount: number): string {
  return `\u20B9${inrAmount}`;
}
