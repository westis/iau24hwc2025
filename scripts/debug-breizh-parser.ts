// Debug Breizh Chrono HTML parsing
const ENDPOINT = "https://live.breizhchrono.com/types/generic/custo/x.running/findInResults.jsp";

async function test() {
  const formData = new URLSearchParams({
    inter: "",
    search: "",
    ville: "",
    course: "24h",
    sexe: "",
    category: "",
    reference: "1384568432549-14",
    from: "null",
    nofacebook: "1",
    version: "v6",
    page: "0",
  });

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const html = await response.text();

  // Extract table rows
  const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(tableRowPattern) || [];

  console.log(`Found ${rows.length} rows`);
  console.log("");

  let rowNum = 0;
  for (const row of rows.slice(0, 5)) {
    // Skip header rows
    if (row.includes("<th") || row.includes("thead")) {
      console.log(`Row ${rowNum}: HEADER ROW (skipped)`);
      rowNum++;
      continue;
    }

    // Extract cells
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let match;

    while ((match = cellPattern.exec(row)) !== null) {
      const cellText = match[1]
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(cellText);
    }

    console.log(`Row ${rowNum}: ${cells.length} cells`);
    cells.forEach((cell, i) => {
      console.log(`  [${i}]: "${cell}"`);
    });
    console.log("");
    rowNum++;
  }
}

test();
