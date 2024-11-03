import {
  Project,
  ClassDeclaration,
  InterfaceDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  VariableStatement
} from "ts-morph";
import fs from "fs-extra";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { generateDocumentation } from "./generateDocumentationFunction.js";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirnamePath = dirname(__filename);

export async function generateDocumentationForProject(
  tsconfigPath: string,
  outputPath: string
) {
  // Read the tsconfig.json file
  const tsconfig = await fs.readJSON(tsconfigPath);

  // Get include patterns from tsconfig
  const includePatterns = tsconfig.include || [];
  if (includePatterns.length === 0) {
    console.error("No files specified in tsconfig include patterns.");
    process.exit(1);
  }

  const project = new Project({
    tsConfigFilePath: tsconfigPath,
    skipAddingFilesFromTsConfig: true // We'll add files manually
  });

  // Add files based on include patterns
  includePatterns.forEach((pattern: string) => {
    const fullPathPattern = join(dirname(tsconfigPath), pattern);
    project.addSourceFilesAtPaths(fullPathPattern);
  });

  const sourceFiles = project.getSourceFiles();
  const projectRoot = dirname(tsconfigPath);

  for (const sourceFile of sourceFiles) {
    const sourceFilePath = sourceFile.getFilePath();
    const relativePath = relative(projectRoot, sourceFilePath);

    // Process classes (Components, Directives, Services, Pipes, Guards, Interceptors, Resolvers)
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      await processClass(cls, outputPath, relativePath);
    }

    // Process interfaces
    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
      await processInterface(iface, outputPath, relativePath);
    }

    // Process enums
    const enums = sourceFile.getEnums();
    for (const en of enums) {
      await processEnum(en, outputPath, relativePath);
    }

    // Process type aliases
    const types = sourceFile.getTypeAliases();
    for (const typeAlias of types) {
      await processTypeAlias(typeAlias, outputPath, relativePath);
    }

    // Process constants
    const variables = sourceFile.getVariableStatements();
    for (const variable of variables) {
      if (variable.isExported()) {
        await processVariable(variable, outputPath, relativePath);
      }
    }
  }
}

// Helper function to process classes
async function processClass(
  cls: ClassDeclaration,
  outputPath: string,
  relativePath: string
) {
  const decorators = cls.getDecorators();
  const className = cls.getName();
  const sourceCode = cls.getText();

  for (const decorator of decorators) {
    const name = decorator.getName();
    let templateName = "";

    // Match decorator to template
    if (name === "Component") {
      templateName = "component";
    } else if (name === "Directive") {
      templateName = "directive";
    } else if (name === "Injectable") {
      // Determine if it's a service, guard, interceptor, resolver
      const implementsTexts = cls.getImplements().map((impl) => impl.getText());
      if (implementsTexts.includes("HttpInterceptor")) {
        templateName = "interceptor";
      } else if (
        implementsTexts.includes("CanActivate") ||
        implementsTexts.includes("CanActivateChild") ||
        implementsTexts.includes("CanDeactivate") ||
        implementsTexts.includes("CanLoad")
      ) {
        templateName = "guard";
      } else if (implementsTexts.find((text) => text.startsWith("Resolve<"))) {
        templateName = "resolver";
      } else {
        templateName = "service"; // Default to service for @Injectable()
      }
    } else if (name === "Pipe") {
      templateName = "pipe";
    } else if (name === "NgModule") {
      templateName = "module";
    }

    if (templateName) {
      // Resolve the path to the templates directory relative to this file
      const templateDirectory = join(__dirnamePath, "templates");
      const templatePath = join(templateDirectory, `${templateName}.md`);

      // Check if the template exists
      if (!(await fs.pathExists(templatePath))) {
        console.error(`Template not found for ${name}: ${templatePath}`);
        continue;
      }

      // Read the template
      const template = await fs.readFile(templatePath, "utf-8");

      // Generate documentation
      console.log(
        `Generating documentation for ${className} (${templateName})...`
      );
      const documentation = await generateDocumentation(sourceCode, template);

      // Construct output directory and file path
      const outputDir = join(outputPath, dirname(relativePath));
      await fs.ensureDir(outputDir);
      const outputFilePath = join(outputDir, `${className}.md`);

      // Save the documentation to a Markdown file
      await fs.writeFile(outputFilePath, documentation);

      console.log(
        `Documentation generated for ${className} at ${outputFilePath}`
      );
    }
  }
}

