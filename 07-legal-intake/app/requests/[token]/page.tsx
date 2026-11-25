import { Topbar } from "@bootcamp/auth/topbar";
import { notFound } from "next/navigation";
import { ClientStatus } from "../../../components/ClientStatus";
import { intakeByToken } from "../../../db/queries";

// The client's private link. The token in the address is the only key: there is no list of requests to browse.
export default async function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const intake = await intakeByToken(token);
  if (!intake) notFound();
  return (
    <div className="app">
      <Topbar title="Legal intake" />
      <main className="desk">
        <h1>Your request, {intake.clientName}</h1>
        <ClientStatus intake={intake} />
      </main>
    </div>
  );
}
