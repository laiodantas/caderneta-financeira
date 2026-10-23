# Caderneta Financeira 📓

Organize seu extrato bancário com cara de caderno. Importe PDF, CSV ou OFX e
veja categorias, gráficos e insights — **tudo processado localmente no seu
navegador**, sem enviar seus dados para servidor nenhum.

## Como rodar

Requer Node.js 22.12 ou superior (Node 24 recomendado).

```bash
npm ci
npm run dev      # abre em http://localhost:5173
```

Build de produção:

```bash
npm run build     # gera a pasta dist/
npm run preview   # serve o build
```

Checagem de tipos:

```bash
npm run typecheck
```

## O que faz

- **Importar** PDF (com OCR automático para extratos escaneados), CSV ou OFX,
  com pré-visualização editável antes de confirmar.
- **Fatura de cartão lida por colunas**: o layout `Data | Movimentação |
  Beneficiário | Valor` é reconstruído pelas coordenadas do texto, então a
  data, o valor e o estabelecimento saem exatos — sem o vencimento, o boleto,
  as opções de parcelamento ou as charges de juros virarem "transações".
- **Agrupar** estabelecimentos equivalentes: `DL*UberRides` vira **Uber**,
  `POP 09Set 12h10min` vira **99pop**, `IFD*...` vira **iFood**, etc.
- **Categoriza e agrupa** automaticamente por estabelecimento.
- **Aprende** quando você corrige uma categoria (regras salvas no navegador).
- **Painel** com total, indicadores, gráfico de rosca (categorias), barras
  (entradas/saídas por mês) e linha (evolução do saldo).
- **Card "As 5 maiores cobranças"**: as cinco despesas individuais mais caras.
- **Card "Cobranças repetidas"**: quem foi cobrado mais de uma vez no período
  (com aviso de repetição no mesmo dia).
- **Card "Parcelamentos"**: cada plano parcelado com parcela X/Y, valor da
  parcela, total planejado, quanto já foi pago e quanto falta — além das
  parcelas que já estão na fila para a próxima fatura.
- **Categorias** com edição de orçamento padrão ou do mês selecionado.
- **Extrato** completo com busca, filtros, ordenação e edição, com etiquetas
  de "Parcela 3/4", "repetida" e moeda original.
- **Insights**: maior despesa, média diária, dia mais caro, projeção do mês,
  gastos recorrentes, cobranças suspeitas e duplicidades.
- Marca transações como **essencial**, **supérflua** ou **ignorar**; adiciona
  **tags** e **notas**.
- Dados salvos como um conjunto atômico no `localStorage`, com aviso de falha e recuperação de conteúdo inválido.
- Backup JSON: exportar e restaurar na aba Importar. Guarde uma cópia antes de trocar de navegador.
- CSV: selecione conta (positivo = entrada) ou cartão (positivo = despesa) antes de enviar. Colunas Tipo com C/D têm prioridade.
- Arquivos: até 30 MB e PDFs com até 100 páginas; OCR por página e cancelamento da leitura.
- Reimportações com lançamentos já existentes são bloqueadas para evitar duplicar os totais.
- Parcelamentos são estimativas; use o identificador da compra na edição do Extrato para ajustar agrupamentos semelhantes.

## Onde personalizar

| O que                         | Arquivo                                   |
| ----------------------------- | ----------------------------------------- |
| Categorias, cores, palavras-chave | `src/config/categories.ts`             |
| Bancos suportados / detecção  | `src/config/banks.ts`                     |
| Apelidos de estabelecimentos  | `src/lib/normalize.ts` (mapa `MERCHANT_ALIASES`) |
| Palavras de "entrada"         | `src/lib/parser/text.ts` (`ENTRADA_KEYWORDS`) |
| Fontes e cores do tema        | `src/index.css` (variáveis em `:root`)    |

## Estrutura

```
src/
├─ config/        # categorias e bancos (fácil de editar)
├─ lib/
│  ├─ parser/     # PDF (pdf.js), CSV, OFX, OCR (tesseract), texto genérico
│  │               # e fatura.ts (fatura de cartão, leitura por colunas)
│  ├─ normalize.ts # limpeza de descrições
│  ├─ categorize.ts# classificação automática + aprendizado
│  ├─ aggregate.ts # totais e agrupamentos
│  ├─ insights.ts  # insights, recorrentes, anomalias, parcelamentos
│  ├─ storage.ts   # persistência em localStorage
│  └─ sample.ts    # dados de exemplo
├─ context/       # estado global (React Context)
├─ components/    # UI: header, gráficos, listas, modal, ilustrações
└─ pages/         # Painel, Categorias, Extrato, Importar
```

## Privacidade

Nenhum dado bancário sai do navegador. Há solicitações externas para as fontes do Google e para o worker, o motor e o modelo de idioma do OCR. O conteúdo dos extratos é processado no navegador; OCR pode precisar de internet na primeira execução.

## Verificações e publicação

Execute `npm run check` para tipos, testes e build. O workflow em .github executa essas verificações automaticamente. `npm run format` formata o código e `npm run format:check` confere a formatação.

Publique somente a pasta `dist/`. O projeto inclui fallback de rotas para Netlify/Cloudflare Pages (`public/_redirects`) e Vercel (`vercel.json`). Em outros servidores, encaminhe rotas como /extrato para index.html, mantendo arquivos estáticos. Não exponha o servidor de desenvolvimento na internet.

Para rollback, mantenha o artefato dist anterior e um backup JSON dos dados antes de atualizar. Se houver falha, republique o artefato anterior; não apague o localStorage. A versão atual lê as chaves antigas e preserva os dados legados.

## Teste no navegador

Com o servidor local na porta 5174 e o Playwright CLI instalado:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
# Em outro terminal:
playwright-cli -s=caderneta open http://127.0.0.1:5174
playwright-cli -s=caderneta run-code --filename=scripts/browser-smoke.js
```

Esse roteiro usa um contexto isolado, dados sintéticos e fixtures PDF próprias. Testa CSV, edição, recarga, duplicação, backup, orçamento, PDF textual, OCR e falha de quota. O OCR depende de downloads externos. Não modifica os dados do perfil principal do navegador.

A revisão de importação é preservada na sessão ao trocar de página ou recarregar. Abrir Categorias, Painel ou Extrato salva automaticamente uma revisão válida. Se houver erro de validação ou de salvamento, a aplicação volta à revisão com os dados preservados. Também há o botão “Salvar e ver categorias” acima da tabela.
