import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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

async function inlineModuleImports(source, sourcePath, visited = new Set()) {
  const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.[^"']+)["']/g;
  const specifiers = [...source.matchAll(importPattern)].map((match) => match[1]);

  for (const specifier of new Set(specifiers)) {
    const importedPath = resolve(dirname(sourcePath), specifier);
    if (visited.has(importedPath)) continue;

    const nextVisited = new Set(visited).add(importedPath);
    const importedSource = await readFile(importedPath, "utf8");
    const inlinedSource = await inlineModuleImports(importedSource, importedPath, nextVisited);
    const dataUrl = `data:text/javascript;base64,${Buffer.from(inlinedSource).toString("base64")}`;
    source = source.replaceAll(`"${specifier}"`, `"${dataUrl}"`);
    source = source.replaceAll(`'${specifier}'`, `'${dataUrl}'`);
  }

  return source;
}

const standaloneJavascript = await inlineModuleImports(javascript, assetPath(scriptTag[1]));

html = html
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
  .replace(
    faviconTag[0],
    () => faviconTag[0].replace(faviconTag[1], faviconDataUrl),
  )
  .replace(stylesheetTag[0], () => `<style>${css}</style>`)
  .replace(
    scriptTag[0],
    () =>
      `<script type="module">${standaloneJavascript.replaceAll("</script>", "<\\/script>")}</script>`,
  );

await writeFile(htmlPath, html);

console.log("Created self-contained dist/index.html");
