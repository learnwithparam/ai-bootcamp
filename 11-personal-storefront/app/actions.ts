"use server";

import { revalidatePath } from "next/cache";
import { addOne, basketSummary, productsByCode, removeFromBasket } from "../db/queries";
import { actionShopper } from "./shopper";

// The shopper's own taps. They never call the model.

export async function addToBasket(code: string) {
  const owner = await actionShopper();
  const [product] = await productsByCode([code]);
  if (!product) throw new Error("That product is not in the shop.");
  await addOne(owner, code);
  return basketSummary(owner);
}

export async function takeOut(code: string) {
  await removeFromBasket(await actionShopper(), code);
  revalidatePath("/basket");
}
