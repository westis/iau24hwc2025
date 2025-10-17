// scripts/dump-pdf-text.ts
// Dump raw text from PDFs to understand structure

import * as fs from "fs";
import * as path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

async function dumpPdfText(pdfPath: string, outputPath: string) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const doc = await loadingTask.promise;
  
  let fullText = "";
  
  // Extract text from all pages
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    fullText += `\n========== PAGE ${pageNum} ==========\n`;
    
    // Show each item separately to understand structure
    textContent.items.forEach((item: any, index: number) => {
      fullText += `${index}: "${item.str}"\n`;
    });
  }
  
  fs.writeFileSync(outputPath, fullText, "utf-8");
  console.log(`✅ Dumped text to ${outputPath}`);
}

async function main() {
  const womenPdf = path.join(__dirname, "../../Listing-FEMMES-24H-WORLD-CHAMPIONSHIPS-ALBI.pdf");
  const menPdf = path.join(__dirname, "../../Listing-HOMMES-24H-WORLD-CHAMPIONSHIPS-ALBI.pdf");
  
  await dumpPdfText(womenPdf, path.join(__dirname, "../data/women-pdf-dump.txt"));
  await dumpPdfText(menPdf, path.join(__dirname, "../data/men-pdf-dump.txt"));
}

main().catch(console.error);

