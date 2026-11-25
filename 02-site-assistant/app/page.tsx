import { Topbar } from "@bootcamp/auth/topbar";
import Link from "next/link";
import { Chat } from "../components/Chat";
import { canSeeSupport, maybeUser } from "./session";

// The chat is open to everyone. Signed in, it can also read your plan and open billing.
export default async function AssistantPage() {
  const user = await maybeUser();
  return (
    <div className="app">
      <Topbar title="Ask learnwithparam" userName={user?.name}>
        {canSeeSupport(user?.email) ? (
          <Link href="/support" className="link-button">
            Support queue
          </Link>
        ) : null}
      </Topbar>
      <Chat />
    </div>
  );
}
