// Save Breizh Chrono HTML response to file
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

  const fs = await import('fs');
  fs.writeFileSync('breizh-leaderboard.html', html, 'utf-8');

  console.log("✅ HTML saved to: breizh-leaderboard.html");
  console.log("Length:", html.length, "characters");
  console.log("");
  console.log("First 1000 characters:");
  console.log(html.substring(0, 1000));
}

test();
