/**
 * Carrega os assets visuais da mesa (fundo gerado via Gemini + sprites
 * interativos gerados via Ludo.ai) de forma assíncrona e não-bloqueante.
 *
 * Cada sprite expõe metadados de ancoragem (anchor/axis) para que o
 * TableRenderer aplique a proporção e o posicionamento corretos sobre a
 * geometria lógica da mesa (src/config/table.ts).
 *
 * Browser-only: usa `new Image()`. Não é importado pelos testes (node env).
 */

export type AssetKey =
  | 'background'
  | 'ball'
  | 'bumper'
  | 'flipper'
  | 'slingshot'
  | 'target'
  | 'blackhole'
  | 'portalSheet';

const SOURCES: Record<AssetKey, string> = {
  background:  'assets/table-bg.jpg',
  ball:        'assets/sprites/ball.png',
  bumper:      'assets/sprites/bumper.png',
  flipper:     'assets/sprites/flipper.png',
  slingshot:   'assets/sprites/slingshot.png',
  target:      'assets/sprites/target.png',
  blackhole:   'assets/sprites/blackhole.png',
  portalSheet: 'assets/sprites/portal-sheet.png',
};

/**
 * Layout do spritesheet do portal (hyperspace) — grade 4x4, 16 quadros de
 * 256x256, animação do buraco abrindo e fechando (gerada via Ludo animateSprite).
 */
export const PORTAL_SHEET = {
  cols: 4,
  rows: 4,
  frames: 16,
  frameW: 256,
  frameH: 256,
} as const;

/**
 * Ancoragem do sprite do flipper, medida a partir da máscara alpha do PNG
 * gerado (assets/sprites/flipper.png, 1253x423):
 *   - hub  (pivô)  = (0.155, 0.499) em frações da imagem
 *   - tip  (ponta) = (0.999, 0.489)
 * O eixo hub→ponta é horizontal (+x), então o sprite é rotacionado
 * exatamente pelo ângulo do flipper. axisFrac = comprimento do eixo / largura.
 */
export const FLIPPER_ANCHOR = {
  hubX: 0.155,
  hubY: 0.499,
  axisFrac: 0.844, // (tipX - hubX) em frações da largura da imagem
} as const;

export class AssetLoader {
  private readonly images = new Map<AssetKey, HTMLImageElement>();

  constructor() {
    for (const key of Object.keys(SOURCES) as AssetKey[]) {
      const img = new Image();
      img.src = SOURCES[key];
      this.images.set(key, img);
    }
  }

  /** Retorna a imagem apenas se já estiver totalmente decodificada. */
  get(key: AssetKey): HTMLImageElement | null {
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }
}
