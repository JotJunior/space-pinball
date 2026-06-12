# Feature Spec: Space Cadet Pinball Web

**Feature**: space-cadet-pinball  
**Status**: Refined (post-clarify)  
**Created**: 2026-06-12  
**Constitution**: [docs/constitution.md](../../constitution.md)

> Decisoes de infraestrutura: N/A (feature stateless, sem scheduling, sem backend, sem dados pessoais — apenas localStorage para high score local)

## Resolved Ambiguities (clarify dec-016, dec-017, dec-018)

| Questao | Decisao | Justificativa |
|---------|---------|---------------|
| Q1: Entrega de modulos TS ao browser | ES modules nativos + `npx serve` (sem bundler no MVP) | Briefing §6 explicita `tsc` sem bundler; constitution P5 nao exige bundler |
| Q2: Timestep de fisica | Fixed timestep interno ~120 steps/s com interpolacao para render | Constitution AD-001 explicita fixed timestep desacoplado; P4 exige fidelidade fisica deterministica |
| Q3: Geometria da mesa | Objeto de configuracao declarativo centralizado em `src/config/` | Constitution AD-004 MUST: constantes em `src/config/`; P4 SHOULD: `src/config/physics.ts` |

---

## User Scenarios & Testing

### P1 — Iniciar e jogar uma partida completa

**Como** jogador desktop,  
**Quero** iniciar uma partida de Space Cadet Pinball pressionando Espaco ou clicando no canvas,  
**Para que** eu possa comecar a jogar imediatamente sem configuracao.

**Acceptance Scenarios:**
- Ao abrir `index.html`, a mesa aparece com a bola no plunger aguardando lancamento.
- Pressionar e segurar Espaco carrega o plunger (indicador visual de forca aumenta).
- Soltar Espaco lanca a bola com forca proporcional ao tempo de carga.
- O jogo aceita as teclas Z / seta-esquerda (flipper esquerdo) e `/` / seta-direita (flipper direito).
- Ao perder a ultima bola, o jogo exibe "GAME OVER" e permite reiniciar.

**Edge Cases:**
- Pressionar Espaco antes da bola estar no plunger nao tem efeito (ou trata como noop).
- Soltar Espaco imediatamente lanca bola com forca minima.

---

### P2 — Fisica fiel da bola e elementos da mesa

**Como** jogador,  
**Quero** que a bola se comporte de forma previsivel e fiel ao original ao interagir com todos os elementos da mesa,  
**Para que** eu sinta a mesma satisfacao jogavel do Space Cadet original.

**Acceptance Scenarios:**
- A bola cai sujeita a gravidade e acelera de forma realista.
- Flippers acionados alteram o angulo e a velocidade da bola de forma dependente da posicao do impacto no flipper.
- Os 3 pop bumpers circulares repelem a bola com forca centrifuga ao serem atingidos.
- Os slingshots/rebounds laterais refletem a bola com angulo preciso.
- Kickers nas paredes aplicam impulso lateral a bola.
- A rampa central redireciona a bola pelo trilho ate o topo da mesa.
- O hyperspace chute teleporta a bola para outra regiao da mesa.

**Edge Cases:**
- Bola que atinge o corner extremo da mesa nao trava nem desaparece.
- Bola lancada com forca maxima que acerta bumpers em rapida sequencia nao causa comportamento inesperado.
- Tilt ativado enquanto a bola esta na rampa ainda resulta em perda da bola.

---

### P3 — Missoes, patentes e progressao

**Como** jogador,  
**Quero** progredir pelas 9 patentes militares completando missoes com objetivos especificos,  
**Para que** eu tenha motivacao de longa duracao alem da pontuacao imediata.

