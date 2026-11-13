/**
 * Gerador de diagnósticos para os testes da extensão Diagnostic Audio.
 *
 * O script não altera os arquivos do projeto. Ele imprime mensagens no
 * formato entendido pelo problemMatcher das tarefas do VS Code, fazendo com
 * que erros e warnings apareçam no painel Problems.
 *
 * Uso:
 *   node diagnostic-test.js t01
 *   node diagnostic-test.js t08 --file diagnostic-inactive.js
 */

const scenarios = {
  t01: [
    { severity: "error", line: 5, message: "Erro de sintaxe inserido pelo teste T01" }
  ],
  t02: [],
  t03: [
    { severity: "warning", line: 10, message: "Warning inserido pelo teste T03" }
  ],
  t04: [],
  t05: [
    { severity: "error", line: 5, message: "Primeiro erro do teste T05" },
    { severity: "error", line: 6, message: "Segundo erro do teste T05" },
    { severity: "error", line: 7, message: "Terceiro erro do teste T05" }
  ],
  t08: [
    { severity: "error", line: 5, message: "Erro em arquivo inativo do teste T08" }
  ]
};

const [, , scenarioId, ...options] = process.argv;
const fileIndex = options.indexOf("--file");
const file = fileIndex >= 0 && options[fileIndex + 1]
  ? options[fileIndex + 1]
  : "diagnostic-fixture.js";

if (!scenarios[scenarioId]) {
  console.error(`Cenário desconhecido: ${scenarioId ?? "(ausente)"}`);
  console.error(`Use um destes cenários: ${Object.keys(scenarios).join(", ")}`);
  process.exitCode = 1;
} else {
  for (const diagnostic of scenarios[scenarioId]) {
    // O formato é consumido pelo problemMatcher definido em .vscode/tasks.json.
    console.log(`${file}:${diagnostic.line}:1: ${diagnostic.severity}: ${diagnostic.message}`);
  }
}
