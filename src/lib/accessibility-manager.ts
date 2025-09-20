/*
  AccessibilityManager: Centralizes a11y behaviors for 3D experiences.
  Provides announcements, high-contrast and reduce-motion toggles, and
  lightweight keyboard navigation helpers for kiosk scenarios.
*/

export interface Keyboard3DOptions {
  onArrow: (dx: number, dy: number) => void;
  onSelect?: () => void;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager | null = null;
  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) AccessibilityManager.instance = new AccessibilityManager();
    return AccessibilityManager.instance;
  }

  private liveRegion: HTMLElement | null = null;

  init(): void {
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-9999px';
      this.liveRegion.style.top = 'auto';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      document.body.appendChild(this.liveRegion);
    }
  }

  announce(message: string): void {
    if (!this.liveRegion) this.init();
    if (this.liveRegion) this.liveRegion.textContent = message;
  }

  setHighContrast(enabled: boolean): void {
    document.documentElement.setAttribute('data-high-contrast', String(enabled));
  }

  setReduceMotion(enabled: boolean): void {
    document.documentElement.setAttribute('data-reduce-motion', String(enabled));
  }

  register3DView(element: HTMLElement): void {
    element.setAttribute('role', 'application');
    element.setAttribute('aria-roledescription', '3D planet viewer');
    // Attach offscreen help and description id
    const helpId = 'planet3d-help';
    let help = document.getElementById(helpId);
    if (!help) {
      help = document.createElement('div');
      help.id = helpId;
      help.style.position = 'absolute';
      help.style.left = '-9999px';
      help.textContent = 'Use arrow keys to nudge the camera. Press Enter or Space to select a hotspot when focused.';
      document.body.appendChild(help);
    }
    element.setAttribute('aria-describedby', helpId);
  }

  setupKeyboardNavigationFor3D(element: HTMLElement, opts: Keyboard3DOptions): void {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': opts.onArrow(-1, 0); this.announce('Camera moved left'); break;
        case 'ArrowRight': opts.onArrow(1, 0); this.announce('Camera moved right'); break;
        case 'ArrowUp': opts.onArrow(0, 1); this.announce('Camera moved up'); break;
        case 'ArrowDown': opts.onArrow(0, -1); this.announce('Camera moved down'); break;
        case 'Enter':
        case ' ': opts.onSelect && opts.onSelect(); break;
        default: return;
      }
      e.preventDefault();
    };
    element.addEventListener('keydown', handler);
  }
}

export const accessibilityManager = AccessibilityManager.getInstance();


