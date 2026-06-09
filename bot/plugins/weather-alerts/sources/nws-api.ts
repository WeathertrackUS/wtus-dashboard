import type { WeatherAlertData } from "../../../types";

const NWS_API = "https://api.weather.gov";

const WATCH_EVENT_TYPES = new Set([
  "Tornado Warning",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
  "Tornado Watch",
  "Severe Thunderstorm Watch",
]);

interface NwsFeature {
  properties: {
    id: string;
    event: string;
    headline?: string;
    description?: string;
    severity: string;
    areaDesc: string;
    parameters?: Record<string, unknown>;
  };
}

export class NwsApiSource {
  name = "nws-api";
  priority = 10;
  private lastFetch: Date | null = null;

  async poll(): Promise<WeatherAlertData[]> {
    const params = new URLSearchParams({ status: "actual", urgency: "Immediate" });
    const url = `${NWS_API}/alerts/active?${params}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "(WTUS Dashboard, team@weathertrackus.com)" },
    });

    if (!response.ok) {
      console.error(`[NwsApiSource] HTTP ${response.status}`);
      return [];
    }

    const data = (await response.json()) as { features: NwsFeature[] };
    const features = data.features ?? [];
    const seenIds = new Set<string>();
    const results: WeatherAlertData[] = [];

    for (const feature of features) {
      const props = feature.properties;
      const eventType = this.normalizeEventType(props.event);
      if (!eventType || !WATCH_EVENT_TYPES.has(props.event)) continue;

      const sourceEventId = props.id;
      if (seenIds.has(sourceEventId)) continue;
      seenIds.add(sourceEventId);

      results.push({
        eventType,
        sourceEventId,
        sourceName: this.name,
        title: props.headline ?? props.event,
        description: props.description,
        severity: props.severity.toLowerCase(),
        affectedArea: props.areaDesc,
        rawPayload: props,
      });
    }

    this.lastFetch = new Date();
    return results;
  }

  private normalizeEventType(event: string): string | null {
    const map: Record<string, string> = {
      "Tornado Warning": "tornado_warning",
      "Severe Thunderstorm Warning": "severe_thunderstorm_warning",
      "Flash Flood Warning": "flash_flood_warning",
      "Tornado Watch": "tornado_watch",
      "Severe Thunderstorm Watch": "severe_thunderstorm_watch",
    };
    return map[event] ?? null;
  }
}
