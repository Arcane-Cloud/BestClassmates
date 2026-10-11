import assert from "node:assert/strict";
import { test } from "node:test";
import { demoPeople } from "../lib/demo-data";
import { emptyPerson, filterPeople, isSafeImageUrl, personSchema } from "../lib/validation";

const valid = () => personSchema.parse(demoPeople[0]);

test("every sample uses the minimal schema and stable unique routes", () => {
  for (const person of demoPeople) assert.equal(personSchema.safeParse(person).success, true);
  assert.equal(new Set(demoPeople.map((p) => p.slug)).size, demoPeople.length);
  assert.equal(new Set(demoPeople.map((p) => p.id)).size, demoPeople.length);
});
test("name, biography and portrait are required; nickname is optional", () => {
  assert.equal(personSchema.safeParse(emptyPerson).success, false);
  for (const field of ["name", "biography", "portrait"]) assert.equal(personSchema.safeParse({ ...valid(), [field]: " " }).success, false);
  assert.equal(personSchema.safeParse({ ...valid(), nickname: "" }).success, true);
});
test("removed fields and caller-provided route IDs are not accepted into persistence input", () => {
  const parsed = personSchema.parse({ ...valid(), slug: "override", id: "override", role: "old", featured: true, birthday: "2000-01-01", timeline: [] });
  for (const field of ["slug", "id", "role", "featured", "birthday", "timeline", "category"]) assert.equal(field in parsed, false);
});
test("minimal content is bounded and publishing configuration is constrained", () => {
  assert.equal(personSchema.safeParse({ ...valid(), name: "人".repeat(61) }).success, false);
  assert.equal(personSchema.safeParse({ ...valid(), biography: "文".repeat(2001) }).success, false);
  for (const color of ["red", "#fff", "url(bad)"]) assert.equal(personSchema.safeParse({ ...valid(), accentColor: color }).success, false);
  for (const sortOrder of [-1, 1.5, 100000, NaN]) assert.equal(personSchema.safeParse({ ...valid(), sortOrder }).success, false);
  assert.equal(personSchema.safeParse({ ...valid(), status: "archived" }).success, false);
});
test("media URLs reject executable protocols, insecure URLs and traversal", () => {
  for (const url of ["javascript:alert(1)", "data:image/svg+xml,bad", "//evil.example/img", "/media/../secret", "http://example.com/a.jpg", "file:///tmp/a"]) assert.equal(isSafeImageUrl(url), false);
  assert.equal(isSafeImageUrl("/media/00000000-0000-4000-8000-000000000001.webp"), true);
  assert.equal(isSafeImageUrl("https://images.example.com/a.jpg"), true);
});
test("overview search matches name, nickname and biography", () => {
  for (const query of ["林予安", "  光影捕手  ", "好奇心"]) assert.ok(filterPeople(demoPeople, query).some((p) => p.slug === "lin-yuan"));
  assert.equal(filterPeople(demoPeople, "不存在的人").length, 0);
  assert.equal(filterPeople(demoPeople, "").length, demoPeople.length);
});
