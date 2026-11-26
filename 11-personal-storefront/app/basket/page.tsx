import { headers } from "next/headers";
import Image from "next/image";
import { basketOf } from "../../db/queries";
import { pounds } from "../../rules/catalog";
import { takeOut } from "../actions";
import { knownShopper } from "../shopper";

export const dynamic = "force-dynamic";

// The shopper's basket: what they added themselves, and what they added from a basket the shop suggested.
export default async function BasketPage() {
  const { owner } = await knownShopper(await headers());
  const lines = owner ? await basketOf(owner) : [];
  const total = lines.reduce((sum, line) => sum + line.quantity * line.pricePence, 0);
  return (
    <main className="basket-page">
      <p className="wordmark">
        <a href="/">Fernhill Grocer</a>
      </p>
      <h1>Your basket</h1>
      {lines.length === 0 ? (
        <p>
          Your basket is empty. <a href="/">Back to the shop</a>
        </p>
      ) : (
        <>
          <ul className="basket-lines">
            {lines.map((line) => (
              <li key={line.code}>
                <Image src={line.image} alt="" width={56} height={56} />
                <span>
                  {line.quantity} × {line.name}
                </span>
                <span>{pounds(line.quantity * line.pricePence)}</span>
                <form action={takeOut.bind(null, line.code)}>
                  <button type="submit" className="button button-quiet" aria-label={`Take out ${line.name}`}>
                    Take out
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="basket-total">
            Total <strong>{pounds(total)}</strong>
          </p>
        </>
      )}
    </main>
  );
}
