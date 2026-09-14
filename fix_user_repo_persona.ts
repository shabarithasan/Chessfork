import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/server/repositories/user-repository.ts";
  let code = await readFile(file, "utf8");
  
  // Update toUserAccount type
  code = code.replace(
    `  puzzlesSolved?: number;
}): UserAccount {`,
    `  puzzlesSolved?: number;
  coachPersona?: string;
}): UserAccount {`
  );
  
  // Update toUserAccount return
  code = code.replace(
    `    puzzlesSolved: row.puzzlesSolved,
  };
}`,
    `    puzzlesSolved: row.puzzlesSolved,
    coachPersona: row.coachPersona ?? "default",
  };
}`
  );

  // Update findDatabaseUserById select
  code = code.replace(
    `        gamesAnalyzed: users.gamesAnalyzed,
        puzzlesSolved: users.puzzlesSolved,
      })`,
    `        gamesAnalyzed: users.gamesAnalyzed,
        puzzlesSolved: users.puzzlesSolved,
        coachPersona: users.coachPersona,
      })`
  );

  await writeFile(file, code);
}
run();
