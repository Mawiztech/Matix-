import AdminLayout from "./AdminLayout";
import Chat from "../../components/Chat";
import { PageHeader } from "../../components/UI";

export default function AdminMessages() {
  return (
    <AdminLayout>
      <PageHeader title="Messages" description="Chat with students, facilitators, and other admins." />
      <Chat />
    </AdminLayout>
  );
}
