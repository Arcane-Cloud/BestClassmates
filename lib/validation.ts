import { z } from "zod";

export function isSafeImageUrl(value: string) {
  if (/^\/(?:images|media)\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes("..")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
const image = z.string().trim().max(2048).refine(isSafeImageUrl, "请使用 HTTPS 图片地址或上传图片");
const optionalImage = z.union([z.literal(""), image]).default("");

export const personSchema = z.object({
  name: z.string().trim().min(1, "请输入名称").max(60, "名称最多 60 字"),
  nickname: z.string().trim().max(60, "外号最多 60 字").default(""),
  biography: z.string().trim().min(1, "请输入简介").max(2000, "简介最多 2000 字"),
  avatar: optionalImage,
  portrait: image,
  background: optionalImage,
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "请输入六位十六进制颜色").default("#e13d30"),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type PersonInput = z.infer<typeof personSchema>;
export type Person = PersonInput & { id: string; slug: string; createdAt: string; updatedAt: string };

export const emptyPerson: PersonInput = {
  name: "", nickname: "", biography: "", avatar: "", portrait: "", background: "",
  accentColor: "#e13d30", sortOrder: 0, status: "draft",
};
export function filterPeople(people: Person[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return people.filter((person) => !term || [person.name, person.nickname, person.biography].join(" ").toLocaleLowerCase().includes(term));
}
