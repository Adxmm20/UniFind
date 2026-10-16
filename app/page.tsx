import fs from "node:fs";
import path from "node:path";
import Header from "./components/Header";
import Slideshow from "./components/Slideshow";

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

// Runs at build time (the page is statically prerendered). Drop a new image into
// public/img/ and it is picked up automatically, in natural filename order.
function getSlides(): string[] {
  const dir = path.join(process.cwd(), "public", "img");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_RE.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((file) => `/img/trendy/${file}`);
}

export default function Home() {
  const slides = getSlides();

  return (
    <>
      <Header />
      <Slideshow slides={slides} />
    </>
  );
}
