import { AdminDevices } from "@/components/AdminDevices";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminDevicesPage() {
  const initialAuthed = await isAdminSession();
  return <AdminDevices initialAuthed={initialAuthed} />;
}
