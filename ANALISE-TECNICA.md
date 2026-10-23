# Análise técnica — Caderneta Financeira

Este documento registra o diagnóstico anterior às correções. Consulte o resultado atual em CORRECOES.md.

Data: 23/10/2026. Escopo: código-fonte, configuração, dependências diretas, documentação, histórico recente, testes e build do checkout atual. Nenhum código funcional foi alterado.

## Parecer

O projeto tem uma base organizada para uma aplicação pessoal local. Entretanto, erros reproduzíveis de importação e parcelamento podem produzir valores financeiros incorretos. A persistência também pode falhar sem aviso visível. Recomendo corrigir esses pontos antes de utilizar o aplicativo como referência confiável para dados reais.

Avaliação qualitativa de prontidão: **62/100 — beta com riscos relevantes**. A nota representa julgamento de engenharia sobre as evidências abaixo, não uma métrica automatizada ou certificação.

## Arquitetura e pontos positivos

- SPA em React 18, TypeScript com `strict`, Vite e React Router. Sem backend próprio, autenticação, pagamentos ou banco remoto no código examinado; essas ausências são coerentes com a proposta local.
- Fluxo principal: arquivo → parser PDF/CSV/OFX → prévia editável → normalização e categorização → FinanceContext → localStorage → agregações e telas.
- Separação clara entre páginas, componentes, contexto, configuração e funções de domínio. É fácil localizar as responsabilidades principais.
- PDF.js extrai texto e coordenadas; um parser específico reconstrói a tabela de fatura. Tesseract faz OCR como fallback.
- Regras de categorias compiladas, prioridade por especificidade e proteção de escolhas manuais são boas decisões. A classificação tem uma suíte com muitos exemplos.
- Painel e Categorias excluem lançamentos com status `ignorar` antes dos cálculos. O Extrato mantém esses registros visíveis.
- O Extrato limita inicialmente a exibição a 40 registros. Há cartões próprios para celular, estados vazios, confirmação de exclusão e revisão anterior à importação.
- Não encontrei envio explícito de transações para serviços externos nem uso de `dangerouslySetInnerHTML` no código da aplicação. Isso não equivale a uma auditoria de tráfego ou garantia contra vulnerabilidades nas dependências.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Passou |
| `npm test` | 136 testes passaram em 6 arquivos |
| `npm run build` | Passou; aviso de uso de `eval` no PDF.js |
| Exemplos sintéticos executando funções reais | Confirmaram falhas descritas abaixo |
| Git antes da análise | Sem alterações locais |

O bundle principal gerado tem aproximadamente 657 kB, ou 194 kB comprimidos em gzip. O chunk do PDF.js tem 329 kB e o worker, 1,09 MB. PDF.js e Tesseract usam importação dinâmica, mas as quatro páginas são importadas diretamente pelo App. Não foi feita medição de desempenho em dispositivo real.

## Prioridade alta

### 1. PDF.js em versão afetada por vulnerabilidade conhecida

Evidências: `package.json` fixa `pdfjs-dist` em `3.11.174`; `src/lib/parser/pdf.ts:99` e `:118` chamam `getDocument({ data })` sem desativar `isEvalSupported`.

O aviso oficial da Mozilla para CVE-2024-4367 inclui versões até `4.1.392` e descreve execução de JavaScript de um PDF malicioso no domínio hospedeiro quando `isEvalSupported` está habilitado, como ocorre por padrão. A aplicação tem um caminho de renderização de PDF para OCR. A versão e a configuração justificam tratamento prioritário, mas não foi executado um PDF de exploração contra o aplicativo.

Correção: selecionar uma versão atualmente corrigida e compatível, atualizar a integração e o worker juntos e testar texto e OCR. Como mitigação documentada para esse aviso, desativar `isEvalSupported` nas duas aberturas. Não tratar `4.2.67`, primeira correção histórica desse CVE, como recomendação automática de versão atual.

Fonte: [Mozilla — GHSA-wgrm-67xf-hhpq](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq).

### 2. CSV pode inverter saída e entrada

