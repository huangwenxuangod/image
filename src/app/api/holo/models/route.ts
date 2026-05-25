import { NextResponse } from "next/server";

import { fetchHoloModels } from "@/lib/holo/catalog";

export async function GET() {
  try {
    const models = await fetchHoloModels();
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch HOLO models.",
      },
      { status: 500 },
    );
  }
}
