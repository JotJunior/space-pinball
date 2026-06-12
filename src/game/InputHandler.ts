/**
 * Keyboard input handler for Space Cadet Pinball.
 * Tracks key state and exposes normalized input interface.
 * Ref: spec.md FR-003; plan.md §Data Model
 */

export interface InputState {
  flipperLeft: boolean;
  flipperRight: boolean;
  plungerCharge: number;  // 0.0 to 1.0 (normalized)
  tiltPressed: boolean;
  muteToggled: boolean;   // true for exactly one frame when M pressed
}

const GAME_KEYS = new Set([
  'z', 'arrowleft',     // flipper left
  '/', 'arrowright',    // flipper right
  ' ',                  // plunger (space)
  'x',                  // tilt
  'm',                  // mute
]);

type KeyboardAction =
  | 'flipperLeft'
  | 'flipperRight'
  | 'plunger'
  | 'tilt'
  | 'mute';

function keyToAction(key: string): KeyboardAction | null {
  const k = key.toLowerCase();
  if (k === 'z' || k === 'arrowleft')  return 'flipperLeft';
  if (k === '/' || k === 'arrowright') return 'flipperRight';
  if (k === ' ')                        return 'plunger';
  if (k === 'x')                        return 'tilt';
  if (k === 'm')                        return 'mute';
  return null;
}

export class InputHandler {
  private readonly state: InputState = {
    flipperLeft:    false,
    flipperRight:   false,
    plungerCharge:  0,
    tiltPressed:    false,
    muteToggled:    false,
  };

  private plungerPressed    = false;
  private plungerPressedAt  = 0;
  private readonly maxCharge = 2000; // ms

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup',   this.onKeyUp);
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  /** Call once per frame to compute plungerCharge and clear one-shot flags. */
  update(now: number): void {
    // Update plunger charge
    if (this.plungerPressed) {
      const elapsed = now - this.plungerPressedAt;
      this.state.plungerCharge = Math.min(elapsed / this.maxCharge, 1.0);
    } else {
      this.state.plungerCharge = 0;
    }

    // Clear one-shot flag after consumption
    this.state.muteToggled = false;
  }

  /** Mark muteToggled consumed (call after reading). */
  consumeMuteToggle(): void {
    this.state.muteToggled = false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup',   this.onKeyUp);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const action = keyToAction(e.key);
    if (action === null) return;

    if (GAME_KEYS.has(e.key.toLowerCase())) {
      e.preventDefault();
    }

    switch (action) {
      case 'flipperLeft':  this.state.flipperLeft  = true; break;
      case 'flipperRight': this.state.flipperRight = true; break;
      case 'plunger':
        if (!this.plungerPressed) {
          this.plungerPressed   = true;
          this.plungerPressedAt = performance.now();
        }
        break;
      case 'tilt': this.state.tiltPressed = true;  break;
      case 'mute': this.state.muteToggled = true;  break;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const action = keyToAction(e.key);
    if (action === null) return;

    switch (action) {
      case 'flipperLeft':  this.state.flipperLeft  = false; break;
      case 'flipperRight': this.state.flipperRight = false; break;
      case 'plunger':      this.plungerPressed     = false; break;
      case 'tilt':         this.state.tiltPressed  = false; break;
    }
  };
}
