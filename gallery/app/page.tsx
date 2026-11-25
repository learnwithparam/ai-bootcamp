import { PRODUCTS } from "@bootcamp/products";

// The home page: every product in learning order, with the command that starts it.
export default function Gallery() {
  return (
    <main className="gallery">
      <header className="gallery-head">
        <p className="label">AI Bootcamp</p>
        <h1>Ten AI products you can run, use and read.</h1>
        <p>Work through them in order. Each one adds a few ideas to the one before.</p>
      </header>
      <ol className="gallery-list">
        {PRODUCTS.map((product, index) => (
          <li key={product.slug} className="card gallery-item">
            <div className="card-head">
              <span className="label">{String(index + 1).padStart(2, "0")}</span>
              <span className="gallery-title">{product.title}</span>
              <a className="button button-primary" href={`http://localhost:${product.port}`}>
                Open
              </a>
            </div>
            <div className="card-body">
              <p>{product.job}</p>
              <div className="gallery-ideas">
                {product.ideas.map((idea) => (
                  <span key={idea} className="chip">
                    {idea}
                  </span>
                ))}
              </div>
              <code className="gallery-command">bun run dev {product.slug}</code>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
