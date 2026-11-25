// Atalho "npm start": instala as dependências (só se preciso), gera o build e abre o preview.
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

// O npm grava node_modules/.package-lock.json a cada instalação. Se ele não existe
// ou é mais antigo que package.json/package-lock.json, as dependências estão desatualizadas.
function needsInstall() {
  const installed = "node_modules/.package-lock.json";
  if (!existsSync(installed)) return true;
  const installedAt = statSync(installed).mtimeMs;
  return ["package.json", "package-lock.json"].some(
    (file) => existsSync(file) && statSync(file).mtimeMs > installedAt,
  );
}

function run(step, command) {
  console.log(`\n▶ ${step}: ${command}`);
  // shell: true permite achar o "npm" no Windows (npm.cmd); os comandos são fixos.
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  if (status !== 0) {
    console.error(`\n✖ Falha em "${step}" (código ${status}).`);
    process.exit(status ?? 1);
  }
}

if (needsInstall()) {
  run("Instalando dependências", existsSync("package-lock.json") ? "npm ci" : "npm install");
} else {
  console.log("✔ Dependências já instaladas, pulando a instalação.");
}

run("Gerando o build", "npm run build");
console.log("\n🚀 Abra o endereço \"Local\" exibido abaixo (Ctrl+C para encerrar).");
run("Iniciando o preview", "npm run preview");
