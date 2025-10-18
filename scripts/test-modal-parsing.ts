// Test modal parsing - fetch AJAX endpoint to find data-remote URLs
import { writeFileSync } from "fs";

async function test() {
  const baseUrl = "https://live.breizhchrono.com";
  const reference = "1384568432549-14";

  try {
    console.log("Fetching AJAX results endpoint...");

    // This is the AJAX endpoint that returns the table HTML with runner data
    const ajaxUrl = `${baseUrl}/types/generic/custo/x.running/findInResults.jsp`;

    const formData = new URLSearchParams({
      inter: "null",
      search: "",
      ville: "",
      course: "24h",
      sexe: "",
      category: "",
      reference: reference,
      from: "null",
      nofacebook: "1",
      version: "v6",
      page: "0"
    });

    const response = await fetch(ajaxUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const html = await response.text();
    console.log(`Response length: ${html.length} characters`);

    // Save to file
    writeFileSync("debug-ajax-results.html", html);
    console.log("✅ Saved AJAX response to debug-ajax-results.html");

    // Look for data-remote patterns
    const dataRemoteMatches = html.match(/data-remote=["'][^"']+["']/g);
    if (dataRemoteMatches && dataRemoteMatches.length > 0) {
      console.log(`\n✅ Found ${dataRemoteMatches.length} data-remote attributes:`);
      console.log(dataRemoteMatches.slice(0, 5));
    } else {
      console.log("\n❌ No data-remote attributes found");
    }

    // Look for onclick with showDetails
    const onclickMatches = html.match(/onclick=["'][^"']*showDetails[^"']*["']/g);
    if (onclickMatches && onclickMatches.length > 0) {
      console.log(`\n✅ Found ${onclickMatches.length} showDetails onclick handlers:`);
      console.log(onclickMatches.slice(0, 5));
    } else {
      console.log("\n❌ No showDetails onclick found");
    }

    // Look for modal IDs
    const modalMatches = html.match(/id=["']details\d+["']/g);
    if (modalMatches && modalMatches.length > 0) {
      console.log(`\n✅ Found ${modalMatches.length} detail modals`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

test();