Evidência: `src/lib/parser/csv.ts:81`. O texto da coluna Tipo é convertido para minúsculas, mas os padrões de letra isolada procuram `C` e `D` maiúsculos sem flag `i`.

Reprodução: `Data;Descricao;Valor;Tipo` seguido de `01/10/2026;Compra;100,00;D` retorna `type: entrada`. Além disso, sem coluna de tipo, um valor positivo com descrição não reconhecida é considerado saída; isso pode inverter créditos de extratos de conta que usam sinal numérico como convenção.

Correção: reconhecer `c/d` após normalização e definir explicitamente a convenção do arquivo, distinguindo extrato de conta de fatura. Permitir confirmação do mapeamento quando houver ambiguidade.

### 3. Fatura perde o primeiro dígito de certos valores

Evidência: `src/lib/parser/fatura.ts:111`, função `parseFirstMoney`.

Reprodução com uma tabela sintética `Data | Movimentação | Beneficiário | Valor`: `1234,56` foi importado como **234,56**. A regex encontra uma substring de três dígitos dentro do número maior; como encontra correspondência, não chega ao fallback que saberia ler o valor inteiro.

Correção: reconhecer valores completos sem separador de milhar e exigir fronteiras monetárias. Cobrir também números de cinco ou mais dígitos e células com BRL e moeda original.

### 4. Parser genérico confunde saldo com valor da transação

Evidência: `src/lib/parser/text.ts:239` escolhe sempre o último valor monetário.

Reprodução: `01/10/2026 Compra Loja -100,00 900,00` vira uma saída de **900**, deixando `-100,00` na descrição. Extratos com colunas Valor e Saldo podem ter todos os valores distorcidos.

Correção: reconhecer o layout das colunas ou pedir seu mapeamento; sinalizar linhas ambíguas em vez de assumir que o último número é a transação.

### 5. Falhas de salvamento ficam invisíveis

Evidências: `src/lib/storage.ts:31` e efeitos em `src/context/FinanceContext.tsx:84`.

`write` captura a exceção e apenas chama `console.error`. Com armazenamento cheio ou indisponível, a tela continua usando o estado em memória e pode mostrar importação concluída. Após recarregar, as alterações podem desaparecer. Simulei uma exceção de quota: `saveTransactions` retornou normalmente.

Extratos e transações também são persistidos em chaves separadas, sem uma operação atômica. Uma gravação pode funcionar e a outra falhar.

Correção: expor o resultado da persistência à interface, permitir recuperação e criar exportação/restauração. Para maior volume e consistência, considerar transações em IndexedDB.

### 6. Importação pode descartar linhas silenciosamente

Evidências: `src/pages/Importar.tsx:62` e `:110`. O botão só exige datas presentes, mas `confirmImport` pula valores inválidos, valores menores ou iguais a zero e descrições vazias usando `continue`.

Consequência: a interface anuncia a quantidade da prévia e sucesso, mesmo quando menos registros foram salvos. Se todas as linhas forem inválidas, cria um extrato vazio.

Correção: validar todas as linhas antes do commit, destacar os erros e impedir confirmação enquanto houver inconsistências. Rejeitar também números com lixo textual: `parseAmountInput('100abc')` atualmente retorna `100`.

### 7. Parcelamentos distintos são fundidos e o saldo restante pode estar errado

Evidência: `src/lib/insights.ts:159` identifica o plano apenas por estabelecimento e total de parcelas.

Reprodução: duas compras na mesma loja, ambas em 3 parcelas, uma de R$ 100 e outra de R$ 200, viram um plano único de R$ 600. O total dos dois planos seria R$ 900.

Separadamente, importar apenas a parcela **3/3 de R$ 100** mostra `paid: 100` e `remaining: 200`. A aplicação soma apenas o histórico importado, mas a interface apresenta esse resultado como quanto já foi pago e quanto falta cobrar. O extrato comprova cobrança, não necessariamente pagamento.

Correção: atribuir identidade à compra, considerar origem e sequência de parcelas e distinguir parcelas observadas, parcelas cobradas e pagamentos efetivamente conhecidos. Não apresentar histórico incompleto como dívida remanescente comprovada.

## Prioridade média

### 8. OFX exige fechamento de todos os campos; QIF não tem leitor próprio

