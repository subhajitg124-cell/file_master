export type FeatureKey =
  | "whatsapp"
  | "digilocker"
  | "autofill"
  | "voice"
  | "scanner"
  | "qr"
  | "aadhaar"
  | "exam"
  | "cafe"
  | "bulk"
  | "assistant"
  | "security";

export type FeatureFlags = Record<FeatureKey, boolean>;

const featureSets: Record<string, FeatureFlags> = {
  development: {
    whatsapp: true,
    digilocker: true,
    autofill: true,
    voice: true,
    scanner: true,
    qr: true,
    aadhaar: true,
    exam: true,
    cafe: true,
    bulk: true,
    assistant: true,
    security: true,
  },
  staging: {
    whatsapp: true,
    digilocker: false,
    autofill: true,
    voice: true,
    scanner: false,
    qr: true,
    aadhaar: true,
    exam: false,
    cafe: false,
    bulk: true,
    assistant: true,
    security: true,
  },
  production: {
    whatsapp: true,
    digilocker: false,
    autofill: true,
    voice: true,
    scanner: false,
    qr: true,
    aadhaar: true,
    exam: false,
    cafe: false,
    bulk: true,
    assistant: true,
    security: true,
  },
  test: {
    whatsapp: true,
    digilocker: true,
    autofill: true,
    voice: true,
    scanner: true,
    qr: true,
    aadhaar: true,
    exam: true,
    cafe: true,
    bulk: true,
    assistant: true,
    security: true,
  },
};

const env = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "production") as string;
export const featureFlags: FeatureFlags = featureSets[env] ?? featureSets.production;

export function isFeatureEnabled(key: FeatureKey) {
  return featureFlags[key] ?? false;
}

export const enabledFeatureKeys = Object.keys(featureFlags).filter(
  (key) => featureFlags[key as FeatureKey]
) as FeatureKey[];

export const isLowBandwidthMode = import.meta.env.VITE_LOW_BANDWIDTH === "true";
