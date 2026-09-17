import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/app/opening/[slug]/page.tsx";
  let code = await readFile(file, "utf8");
  
  const importTarget = `import { listAnalysisResponses } from "@/lib/platform-service";`;
  const importReplace = `import { listAnalysisResponses } from "@/lib/platform-service";\nimport { OpeningTrainer } from "@/components/opening/opening-trainer";`;
  code = code.replace(importTarget, importReplace);
  
  const lines = code.split("\n");
  const linkIndex = lines.findIndex(line => line.includes("Analyze your {opening.name} games"));
  if (linkIndex !== -1) {
    const insertCode = `
          {opening.mainLine && opening.trainColor && (
            <div className="mt-12">
              <OpeningTrainer 
                openingName={opening.name} 
                mainLine={opening.mainLine} 
                trainColor={opening.trainColor as "white" | "black"} 
              />
            </div>
          )}
`;
    lines.splice(linkIndex + 2, 0, insertCode);
    code = lines.join("\n");
  }

  await writeFile(file, code);
}
run();
