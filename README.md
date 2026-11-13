# Diagnostic Audio

Extensão experimental para o Visual Studio Code que fornece feedback sonoro
sobre alterações nos diagnósticos do arquivo ativo. O projeto foi desenvolvido
como um protótipo de tecnologia assistiva para o Trabalho de Conclusão de
Curso **Acessibilidade no Desenvolvimento de Software: Desafios e Soluções
para Engenheiros com Deficiência Visual**.

A extensão complementa a apresentação visual dos erros e warnings do VS Code
com sinais sonoros curtos. Dessa forma, o usuário pode perceber que um
diagnóstico apareceu ou foi resolvido sem precisar consultar visualmente o
editor ou o painel **Problems**.

## Funcionalidades

- Monitora os diagnósticos do editor ativo.
- Reage a diagnósticos com severidade `Error` e `Warning`.
- Emite sons diferentes quando um diagnóstico aparece ou é resolvido.
- Agrupa alterações rápidas usando *debounce* para evitar excesso de sons.
- Permite ativar ou desativar o recurso.
- Permite controlar o volume e o tempo de *debounce*.
- Disponibiliza o comando **Diagnostic Audio: Test Sound** para testar a
  reprodução de áudio.

## Fluxo de funcionamento

1. O VS Code atualiza os diagnósticos do arquivo em edição.
2. A extensão verifica se o evento pertence ao editor ativo.
3. Os diagnósticos atuais são comparados com o estado anterior do documento.
4. A extensão identifica diagnósticos que apareceram ou foram resolvidos.
5. Um sinal sonoro correspondente à severidade e ao tipo de evento é
   reproduzido.

O protótipo não substitui leitores de tela nem fornece mensagens faladas. Seu
objetivo é oferecer um canal auditivo complementar para informações que o VS
Code normalmente apresenta de maneira visual.

## Requisitos

- Visual Studio Code `1.115.0` ou superior;
- Node.js e npm;
- Linux com o comando `paplay` disponível;
- arquivos de som padrão em
  `/usr/share/sounds/freedesktop/stereo/`.

Atualmente, a reprodução de áudio é orientada a ambientes Linux. O comando
`paplay` é utilizado diretamente pela extensão para reproduzir os arquivos de
som do sistema.

## Instalação para desenvolvimento

Clone ou abra este projeto e instale as dependências:

```bash
npm install
```

Compile a extensão:

```bash
npm run compile
```

Para recompilar automaticamente durante o desenvolvimento:

```bash
npm run watch
```

Em seguida, abra o projeto no VS Code e pressione `F5`. A ação inicia uma
janela **Extension Development Host** com a extensão carregada.

## Teste rápido do áudio

Na janela **Extension Development Host**:

1. Abra a Paleta de Comandos com `Ctrl+Shift+P`.
2. Execute **Diagnostic Audio: Test Sound**.

Se não houver som, teste o reprodutor diretamente no terminal:

```bash
paplay /usr/share/sounds/freedesktop/stereo/suspend-error.oga
```

Os registros da extensão podem ser consultados em:

`View > Output > Diagnostic Audio`

## Testes funcionais

Os arquivos de teste estão na pasta [`Test/`](Test/). O arquivo
[`diagnostic-test.js`](Test/diagnostic-test.js) gera diagnósticos artificiais
no formato reconhecido pelo *problem matcher* do VS Code. As tarefas
correspondentes estão em [`Test/.vscode/tasks.json`](Test/.vscode/tasks.json).

Para executar uma tarefa, abra a Paleta de Comandos e selecione:

`Tasks: Run Task`

| ID | Tarefa | Comportamento esperado |
| --- | --- | --- |
| T01 | Inserir novo erro | Emitir som de erro |
| T02 | Corrigir o erro existente | Emitir som de erro resolvido |
| T03 | Inserir novo warning | Emitir som de warning |
| T04 | Corrigir o warning | Emitir som de warning resolvido |
| T05 | Vários erros quase simultâneos | Emitir um único sinal de erro após o *debounce* |
| T06 | Mover o cursor para uma linha com erro | Não emitir novo som na extensão apenas pelo movimento |
| T07 | Abrir um arquivo que já contém erros | Sincronizar o estado sem emitir alerta retroativo |
| T08 | Alterar diagnósticos em arquivo inativo | Ignorar o evento |

Os cenários T06 e T07 são realizados manualmente:

- Para T06, crie um diagnóstico com T01, mova o cursor para outra linha e
  depois retorne à linha com erro.
- Para T07, feche e abra novamente o arquivo que já possui o diagnóstico.
- Para T08, mantenha `diagnostic-fixture.js` ativo e execute a tarefa
  **T08 - Diagnóstico em arquivo inativo**. O diagnóstico será associado a
  `diagnostic-inactive.js`.

Os sinais nativos do VS Code podem ser desativados durante os testes para
evitar sons duplicados. Essa configuração não desativa a extensão, que possui
configurações próprias.

## Configuração

As configurações podem ser alteradas pela interface de configurações do VS
Code ou no arquivo `settings.json`:

```json
{
  "diagnosticAudio.enabled": true,
  "diagnosticAudio.volume": 1,
  "diagnosticAudio.debounceMs": 400
}
```

| Configuração | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `diagnosticAudio.enabled` | boolean | `true` | Ativa ou desativa a reprodução automática. |
| `diagnosticAudio.volume` | number | `1` | Volume entre `0` e `1`. |
| `diagnosticAudio.debounceMs` | number | `400` | Tempo, em milissegundos, antes de anunciar alterações agrupadas. |

Para testar somente esta extensão, os sons nativos relacionados a erros e
warnings podem ser desativados separadamente:

```json
{
  "accessibility.signals.lineHasError": {
    "sound": "off",
    "announcement": "auto"
  },
  "accessibility.signals.lineHasWarning": {
    "sound": "off",
    "announcement": "auto"
  },
  "diagnosticAudio.enabled": true
}
```

## Estrutura do projeto

```text
src/extension.ts              Código-fonte da extensão
out/                          JavaScript compilado (gerado localmente)
Test/                         Arquivos e tarefas dos testes funcionais
package.json                  Metadados, comandos e configurações da extensão
package-lock.json             Versões fixadas das dependências
tsconfig.json                 Configuração do TypeScript
.vscodeignore                 Arquivos excluídos de um pacote da extensão
```

## Limitações atuais

- A reprodução depende do `paplay` e dos sons disponíveis no sistema Linux.
- O suporte está limitado ao editor ativo.
- A extensão reconhece erros e warnings, mas não apresenta o texto do
  diagnóstico por voz.
- Não há, nesta versão, avaliação de usabilidade com usuários reais com
  deficiência visual.
- O protótipo foi desenvolvido para o VS Code e não foi validado em outras
  IDEs.

## Relação com a pesquisa

O protótipo operacionaliza a diretriz de fornecimento de feedback multimodal e
sonoro. A implementação transforma essa recomendação em um mecanismo concreto
de detecção de alterações nos diagnósticos e emissão de sinais auditivos,
complementando as tecnologias assistivas utilizadas no desenvolvimento de
software.
