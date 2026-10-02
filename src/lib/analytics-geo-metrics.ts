import { EU_COUNTRY_CODES, isEuCountry } from "@/lib/geo-eu";
import { getSql } from "@/lib/db";

type MetricsAudience = "visitor" | "internal" | "all";

export type GeoCountryRow = {
  country: string;
  uniqueVisitors: number;
};

export type GeoUsRegionRow = {
  region: string;
  uniqueVisitors: number;
};

export type GeoEuSubregionRow = {
  country: string;
  region: string;
  uniqueVisitors: number;
};

export type GeoMetrics7d = {
  countries: GeoCountryRow[];
  usRegions: GeoUsRegionRow[];
  euCountries: GeoCountryRow[];
  euSubregions: GeoEuSubregionRow[];
  unknownGeoVisitors: number;
  geoKnownVisitors: number;
};

type FirstTouchRow = {
  geo_country: string | null;
  geo_region: string | null;
};

async function queryFirstTouchGeo(
  audience: MetricsAudience,
): Promise<FirstTouchRow[]> {
  const sql = getSql();

  if (audience === "internal") {
    return (await sql`
      SELECT DISTINCT ON (visitor_id)
        geo_country,
        geo_region
      FROM analytics_events
      WHERE event_name = 'page_view'
        AND created_at >= now() - interval '7 days'
        AND visitor_id IS NOT NULL
        AND audience = 'internal'
      ORDER BY visitor_id, created_at ASC
    `) as FirstTouchRow[];
  }

  if (audience === "all") {
    return (await sql`
      SELECT DISTINCT ON (visitor_id)
        geo_country,
        geo_region
      FROM analytics_events
      WHERE event_name = 'page_view'
        AND created_at >= now() - interval '7 days'
        AND visitor_id IS NOT NULL
      ORDER BY visitor_id, created_at ASC
    `) as FirstTouchRow[];
  }

  return (await sql`
    SELECT DISTINCT ON (visitor_id)
      geo_country,
      geo_region
    FROM analytics_events
    WHERE event_name = 'page_view'
      AND created_at >= now() - interval '7 days'
      AND visitor_id IS NOT NULL
      AND audience = 'visitor'
    ORDER BY visitor_id, created_at ASC
  `) as FirstTouchRow[];
}

export async function fetchGeoMetrics7d(
  audience: MetricsAudience = "visitor",
): Promise<GeoMetrics7d> {
  const rows = await queryFirstTouchGeo(audience);

  const countryCounts = new Map<string, number>();
  const usRegionCounts = new Map<string, number>();
  const euCountryCounts = new Map<string, number>();
  const euSubCounts = new Map<string, number>();

  let unknown = 0;

  for (const row of rows) {
    const country = row.geo_country?.trim().toUpperCase() || null;
    const region = row.geo_region?.trim().toUpperCase() || null;

    if (!country) {
      unknown += 1;
      continue;
    }

    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);

    if (country === "US" && region) {
      usRegionCounts.set(region, (usRegionCounts.get(region) ?? 0) + 1);
    }

    if (isEuCountry(country)) {
      euCountryCounts.set(country, (euCountryCounts.get(country) ?? 0) + 1);
      if (region) {
        const key = `${country}|${region}`;
        euSubCounts.set(key, (euSubCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const sortDesc = (a: { uniqueVisitors: number }, b: { uniqueVisitors: number }) =>
    b.uniqueVisitors - a.uniqueVisitors;

  const countries = [...countryCounts.entries()]
    .map(([country, uniqueVisitors]) => ({ country, uniqueVisitors }))
    .sort(sortDesc);

  const usRegions = [...usRegionCounts.entries()]
    .map(([region, uniqueVisitors]) => ({ region, uniqueVisitors }))
    .sort(sortDesc);

  const euCountries = [...euCountryCounts.entries()]
    .map(([country, uniqueVisitors]) => ({ country, uniqueVisitors }))
    .sort(sortDesc);

  const euSubregions = [...euSubCounts.entries()]
    .map(([key, uniqueVisitors]) => {
      const [country, region] = key.split("|");
      return { country: country!, region: region!, uniqueVisitors };
    })
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || a.country.localeCompare(b.country));

  return {
    countries,
    usRegions,
    euCountries,
    euSubregions,
    unknownGeoVisitors: unknown,
    geoKnownVisitors: rows.length - unknown,
  };
}

/** For docs / admin footnotes */
export function euCountryCount(): number {
  return EU_COUNTRY_CODES.size;
}
