import { FirmShell } from "../../components/FirmShell";
import { openCount, partyRecords } from "../../db/queries";
import { requireStaff } from "../session";

type PartyRecord = Awaited<ReturnType<typeof partyRecords>>[number];

function RecordsTable({ records }: { records: PartyRecord[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Matter</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.name + record.matter}>
              <td>{record.name}</td>
              <td>
                <span className={record.role === "client" ? "pill pill-info" : "pill"}>
                  {record.role === "client" ? "Our client" : "Against us"}
                </span>
              </td>
              <td>{record.matter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Everyone the firm has acted for or against. The conflict check compares each new request with this list.
export default async function RecordsPage() {
  const staff = await requireStaff();
  const [records, open] = await Promise.all([partyRecords(), openCount()]);
  return (
    <FirmShell user={staff} current="records" open={open}>
      <header className="page-header">
        <div>
          <h1>Conflict records</h1>
          <p>
            Every person and company the firm acts for or against. Code checks each new request against these
            names.
          </p>
        </div>
      </header>
      <RecordsTable records={records} />
    </FirmShell>
  );
}
