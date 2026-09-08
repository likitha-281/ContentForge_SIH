import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, ".output");

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log("[postbuild] Preparing distribution artifacts in", distDir);
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Sync from .output if Nitro generated to .output
  if (fs.existsSync(outputDir)) {
    const outputPublic = path.join(outputDir, "public");
    const outputServer = path.join(outputDir, "server");
    if (fs.existsSync(outputPublic)) {
      copyDirRecursive(outputPublic, distDir);
    }
    if (fs.existsSync(outputServer)) {
      copyDirRecursive(outputServer, path.join(distDir, "server"));
    }
  }

  // Also check if dist/client exists and hoist to dist root
  const distClient = path.join(distDir, "client");
  if (fs.existsSync(distClient)) {
    copyDirRecursive(distClient, distDir);
  }

  // 2. Generate index.html from SSR bundle
  let serverEntry = null;
  const possibleEntries = [
    path.join(distDir, "server", "index.mjs"),
    path.join(outputDir, "server", "index.mjs"),
  ];

  for (const candidate of possibleEntries) {
    if (fs.existsSync(candidate)) {
      serverEntry = candidate;
      break;
    }
  }

  let htmlRendered = false;
  if (serverEntry) {
    try {
      console.log("[postbuild] Rendering static entry via SSR from", serverEntry);
      const mod = await import(`file://${serverEntry}`);
      const server = mod.default;
      if (server && typeof server.fetch === "function") {
        const env = { ASSETS: { fetch: () => new Response(null, { status: 404 }) } };
        const ctx = { waitUntil: () => {}, context: { waitUntil: () => {} } };
        const res = await server.fetch(new Request("http://localhost/"), env, ctx);
        if (res.status === 200) {
          const html = await res.text();
          if (html && html.length > 500) {
            fs.writeFileSync(path.join(distDir, "index.html"), html, "utf-8");
            fs.writeFileSync(path.join(distDir, "200.html"), html, "utf-8");
            fs.writeFileSync(path.join(distDir, "404.html"), html, "utf-8");
            console.log("[postbuild] Successfully rendered index.html (" + html.length + " bytes)");
            htmlRendered = true;
          }
        } else {
          console.warn("[postbuild] SSR fetch returned status:", res.status);
        }
      }
    } catch (err) {
      console.warn("[postbuild] Failed to render via SSR handler:", err);
    }
  }

  // Fallback template if SSR rendering was not possible
  if (!htmlRendered && !fs.existsSync(path.join(distDir, "index.html"))) {
    console.log("[postbuild] Generating fallback SPA index.html from assets");
    const assetsDir = path.join(distDir, "assets");
    let mainCss = "";
    let mainJs = "";
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      const cssFile = assetFiles.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
      const jsFile = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js"));
      if (cssFile) mainCss = `/assets/${cssFile}`;
      if (jsFile) mainJs = `/assets/${jsFile}`;
    }

    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>INTELLI-FORGE — Transform Faster. Verify Before You Trust.</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
    ${mainCss ? `<link rel="stylesheet" href="${mainCss}" />` : ""}
  </head>
  <body>
    <div id="root"></div>
    ${mainJs ? `<script type="module" src="${mainJs}"></script>` : ""}
  </body>
</html>`;
    fs.writeFileSync(path.join(distDir, "index.html"), fallbackHtml, "utf-8");
    fs.writeFileSync(path.join(distDir, "200.html"), fallbackHtml, "utf-8");
    fs.writeFileSync(path.join(distDir, "404.html"), fallbackHtml, "utf-8");
  }

  const files = fs.readdirSync(distDir);
  console.log("[postbuild] dist/ now contains:", files);
}

main().catch((err) => {
  console.error("[postbuild] Error in postbuild script:", err);
  process.exit(1);
});
