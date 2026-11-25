"use client";

import { useEffect, useRef, useState } from "react";
import type { Box } from "../rules/locate";

type Mark = { key: string; box: Box };
type Props = { url: string; marks: Mark[]; active: string | null; onPick: (key: string) => void };

type Size = { width: number; height: number };

// Renders page one into the canvas. Returns the page size in points once it is drawn, or failed.
function useDrawnPage(url: string) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let task: { cancel: () => void } | null = null;
    let gone = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker";
      const page = await (await pdfjs.getDocument({ url }).promise).getPage(1);
      const view = page.getViewport({ scale: 1 });
      const sharp = page.getViewport({ scale: 2 * (window.devicePixelRatio > 1 ? 1.5 : 1) });
      const target = canvas.current;
      if (gone || !target) return;
      target.width = sharp.width;
      target.height = sharp.height;
      const render = page.render({ canvas: target, viewport: sharp });
      task = render;
      await render.promise;
      if (!gone) setSize({ width: view.width, height: view.height });
    })().catch((error: unknown) => {
      console.error("Drawing the PDF failed:", error);
      if (!gone) setFailed(true);
    });
    return () => {
      gone = true;
      task?.cancel();
    };
  }, [url]);
  return { canvas, size, failed };
}

// Draws the first page of the bill with pdf.js, and a box over each value the assistant found on it.
// pdf.js is loaded only in the browser, after the page has rendered, so it never runs on the server.
export function PdfPage({ url, marks, active, onPick }: Props) {
  const { canvas, size, failed } = useDrawnPage(url);
  const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;
  return (
    <div className="pdf-page" data-ready={size ? "" : undefined}>
      <canvas ref={canvas} aria-label="The bill as the supplier sent it" role="img" />
      {failed ? (
        <p className="pdf-failed">
          The PDF could not be drawn.{" "}
          <a href={url} target="_blank" rel="noreferrer">
            Open it in a new tab
          </a>
          .
        </p>
      ) : null}
      {size
        ? marks.map(({ key, box }) => (
            <button
              key={key}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="pdf-mark"
              data-active={active === key || undefined}
              onClick={() => onPick(key)}
              style={{
                left: percent(box.x - 2, size.width),
                top: percent(box.y - 2, size.height),
                width: percent(box.width + 4, size.width),
                height: percent(box.height + 4, size.height),
              }}
            />
          ))
        : null}
    </div>
  );
}
