/**
 * Zambia place search — forward-geocodes free text ("Makeni", "Manda Hill")
 * to a short list of Zambian place candidates via OpenStreetMap Nominatim,
 * the same engine the inquiry flow's Area/Landmark field uses
 * (LocationDetails.tsx). Extracted lean so any typeahead (e.g. the event
 * venue field) can suggest real places and pin their coordinates without
 * dragging in the province/city mapping the inquiry flow needs.
 */

export interface ZambiaPlace {
  id: string;
  /** Short label — "Makeni Mall". */
  name: string;
  /** Context line — "Makeni, Lusaka" (trimmed from the full display name). */
  detail: string;
  latitude: number;
  longitude: number;
}

/**
 * Callers must pass an AbortController signal and treat AbortError as
 * "no results yet" so a fast typist's stale requests never clobber a later,
 * more specific query. Queries under 3 characters return [] without a
 * network call.
 */
export async function searchZambiaPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<ZambiaPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=zm&accept-language=en&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((r: any) => r?.address?.country_code === 'zm')
      .map((r: any): ZambiaPlace => {
        const displayName: string = r.display_name || '';
        const name: string = r.name || displayName.split(',')[0]?.trim() || trimmed;
        // Context = the two display-name segments after the name, minus the
        // trailing ", Zambia" noise every result carries.
        const detail = displayName
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s && s !== name && !/^zambia$/i.test(s) && !/^\d{5,}$/.test(s))
          .slice(0, 2)
          .join(', ');
        return {
          id: String(r.place_id ?? `${r.lat},${r.lon}`),
          name,
          detail,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
        };
      })
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return [];
    console.warn('Zambia place search failed:', err);
    return [];
  }
}