`src/lib/parser/ofx.ts:8` só extrai campos com abertura e fechamento. Um bloco `<STMTTRN>` com campos `<DTPOSTED>`, `<TRNAMT>` e `<MEMO>` sem fechamento individual retornou uma lista vazia. O leitor não trata essa variante SGML.

`src/lib/parser/index.ts:48` aceita `.qif`, mas chama `parseOFX`, embora QIF tenha outra estrutura. Implementar leitura apropriada ou remover QIF da seleção. Adicionar fixtures para variantes de OFX e validar datas.

### 9. Regras antigas vencem correções posteriores

`matchLearned`, em `src/lib/categorize.ts:21`, retorna a primeira regra correspondente. As novas regras são acrescentadas no final, e o id inclui categoria e padrão. Assim, corrigir o mesmo padrão de Compras para Saúde mantém as duas regras, mas as futuras importações continuam classificadas como Compras. Confirmei esse comportamento com `Loja`.

Substituir a regra de mesmo padrão ou definir precedência explícita por atualização e especificidade.

### 10. Dados persistidos não têm validação de estrutura

`src/lib/storage.ts:21` faz `JSON.parse` com conversão de tipo, sem validar o resultado. `loadTransactions` devolveu `null` ao receber o JSON válido `null`. As páginas depois chamam `.map` e `.filter`, o que pode impedir a abertura.

Há tratamento melhor para orçamentos, mas não para transações, regras e extratos. Adicionar validação, migrações e recuperação preservando o conteúdo inválido. JSON ilegível hoje vira fallback vazio e pode ser sobrescrito pelos efeitos de persistência.

### 11. Não há proteção contra reimportação nem disputa entre arquivos

`commitImport` sempre acrescenta todos os registros com novos ids. Importar o mesmo arquivo duas vezes duplica os totais; o alerta de possível duplicidade não impede isso.

Durante `busy`, a área de upload continua disponível e `handleFile` não possui trava ou controle da requisição ativa. Duas leituras podem terminar em ordem invertida e substituir a prévia esperada. Implementar política explícita de reimportação e ignorar resultados obsoletos ou impedir uploads concorrentes.

### 12. Próximas parcelas acumulam previsões antigas

`src/pages/Dashboard.tsx:74` reúne `pendingInstallments` de todos os extratos. Não há conciliação com parcelas posteriormente importadas nem vencimento da previsão. Uma parcela antiga pode continuar aparecendo como futura. Vincular as previsões ao período e plano e conciliá-las com cobranças observadas.

### 13. Alguns indicadores usam critérios que não correspondem aos rótulos

- `compareMonths` compara os dois últimos meses com registros. Com agosto e outubro, compara outubro com agosto, enquanto o painel diz “vs mês anterior”.
- `duplicates` não inclui o tipo na chave: débito e estorno do mesmo estabelecimento, data e valor foram marcados como duplicados no exemplo sintético.
- O Extrato inclui registros ignorados nos totais do cabeçalho; Painel e Categorias os excluem. Explicitar essa diferença ou padronizar os totais.
- `avgDailySpend` divide pelos dias que tiveram saídas, enquanto a interface diz apenas “Média por dia”. Explicar o denominador.

### 14. Limitações no processamento de PDFs grandes ou mistos

`renderPdfPages` mantém os canvases de todas as páginas em memória antes de executar OCR. O consumo cresce com o número e o tamanho das páginas. Não há limite de arquivo/páginas nem cancelamento.

O OCR é escolhido pela média de caracteres do documento; um PDF com páginas textuais e escaneadas pode deixar páginas sem extração. O worker Tesseract só é encerrado no caminho de sucesso, sem `finally`. Após OCR, `pages` é zerado e o resultado informa zero páginas.

Processar e liberar uma página por vez, decidir OCR por página, encerrar recursos em `finally` e conservar a contagem original.

### 15. Acessibilidade com lacunas no teclado

Em `src/components/ui.tsx:90`, o modal tem nome acessível, foco inicial e Escape, mas não contém o foco nem o devolve ao acionador. No Extrato desktop, a edição depende do clique no `<tr>`; não há botão equivalente de edição acessível por teclado. Os campos da prévia não possuem rótulos individuais associados.

