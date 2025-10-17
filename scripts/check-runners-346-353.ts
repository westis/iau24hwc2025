#!/usr/bin/env tsx
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function checkRunners() {
  const db = getDatabase();
  const result = await db.query(
    `SELECT bib, firstname, lastname, nationality,
            photo_url IS NOT NULL as has_photo,
            avatar_url IS NOT NULL as has_avatar
     FROM runners
     WHERE bib >= 346 AND bib <= 353
     ORDER BY bib`
  );

  console.log("Runners 346-353:\n");
  result.rows.forEach((r: any) => {
    console.log(
      `#${r.bib} ${r.firstname} ${r.lastname} (${r.nationality}): Photo=${r.has_photo}, Avatar=${r.has_avatar}`
    );
  });

  process.exit(0);
}

checkRunners();
