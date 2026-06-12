# Briefing: Space Cadet Pinball — Reimplementacao Web

**Data**: 2026-06-12
**Status**: Aprovado
**Versao**: 1.0.0

---

## 1. Visao e Proposito

Reimplementar o jogo **Space Cadet 3D Pinball** (originalmente distribuido com o Windows XP) como aplicacao web de pagina unica, rodando inteiramente no browser via HTML5 + Canvas 2D. O objetivo e preservar a identidade visual e o conjunto completo de funcionalidades do original — fisica de pinball, sistema de missoes/patentes, sons e musica — sem depender de nenhum asset ou codigo original (copyright Microsoft/Cinematronics). Todo o conteudo (graficos, audio, logica) sera criado do zero.

**Elevator pitch**: "O Space Cadet Pinball do Windows XP, inteiramente no browser, codigo e assets 100% proprios, sem instalar nada."

---

## 2. Usuarios e Stakeholders

| Ator | Papel |
|------|-------|
| Jogador desktop | Usuario final; acessa via browser moderno (Chrome, Firefox, Safari, Edge) |
| Desenvolvedor/operador | Dono do projeto; sem equipe adicional |

**Plataforma alvo**: desktop browsers modernos, controle exclusivamente por teclado. Sem suporte a mobile/touch no MVP.

---

## 3. Escopo

### 3.1 MVP (Escopo Coberto)

Paridade funcional completa com o Space Cadet 3D Pinball original:

**Controles**
- Flipper esquerdo: tecla `Z` ou seta esquerda
- Flipper direito: tecla `/` ou seta direita
- Plunger/launcher: tecla `Espaco` (segurar para carregar, soltar para lancar)
- Tilt: tecla `X` (inclinacao da mesa, detectada como tilt se excessivo)

**Elementos da mesa** (layout fiel ao original)
- 3 bumpers circulares (pop bumpers) no campo superior
- Rebounds/slingshots bilaterais (laterais do campo medio)
- Flags/targets — alvos que acendem e apagam ao serem atingidos
- Kickers nas paredes laterais
- Rampa central e hyperspace chute (portal de teletransporte)
- Lanes de entrada do plunger

**Fisica**
- Bola com velocidade, aceleracao gravitacional, bouncing
- Colisao com flippers (angulo dependente de posicao e velocidade do flipper)
- Colisao com bumpers (repulsao centrifuga)
- Colisao com rebounds (reflexao angular)
- Tilt (penalidade por movimento excessivo; perde bola)

**Sistema de missoes e patentes** (9 niveis, progressao por objetivos)
- Cadet → Ensign → Lieutenant → Captain → Commodore → Admiral → Vice Admiral → Admiral of the Fleet → Fleet Admiral
- Cada patente exige completar objetivos especificos (ex: acertar bumpers N vezes, completar rampas)
- Fuel lights: barra de combustivel que indica progresso para a proxima missao
- Multiplicadores de pontuacao (x2, x3, x5) ativados por objetivos

**Partida**
- 3 bolas por partida
- Replay: se pontuacao atingir threshold, ganhar bola extra
- Tilt: perde a bola atual sem pontuacao adicional
- Game over: sem bolas restantes

**Placar e persistencia**
- Placar corrente exibido no HUD lateral
- High score persistido em `localStorage` (sobrevive a recarregamento)
- HUD lateral com: pontuacao, bolas restantes, patente atual, fuel lights

**Audio** (recriado via Web Audio API — sintese procedural)
- Sons de impacto: bumper, flipper acionado, rebounds, kicker
- Sons de evento: missao completa, mudanca de patente, tilt, game over, novo high score
- Musica de fundo: tema sintetizado inspirado no original

**Visual** (canvas/SVG, sem assets bitmap de copyright)
- Layout da mesa fiel ao original: proporcoes, posicao dos elementos
- Paleta de cores: fundo escuro (azul/preto espacial), elementos em tons de azul, cinza, amarelo neon
- HUD lateral direito: placar, bolas, patente, missao ativa, fuel bar
- Tipografia: fonte monoespaco ou bitmap-style para placar

### 3.2 Pos-MVP (Desejavel, fora do escopo atual)

- Suporte a touch/mobile
- Multiplayer ou ranking online
- Modos de dificuldade configuravel
- Customizacao de teclas via UI
- Efeitos de particulas avancados
- Save/resume de partida

