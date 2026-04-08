import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/queries/dashboard";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json({ data });
}
