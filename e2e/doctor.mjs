import { execFileSync } from "node:child_process";

const port = 8798;
const base = `http://127.0.0.1:${port}`;

function listenerPids(targetPort) {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${targetPort}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid));
  } catch {
    return [];
  }
}

async function main() {
  const listening = listenerPids(port);
  if (listening.length === 0) {
    console.error(`nothing is listening on ${base}`);
    process.exit(1);
  }
  console.log(`port ${port} listeners: ${listening.join(", ")}`);

  const home = await fetch(base);
  const html = await home.text();
  if (!html.includes("フォトギャラリー")) {
    console.error("GET / did not return the gallery page");
    process.exit(1);
  }

  const media = await fetch(`${base}/api/media`);
  if (!media.ok) {
    console.error(`/api/media returned ${media.status}`);
    process.exit(1);
  }
  const body = await media.json();
  const years = body.years;
  if (!Array.isArray(years) || years.length !== 4) {
    console.error(
      `expected 4 year groups, got ${Array.isArray(years) ? years.length : "non-array"}`,
    );
    process.exit(1);
  }
  console.log("gallery list: ok (4 years)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