### 3.3 Fora de Escopo (nunca)

- Embutir assets originais do Windows XP (copyright Microsoft)
- Uso do codigo-fonte do port k4zmu2a/SpaceCadetPinball como base (copyright)
- Backend ou servidor — aplicacao e 100% client-side
- Integracoes com APIs externas

---

## 4. Prioridades e Trade-offs

| Prioridade | Decisao |
|------------|---------|
| Fidelidade visual e funcional | Maxima — objetivo central do projeto |
| Zero dependencias de copyright | Inegociavel — assets e logica 100% proprios |
| Sem backend | Inegociavel — single-page, servidor estatico opcional |
| TypeScript vs JavaScript | TypeScript com tipagem estrita (manutenibilidade) [fornecido] |
| Audio sintetizado vs samples | Web Audio API com sintese procedural (zero copyright, zero downloads) [fornecido] |
| Testes | Unitarios leves para fisica; sem E2E pesado |

---

## 5. Restricoes

| Tipo | Detalhe |
|------|---------|
| Legal | NENHUM asset ou codigo do Windows XP / Cinematronics pode ser incluido |
| Tecnica | Sem framework pesado; sem build system obrigatorio alem de `tsc` |
| Equipe | Desenvolvedor solo |
| Prazo | Nao definido formalmente — MVP iterativo |
| Budget | Zero (sem licencas, zero downloads de terceiros para assets) |
| CI/CD | Sem pipeline de CI automatizado no MVP |

---

## 6. Stack Tecnica

| Camada | Tecnologia |
|--------|------------|
| Linguagem | TypeScript (strict mode) |
| Renderizacao | HTML5 Canvas 2D API |
| Audio | Web Audio API (sintese procedural — sem arquivos de audio) |
| Estrutura | Single-page application (`index.html` + bundle TS compilado) |
| Build | `tsc` (TypeScript compiler) — sem bundler obrigatorio no MVP |
| Persistencia | `localStorage` (high score) |
| Servidor | Nao requerido; `npx serve .` ou similar para desenvolvimento |
| Testes | Vitest ou Jest (unitarios de fisica) |

**Sem frameworks de UI** (React, Vue, Svelte etc.) — Canvas puro.

**Referencia tecnica (consulta, nao base de codigo)**: port WebAssembly k4zmu2a/SpaceCadetPinball (GitHub) — serve como referencia de fisica e logica de missoes, NAO como codigo a ser copiado.

---

## 7. Qualidade e Padroes

- **TypeScript strict**: `"strict": true` no `tsconfig.json`; sem `any` sem justificativa
- **Testes unitarios**: cobertura da engine de fisica (colisao, bouncing, flipper angulo)
- **Zero dependencias de runtime externas**: sem CDN, sem npm packages de terceiros para o jogo em si (apenas devDependencies para TypeScript + testes)
- **Sem console.error silenciados**: erros surfacam, nao sao swallowed
- **Seguranca**: sem input do usuario alem de teclado; localStorage usado apenas para high score (sem dados pessoais)

---

## 8. Visao de Futuro (6-12 meses)

- Suporte a mobile/touch (controles na tela)
- Tabela de high scores com initials (localStorage expanded)
- Modo pratica (bolas ilimitadas, sem pontuacao)
- Editor de mesas (ambicioso, pos-MVP distante)

---

## 9. Itens a Definir

| Item | Contexto |
|------|---------|
| Estrutura exata de modulos TS | A definir no `/plan` — engine fisica, renderer, audio, game-state, UI |
| Algoritmo de deteccao de colisao | Referencia: k4zmu2a port + literatura de pinball physics |
| Thresholds de pontuacao para patentes | A calibrar por playtest (valores do original como referencia) |
| Threshold de replay | Valor do original (75.000 pontos) — a confirmar no plan |
| Frame rate target | 60fps via `requestAnimationFrame` — a validar performance |

---

## 10. Setup / Bootstrap

Projeto single-package TypeScript. Nao ha workspaces multiplos.

**Inicializacao do ambiente de desenvolvimento**:
```sh
npm install          # instala devDependencies (typescript, vitest)
npx tsc --watch      # compilacao incremental
```

Nenhum script de bootstrap multi-workspace necessario.
