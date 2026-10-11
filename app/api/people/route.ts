import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, assertSameOrigin, readJson } from "@/lib/http";
import { personSchema } from "@/lib/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const input = personSchema.parse(await readJson(request));
    const person = await getDb().person.create({ data: { ...input, slug: randomUUID() }, select: { id: true, slug: true } });
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) { return apiError(error); }
}
