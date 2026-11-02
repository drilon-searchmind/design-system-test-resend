/**
 * Re-embed src/grafik.jsx into Grafik (standalone).html bundler manifest.
 * Usage: node repack-standalone.mjs
 */
import fs from "node:fs";
import zlib from "node:zlib";

const htmlFile = "Grafik (standalone).html";
const grafikSource = fs.readFileSync("src/grafik.jsx", "utf8");

const html = fs.readFileSync(htmlFile, "utf8");
const manifestMatch = html.match(
  /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/,
);
if (!manifestMatch) throw new Error("manifest not found");

const manifest = JSON.parse(manifestMatch[1]);

let grafikUuid = null;
for (const [uuid, entry] of Object.entries(manifest)) {
  let buf = Buffer.from(entry.data, "base64");
  if (entry.compressed) buf = zlib.gunzipSync(buf);
  if (buf.toString("utf8").includes("function GrafikScreen")) {
    grafikUuid = uuid;
    break;
  }
}
if (!grafikUuid) throw new Error("GrafikScreen asset not found in manifest");

const entry = manifest[grafikUuid];
const compressed = zlib.gzipSync(Buffer.from(grafikSource, "utf8"));
entry.data = compressed.toString("base64");
entry.compressed = true;

const newManifestJson = JSON.stringify(manifest);
const newHtml = html.replace(
  /<script type="__bundler\/manifest">[\s\S]*?<\/script>/,
  `<script type="__bundler/manifest">${newManifestJson}</script>`,
);

fs.writeFileSync(htmlFile, newHtml);

const check = zlib.gunzipSync(Buffer.from(manifest[grafikUuid].data, "base64")).toString("utf8");
if (!check.includes("WriteBackApiCallout")) {
  throw new Error("Repack verification failed — bundle missing WriteBackApiCallout");
}
console.log("Updated", htmlFile, "asset", grafikUuid, "bytes", compressed.length);
