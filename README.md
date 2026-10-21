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
- **Categoriza e agrupa** automaticamente por estabelecimento.
- **Aprende** quando você corrige uma categoria (regras salvas no navegador).
- **Painel** com total, indicadores, gráfico de rosca (categorias), barras
  (entradas/saídas por mês) e linha (evolução do saldo).
- **Categorias** com orçamento por categoria e barra de progresso.
- **Extrato** completo com busca, filtros, ordenação e edição.
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
│  ├─ normalize.ts # limpeza de descrições
│  ├─ categorize.ts# classificação automática + aprendizado
│  ├─ aggregate.ts # totais e agrupamentos
│  ├─ insights.ts  # insights, recorrentes, anomalias
│  ├─ storage.ts   # persistência em localStorage
│  └─ sample.ts    # dados de exemplo
├─ context/       # estado global (React Context)
├─ components/    # UI: header, gráficos, listas, modal, ilustrações
└─ pages/         # Painel, Categorias, Extrato, Importar
```

## Privacidade

Nenhum dado bancário sai do navegador. O único download externo é o modelo de
idioma do OCR (português), usado apenas quando o PDF é escaneado.
