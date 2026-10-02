const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

let regionNames: Intl.DisplayNames | null = null;

function countryNames(): Intl.DisplayNames {
  if (!regionNames) {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  }
  return regionNames;
}

export function formatCountryCode(code: string | null | undefined): string {
  if (!code || code === "unknown") return "Unknown";
  try {
    return countryNames().of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function formatUsRegion(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const c = code.toUpperCase();
  return US_STATE_NAMES[c] ?? c;
}

export function formatGeoChip(
  country: string | null | undefined,
  region: string | null | undefined,
): string {
  const c = country?.toUpperCase();
  if (!c || c === "UNKNOWN") return "Geo unknown";
  const countryLabel = formatCountryCode(c);
  if (c === "US" && region) {
    return `${formatUsRegion(region)}, US`;
  }
  if (region) {
    return `${countryLabel} · ${region}`;
  }
  return countryLabel;
}
