import { OPENING } from "../../agent/collect";
import { FirmHeader } from "../../components/FirmHeader";
import { IntakeDesk } from "../../components/IntakeDesk";
import { sendIntake, talk } from "./actions";

// The public intake. No account: the client talks, checks the form the assistant filled in, and sends it.
export default function IntakePage() {
  return (
    <div className="firm">
      <FirmHeader />
      <main className="firm-intake">
        <h1>Tell us what happened</h1>
        <p className="firm-lead">
          Write as you would to a friend. You can change anything in the form before you send it.
        </p>
        <IntakeDesk opening={OPENING} talk={talk} send={sendIntake} />
      </main>
    </div>
  );
}
