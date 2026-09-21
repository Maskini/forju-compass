"use client";

import { useEffect, useRef } from "react";

// The reference uses independent horizontal flights in document space,
// small vertical oscillations, and a half-turn at each change of direction.
const objects = [
  { shape: "teal-leaf", size: 45, band: .12, phase: .12, opacity: .90 },
  { shape: "teal-crane", size: 38, band: .27, phase: .72, opacity: .82 },
  { shape: "orange-airplane", size: 42, band: .39, phase: .44, opacity: .85 },
  { shape: "pink-heart", size: 33, band: .50, phase: .91, opacity: .76 },
  { shape: "mint-fish", size: 51, band: .62, phase: .29, opacity: .90 },
  { shape: "pink-triangle", size: 39, band: .75, phase: .58, opacity: .78 },
  { shape: "teal-leaf", size: 45, band: .91, phase: .82, opacity: .85 },
  { shape: "compass", size: 46, band: .84, phase: .18, opacity: 1 },
];

export default function FloatingOrigami() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const page = layer?.parentElement;
    if (!layer || !page) return;
    const elements = Array.from(layer.children) as HTMLElement[];
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const flights = objects.map((object, index) => ({
      x: 0, y: 0, vx: index % 2 ? -.5 : .5, vy: 0,
      heading: index % 2 ? Math.PI : 0, angle: index % 2 ? 180 : 0,
      phase: object.phase * Math.PI * 2, opacity: object.opacity,
    }));
    let initialized = false;
    let previousScroll = window.scrollY, scrollWind = 0;
    const pointer = { x: -1000, y: -1000, vx: 0, vy: 0 };
    let width = 0, height = 0, frame = 0, lastTime = 0, elapsed = 0;
    let pageTop = 0;
    let needsMeasure = true;
    let obstacles: { left: number; right: number; top: number; bottom: number }[] = [];

    function measure() {
      const bounds = page!.getBoundingClientRect();
      const oldWidth = width, oldHeight = height;
      width = bounds.width;
      height = bounds.height;
      pageTop = bounds.top + window.scrollY;
      flights.forEach((flight, index) => {
        if (!initialized) {
          flight.x = 40 + objects[index].phase * Math.max(1, width - 130);
          flight.y = height * objects[index].band;
        } else if (oldWidth && oldHeight) {
          flight.x *= width / oldWidth;
          flight.y *= height / oldHeight;
        }
      });
      initialized = true;
      obstacles = Array.from(page!.querySelectorAll("h1, h2, button, input, textarea, summary, [data-deco-avoid], .footer-pill, .quick-action, .answer-cta"))
        .map(element => element.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ left: rect.left - bounds.left - 10, right: rect.right - bounds.left + 10,
          top: rect.top - bounds.top - 8, bottom: rect.bottom - bounds.top + 8 }));
      needsMeasure = false;
    }

    function render(time: number) {
      frame = 0;
      if (document.hidden) { lastTime = 0; return; }
      if (needsMeasure) measure();
      const dt = Math.min(.05, lastTime ? (time - lastTime) / 1000 : 0);
      lastTime = time;
      const reduced = preference.matches;
      if (!reduced) elapsed += dt;
      objects.forEach((object, index) => {
        const element = elements[index];
        const flight = flights[index];
        const step = reduced ? 0 : dt * 60;
        const mass = .8 + index % 3 * .12;
        flight.phase += .018 * (1 + index % 3 * .15) * step;
        const direction = Math.cos(flight.heading) >= 0 ? 1 : -1;
        const flutter = Math.sin(flight.phase) * .10;
        flight.heading = (direction > 0 ? 0 : Math.PI) + flutter;
        flight.vx += (.018 * Math.cos(flight.heading) + .009 * Math.cos(elapsed * .6 + index)) / mass * step;
        flight.vy += (.018 * Math.sin(flight.heading) + .003 * Math.sin(flight.phase * 1.7)) / mass * step;
        const distance = Math.hypot(flight.x - pointer.x, flight.y - (pointer.y + window.scrollY - pageTop));
        if (distance < 180) {
          const influence = (1 - distance / 180) ** 2;
          flight.vx += pointer.vx * .045 * influence / mass * step;
          flight.vy += pointer.vy * .045 * influence / mass * step;
        }
        flight.vy += .045 * scrollWind / mass * step;
        flight.vx *= Math.pow(.96, step);
        flight.vy += (.9 * scrollWind - flight.vy) * (1 - Math.pow(.96, step));
        const speed = Math.hypot(flight.vx, flight.vy);
        if (speed > 1.85) { flight.vx *= 1.85 / speed; flight.vy *= 1.85 / speed; }
        flight.x += flight.vx * step;
        flight.y += flight.vy * step;
        const edge = width < 600 ? 20 : 60;
        const right = Math.max(edge, width - object.size - edge);
        if (flight.x < edge) { flight.x = edge; flight.vx = Math.abs(flight.vx) * .82; flight.heading = 0; }
        if (flight.x > right) { flight.x = right; flight.vx = -Math.abs(flight.vx) * .82; flight.heading = Math.PI; }
        const bottom = Math.max(90, height - object.size - 30);
        if (flight.y < 90) { flight.y = 90; flight.vy = Math.abs(flight.vy); }
        if (flight.y > bottom) { flight.y = bottom; flight.vy = -Math.abs(flight.vy); }
        const targetAngle = flight.heading * 180 / Math.PI;
        const difference = ((targetAngle - flight.angle + 540) % 360) - 180;
        flight.angle += difference * (1 - Math.exp(-dt * 4));
        const x = flight.x, y = flight.y;
        const tilt = reduced ? 0 : Math.sin(elapsed * 1.1 + index * 1.4) * 3;
        const overlaps = obstacles.some(rect => x + object.size / 2 > rect.left && x + object.size / 2 < rect.right
          && y + object.size / 2 > rect.top && y + object.size / 2 < rect.bottom);
        const opacity = overlaps ? object.opacity * .2 : object.opacity;
        flight.opacity += (opacity - flight.opacity) * (reduced ? 1 : 1 - Math.exp(-dt * 8));
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        element.style.opacity = String(flight.opacity);
        (element.firstElementChild as HTMLElement).style.transform = `rotate(${reduced ? 0 : flight.angle + tilt}deg)`;
      });
      scrollWind *= Math.exp(-dt * 6);
      pointer.vx *= Math.exp(-dt * 8);
      pointer.vy *= Math.exp(-dt * 8);
      if (!reduced) frame = requestAnimationFrame(render);
      else lastTime = 0;
    }

    function schedule() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(render);
    }
    function invalidate() { needsMeasure = true; schedule(); }
    function onScroll() {
      const delta = window.scrollY - previousScroll;
      previousScroll = window.scrollY;
      scrollWind = Math.max(-8, Math.min(8, scrollWind + delta * .025));
      invalidate();
    }
    function onPointer(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      pointer.vx = Math.max(-8, Math.min(8, event.movementX));
      pointer.vy = Math.max(-8, Math.min(8, event.movementY));
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      scrollWind = 0;
      pointer.vx = pointer.vy = 0;
      previousScroll = window.scrollY;
      invalidate();
    }
    const observer = new ResizeObserver(invalidate);
    observer.observe(page);
    window.addEventListener("resize", invalidate);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    preference.addEventListener("change", reset);
    document.addEventListener("visibilitychange", reset);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      preference.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);

  return <div ref={layerRef} className="floating-origami" aria-hidden="true">
    {objects.map((object, index) => <span key={`${object.shape}-${index}`} className="floating-origami__object"
      style={{ width: object.size, height: object.size, opacity: 0 }}>
      {object.shape === "compass"
        ? <span className="floating-origami__art floating-origami__compass"><img src="/forju/forju-compass-logo.png" alt="" draggable={false} /></span>
        : <img className="floating-origami__art" src={`/forju/origami/${object.shape}.png`} alt="" draggable={false} />}
    </span>)}
  </div>;
}
