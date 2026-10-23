# Correções e validação — 23/10/2026

O diagnóstico original foi mantido em `ANALISE-TECNICA.md` como histórico. Este documento descreve o estado após as correções.

| Área | Resultado |
| --- | --- |
| Dependências | PDF.js 6.4.299, Vite 8.3.5, Vitest 5.0.5, Router 7.18.4 e Recharts atualizado. Auditoria npm sem vulnerabilidades conhecidas. |
| CSV | C/D reconhecidos, convenção de conta/cartão explícita, campos entre aspas com quebra de linha e falhas de valores sinalizadas. |
| PDF | Valores sem separador de milhar preservados; worker atualizado; OCR decidido por página, com liberação dos recursos. |
| Texto com saldo | Valor separado de saldo; linhas com múltiplos valores sem identificação suficiente são rejeitadas com orientação. |
| OFX/QIF | Campos SGML/XML aceitos; valores inválidos sinalizados; QIF removido dos formatos aceitos. |
| Importação | Todas as linhas são validadas, sem descarte silencioso na confirmação. Leituras concorrentes bloqueadas e cancelamento disponível. Limites de 30 MB e 100 páginas. |
| Persistência | Um conjunto versionado gravado em uma única operação; falha de quota visível; dados inválidos preservados e gravação bloqueada até recuperação. |
| Recuperação | Exportação de backup, restauração validada e cópia bruta de recuperação na aba Importar. Migração das chaves antigas. |
| Reimportação | Sobreposição com registros existentes bloqueada; usuário pode revisar/remover linhas ou substituir o extrato anterior. |
| Regras | Correção mais recente substitui o mesmo padrão e tem prioridade. |
| Parcelamentos | Agrupamento considera origem, descrição, valor e mês inicial estimado. Identificador manual permite corrigir casos ambíguos. Última parcela não deixa saldo futuro fictício. |
| Previsões | Painel usa previsões do período mais recente, elimina repetições e remove previsões já observadas no histórico correspondente. |
| Indicadores | Estorno não é duplicata de débito; comparação usa mês calendário anterior; totais do Extrato excluem ignoradas; média diária explicita seu denominador. |
| Orçamento | Editor por mês ou padrão na aba Categorias; limites negativos rejeitados. |
| Histórico/filtros | Contagem atual derivada dos registros; filtros de valor usam interpretação monetária comum. |
| Acessibilidade | Botão de edição no desktop, campos da prévia com nomes acessíveis, foco contido/devolvido pelo modal, foco visível e movimento reduzido. |
| Desempenho | Páginas carregadas sob demanda; medianas e recorrências calculadas por grupo. Bundle inicial caiu de cerca de 657 kB para 216 kB, sem contar os chunks carregados depois. |
| Manutenção | Formatação padronizada, TypeScript reprova código não utilizado, comando `check`, workflow CI e fallbacks de rotas para hospedagem. |
| Documentação | Requisitos de Node, serviços externos, backup, execução, publicação e rollback documentados. |

## Evidência de validação

- `npm run check`: tipos, **166 testes em 7 arquivos**, build de produção aprovados.
- `npm audit --omit=dev`: nenhuma vulnerabilidade conhecida encontrada na consulta executada.
- `scripts/browser-smoke.js`: roteiro executado com Playwright CLI em contexto isolado, com fixtures sintéticas próprias.
- Navegador: CSV → confirmação → recarga → edição → recarga; bloqueio de reimportação e prévia inválida; backup exportado/restaurado; orçamento editado; PDF textual e OCR; painel a 390 px; falha simulada de quota com aviso visível. Nenhuma exceção JavaScript nesse roteiro.
- Capturas da execução estão em `.playwright-cli/final-desktop.png` e `.playwright-cli/final-mobile.png` (diretório local ignorado pelo Git).

## Limites e próximos passos

- Não há garantia universal para todos os layouts bancários. Prévia e revisão continuam necessárias; os testes usam extratos sintéticos, não documentos reais do usuário.
- Parcelamentos sem identidade própria no arquivo continuam sendo estimativas. O identificador manual serve para separar compras iguais ou unir parcelas que o banco descreve de formas diferentes. Os valores observados não são prova de pagamento da fatura.
- OCR depende dos downloads externos de worker, motor e modelo. Cancelar uma leitura interrompe o processamento, mas um download já iniciado pode levar um instante para terminar.
- A persistência continua em localStorage, com capacidade limitada e sem sincronização entre dispositivos. Uma mudança em outra aba bloqueia novas gravações e solicita recarga.
- O workflow CI foi criado, mas sua execução remota depende de publicar as alterações no repositório.
- O roteiro de teclado foi revisado no código; não foi feita certificação de acessibilidade ou teste com leitor de tela.

Sugestão de evolução: disponibilizar uma versão instalável com recursos de OCR hospedados localmente e mover a persistência para IndexedDB. Isso melhora funcionamento offline e capacidade de armazenamento. Outra melhoria útil é permitir selecionar somente as transações novas ao importar extratos com períodos sobrepostos.

## Correção adicional: navegação após selecionar PDF

A prévia antes ficava apenas no estado local da página Importar. Agora há um contexto de revisão compartilhado, persistência temporária em sessionStorage, salvamento ao navegar e um botão de conclusão acima da tabela. Uma revisão inválida volta à tela de importação sem perder os campos.

Validação com a fatura Inter fornecida pelo usuário: 63 lançamentos lidos, 9 categorias no período selecionado, um único extrato salvo; alternância entre Categorias, Extrato e Painel e recarga mantiveram os dados. O PDF real permanece na pasta Downloads e não foi incluído nos testes versionados. O roteiro de navegador ganhou regressões com dados sintéticos para esse fluxo.
