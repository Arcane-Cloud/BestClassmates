import "server-only";
import { cache } from "react";
import type { Person as DatabasePerson } from "@prisma/client";
import { getDb, isDemoMode } from "./db";
import { demoPeople } from "./demo-data";
import { personSchema, type Person } from "./validation";

function serialize(row: DatabasePerson): Person {
  return { ...personSchema.parse(row), id: row.id, slug: row.slug, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
const orderBy = [{ sortOrder: "asc" }, { name: "asc" }] as const;

// React cache only deduplicates reads within a server render, never across visitors.
export const getPublicPeople = cache(async (): Promise<Person[]> => {
  if (isDemoMode()) return demoPeople.filter((person) => person.status === "published");
  const rows = await getDb().person.findMany({ where: { status: "published" }, orderBy: [...orderBy] });
  return rows.map(serialize);
});
export const getPublicPerson = cache(async (slug: string): Promise<Person | null> => {
  if (isDemoMode()) return demoPeople.find((person) => person.slug === slug && person.status === "published") ?? null;
  const row = await getDb().person.findFirst({ where: { slug, status: "published" } });
  return row ? serialize(row) : null;
});
export async function getAdminPeople(): Promise<Person[]> {
  const rows = await getDb().person.findMany({ orderBy: [...orderBy] });
  return rows.map(serialize);
}
export async function getAdminPerson(id: string): Promise<Person | null> {
  const row = await getDb().person.findUnique({ where: { id } });
  return row ? serialize(row) : null;
}
