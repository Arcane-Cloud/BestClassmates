import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, readJson } from "@/lib/http";
import { personSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const input = personSchema.parse(await readJson(request));
    const person = await getDb().person.update({ where: { id }, data: input, select: { id: true, slug: true } });
    return NextResponse.json({ person });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    const id = z.uuid().parse((await params).id);
    await getDb().person.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
