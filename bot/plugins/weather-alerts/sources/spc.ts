import type { WeatherAlertData } from "../../../types";

const SPC_BASE = "https://www.spc.noaa.gov";

export class SpcSource {
  name = "spc";
  priority = 20;
  private lastOutlookId: string | null = null;

  async poll(): Promise<WeatherAlertData[]> {
    const results: WeatherAlertData[] = [];
    const day1 = await this.fetchDay1Outlook();
    if (day1) results.push(day1);
    return results;
  }

  private async fetchDay1Outlook(): Promise<WeatherAlertData | null> {
    try {
      const url = `${SPC_BASE}/products/outlook/day1otlk.html`;
      const response = await fetch(url, {
        headers: { "User-Agent": "(WTUS Dashboard, team@weathertrackus.com)" },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const timeMatch = html.match(/<b>Day 1.+?(\d{4}\s+[A-Za-z]+)\s+(\d{4}\s+[A-Za-z]+)/i);
      const riskMatch = html.match(/<b>(General|MRGL|SLGT|ENH|MDT|HIGH)\s+risk/i);
      const titleMatch = html.match(/<title>(.+?)<\/title>/i);

      const now = new Date();
      const outlookId = `${now.toISOString().slice(0, 13)}-day1`;
      if (outlookId === this.lastOutlookId) return null;

      const parts: string[] = [];
      if (timeMatch) parts.push(`Valid: ${timeMatch[1]} - ${timeMatch[2]}`);
      if (riskMatch) parts.push(`Risk: ${riskMatch[1]}`);
      if (titleMatch) parts.push(titleMatch[1]);

      this.lastOutlookId = outlookId;

      return {
        eventType: "spc_outlook",
        sourceEventId: outlookId,
        sourceName: this.name,
        title: parts.length > 0 ? parts.join(" | ") : `SPC Day 1 Outlook ${now.toISOString().slice(0, 13)}Z`,
        description: `SPC Day 1 Convective Outlook\n${parts.join("\n")}`,
        severity: this.severityFromRisk(riskMatch?.[1] ?? ""),
        rawPayload: { source: "spc", outlookType: "day1", fetchedAt: now.toISOString() },
      };
    } catch (error) {
      console.error("[SpcSource] fetch failed:", error);
      return null;
    }
  }

  private severityFromRisk(risk: string): string {
    const map: Record<string, string> = {
      GENERAL: "minor",
      MRGL: "minor",
      SLGT: "moderate",
      ENH: "moderate",
      MDT: "severe",
      HIGH: "extreme",
    };
    return map[risk.toUpperCase()] ?? "minor";
  }
}
