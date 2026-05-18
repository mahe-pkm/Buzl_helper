const fs = require("node:fs");
const path = require("node:path");

const manifestPath = path.join(__dirname, "..", "dist", "manifest.json");
const sourceManifestPath = path.join(__dirname, "..", "manifest.json");

const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, "utf8"));
delete manifest.background;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
for (const staleFile of ["service-worker-loader.js", "background.js"]) {
  const stalePath = path.join(__dirname, "..", "dist", staleFile);
  if (fs.existsSync(stalePath)) {
    fs.rmSync(stalePath, { force: true });
  }
}
