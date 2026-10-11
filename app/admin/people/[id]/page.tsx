import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { getAdminPerson } from "@/lib/people";
import { AdminShell } from "@/components/admin/admin-shell";
import { PersonEditor } from "@/components/admin/person-editor";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPage();
  const id = (await params).id;
  if (!z.uuid().safeParse(id).success) notFound();
  const person = await getAdminPerson(id);
  if (!person) notFound();
  return <AdminShell email={session.email}><PersonEditor key={person.id} person={person} /></AdminShell>;
}
