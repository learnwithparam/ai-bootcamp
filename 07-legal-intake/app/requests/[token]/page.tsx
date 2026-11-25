import { notFound } from "next/navigation";
import { ClientStatus } from "../../../components/ClientStatus";
import { FirmHeader } from "../../../components/FirmHeader";
import { intakeByToken } from "../../../db/queries";

// The client's private link. The token in the address is the only key: there is no list of requests to browse.
// A failed step shows as "reviewing": the firm sees the failure on its board and runs it again.
export default async function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const intake = await intakeByToken(token);
  if (!intake) notFound();
  return (
    <div className="firm">
      <FirmHeader />
      <main className="firm-intake firm-narrow">
        <h1>Your request, {intake.clientName}</h1>
        <ClientStatus intake={intake} />
      </main>
    </div>
  );
}