**Acceptance Scenarios:**
- O jogo inicia na patente Cadet.
- Cada patente tem objetivos visuais claros indicados na mesa e no HUD.
- Completar os objetivos de uma patente ativa a progressao visual e sonora para a proxima patente.
- As 9 patentes em ordem sao: Cadet → Ensign → Lieutenant → Captain → Commodore → Admiral → Vice Admiral → Admiral of the Fleet → Fleet Admiral.
- Ao atingir Fleet Admiral, o ciclo reinicia ou o jogo entra em modo especial.
- A barra de fuel lights indica progresso atual dentro da missao corrente.
- Multiplicadores x2, x3, x5 sao ativados por objetivos especificos e exibidos no HUD.

**Edge Cases:**
- Perder a bola no meio de uma missao parcialmente completa nao reseta o progresso.
- Completar multiplos objetivos em rapida sequencia (ex: bumper e flag ao mesmo tempo) contabiliza ambos.

---

### P4 — Mecanicas de partida (vidas, tilt, replay)

**Como** jogador,  
**Quero** que as mecanicas de vidas, tilt e replay funcionem como no original,  
**Para que** a partida tenha a mesma tensao e fairness do jogo classico.

**Acceptance Scenarios:**
- A partida inicia com 3 bolas; o indicador de bolas restantes e visivel no HUD.
- Ao perder uma bola, a proxima e colocada no plunger automaticamente.
- Pressionar X repetidamente ou simular tilt excessivo ativa o Tilt: flippers ficam desabilitados e a bola e perdida.
- Indicador visual "TILT" aparece na mesa ao ativar tilt.
- Ao atingir o threshold de replay (75.000 pontos por padrao), o jogo concede uma bola extra com feedback sonoro e visual.
- O replay pode ocorrer no maximo uma vez por partida.

**Edge Cases:**
- Tilt na ultima bola finaliza o jogo imediatamente.
- Replay nao e concedido se o jogador ja recebeu replay nessa partida.

---

### P5 — HUD, placar e high score persistido

**Como** jogador,  
**Quero** ver minha pontuacao, status de jogo e high score a qualquer momento, com o record preservado entre sessoes,  
**Para que** eu tenha feedback continuo e motivacao para superar meu proprio recorde.

**Acceptance Scenarios:**
- O HUD lateral exibe: pontuacao atual, high score, bolas restantes, patente atual, fuel bar, missao ativa.
- O high score e salvo em localStorage apos cada partida.
- Ao carregar o jogo novamente, o high score salvo e exibido.
- Ao superar o high score, um feedback especial (visual + sonoro) indica o novo recorde.
- O layout do HUD e fiel ao original (painel lateral direito, fonte bitmap-style, esquema de cores espacial).

**Edge Cases:**
- Se localStorage nao esta disponivel (modo privado extremo), o jogo funciona normalmente sem persistencia.
- High score de 0 e o default inicial.

---

### P6 — Audio sintetizado (sons e musica)

**Como** jogador,  
**Quero** ouvir sons para cada evento do jogo e musica de fundo,  
**Para que** a experiencia auditiva reforce o feedback visual e evoque o original.

**Acceptance Scenarios:**
- Sons distintos para: bumper atingido, flipper acionado, rebounds, kicker, missao completa, mudanca de patente, tilt, game over, novo high score.
- Musica de fundo toca durante o jogo e para no game over.
- O audio inicia somente apos a primeira interacao do usuario com a pagina.
- Os sons sao gerados em runtime via sintese procedural — nenhum arquivo de audio e carregado.
- O jogador pode silenciar o jogo (tecla M ou botao na interface).

**Edge Cases:**
- Em browsers que bloqueiam AudioContext antes de interacao, o jogo funciona silenciosamente ate o primeiro clique/tecla.
- Sons sobrepostos (ex: multiplos bumpers atingidos ao mesmo tempo) nao causam distorcao audivel.

---

### P7 — Visual fiel: mesa, paleta e identidade grafica

**Como** jogador,  
**Quero** ver uma mesa visualmente fiel ao Space Cadet original, desenhada programaticamente,  
**Para que** o jogo seja reconhecivel sem depender de assets de copyright.

