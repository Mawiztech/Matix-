import FacilitatorLayout from "./FacilitatorLayout";
import Chat from "../../components/Chat";
import { PageHeader } from "../../components/UI";

export default function FacilitatorMessages() {
  return (
    <FacilitatorLayout>
      <PageHeader title="Messages" description="Chat with students, admins, and other facilitators." />
      <Chat />
    </FacilitatorLayout>
  );
}
