// Test the actual Breizh Chrono data endpoint
const ENDPOINT = "https://live.breizhchrono.com/types/generic/custo/x.running/findInResults.jsp";

async function test() {
  console.log("Fetching from:", ENDPOINT);
  console.log("");

  try {
    const response = await fetch(ENDPOINT, {
      headers: {
        "User-Agent": "IAU 24H World Championship App",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    console.log("Status:", response.status);

    if (!response.ok) {
      console.log("❌ Failed:", response.statusText);
      return;
    }

    const html = await response.text();
    console.log("HTML Length:", html.length, "characters");
    console.log("");
    console.log("First 2000 characters:");
    console.log("=".repeat(80));
    console.log(html.substring(0, 2000));
    console.log("=".repeat(80));
    console.log("");

    // Save to file for inspection
    const fs = await import('fs');
    fs.writeFileSync('breizh-response.html', html);
    console.log("✅ Full HTML saved to: breizh-response.html");
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

test();
