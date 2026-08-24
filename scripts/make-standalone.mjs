import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve("dist");
const htmlPath = resolve(outputDirectory, "index.html");
let html = await readFile(htmlPath, "utf8");

const stylesheetTag = html.match(
  /<link rel="stylesheet"(?: crossorigin)? href="([^"]+)">/,
);
const scriptTag = html.match(
  /<script type="module"(?: crossorigin)? src="([^"]+)"><\/script>/,
);
const faviconTag = html.match(
  /<link rel="icon" type="image\/png" href="([^"]+)" \/>/,
);

if (!stylesheetTag || !scriptTag || !faviconTag) {
  throw new Error("Could not locate the generated page assets.");
}

function assetPath(urlPath) {
  return resolve(outputDirectory, urlPath.replace(/^\//, ""));
}

const [css, javascript, favicon] = await Promise.all([
  readFile(assetPath(stylesheetTag[1]), "utf8"),
  readFile(assetPath(scriptTag[1]), "utf8"),
  readFile(assetPath(faviconTag[1])),
]);

const faviconDataUrl = `data:image/png;base64,${favicon.toString("base64")}`;

html = html
  .replace(
    faviconTag[0],
    () => faviconTag[0].replace(faviconTag[1], faviconDataUrl),
  )
  .replace(stylesheetTag[0], () => `<style>${css}</style>`)
  .replace(
    scriptTag[0],
    () =>
      `<script type="module">${javascript.replaceAll("</script>", "<\\/script>")}</script>`,
  );

await writeFile(htmlPath, html);

console.log("Created self-contained dist/index.html");
