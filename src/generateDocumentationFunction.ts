import { pipeline, Pipeline } from "@xenova/transformers";

let generateText: Pipeline;

export async function initializeModel() {
  generateText = (await pipeline("text-generation", "Xenova/gpt2")) as Pipeline;
}

export async function generateDocumentation(
  code: string,
  template: string
): Promise<string> {
  // Initialize the model if not already initialized
  if (!generateText) {
    await initializeModel();
  }

  const prompt = `
Using the following template:
${template}

Generate detailed documentation in markdown format for the following Angular code:
${code}
`;

  // Generate text using the local model
  const output = await generateText(prompt, {
    max_new_tokens: 650,
    temperature: 0
  });

  // The output is an array of generated texts
  return output[0].generated_text;
}
