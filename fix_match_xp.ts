import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/app/api/play/online/[id]/move/route.ts";
  let code = await readFile(file, "utf8");
  
  if (!code.includes("awardUserXp")) {
    code = code.replace(
      `import { Chess } from "chess.js";`,
      `import { Chess } from "chess.js";\nimport { getCurrentUser } from "@/server/auth/session";\nimport { awardUserXp } from "@/server/repositories/user-repository";\nimport { XP_AWARDS } from "@/lib/progression";`
    );
    
    code = code.replace(
      `    // Update match in DB
    await db.update(matches)
      .set({ fen, pgn: pgn || "", status })
      .where(eq(matches.id, id));`,
      `    // Update match in DB
    await db.update(matches)
      .set({ fen, pgn: pgn || "", status })
      .where(eq(matches.id, id));

    if (isGameOver) {
      const user = await getCurrentUser();
      if (user) {
         await awardUserXp(user.id, XP_AWARDS.WIN_ONLINE_MATCH).catch(console.error);
      }
    }`
    );
    
    await writeFile(file, code);
  }
}
run();
