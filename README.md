# Caderneta Financeira 📓

Organize seu extrato bancário com cara de caderno. Importe PDF, CSV ou OFX e
veja categorias, gráficos e insights — **tudo processado localmente no seu
navegador**, sem enviar seus dados para servidor nenhum.

## Como rodar

```bash
npm install
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
- **Categorias** com orçamento por categoria e barra de progresso.
- **Extrato** completo com busca, filtros, ordenação e edição, com etiquetas
  de "Parcela 3/4", "repetida" e moeda original.
- **Insights**: maior despesa, média diária, dia mais caro, projeção do mês,
  gastos recorrentes, cobranças suspeitas e duplicidades.
- Marca transações como **essencial**, **supérflua** ou **ignorar**; adiciona
  **tags** e **notas**.
- Dados salvos em `localStorage` (não precisa reenviar o PDF).

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

Nenhum dado bancário sai do navegador. O único download externo é o modelo de
idioma do OCR (português), usado apenas quando o PDF é escaneado.
