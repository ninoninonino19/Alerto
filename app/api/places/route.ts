import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const matches = await searchPlaces(query);
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: "lookup-failed" }, { status: 502 });
  }
}
