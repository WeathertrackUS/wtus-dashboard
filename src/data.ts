import type { AvailabilityWindow, LiveEvent, Member, SectionKey, Task, TemporaryCoverage } from "./types";

export const sections: Array<{ key: SectionKey; name: string; description: string }> = [
  { key: "finance", name: "Finance", description: "Budget, subscriptions, and expense tracking" },
  { key: "forecasting", name: "Forecasting", description: "Forecast packages and event outlooks" },
  { key: "nowcasting", name: "Nowcasting", description: "Real-time monitoring and short-fuse updates" },
  { key: "youtube", name: "YouTube", description: "Stream planning, uploads, and live support" },
  { key: "graphics", name: "Graphics", description: "Visual products, templates, and brand assets" },
  { key: "facebook", name: "Facebook", description: "Posts, comments, and platform coverage" },
  { key: "development", name: "Development", description: "Internal tools and site/app improvements" },
  { key: "verification", name: "Verification", description: "Report validation and source checks" },
];

export const initialMembers: Member[] = [];
export const initialTasks: Task[] = [];
export const initialAvailability: AvailabilityWindow[] = [];
export const initialEvents: LiveEvent[] = [];
export const initialCoverage: TemporaryCoverage[] = [];
