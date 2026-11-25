import { assignAccount, takeAccount } from "../app/actions";
import type { Member } from "../app/session";
import type { Report } from "../rules/report";
import type { Person } from "../rules/team";
import { may } from "../rules/team";
import { initials } from "./AccountsShell";
import { AssignSelect } from "./AssignSelect";

type Props = { report: Report; member: Member; people: Pick<Person, "id" | "name">[] };

// Who works this account. The lead picks anyone; a rep takes an account nobody owns.
export function OwnerCell({ report, member, people }: Props) {
  const label = report.identity?.name ?? report.company;
  if (may(member.role, "assign"))
    return (
      <form action={assignAccount}>
        <AssignSelect id={report.id} ownerId={report.ownerId} people={people} label={label} />
      </form>
    );
  if (may(member.role, "take", report))
    return (
      <form action={takeAccount}>
        <input type="hidden" name="id" value={report.id} />
        <button type="submit" className="button button-quiet">
          Take<span className="sr-only"> {label}</span>
        </button>
      </form>
    );
  const owner = people.find((person) => person.id === report.ownerId);
  return (
    <span className="owner">
      <span className="avatar avatar-sm" aria-hidden="true">
        {initials(owner?.name ?? "?")}
      </span>
      <span>{report.ownerId === member.id ? "You" : (owner?.name ?? "Someone who left")}</span>
    </span>
  );
}
