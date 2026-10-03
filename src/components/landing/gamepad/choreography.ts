import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ANCHOR_ATTR, type GamepadPose } from './gamepadStore';

gsap.registerPlugin(ScrollTrigger);

/*
 * The scroll journey, in screen space — from the top of the landing page to the very last pixel.
 *
 * Waypoints are ordinary DOM elements marked with data-gamepad-anchor (see gamepadAnchor()):
 * the Orrery's sun in the hero, an empty slot or quiet corner in each chapter, and the footer's
 * giant wordmark. Anchors that are display:none at the current breakpoint are skipped, so phones
 * get a shorter route automatically.
 *
 *   rest    the controller rides with its anchor (sticky anchors keep it parked while you read)
 *   leg     it lets go, hangs while the page rises past, then falls on an arc to the next anchor,
 *           turning and tumbling, and touches down with a small double bounce
 *   cruise  legs longer than ~2.4 screens tuck it into the bottom-right corner, turning slowly
 *           with the scroll, before it flies out to the next anchor
 *   finale  the last anchor is reached exactly at the end of the scroll
 *
 * GSAP ScrollTrigger (scrubbed) turns the scroll position into a smoothed `travel` value; all
 * geometry is resolved per frame from live element rects, so layout changes (API data, images,
 * the FAQ accordion) never desynchronise the hand-offs and React never re-renders while scrolling.
 */

interface Pose {
  x: number;
  y: number;
  z: number;
  /** idle bob 0..1 */
  float: number;
  /** pointer tilt response 0..1 */
  pointer: number;
  /** contact/soft shadow opacity */
  shadow: number;
  /** shadow offset below centre, × size */
  shadowAt: number;
}

const POSES: Record<GamepadPose | 'cruise', Pose> = {
  // face to camera, a 3/4 turn towards the page
  hero: { x: -0.26, y: -0.48, z: 0.05, float: 1, pointer: 1, shadow: 0.3, shadowAt: 0.42 },
  // lying back ~55°, turned on its "table"
  restRight: { x: -0.98, y: 0.22, z: 0.32, float: 0, pointer: 0.25, shadow: 0.62, shadowAt: 0.24 },
  restLeft: { x: -0.98, y: -0.22, z: -0.32, float: 0, pointer: 0.25, shadow: 0.62, shadowAt: 0.24 },
  // hovering upright, looking at the heading beside it
  hoverLeft: { x: -0.2, y: -0.62, z: 0.1, float: 0.55, pointer: 0.6, shadow: 0.22, shadowAt: 0.46 },
  hoverRight: { x: -0.2, y: 0.62, z: -0.1, float: 0.55, pointer: 0.6, shadow: 0.22, shadowAt: 0.46 },
  // perched on the top edge of a window
  perch: { x: -1.16, y: -0.34, z: -0.18, float: 0, pointer: 0.25, shadow: 0.5, shadowAt: 0.2 },
  // the end of the page
  finale: { x: -0.94, y: 0.02, z: 0.06, float: 0, pointer: 0.3, shadow: 0.66, shadowAt: 0.24 },
  cruise: { x: -0.3, y: -0.55, z: 0.12, float: 0.5, pointer: 0, shadow: 0, shadowAt: 0.4 },
};

export interface Frame {
  sx: number;
  sy: number;
  size: number;
  rx: number;
  ry: number;
  rz: number;
  shadow: number;
  shadowY: number;
  cam: number;
  heroX: number;
  heroY: number;
  heroSize: number;
  heroFade: number;
  /** something is still moving (bob, scrub catching up, pointer easing) — keep rendering */
  animating: boolean;
}

interface Stop {
  el: HTMLElement;
  pose: Pose;
  size: number;
  /** scroll position where it arrives / lets go */
  A: number;
  D: number;
  /** screen Y it hangs at when it lets go */
  hangY: number;
  hero: boolean;
}

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sineInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const quadIn = (t: number) => clamp(t, 0, 1) ** 2;
const smooth = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
/** two decaying hops over u ∈ [0, 1] */
const bounce = (u: number) => (u < 0.62 ? Math.sin((Math.PI * u) / 0.62) : 0.24 * Math.sin((Math.PI * (u - 0.62)) / 0.38));
const num = (v: string | undefined) => (v === undefined || v === '' || Number.isNaN(+v) ? undefined : +v);

export class GamepadRig {
  readonly pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  /** GSAP-smoothed scroll position (the scrub) */
  readonly travel = { scroll: 0 };
  mode: 'scroll' | 'static' = 'scroll';
  mobile = false;
  visible = true;
  onVisibility: ((visible: boolean) => void) | null = null;
  /** set by the canvas (R3F invalidate) — the canvas renders on demand */
  invalidate: () => void = () => {};

