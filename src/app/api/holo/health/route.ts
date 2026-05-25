import { NextResponse } from "next/server";

import { fetchHoloHealth } from "@/lib/holo/catalog";

export async function GET() {
  try {
    const health = await fetchHoloHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch HOLO health.",
      },
      { status: 500 },
    );
  }
}
