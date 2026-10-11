import { isDemoMode } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { getAdminPeople } from "@/lib/people";
import { demoPeople } from "@/lib/demo-data";
import { AdminShell } from "@/components/admin/admin-shell";
import { PeopleManager } from "@/components/admin/people-manager";

export default async function AdminPage() {
  const demo = isDemoMode();
  const session = demo ? null : await requireAdminPage();
  const people = demo ? demoPeople : await getAdminPeople();
  return <AdminShell demo={demo} email={session?.email}><PeopleManager people={people} demo={demo} /></AdminShell>;
}
