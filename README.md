# DashGalo

Dashboard (PWA, celular e computador) com todas as partidas do Atlético Mineiro desde 1909, a partir das fichas técnicas do blog [O Canto do Galo](https://galopedia.blogspot.com/).

## Como funciona

1. `npm run coletar` baixa o feed do Blogger (versão JSON do feed Atom, 150 posts por página) e grava `dados-brutos/posts.json`.
2. `npm run gerar` passa cada post pelo parser (`src/parser/ficha.ts`) e grava `public/data/partidas.json` (resumo dos jogos) e `public/data/fichas.json` (escalações, carregadas só na ficha do jogo).
3. O app (React + Vite + vite-plugin-pwa) calcula tudo no navegador a partir desses arquivos.

O GitHub Actions (`.github/workflows/pipeline.yml`) roda a cada push, toda segunda-feira às 06:17 e sob demanda: testes → coleta → commit dos dados brutos (se mudaram) → build → testes visuais → deploy no GitHub Pages (só na `main`). Em **Settings › Pages**, a fonte deve ser **GitHub Actions**.

## Convenções

- Amistosos e jogos do Atlético-B ficam fora por padrão e entram pelos filtros.
- Aproveitamento = pontos ganhos / pontos disputados, vitória valendo 3, guardado como fração.
- Renda em centavos inteiros, na moeda da época (Rs, Cr$, NCr$, Cz$, NCz$, R$). Rankings de renda só usam R$.
- O lado de cada gol vem do cruzamento do autor com as escalações (gol contra inverte); quando não dá, o placar completa.

## Comandos

```bash
npm test                                   # parser e cálculos (vitest)
npm run dev                                # gera os dados e abre o app
npm run build && PW_CHROME=/usr/bin/google-chrome npm run e2e   # screenshots em screenshots/
```
