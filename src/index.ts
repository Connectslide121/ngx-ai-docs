#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import fs from "fs-extra";
import { generateDocumentationForProject } from "./generateDocumentation.js";

const program = new Command();

program
  .version("1.0.0")
  .description("Generate documentation for Angular projects using AI")
  .option("-p, --project <path>", "Path to tsconfig.json file", "tsconfig.json")
  .option("-d, --output <path>", "Output directory", "./docs")
  .parse(process.argv);

const options = program.opts();

async function main() {
  const tsconfigPath = path.resolve(options.project);
  const outputPath = path.resolve(options.output);

  if (!fs.existsSync(tsconfigPath)) {
    console.error(`tsconfig file not found at ${tsconfigPath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  await fs.ensureDir(outputPath);

  // Call the documentation generator
  await generateDocumentationForProject(tsconfigPath, outputPath);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
