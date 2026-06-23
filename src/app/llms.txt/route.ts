import { siteConfig } from "@/lib/site";

export function GET() {
  const body = `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name} is a report-centric chess improvement platform with hybrid analysis, Problem to Perfect drills, saved game reports, AI coach snapshots, weekly digests, and yearly wrapped summaries.

## Core Products

- /analyze: Quick and deep game analysis from PGN, Chess.com, or Lichess
- /puzzles: Problem to Perfect tactical training
- /coach: Five-pillar coaching snapshot with daily plan
- /games: Saved report library
- /more: Share and experimental tools kept outside the focused analysis report
- /u/[username]: Public Problem to Perfect profile

## Tools

- /board: Analysis board
- /editor: Position editor
- /next-move: Single-position best move tool
- /daily: Daily perfect-move streak loop

## Business

- /pricing: Subscription tiers
- /privacy-policy: Privacy practices
- /tos: Terms of service
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
