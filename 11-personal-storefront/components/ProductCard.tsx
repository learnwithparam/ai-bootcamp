"use client";

import Image from "next/image";
import { useTransition } from "react";
import { addToBasket } from "../app/actions";
import { ALLERGEN_WORDS, type Allergen, type Product, pounds } from "../rules/catalog";

const DIET_LABEL = { vegan: "Vegan", vegetarian: "Vegetarian", neither: null, unknown: null } as const;

// One product, with what its label says. The allergens are from the database record, so the card can never disagree with it.
export function ProductCard({
  product,
  onAdded,
}: {
  product: Product;
  onAdded: (basket: { count: number; totalPence: number }) => void;
}) {
  const [adding, start] = useTransition();
  const contains = product.allergens.map((tag) => ALLERGEN_WORDS[tag as Allergen] ?? tag);
  return (
    <article className="product" data-code={product.code}>
      <Image src={product.image} alt="" width={160} height={160} sizes="160px" />
      <h3>{product.name}</h3>
      <p className="product-meta">
        {product.brand} {product.quantity}
      </p>
      <p className="product-tags">
        {DIET_LABEL[product.diet] && <span className="tag tag-diet">{DIET_LABEL[product.diet]}</span>}
        {contains.length > 0 && <span className="tag">Contains {contains.join(", ")}</span>}
      </p>
      <div className="product-buy">
        <strong>{pounds(product.pricePence)}</strong>
        <button
          type="button"
          className="button button-quiet"
          disabled={adding}
          aria-label={`Add ${product.name}`}
          onClick={() => start(async () => onAdded(await addToBasket(product.code)))}
        >
          {adding ? "Adding" : "Add"}
        </button>
      </div>
    </article>
  );
}
