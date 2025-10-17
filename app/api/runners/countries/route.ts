// app/api/runners/countries/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch unique countries from runners table (excluding DNS)
    const { data: runners, error } = await supabase
      .from("runners")
      .select("nationality")
      .eq("dns", false)
      .not("nationality", "is", null);

    if (error) {
      console.error("Error fetching countries:", error);
      return NextResponse.json(
        { error: "Failed to fetch countries" },
        { status: 500 }
      );
    }

    // Extract unique countries and sort
    const uniqueCountries = Array.from(
      new Set(runners.map((r) => r.nationality))
    ).sort();

    return NextResponse.json({
      countries: uniqueCountries,
      total: uniqueCountries.length,
    });
  } catch (error) {
    console.error("Error in countries endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
