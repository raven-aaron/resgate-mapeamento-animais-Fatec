import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const parse = (name) => JSON.parse(read(name));
const manifest = parse("package.json");
const lockfile = parse("package-lock.json");
const policy = parse("toolchain.versions.json");
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
const npmAgent = process.env.npm_config_user_agent || "";
const npmMatch = /^npm\/(\d+)\./.exec(npmAgent);
const nvmrc = read(".nvmrc").trim();

check(nodeMajor === policy.nodeMajor,
  "Node.js incompatível: esperado major " + policy.nodeMajor + ", encontrado " + process.versions.node);
check(npmMatch !== null && Number(npmMatch[1]) === policy.npmMajor,
  "npm incompatível ou execução fora de npm run: esperado major " + policy.npmMajor);
check(nvmrc === String(policy.nodeMajor),
  ".nvmrc deve indicar o major " + policy.nodeMajor);
check(manifest.engines?.node === ">=24 <25" && manifest.engines?.npm === ">=11 <12",
  "O campo engines do package.json não corresponde à política");
check(lockfile.packages?.[""]?.engines?.node === manifest.engines?.node &&
      lockfile.packages?.[""]?.engines?.npm === manifest.engines?.npm,
  "O package-lock.json não corresponde ao engines do package.json");

for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  const declared = manifest[field] || {};
  const locked = lockfile.packages?.[""]?.[field] || {};
  for (const name of new Set([...Object.keys(declared), ...Object.keys(locked)])) {
    check(declared[name] === locked[name],
      "Manifesto e lockfile divergentes: " + field + "." + name);
  }
}

for (const [name, expected] of Object.entries(policy.packages)) {
  const declared = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
  const installed = lockfile.packages?.["node_modules/" + name]?.version;
  check(declared === expected,
    name + ": package.json deve declarar " + expected + " (atual: " + String(declared) + ")");
  check(installed === expected,
    name + ": package-lock.json deve instalar " + expected + " (atual: " + String(installed) + ")");
}

if (errors.length) {
  console.error("Falha na política de versões:\n- " + errors.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("Política de versões OK: Node " + policy.nodeMajor +
    ", npm " + policy.npmMajor + " e dependências aprovadas.");
}
