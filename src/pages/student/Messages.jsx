import StudentLayout from "./StudentLayout";
import Chat from "../../components/Chat";
import { PageHeader } from "../../components/UI";

export default function StudentMessages() {
  return (
    <StudentLayout>
      <PageHeader title="Messages" description="Chat with facilitators, admins, and other students." />
      <Chat />
    </StudentLayout>
  );
}
