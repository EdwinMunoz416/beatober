export type GeoFromEdge = {
  country: string | null;
  region: string | null;
};

function header(request: Request, name: string): string | null {
  const v = request.headers.get(name);
  return v?.trim() || null;
}

function normalizeCountry(raw: string | null): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  if (c.length !== 2 || c === "XX") return null;
  return c;
}

/** Vercel edge geo headers (no raw IP stored). */
function normalizeRegion(raw: string | null, country: string | null): string | null {
  if (!raw) return null;
  let r = raw.trim().toUpperCase();
  if (!r) return null;
  if (country && r.startsWith(`${country}-`)) {
    r = r.slice(country.length + 1);
  }
  if (r.length > 12) r = r.slice(0, 12);
  return r;
}

export function geoFromRequest(request: Request): GeoFromEdge {
  const country = normalizeCountry(
    header(request, "x-vercel-ip-country") ??
      header(request, "X-Vercel-IP-Country"),
  );
  const region = normalizeRegion(
    header(request, "x-vercel-ip-country-region") ??
      header(request, "X-Vercel-IP-Country-Region"),
    country,
  );
  return { country, region };
}
