<!--
Sync Impact Report
- Version: new → 1.0.0
- Principios adicionados: 7 (Copyright-Free, TypeScript-Strict, Canvas-First, Physics-Fidelity, Zero-Runtime-Deps, Test-Physics-Core, Client-Only)
- Secoes adicionadas: Core Principles, Architecture Decisions, Quality Standards, Governance
- Secoes removidas: n/a (documento novo)
- Artefatos que precisam atualizacao: nenhum (documento inicial)
- TODOs pendentes: nenhum
-->

# Constitution: Space Cadet Pinball Web

**Version**: 1.0.0
**Ratified**: 2026-06-12
**Last Amended**: 2026-06-12

---

## Core Principles

### P1 — Copyright-Free (NON-NEGOTIABLE)

**MUST**: Nenhum asset (bitmap, audio, video, fonte proprietaria) nem codigo-fonte do Space Cadet 3D Pinball original (Windows XP, Microsoft/Cinematronics) ou de ports derivados (ex: k4zmu2a/SpaceCadetPinball) pode ser incluido, copiado ou adaptado no codebase.

Todo conteudo — graficos, sons, musica, logica de jogo — DEVE ser criado do zero ou derivado de fontes explicitamente livres de copyright.

**Por que**: restricao legal inegociavel; violacao invalida o projeto inteiro.

**Testavel via**: `git log --all --diff-filter=A -- '*.bmp' '*.wav' '*.mid' '*.dll'` retorna vazio; ausencia de licencas de terceiros no repositorio.

---

### P2 — TypeScript Strict (NON-NEGOTIABLE)

**MUST**: Todo codigo de producao e de teste DEVE ser TypeScript com `"strict": true` no `tsconfig.json`. O uso de `any` sem comentario explicativo e proibido.

**MUST NOT**: Desabilitar regras do compilador TS via `// @ts-ignore` ou `// @ts-nocheck` sem justificativa documentada no proprio comentario.

**Por que**: projeto de tamanho medio com engine de fisica numericamente densa — tipagem estrita previne erros de categoria (ex: coordenada tratada como velocidade) antes do runtime.

**Testavel via**: `npx tsc --noEmit` retorna exit 0; `grep -rn '@ts-ignore\|any' src/` auditado em revisao.

---

### P3 — Canvas-First, Zero Framework (NON-NEGOTIABLE)

**MUST**: A renderizacao do jogo DEVE usar exclusivamente a Canvas 2D API nativa do browser. Frameworks de UI (React, Vue, Svelte, Angular, etc.) sao proibidos no bundle de producao.

**SHOULD**: Elementos de UI fora do canvas (menus, overlays) PODEM usar HTML/CSS simples, mas sem framework.

**Por que**: fidelidade ao original exige controle pixel-a-pixel do loop de renderizacao; frameworks de UI introduzem latencia de reconciliacao incompativel com 60fps game loop.

**Testavel via**: `package.json` `dependencies` nao contem react, vue, angular, svelte ou similares.

---

### P4 — Physics Fidelity Over Visual Fidelity

**MUST**: A engine de fisica (bouncing, flipper, bumpers, slingshots) DEVE ser implementada com acuracia suficiente para replicar o comportamento jogavel do original. Ajustes cosmeticos visuais sao secundarios a corretude fisica.

**SHOULD**: Constantes de fisica (gravidade, elasticidade, forca de flipper) DEVEM ser calibraveis via arquivo de configuracao separado (ex: `src/config/physics.ts`) para facilitar tuning sem alterar logica.

**Por que**: o valor do projeto e a experiencia de jogo; visual errado e aceitavel temporariamente, fisica errada torna o jogo injogavel.

**Testavel via**: testes unitarios da engine de fisica passam; flipper consegue lancar bola ate bumpers em simulacao.

---

### P5 — Zero Runtime Dependencies

**MUST**: O bundle de producao (o que roda no browser) NAO DEVE ter dependencias de runtime externas — sem npm packages de terceiros carregados em runtime, sem CDN calls, sem fetch para APIs externas.

**MAY**: `devDependencies` (TypeScript, Vitest, bundler) sao permitidas apenas para o toolchain de desenvolvimento.

**Por que**: aplicacao DEVE rodar offline abrindo `index.html` localmente; zero superficie de ataque externa; zero licenciamento de runtime.

**Testavel via**: `package.json` `dependencies` (nao `devDependencies`) esta vazio ou contem apenas polyfills explicitamente justificados.

---

### P6 — Test the Physics Core

**SHOULD**: A engine de fisica (`src/physics/` ou equivalente) DEVE ter cobertura de testes unitarios cobrindo: colisao bola-flipper, colisao bola-bumper, colisao bola-parede, deteccao de tilt, e logica de score/missoes.

