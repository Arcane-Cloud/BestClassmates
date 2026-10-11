import { requireAdminPage } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { PersonEditor } from "@/components/admin/person-editor";

export default async function NewPersonPage() {
  const session = await requireAdminPage();
  return <AdminShell email={session.email}><PersonEditor /></AdminShell>;
}
