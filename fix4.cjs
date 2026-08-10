const fs = require('fs');

const f6 = 'src/components/analysis/game-analysis-page.tsx';
let c6 = fs.readFileSync(f6, 'utf8');

c6 = c6.replace(/const BADGE_IMG: Record<string, string> = {[\s\S]*?};\n/, '');
c6 = c6.replace(/const GRADE_TO_BADGE: Record<string, string> = {[\s\S]*?};\n/, `const GRADE_TO_LABEL: Record<string, string> = {
  Brilliant: "brilliant",
  Great: "great_find",
  Best: "best",
  Excellent: "excellent",
  Good: "good",
  Book: "book",
  Inaccuracy: "inaccuracy",
  Mistake: "mistake",
  Blunder: "blunder",
  Miss: "miss",
};\n`);

const oldBadge = `function BadgeIcon({ badge, size = 16 }: { badge: string; size?: number }) {
  const src = BADGE_IMG[badge];
  if (!src) return null;
  return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
}`;

const newBadge = `function BadgeIcon({ badge, size = 16 }: { badge: string; size?: number }) {
  if (!badge) return null;
  return <img src={\`/images/brilliance_v2/svg/\${badge}.svg\`} alt="" width={size} height={size} className="shrink-0" />;
}`;

c6 = c6.replace(oldBadge, newBadge);

c6 = c6.replace('badge={GRADE_TO_BADGE[isLiveActive', 'badge={GRADE_TO_LABEL[isLiveActive');
c6 = c6.replace('liveEngine={liveEngine}', '');

// Remove the inner GRADE_TO_LABEL correctly
const innerGradeStart = c6.indexOf('const GRADE_TO_LABEL: Record<string, string> = {', 500);
if (innerGradeStart !== -1) {
  const innerGradeEnd = c6.indexOf('};', innerGradeStart) + 3;
  c6 = c6.substring(0, innerGradeStart) + c6.substring(innerGradeEnd);
}

fs.writeFileSync(f6, c6);
console.log('Done!');
