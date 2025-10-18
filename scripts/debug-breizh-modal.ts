// Debug script to see what's actually in Breizh Chrono modals
import puppeteer from "puppeteer";

async function debugModal() {
  console.log("🚀 Debugging Breizh Chrono modal structure...\n");

  const browser = await puppeteer.launch({
    headless: false, // Show browser so we can see it
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const url = "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14";
    console.log(`📡 Navigating to ${url}...\n`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Get the first runner (bib 191 - leader)
    const firstRunner = await page.evaluate(() => {
      const link = document.querySelector('a[href^="javascript:showDetails"]');
      if (!link) return null;

      const text = link.textContent || "";
      const bibMatch = text.match(/N°(\d+)/);
      const detailsMatch = link.getAttribute("href")?.match(/showDetails\('([^']+)'\)/);

      return {
        bib: bibMatch ? parseInt(bibMatch[1], 10) : null,
        modalId: detailsMatch ? detailsMatch[1] : null,
        name: text.split("-").slice(1).join("-").trim(),
      };
    });

    if (!firstRunner || !firstRunner.modalId) {
      console.log("❌ Couldn't find first runner");
      return;
    }

    console.log(`✅ Found runner: Bib ${firstRunner.bib} - ${firstRunner.name}`);
    console.log(`   Modal ID: ${firstRunner.modalId}\n`);

    // Click to open modal
    await page.evaluate((modalId) => {
      const link = document.querySelector(`a[href="javascript:showDetails('${modalId}')"]`) as HTMLElement;
      if (link) link.click();
    }, firstRunner.modalId);

    // Wait for modal
    await page.waitForSelector(`#${firstRunner.modalId}`, { visible: true, timeout: 5000 });

    // Extract EVERYTHING from the modal
    const modalContent = await page.evaluate((modalId) => {
      const modal = document.querySelector(`#${modalId}`);
      if (!modal) return { error: "Modal not found" };

      // Get table headers
      const headers = Array.from(modal.querySelectorAll("thead th")).map(th => th.textContent?.trim() || "");

      // Get first 3 data rows
      const rows = Array.from(modal.querySelectorAll("tbody tr")).slice(0, 3);
      const rowData = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        return cells.map((cell, index) => ({
          index,
          content: cell.textContent?.trim() || "",
          innerHTML: cell.innerHTML?.trim() || "",
        }));
      });

      return {
        headers,
        totalRows: modal.querySelectorAll("tbody tr").length,
        first3Rows: rowData,
      };
    }, firstRunner.modalId);

    console.log("📊 MODAL STRUCTURE:\n");
    console.log("Headers:", modalContent.headers);
    console.log(`\nTotal rows: ${modalContent.totalRows}\n`);

    console.log("FIRST 3 ROWS:\n");
    modalContent.first3Rows.forEach((row, rowIndex) => {
      console.log(`Row ${rowIndex + 1}:`);
      row.forEach((cell) => {
        console.log(`  Cell ${cell.index}: "${cell.content}"`);
        if (cell.innerHTML !== cell.content) {
          console.log(`    HTML: ${cell.innerHTML}`);
        }
      });
      console.log();
    });

    // Keep browser open for 30 seconds so you can inspect
    console.log("⏰ Keeping browser open for 30 seconds so you can inspect...");
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await browser.close();
  }
}

debugModal().catch(console.error);
