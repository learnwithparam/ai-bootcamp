import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { Chat } from "../components/Chat";
import { requireOwner } from "./session";

export default async function AdminPage() {
  const owner = await requireOwner();
  return (
    <div className="app">
      <Topbar title="Admin assistant" userName={owner.name}>
        <Link href="/log" className="link-button">
          Drafts and changes
        </Link>
      </Topbar>
      <Chat />
    </div>
  );
}
