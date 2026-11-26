import { headers } from "next/headers";
import { Storefront } from "../components/Storefront";
import { allProducts, basketSummary, savedPage } from "../db/queries";
import { defaultLayout, recheck, shelfOf } from "../rules/layout";
import { NEW_PROFILE } from "../rules/profile";
import { knownShopper } from "./shopper";

export const dynamic = "force-dynamic";

// The storefront. A shopper the shop knows gets their own page back, checked again against today's shelves;
// anyone else gets the plain page until they say how they shop.
export default async function Home() {
  const { owner, name } = await knownShopper(await headers());
  const products = await allProducts();
  const saved = owner ? await savedPage(owner) : null;
  const profile = saved?.profile ?? NEW_PROFILE;
  const kept = saved ? recheck(saved.sections, shelfOf(products), profile) : [];
  const sections = kept.length > 0 ? kept : defaultLayout(products, profile);
  const basket = owner ? await basketSummary(owner) : { count: 0, totalPence: 0 };
  const signedIn = owner?.startsWith("user:") ?? false;
  return <Storefront initial={{ profile, sections, working: null, basket }} account={{ name, signedIn }} />;
}
