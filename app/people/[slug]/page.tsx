import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPeople, getPublicPerson } from "@/lib/people";
import { isDemoMode } from "@/lib/db";
import { ProfileScene } from "@/components/showcase/profile-scene";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPublicPerson((await params).slug);
  if (!person) return { title: "人物未找到" };
  return { title: `${person.name}${person.nickname ? ` · ${person.nickname}` : ""}`, description: person.biography.slice(0, 180), openGraph: { title: `${person.name} · 最佳同学`, description: person.biography.slice(0, 180), images: [{ url: person.portrait }] } };
}
export default async function ProfilePage({ params }: Props) {
  const person = await getPublicPerson((await params).slug);
  if (!person) notFound();
  const people = await getPublicPeople();
  const index = people.findIndex((p) => p.id === person.id);
  return <ProfileScene key={person.id} person={person} previous={people.length > 1 ? people[(index - 1 + people.length) % people.length] : null} next={people.length > 1 ? people[(index + 1) % people.length] : null} index={index} demo={isDemoMode()} />;
}