Adicionar ação de edição explícita, gerenciamento completo do foco e nomes acessíveis nos campos. Esta conclusão é estática; não houve auditoria com leitor de tela ou avaliação visual de contraste.

## Manutenção, documentação e desempenho

- **Orçamento sem edição na interface:** o domínio e os indicadores do Painel permanecem, mas Categorias não oferece editor nem barra de orçamento. O histórico Git registra a remoção; o README ainda anuncia a funcionalidade. Alinhar produto e documentação para evitar limites predefinidos sem controle visível.
- **Filtros de valores inconsistentes:** em `src/pages/Extrato.tsx:64`, `1.234,56` vira aproximadamente `1.234`, porque o código troca apenas a vírgula antes de `parseFloat`. Usar uma conversão monetária única e estrita.
- **Contagem no histórico:** `transactionCount` é definido na importação e não é atualizado ao excluir transações individuais. Calcular a contagem atual ou explicitar que representa a quantidade original.
- **Privacidade documentada de forma imprecisa:** o README diz que o único download externo é o modelo de OCR, mas `index.html` carrega Google Fonts e o Tesseract instalado usa worker externo por padrão. Isso não demonstra envio de conteúdo bancário, mas há solicitações externas adicionais. Documentá-las ou hospedar os recursos localmente.
- **Vite antigo:** `5.4.8` está na faixa afetada pelo [GHSA-x574-m823-4x7w](https://github.com/vitejs/vite/security/advisories/GHSA-x574-m823-4x7w), que permite leitura de arquivos quando o servidor de desenvolvimento é exposto à rede. A configuração examinada não habilita `--host`/`server.host`; portanto, não afirmo que esse cenário esteja ativo. Atualizar a ferramenta e preservar a separação entre desenvolvimento e hospedagem estática.
- **Custo de processamento:** `anomalies` ordena novamente os valores de cada estabelecimento para cada transação; `recurringExpenses` filtra toda a lista para cada grupo. Calcular estatísticas por grupo uma vez antes de percorrer os registros.
- **Estado global:** toda alteração no FinanceContext pode renderizar novamente consumidores que só usam parte do estado. A persistência serializa toda a lista de transações a cada mudança. Medir com volume real antes de introduzir complexidade adicional.
- **CSS e código remanescente:** `src/index.css` concentra mais de 2.200 linhas, incluindo estilos de orçamento cuja interface foi removida. Há funções e tipos sem uso; o TypeScript não reprova variáveis/parâmetros não utilizados.
- **Publicação:** BrowserRouter exige fallback para `index.html` nas rotas diretas. Não há configuração de hospedagem no repositório para confirmar isso. Também não há pipeline CI, script de lint ou roteiro de rollback documentado.

## Testes e sequência de correção

Os 136 testes são úteis, mas 105 estão na suíte de categorização. Não há testes automatizados dos parsers, armazenamento, contexto ou fluxos de interface. Os testes atuais não protegem as fronteiras com maior risco financeiro.

Ordem sugerida:

1. Atualizar/mitigar PDF.js e adicionar regressões dos valores de fatura e da direção do CSV.
2. Corrigir leitura de Valor/Saldo, variantes OFX e validação integral da prévia.
3. Tornar falhas de persistência visíveis, validar os dados carregados e disponibilizar backup/restauração.
4. Corrigir identidade de parcelamentos, significado de pago/restante e conciliação de previsões.
5. Tratar reimportação, concorrência de arquivos, prioridade das regras e indicadores.
6. Adicionar teste de ponta a ponta: importar → revisar → salvar → editar → recarregar → verificar totais; corrigir teclado e documentação.

## Limites da análise

Não foram usados extratos reais nem executados fluxos de navegador, OCR completo, leitores de tela ou implantação em hospedagem. Os exemplos de domínio foram executados diretamente nas funções TypeScript, com entradas sintéticas. A revisão de segurança verificou avisos oficiais específicos; não foi um inventário completo de vulnerabilidades transitivas. Nenhum arquivo do repositório foi enviado a um serviço de auditoria.