**MUST NOT**: Fazer merge de mudancas na engine de fisica que quebrem testes unitarios existentes sem justificativa documentada.

**Por que**: a fisica e o coracao do jogo; regressoes sao invisiveis sem testes automatizados (o jogo "parece igual" mas a fisica muda sutilmente).

**Testavel via**: `npm test` retorna exit 0; `npx vitest run --coverage` mostra cobertura >= 70% em `src/physics/`.

---

### P7 — Client-Only, No Backend (NON-NEGOTIABLE)

**MUST**: A aplicacao DEVE ser 100% client-side. Nenhuma chamada de rede e permitida em runtime (exceto carregar o proprio `index.html` + assets gerados). Persistencia DEVE usar exclusivamente `localStorage`.

**MUST NOT**: Introduzir servidor Node.js, API REST, WebSocket server, ou qualquer servico de backend — nem mesmo para desenvolvimento local alem de servidor estatico simples.

**Por que**: proposito do projeto e rodar sem infraestrutura; backend contradiz o requisito de "abrir index.html e jogar".

**Testavel via**: `grep -rn 'fetch\|XMLHttpRequest\|WebSocket\|axios' src/` retorna vazio (exceto comentarios).

---

## Architecture Decisions

### AD-001: Game Loop via requestAnimationFrame

O loop principal do jogo DEVE usar `requestAnimationFrame` com delta-time para atualizacoes de fisica e renderizacao. Fixed timestep de fisica (ex: 16.67ms) desacoplado do timestep de render quando necessario para estabilidade.

### AD-002: Separacao Engine/Renderer

A engine de fisica (`PhysicsEngine`) DEVE ser completamente independente do renderer (`Renderer`). A engine opera em coordenadas de mundo; o renderer transforma para coordenadas de canvas. Isso permite testes unitarios da engine sem canvas.

### AD-003: Audio via Web Audio API Procedural

Sons DEVEM ser sintetizados em runtime via Web Audio API (oscillators, gain nodes, filters). Nenhum arquivo de audio (.mp3, .ogg, .wav) no repositorio. O AudioManager DEVE ser inicializado apos interacao do usuario (requisito do browser para AudioContext).

### AD-004: Configuracao Centralizada

Constantes de jogo (fisica, scoring, missoes) DEVEM residir em `src/config/` — separadas da logica. Isso permite ajuste de balance sem alterar codigo de comportamento.

### AD-005: State Machine para Missoes

O sistema de missoes/patentes DEVE ser implementado como state machine explicita com transicoes documentadas. Estados: `Cadet → Ensign → Lieutenant → Captain → Commodore → Admiral → Vice Admiral → Admiral of the Fleet → Fleet Admiral`.

---

## Quality Standards

| Standard | Nivel | Detalhe |
|----------|-------|---------|
| TypeScript strict | MUST | `"strict": true`; zero `any` sem justificativa |
| Testes unitarios | SHOULD | Cobertura >= 70% em `src/physics/` |
| Performance | SHOULD | 60fps em hardware moderno (Chrome/Firefox/Safari) |
| Acessibilidade | MAY | Fora de escopo MVP — jogo de teclado, sem screen reader |
| Seguranca | MUST | localStorage apenas para high score; zero dados pessoais |
| Bundle size | SHOULD | < 500KB minificado (sem assets de audio externos) |

---

## Governance

### Amendment Rules

- **MAJOR** (ex: 1.0.0 → 2.0.0): Remocao ou redefinicao incompativel de principio NON-NEGOTIABLE. Requer decisao documentada com justificativa de 3+ paragrafos.
- **MINOR** (ex: 1.0.0 → 1.1.0): Novo principio ou nova Architecture Decision. Requer justificativa de 1 paragrafo.
- **PATCH** (ex: 1.0.0 → 1.0.1): Clarificacao de texto, correcao tipografica. Sem justificativa formal necessaria.

### Exception Handling

Excecoes a principios NON-NEGOTIABLE (P1, P2, P3, P7) NAO sao permitidas. Excecoes a principios SHOULD (P4, P5, P6) requerem comentario `// CONSTITUTION-EXCEPTION: <P#> <justificativa>` no ponto de excecao.

### Conflict Resolution

Se dois principios entrarem em conflito em uma decisao especifica, o desenvolvedor DEVE documentar o trade-off em um ADR (Architecture Decision Record) em `docs/06-adrs/` antes de prosseguir.

---

*Version 1.0.0 — Ratified 2026-06-12 — Last Amended 2026-06-12*
