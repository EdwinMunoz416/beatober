import { AdminLiveDashboard } from "@/components/AdminLiveDashboard";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const initialAuthed = await isAdminSession();
  return <AdminLiveDashboard initialAuthed={initialAuthed} />;
}
