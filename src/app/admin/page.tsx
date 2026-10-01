import { AdminControlRoom } from "@/components/AdminControlRoom";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialAuthed = await isAdminSession();
  return <AdminControlRoom initialAuthed={initialAuthed} />;
}
