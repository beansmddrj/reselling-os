export type ReleaseNote = {
  version: string;
  releasedOn: string;
  status: "Installed" | "Platform update";
  summary: string;
  changes: string[];
};

// This is intentionally curated rather than derived from Git at runtime so
// operators get a readable, stable explanation of what reached production.
export const releaseNotes: ReleaseNote[] = [
  {
    version: "v0.1.6",
    releasedOn: "September 2, 2026",
    status: "Installed",
    summary: "Workspace health monitoring",
    changes: [
      "Signed-in application errors can be captured as safe diagnostics for workspace owners and admins.",
      "The Admin Control Center now shows recent error reports without exposing passwords, inventory details, financial data, or stack traces.",
      "New accounts require a 12-character password in the app. Public-beta traffic still needs a distributed rate limit and external alerts.",
    ],
  },
  {
    version: "v0.1.5",
    releasedOn: "September 2, 2026",
    status: "Installed",
    summary: "Business tenant boundary",
    changes: [
      "Inventory, intake drafts, sales records, shipments, expenses, activity, and private media now use the shared Business workspace boundary.",
      "Workspace membership is enforced in the database and private photo storage—not only in the interface.",
      "Owner-only costs, profit, expenses, and shipment capital stay private.",
    ],
  },
  {
    version: "v0.1.4",
    releasedOn: "September 2, 2026",
    status: "Installed",
    summary: "Settings foundation",
    changes: [
      "Added a Settings control center for workspace, team, workflow, and account controls.",
      "Added editable business and display names.",
      "Prepared the platform for a dedicated admin surface.",
    ],
  },
  {
    version: "v0.1.3",
    releasedOn: "September 1, 2026",
    status: "Installed",
    summary: "Inbound shipments and owner finances",
    changes: [
      "Track incoming shipments, packages, receipts, and projected value.",
      "Added owner-only operating-expense ledger and protected financial reporting.",
    ],
  },
  {
    version: "v0.1.2",
    releasedOn: "September 1, 2026",
    status: "Installed",
    summary: "Repeat stock and Sold Moments",
    changes: [
      "Repeat listings support quantity, size-specific stock, and zero-stock recovery.",
      "Optional Sold Moments archive a photo with a sale without cluttering inventory.",
    ],
  },
  {
    version: "v0.1.1",
    releasedOn: "September 1, 2026",
    status: "Installed",
    summary: "Shared workspace",
    changes: [
      "Added individual logins, teammate invitations, and shared operational inventory.",
      "Separated team-visible sales activity from the owner’s private financial details.",
    ],
  },
];
