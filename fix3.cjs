const fs = require('fs');
let code = fs.readFileSync('src/components/analysis/game-analysis-page.tsx', 'utf8');

// Find BestMoveButton position to know where BadgeIcon should end
const bestMoveIdx = code.indexOf('function BestMoveButton');
const beforeBadgeIcon = code.substring(0, code.indexOf('function BadgeIcon'));
const afterBadgeIcon = code.substring(bestMoveIdx);

const newBadgeIcon = `function BadgeIcon({ badge, size = 16 }: { badge: string; size?: number }) {
  if (!badge) return null;
  return <img src={\`/images/brilliance_v2/svg/\${badge}.svg\`} alt="" width={size} height={size} className="shrink-0" />;
}

`;

fs.writeFileSync('src/components/analysis/game-analysis-page.tsx', beforeBadgeIcon + newBadgeIcon + afterBadgeIcon);
console.log('Done!');
