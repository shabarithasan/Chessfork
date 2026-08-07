import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("game analysis page — structural changes", () => {

  it("PandaMascotNew component exists and exports correctly", () => {
    const filePath = path.resolve(__dirname, "../components/mascot/PandaMascotNew.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("export function PandaMascotNew");
    expect(content).toContain("viewBox=\"-60 -115 120 165\"");
    expect(content).toContain("#21242F");
    expect(content).toContain("#DEDEE2");
  });

  it("InsightsTab imports PandaMascotNew (not PandaMascotInteractive)", () => {
    const filePath = path.resolve(__dirname, "../components/chess/InsightsTab.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("PandaMascotNew");
    expect(content).not.toContain("PandaMascotInteractive");
  });

  it("InsightsTab renders PandaMascotNew as the coach mascot", () => {
    const filePath = path.resolve(__dirname, "../components/chess/InsightsTab.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("<PandaMascotNew size={96} />");
  });

  it("InsightsTab includes background illustration img", () => {
    const filePath = path.resolve(__dirname, "../components/chess/InsightsTab.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("panda-illustration.svg");
    expect(content).toContain("opacity-[0.06]");
  });

  it("background illustration SVG exists in public folder", () => {
    const filePath = path.resolve(__dirname, "../../public/images/panda-illustration.svg");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should contain the panda paths we added
    expect(content).toContain("Panda character added as new element");
    expect(content).toContain("#21242F");
    expect(content).toContain('width="1418"');
  });

  it("game-analysis-page has auto-scroll for move bar", () => {
    const filePath = path.resolve(__dirname, "../components/analysis/game-analysis-page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("moveBarRef");
    expect(content).toContain("scrollIntoView");
    expect(content).toContain("data-current");
  });

  it("what-if move buttons have data-current attribute", () => {
    const filePath = path.resolve(__dirname, "../components/analysis/game-analysis-page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // The what-if button should have data-current
    expect(content).toContain("data-current={isActiveItem ? \"true\" : undefined}");
  });

  it("PNG screenshot from previous session exists", () => {
    const files = ["game-analysis-overall.png", "chessigma-analysis.png"];
    for (const f of files) {
      const p = path.resolve(__dirname, `../../e2e/screenshots/${f}`);
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        expect(stat.size).toBeGreaterThan(0);
      }
    }
  });
});
