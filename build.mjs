import { copy } from "fs-extra";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const srcDir = join(__dirname, "templates");
const destDir = join(__dirname, "dist", "templates");

async function copyTemplates() {
  try {
    await copy(srcDir, destDir);
    console.log("Templates copied successfully.");
  } catch (err) {
    console.error("Error copying templates:", err);
    process.exit(1);
  }
}

copyTemplates();
