import { PRODUCTS, type Product } from "@bootcamp/products";
import Image from "next/image";
import { firstScreenshot, isRunning } from "./showcase";

// The home page: every product in learning order. A running product opens; a stopped one shows the command that starts it.
export const dynamic = "force-dynamic";

const REPO = "https://github.com/learnwithparam/ai-bootcamp/tree/main";

export default async function Gallery() {
  const running = await Promise.all(
    PRODUCTS.map((product) => (product.port ? isRunning(product.port) : false)),
  );
  return (
    <main className="gallery">
      <header className="gallery-head">
        <h1>AI Bootcamp</h1>
        <p>
          AI products you can run, use and read. Work through them in order: each one adds a few ideas to the
          one before, and each folder's README walks you through its code.
        </p>
      </header>
      <ol className="gallery-list">
        {PRODUCTS.map((product, index) => (
          <ProductCard
            key={product.slug}
            product={product}
            step={index + 1}
            running={running[index] ?? false}
          />
        ))}
      </ol>
    </main>
  );
}

function ProductCard({ product, step, running }: { product: Product; step: number; running: boolean }) {
  const screenshot = firstScreenshot(product);
  return (
    <li className="gallery-item">
      {screenshot ? (
        <Image
          className="gallery-shot"
          src={`/screenshots/${product.slug}`}
          alt={screenshot.alt}
          width={1280}
          height={800}
          sizes="(max-width: 800px) 100vw, 600px"
          priority={step === 1}
        />
      ) : null}
      <div className="gallery-text">
        <h2>
          <span className="gallery-step">{String(step).padStart(2, "0")}</span> {product.title}
        </h2>
        <p>{product.job}</p>
        <div className="gallery-ideas">
          {product.ideas.map((idea) => (
            <span key={idea} className="chip">
              {idea}
            </span>
          ))}
        </div>
        <Start running={running} product={product} />
        <a className="gallery-readme" href={`${REPO}/${product.folder}`} target="_blank" rel="noreferrer">
          Read the learner page
        </a>
      </div>
    </li>
  );
}

function Start({ running, product }: { running: boolean; product: Product }) {
  if (product.command) {
    return (
      <p className="gallery-start">
        Runs in your terminal. Start it from the repo root:
        <code>{product.command}</code>
      </p>
    );
  }
  const url = `http://localhost:${product.port}`;
  if (running) {
    return (
      <a className="button button-primary gallery-open" href={url}>
        Open {url.replace("http://", "")}
      </a>
    );
  }
  return (
    <p className="gallery-start">
      Not running. Start it from the repo root:
      <code>bun run dev {product.slug}</code>
    </p>
  );
}
