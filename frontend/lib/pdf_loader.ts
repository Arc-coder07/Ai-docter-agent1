// We use a safe require to handle the CommonJS export of pdf-parse
// This avoids the "default is not a function" and "Class constructor" errors.

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let pdfParser: any;

  try {
    pdfParser = require("pdf-parse");
  } catch (error) {
    throw new Error("Failed to load 'pdf-parse'. Ensure it is installed with 'npm install pdf-parse@1.1.1'");
  }

  // Handle potential export mismatch (ESM vs CJS)
  // Standard pdf-parse 1.1.1 exports the function directly.
  const parseFunc = typeof pdfParser === "function" ? pdfParser : pdfParser.default;

  if (typeof parseFunc !== "function") {
    throw new Error("Invalid pdf-parse library detected. Please reinstall using 'npm install pdf-parse@1.1.1'");
  }

  try {
    const data = await parseFunc(buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error("Extracted text is empty. The PDF might be scanned or image-based.");
    }

    return text;
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}