  private stops: Stop[] = [];
  private maxScroll = 1;
  private cruiseW = 150;

  attach(reducedMotion: boolean) {
    this.mode = reducedMotion ? 'static' : 'scroll';
    this.measure();
    this.travel.scroll = window.scrollY;

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      this.invalidate();
    };
    const onLeave = () => {
      this.pointer.tx = 0;
      this.pointer.ty = 0;
      this.invalidate();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    let ctx: gsap.Context | null = null;
    if (this.mode === 'scroll') {
      ScrollTrigger.config({ ignoreMobileResize: true });
      ctx = gsap.context(() => {
        gsap.fromTo(
          this.travel,
          { scroll: 0 },
          {
            scroll: () => this.maxScroll,
            ease: 'none',
            immediateRender: false,
            onUpdate: () => this.invalidate(),
            scrollTrigger: {
              start: 0,
              end: () => {
                this.measure();
                return this.maxScroll;
              },
              // inertia: the controller trails the scrollbar like a real object would
              scrub: 0.85,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }

    let raf = 0;
    const relayout = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        this.measure();
        if (ctx) ScrollTrigger.refresh();
        this.updateVisibility();
        this.invalidate();
      });
    };
    const ro = new ResizeObserver(relayout);
    ro.observe(document.body);
    window.addEventListener('resize', relayout);
    const onScroll = () => {
      if (this.mode === 'static') this.updateVisibility();
      this.invalidate();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.updateVisibility();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', relayout);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      ctx?.revert(); // kills the tween and its ScrollTrigger
    };
  }

  /** Waypoints → scroll positions. Cheap; runs on refresh / resize / layout change. */
  measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    this.mobile = vw < 768;
    this.cruiseW = this.mobile ? 96 : 150;
    this.maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

    const els = [...document.querySelectorAll<HTMLElement>(`[${ANCHOR_ATTR}]`)]
      .filter((el) => el.offsetWidth > 0 && el.getClientRects().length > 0)
      .sort((a, b) => (num(a.dataset.gamepadOrder) ?? 0) - (num(b.dataset.gamepadOrder) ?? 0));
    if (this.mode === 'static') els.splice(1);

    const stops: Stop[] = [];
    els.forEach((el, i) => {
      const hero = i === 0;
      const pose = POSES[(el.dataset.gamepadPose as GamepadPose) ?? 'restRight'] ?? POSES.restRight;
      const r = el.getBoundingClientRect();
      const half = el.offsetHeight / 2;
      const size = hero
        ? clamp(el.offsetWidth * 2.2, 220, Math.min(vw * (this.mobile ? 0.78 : 0.42), 560))
        : el.offsetWidth * (num(el.dataset.gamepadFit) ?? 0.98);

      if (hero) {
        const natural = r.top + half + sy;
        const hangY = Math.min(natural, vh * 0.5);
        stops.push({ el, pose: this.mobile ? { ...pose, y: -0.28 } : pose, size, A: 0, D: Math.max(0, natural - hangY), hangY, hero });
        return;
      }

      const sticky = el.closest<HTMLElement>('[data-gamepad-sticky]');
      if (sticky && sticky.parentElement && getComputedStyle(sticky).position === 'sticky') {
        // sticky column: measure through its non-sticky parent so a stuck column measures correctly
        const inside = r.top - sticky.getBoundingClientRect().top + half;
        const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
        const parent = sticky.parentElement;
        const parentTop = parent.getBoundingClientRect().top + sy;
        let restY = stickyTop + inside;
        if (restY > vh * 0.82) restY = vh * 0.6; // very short screens: land before it sticks
        const A = parentTop + inside - restY;
        const unstick = parentTop + parent.offsetHeight - sticky.offsetHeight - stickyTop;
        const D = Math.max(A + vh * 0.35, Math.min(unstick, A + vh * 2.6));
        stops.push({ el, pose, size, A, D, hangY: restY - Math.max(0, D - unstick), hero });
      } else {
        const natural = r.top + half + sy;
        const restY = vh * (num(el.dataset.gamepadRest) ?? 0.5);
        const departY = vh * (num(el.dataset.gamepadDepart) ?? 0.26);
        stops.push({ el, pose, size, A: natural - restY, D: natural - departY, hangY: departY, hero });
      }
    });

    // keep the route monotonic: every leg needs some scroll; drop waypoints that are too close
    const minLeg = vh * 0.4;
    const route: Stop[] = [];
    for (const st of stops) {
      const prev = route[route.length - 1];
      if (prev && st.A - prev.D < minLeg) {
        const D = Math.max(prev.A + vh * 0.05, st.A - minLeg);
        if (st.A - D < minLeg * 0.75) continue;
        prev.hangY += prev.hero ? 0 : prev.D - D; // it lets go earlier, i.e. lower on screen
        prev.D = D;
      }
      route.push(st);
    }
    // the finale is reached exactly at (or before) the end of the scroll and never lets go
    const last = route[route.length - 1];
    if (last && route.length > 1) {
      last.A = Math.min(last.A, this.maxScroll - 1);
      last.D = Infinity;
      while (route.length > 2 && route[route.length - 2].D > last.A - minLeg * 0.75) route.splice(route.length - 2, 1);
    } else if (last) {
      last.D = Infinity;
    }
    this.stops = route;
  }

  private updateVisibility() {
    let visible = true;
    if (this.mode === 'static' && this.stops[0]) {
      const r = this.stops[0].el.getBoundingClientRect();
      const s = this.stops[0].size;
      visible = r.bottom > -s && r.top < window.innerHeight + s;
    }
    if (visible !== this.visible) {
      this.visible = visible;
      this.onVisibility?.(visible);
    }
  }

  private live(st: Stop) {
    const r = st.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** Resolve this frame's pose. `t` = seconds, `dt` = frame delta. */
  sample(t: number, dt: number): Frame {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const stops = this.stops;
    const k = 1 - Math.exp(-dt * 4);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k;
    const pointerMoving = Math.abs(this.pointer.tx - this.pointer.x) + Math.abs(this.pointer.ty - this.pointer.y) > 0.002;

    const sc = this.mode === 'static' ? window.scrollY : this.travel.scroll;
    const scrubbing = this.mode === 'scroll' && Math.abs(sc - clamp(window.scrollY, 0, this.maxScroll)) > 0.5;

    const hero = stops[0];
    const heroLive = hero ? this.live(hero) : { x: vw * 0.7, y: vh * 0.5 };
    const base = {
      heroX: heroLive.x,
      heroY: heroLive.y,
      heroSize: hero?.size ?? 400,
    };
    if (!hero) {
      return { sx: -9999, sy: -9999, size: 0, rx: 0, ry: 0, rz: 0, shadow: 0, shadowY: 0, cam: 0, heroFade: 0, animating: false, ...base };
    }

    // where are we on the route?
    let i = 0;
    while (i < stops.length - 1 && sc > stops[i].D) i++;
    if (i > 0 && sc < stops[i].A) return this.leg(i - 1, sc, t, base, pointerMoving || scrubbing);

    // ── resting at stop i ───────────────────────────────────────────────
    const st = stops[i];
    const p = st.pose;
    const lv = this.live(st);
    const y = st.hero && this.mode === 'scroll' ? Math.max(lv.y, st.hangY) : lv.y;
    const float = this.mode === 'static' ? 0 : p.float;
    const bob = Math.sin(t * 1.15) * 0.012 * vh * float;
    const pa = p.pointer * (this.mode === 'static' ? 0.6 : 1);
    return {
      sx: lv.x,
      sy: y + bob,
      size: st.size,
      rx: p.x + float * 0.05 * Math.sin(t * 0.8) + this.pointer.y * 0.16 * pa,
      ry: p.y + float * 0.07 * Math.sin(t * 0.55) + this.pointer.x * 0.26 * pa,
      rz: p.z + float * 0.03 * Math.sin(t * 0.7 + 1),
      shadow: p.shadow,
      shadowY: y + st.size * p.shadowAt + bob * 0.4,
      cam: 0,
      heroFade: st.hero ? 1 : 0,
      animating: float > 0 || pointerMoving || scrubbing,
      ...base,
    };
  }

  private leg(i: number, sc: number, t: number, base: Pick<Frame, 'heroX' | 'heroY' | 'heroSize'>, moving: boolean): Frame {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const a = this.stops[i];
    const b = this.stops[i + 1];
    const L = Math.max(1, b.A - a.D);
    const into = clamp(sc - a.D, 0, L);
    const to = this.live(b);
    const from = { x: this.live(a).x, y: a.hangY };
    const pa = a.pose;
    const pb = b.pose;
    const mob = this.mobile;
    const turns = mob ? 0 : i % 2 === 0 ? 1 : 0;
    const dir = to.x < from.x ? 1 : -1; // turn towards the direction of travel
    const heroFade = a.hero ? 1 - clamp((into / L) * 2.2, 0, 1) : 0;
    const cruising = L > vh * 2.4;

    // corner berth for long legs
    const cw = this.cruiseW;
    const C = { x: vw - Math.max(24, vw * 0.035) - cw / 2, y: vh - Math.max(48, vh * 0.07) - cw * 0.32 };
    const pc = POSES.cruise;

    // pieces: depart (a → C), cruise, arrive (C → b); short legs fly a → b directly
    const dep = cruising ? Math.min(vh * 0.7, L * 0.3) : 0;
    const arr = cruising ? Math.min(vh * 1.1, L * 0.4) : L;
    const cruiseYaw = cruising ? -((L - dep - arr) / 1800) * TAU : 0;

    if (cruising && into < L - arr) {
      if (into < dep) {
        const q = into / dep;
        const e = sineInOut(q);
        return {
          sx: lerp(from.x, C.x, e),
          sy: lerp(from.y, C.y, quadIn(q) * 0.6 + e * 0.4) - Math.sin(Math.PI * q) * vh * 0.04,
          size: lerp(a.size, cw, e),
          rx: lerp(pa.x, pc.x, e) - 0.6 * Math.sin(Math.PI * q),
          ry: lerp(pa.y, pc.y, e) - Math.PI * e * (mob ? 0 : 1),
          rz: lerp(pa.z, pc.z, e) + 0.2 * Math.sin(TAU * q),
          shadow: pa.shadow * (1 - smooth(0, 0.3, q)),
          shadowY: from.y + a.size * pa.shadowAt,
          cam: Math.sin(Math.PI * q) * 0.6,
          heroFade,
          animating: moving,
          ...base,
        };
      }
      const c = (into - dep) / 1800;
      return {
        sx: C.x,
        sy: C.y + Math.sin(t * 1.2) * 4,
        size: cw,
        rx: pc.x + 0.05 * Math.sin(t * 0.8),
        ry: pc.y - Math.PI * (mob ? 0 : 1) - c * TAU,
        rz: pc.z + 0.04 * Math.sin(t * 0.7),
        shadow: 0,
        shadowY: C.y + cw * 0.4,
        cam: 0,
        heroFade,
        animating: true,
        ...base,
      };
    }

    // the flight (or the final approach out of the corner)
    const q0 = cruising ? (into - (L - arr)) / arr : into / L;
    const q = clamp(q0 / 0.88, 0, 1); // touch-down at 88 %, then the bounce
    const h = q0 > 0.88 ? bounce((q0 - 0.88) / 0.12) : 0;
    const src = cruising
      ? { x: C.x, y: C.y, size: cw, rx: pc.x, ry: pc.y - Math.PI * (mob ? 0 : 1) + cruiseYaw, rz: pc.z, shadow: 0, shadowAt: pc.shadowAt }
      : { x: from.x, y: from.y, size: a.size, rx: pa.x, ry: pa.y, rz: pa.z, shadow: pa.shadow, shadowAt: pa.shadowAt };
    // land on the target yaw nearest to where we are, plus this leg's showpiece turns
    const ryTarget = pb.y + TAU * Math.round((src.ry - pb.y) / TAU);

    // out of the hero it drops down its own side first and slides in under the heading at the end
    const ex = a.hero ? quadIn(q) * 0.65 + sineInOut(q) * 0.35 : sineInOut(q);
    const ey = cruising ? sineInOut(q) * 0.5 + quadIn(q) * 0.5 : quadIn(q); // gravity
    const e = sineInOut(q);
    // swing out towards the nearer screen edge mid-flight, so it crosses as little content as possible
    const midX = lerp(src.x, to.x, 0.5);
    const edge = midX > vw / 2 ? vw * 0.86 : vw * 0.14;
    const sx = lerp(src.x, to.x, ex) + (cruising ? 0 : Math.sin(Math.PI * q) * (edge - midX) * 0.3);
    const lift = cruising ? 0 : Math.sin(Math.PI * Math.min(1, q * 2.5)) * -0.035 * vh * (1 - q); // a breath upwards as it lets go
    const sy = lerp(src.y, to.y, ey) + lift - h * 0.045 * vh;
    const size = lerp(src.size, b.size, e) * (1 - 0.16 * Math.sin(Math.PI * q));
    const tumble = (mob ? 0.45 : 0.9) * (i % 2 === 0 ? 1 : -0.7);
    const shadow = src.shadow * (1 - smooth(0, 0.2, q)) + pb.shadow * smooth(0.72, 1, q) * (1 - 0.6 * h);

    return {
      sx,
      sy,
      size,
      rx: lerp(src.rx, pb.x, e) - tumble * Math.sin(Math.PI * q) + h * 0.12,
      ry: lerp(src.ry, ryTarget, e) - dir * turns * TAU * sineInOut(clamp((q - 0.04) / 0.9, 0, 1)),
      rz: lerp(src.rz, pb.z, e) + 0.22 * Math.sin(TAU * q) - h * 0.15,
      shadow,
      shadowY: lerp(src.y + src.size * src.shadowAt, to.y + b.size * pb.shadowAt, ey),
      cam: Math.sin(Math.PI * q),
      heroFade,
      animating: moving,
      ...base,
    };
  }
}
