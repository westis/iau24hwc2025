// scripts/parse-bib-numbers.ts
// Parse bib numbers from PDF entry lists

import * as fs from "fs";
import * as path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

interface RunnerBibData {
  bib: number;
  lastname: string;
  nationality: string;
  country: string;
  gender: "M" | "W";
}

async function parsePdf(pdfPath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(dataBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const doc = await loadingTask.promise;
    
    let fullText = "";
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (error) {
    console.error(
      "Error parsing PDF. Make sure pdfjs-dist is installed: npm install pdfjs-dist"
    );
    console.error("Error details:", error);
    throw error;
  }
}

function parseRunnerLine(line: string, gender: "M" | "W"): RunnerBibData | null {
  // Example line format (adjust based on actual PDF):
  // 101  SMITH  USA  United States  W35
  // We need to extract: bib, lastname, nationality, country
  
  // Clean the line
  line = line.trim();
  if (!line) return null;

  // Split by multiple spaces or tabs
  const parts = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);

  if (parts.length < 3) return null;

  // Try to identify bib number (usually first column, numeric)
  const bibMatch = parts[0].match(/^\d+$/);
  if (!bibMatch) return null;

  const bib = parseInt(parts[0]);
  
  // Find lastname (usually second column)
  const lastname = parts[1];
  
  // Find nationality code (3-letter code)
  let nationality = "";
  let country = "";
  
  for (let i = 2; i < parts.length; i++) {
    // Check if it's a 3-letter country code
    if (parts[i].length === 3 && /^[A-Z]{3}$/.test(parts[i])) {
      nationality = parts[i];
      // Country name is likely the next part
      if (i + 1 < parts.length) {
        country = parts[i + 1];
      }
      break;
    }
  }

  if (!nationality) return null;

  return {
    bib,
    lastname,
    nationality,
    country,
    gender,
  };
}

function parseText(text: string, gender: "M" | "W"): RunnerBibData[] {
  const lines = text.split("\n");
  const runners: RunnerBibData[] = [];

  for (const line of lines) {
    const runner = parseRunnerLine(line, gender);
    if (runner) {
      runners.push(runner);
    }
  }

  return runners;
}

function exportToCsv(runners: RunnerBibData[], outputPath: string) {
  const header = "bib,lastname,nationality,country,gender\n";
  const rows = runners
    .map(
      (r) =>
        `${r.bib},"${r.lastname}",${r.nationality},"${r.country}",${r.gender}`
    )
    .join("\n");

  fs.writeFileSync(outputPath, header + rows, "utf-8");
  console.log(`✅ Exported ${runners.length} runners to ${outputPath}`);
}

async function main() {
  console.log("🏃 Parsing PDF entry lists for bib numbers...\n");

  const womenPdfPath = path.join(
    __dirname,
    "../../Listing-FEMMES-24H-WORLD-CHAMPIONSHIPS-ALBI.pdf"
  );
  const menPdfPath = path.join(
    __dirname,
    "../../Listing-HOMMES-24H-WORLD-CHAMPIONSHIPS-ALBI.pdf"
  );

  try {
    console.log("📄 Parsing women's list...");
    const womenText = await parsePdf(womenPdfPath);
    const women = parseText(womenText, "W");
    console.log(`   Found ${women.length} women\n`);

    console.log("📄 Parsing men's list...");
    const menText = await parsePdf(menPdfPath);
    const men = parseText(menText, "M");
    console.log(`   Found ${men.length} men\n`);

    // Combine and sort by bib number
    const allRunners = [...women, ...men].sort((a, b) => a.bib - b.bib);

    console.log(`📊 Total: ${allRunners.length} runners\n`);

    // Export to CSV
    const csvPath = path.join(__dirname, "../data/bib-numbers.csv");
    exportToCsv(allRunners, csvPath);

    // Show sample
    console.log("\n📋 Sample (first 10 runners):");
    console.log("Bib | Lastname | Nat | Country | Gender");
    console.log("-".repeat(60));
    allRunners.slice(0, 10).forEach((r) => {
      console.log(
        `${r.bib.toString().padStart(3)} | ${r.lastname.padEnd(20)} | ${r.nationality} | ${r.country.padEnd(15)} | ${r.gender}`
      );
    });

    console.log("\n✅ Done! Check the CSV file to confirm data.");
    console.log("   Next step: Run import script to update database");
  } catch (error) {
    if (error instanceof Error && error.message.includes("pdfjs-dist")) {
      console.error("\n❌ Missing dependency!");
      console.error("   Run: npm install pdfjs-dist");
      process.exit(1);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