// Helper function to process interfaces
async function processInterface(
  iface: InterfaceDeclaration,
  outputPath: string,
  relativePath: string
) {
  const interfaceName = iface.getName();
  const sourceCode = iface.getText();
  const templateName = "interface";

  // Resolve the path to the templates directory relative to this file
  const templateDirectory = join(__dirnamePath, "templates");
  const templatePath = join(templateDirectory, `${templateName}.md`);

  // Check if the template exists
  if (!(await fs.pathExists(templatePath))) {
    console.error(`Template not found for interface: ${templatePath}`);
    return;
  }

  // Read the template
  const template = await fs.readFile(templatePath, "utf-8");

  console.log(`Generating documentation for interface ${interfaceName}...`);
  const documentation = await generateDocumentation(sourceCode, template);

  // Construct output directory and file path
  const outputDir = join(outputPath, dirname(relativePath));
  await fs.ensureDir(outputDir);
  const outputFilePath = join(outputDir, `${interfaceName}.md`);

  await fs.writeFile(outputFilePath, documentation);

  console.log(
    `Documentation generated for interface ${interfaceName} at ${outputFilePath}`
  );
}

// Helper function to process enums
async function processEnum(
  en: EnumDeclaration,
  outputPath: string,
  relativePath: string
) {
  const enumName = en.getName();
  const sourceCode = en.getText();
  const templateName = "enum";

  // Resolve the path to the templates directory relative to this file
  const templateDirectory = join(__dirnamePath, "templates");
  const templatePath = join(templateDirectory, `${templateName}.md`);

  // Check if the template exists
  if (!(await fs.pathExists(templatePath))) {
    console.error(`Template not found for enum: ${templatePath}`);
    return;
  }

  // Read the template
  const template = await fs.readFile(templatePath, "utf-8");

  console.log(`Generating documentation for enum ${enumName}...`);
  const documentation = await generateDocumentation(sourceCode, template);

  // Construct output directory and file path
  const outputDir = join(outputPath, dirname(relativePath));
  await fs.ensureDir(outputDir);
  const outputFilePath = join(outputDir, `${enumName}.md`);

  await fs.writeFile(outputFilePath, documentation);

  console.log(
    `Documentation generated for enum ${enumName} at ${outputFilePath}`
  );
}

// Helper function to process type aliases
async function processTypeAlias(
  typeAlias: TypeAliasDeclaration,
  outputPath: string,
  relativePath: string
) {
  const typeName = typeAlias.getName();
  const sourceCode = typeAlias.getText();
  const templateName = "type";

  // Resolve the path to the templates directory relative to this file
  const templateDirectory = join(__dirnamePath, "templates");
  const templatePath = join(templateDirectory, `${templateName}.md`);

  // Check if the template exists
  if (!(await fs.pathExists(templatePath))) {
    console.error(`Template not found for type alias: ${templatePath}`);
    return;
  }

  // Read the template
  const template = await fs.readFile(templatePath, "utf-8");

  console.log(`Generating documentation for type alias ${typeName}...`);
  const documentation = await generateDocumentation(sourceCode, template);

  // Construct output directory and file path
  const outputDir = join(outputPath, dirname(relativePath));
  await fs.ensureDir(outputDir);
  const outputFilePath = join(outputDir, `${typeName}.md`);

  await fs.writeFile(outputFilePath, documentation);

  console.log(
    `Documentation generated for type alias ${typeName} at ${outputFilePath}`
  );
}

// Helper function to process constants (variables)
async function processVariable(
  variable: VariableStatement,
  outputPath: string,
  relativePath: string
) {
  const isConst = variable.getDeclarationKind() === "const";

  if (isConst) {
    const declarations = variable.getDeclarations();

    for (const declaration of declarations) {
      const name = declaration.getName();
      const sourceCode = declaration.getText();
      const templateName = "constant";

      // Resolve the path to the templates directory relative to this file
      const templateDirectory = join(__dirnamePath, "templates");
      const templatePath = join(templateDirectory, `${templateName}.md`);

      // Check if the template exists
      if (!(await fs.pathExists(templatePath))) {
        console.error(`Template not found for constant: ${templatePath}`);
        continue;
      }

      // Read the template
      const template = await fs.readFile(templatePath, "utf-8");

      console.log(`Generating documentation for constant ${name}...`);
      const documentation = await generateDocumentation(sourceCode, template);

      // Construct output directory and file path
      const outputDir = join(outputPath, dirname(relativePath));
      await fs.ensureDir(outputDir);
      const outputFilePath = join(outputDir, `${name}.md`);

      await fs.writeFile(outputFilePath, documentation);

      console.log(
        `Documentation generated for constant ${name} at ${outputFilePath}`
      );
    }
  }
}