**Acceptance Scenarios:**
- A mesa tem o layout caracteristico do original: plunger lane a direita, 3 bumpers no topo, slingshots laterais, rampa central.
- A paleta de cores usa fundo escuro (azul espacial/preto), elementos em azul, cinza metalico e amarelo neon.
- Todos os elementos graficos (mesa, bola, flippers, bumpers, HUD) sao desenhados via Canvas 2D API — sem imagens externas.
- A fonte do placar usa estilo bitmap/monoespaco para evocar o original.
- A mesa se adapta proporcional ao viewport mantendo aspect ratio.

**Edge Cases:**
- Em viewports muito pequenos (< 600px de largura), a mesa exibe aviso de resolucao minima ou escala adaptativa.

---

## Functional Requirements

### FR-001 — Game Loop

O sistema DEVE executar um game loop via `requestAnimationFrame` mantendo ~60 frames por segundo. A fisica DEVE rodar em fixed timestep interno (~120 steps/s), com o render interpolando entre estados de fisica adjacentes (dec-017). Os modulos TypeScript DEVEM ser entregues ao browser como ES modules nativos, acessiveis via servidor estatico simples (`npx serve`) sem necessidade de bundler no MVP (dec-016).

### FR-002 — Motor de Fisica

O motor de fisica DEVE implementar:
- Gravidade constante (ajustavel via configuracao)
- Deteccao de colisao bola-flipper com reflexao dependente de angulo e velocidade do flipper
- Deteccao de colisao bola-bumper com repulsao centrifuga
- Deteccao de colisao bola-slingshot com reflexao angular
- Deteccao de colisao bola-parede (bordas da mesa)
- Deteccao de colisao bola-kicker com impulso configuravel
- Deteccao de saida da bola (parte inferior da mesa = perda de bola)

### FR-003 — Controles de Teclado

O sistema DEVE aceitar as seguintes teclas:
- Flipper esquerdo: `Z` ou seta esquerda
- Flipper direito: `/` ou seta direita
- Plunger: `Espaco` (pressionar = carregar; soltar = lancar)
- Tilt: `X` (inclinacao intencional)
- Mute: `M` (alternar audio)

Controles DEVEM ser responsivos (latencia < 1 frame).

### FR-003b — Configuracao Centralizada da Geometria

Toda a geometria da mesa (posicao de bumpers, slingshots, rampa, chute, kickers, paredes, lanes) e as constantes de fisica (gravidade, elasticidade, forca de flipper, limiares de tilt) DEVEM ser definidas como objetos de configuracao declarativos em `src/config/` — separados da logica de fisica e renderizacao (dec-018, constitution AD-004).

### FR-004 — Sistema de Missoes

O sistema DEVE implementar uma state machine de missoes com 9 estados (patentes). Cada estado DEVE ter objetivos declarativos (ex: "acertar 3 bumpers + completar 1 rampa"). Transicoes DEVEM ser acionadas por completude dos objetivos. A progressao DEVE sobreviver a perda de bola (exceto se reset explicitado por regra da patente).

### FR-005 — Scoring e Multiplicadores

O sistema DEVE:
- Acumular pontuacao por evento (bumper: +N pts, flags: +N pts, rampa: +N pts, etc.)
- Aplicar multiplicadores ativos (x2, x3, x5) sobre pontos ganhos
- Exibir pontuacao atualizada em tempo real no HUD
- Persistir high score em `localStorage` com chave `spaceCadetHighScore`

### FR-006 — Mecanica de Bolas e Fim de Partida

O sistema DEVE:
- Iniciar partida com 3 bolas
- Reduzir contador ao perder bola
- Acionar GAME OVER quando contador chegar a 0
- Conceder replay (bola extra) quando pontuacao >= 75.000 (uma vez por partida)
- Implementar tilt: N presses de X em sequencia rapida (ou logica de movimento da mesa)

### FR-007 — Motor de Audio

O sistema DEVE:
- Inicializar `AudioContext` somente apos interacao do usuario
- Gerar todos os sons via osciladores, filtros e nodes da Web Audio API
- Sintetizar musica de fundo em loop
- Suportar mute/unmute em runtime
- Suportar N sons simultaneos sem clipping

### FR-008 — Renderizacao Canvas

O sistema DEVE:
- Renderizar toda a mesa, bola, elementos e HUD via Canvas 2D API
- Redesenhar o frame completo a cada iteracao do game loop
- Escalar a mesa proporcionalmente mantendo aspect ratio do original (~600x900px)
- Usar fonte monoespaco para placar no HUD

### FR-009 — Persistencia

O sistema DEVE armazenar somente o high score em `localStorage`. Nenhum dado de usuario, sessao ou preferencias alem do mute state (opcional) DEVE ser armazenado. O jogo DEVE funcionar normalmente se `localStorage` for indisponivel (degradacao graceful).

### FR-010 — Independencia de Assets Externos

O sistema NAO DEVE fazer nenhuma requisicao de rede em runtime. Todos os graficos DEVEM ser desenhados via Canvas API. Nenhum arquivo de audio, imagem ou fonte externa DEVE ser carregado. A aplicacao DEVE funcionar completamente offline apos carregamento inicial do HTML.

---

## Key Entities

| Entidade | Descricao |
|----------|-----------|
| `Ball` | Estado da bola: posicao (x,y), velocidade (vx,vy), raio |
| `Flipper` | Estado do flipper: angulo corrente, velocidade angular, lado (esq/dir) |
| `Bumper` | Posicao fixa, estado ativo/inativo, pontos por hit |
| `Slingshot` | Regiao de reflexao lateral, estado ativo/inativo |
| `Target/Flag` | Alvo aceso/apagado, pontos, referencia a missao |
| `Ramp` | Geometria da rampa, ponto de entrada, ponto de saida |
| `HyperspaceChute` | Trigger de entrada, destino de saida |
| `MissionState` | Patente corrente, objetivos correntes, progresso |
| `GameState` | Pontuacao, bolas restantes, multiplicador ativo, status (playing/paused/gameover) |
| `AudioManager` | AudioContext, nodes de sintese, estado mute |
| `ScoreBoard` | Pontuacao corrente, high score (localStorage) |

---

## Success Criteria

1. **Jogabilidade**: Um jogador familiar com o original consegue reconhecer e jogar a versao web sem instrucoes adicionais, completando pelo menos uma mudanca de patente em uma partida.

2. **Fidelidade fisica**: A bola interage com todos os elementos da mesa (flippers, bumpers, slingshots, rampa, chute) de forma previsivel e consistente com o comportamento do original — avaliado por inspeção visual comparativa.

3. **Performance**: O jogo mantem 60fps estavel em hardware de desktop moderno (Chrome/Firefox/Safari, ultimo ano) durante 5 minutos de jogo continuo, sem quedas abaixo de 55fps.

4. **Zero dependencias de copyright**: `git ls-files` nao lista nenhum arquivo `.bmp`, `.wav`, `.mid`, `.dll` ou asset do Windows XP; `package.json > dependencies` esta vazio.

5. **Zero runtime externo**: O jogo funciona completamente offline apos carregar `index.html` — sem requisicoes de rede, sem CDN, sem fetch.

6. **Audio funcional**: Todos os 9 tipos de evento sonoro disparam som sintetizado auditivel; a musica de fundo toca em loop durante o jogo.

7. **High score persistido**: Fechar e reabrir o browser preserva o high score (verificavel via DevTools > Application > localStorage).

8. **TypeScript compilavel**: `npx tsc --noEmit` retorna exit 0 sem erros ou warnings.

---

## Out of Scope

- Suporte a touch/mobile
- Multiplayer ou ranking online
- Modos de dificuldade configuravel via UI
- Customizacao de teclas via UI
- Save/resume de partida
- Efeitos de particulas avancados (explosoes, trails)
- Qualquer asset original do Windows XP / Cinematronics
- Backend, servidor, API, banco de dados
