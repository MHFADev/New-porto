'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Matter from 'matter-js';

const SCREW_NAMES = ['Top-left screw', 'Top-right screw', 'Bottom-left screw', 'Bottom-right screw'];

type PhysicsWrapperProps = {
  children: ReactNode;
  className?: string;
};

export default function PhysicsWrapper({ children, className = '' }: PhysicsWrapperProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState([false, false, false, false]);
  const releasedRef = useRef(released);
  const screwRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    releasedRef.current = released;
  }, [released]);

  useEffect(() => {
    const stage = stageRef.current;
    const bodyElement = bodyRef.current;
    if (!stage || !bodyElement) return;

    const setup = () => {
      const width = bodyElement.offsetWidth;
      const height = bodyElement.offsetHeight;
      if (!width || !height) return;
      stage.style.minHeight = `${height + 72}px`;

      const engine = Matter.Engine.create({ enableSleeping: false });
      engine.gravity.y = 1;
      engine.gravity.scale = 0.0018;
      const runner = Matter.Runner.create();
      const body = Matter.Bodies.rectangle(width / 2, height / 2, width, height, {
        friction: 0.6,
        frictionAir: 0.035,
        restitution: 0.16,
        density: 0.002,
        chamfer: { radius: 18 },
      });
      const floor = Matter.Bodies.rectangle(width / 2, height + 22, width * 1.6, 36, {
        isStatic: true,
        restitution: 0.22,
        friction: 0.8,
        label: 'contribution-floor',
      });
      const anchors = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ];
      const localPoints = [
        { x: -width / 2, y: -height / 2 },
        { x: width / 2, y: -height / 2 },
        { x: -width / 2, y: height / 2 },
        { x: width / 2, y: height / 2 },
      ];
      const constraints = anchors.map((anchor, index) => Matter.Constraint.create({
        bodyA: body,
        pointA: localPoints[index],
        pointB: anchor,
        stiffness: 0.92,
        damping: 0.18,
        length: 0,
      }));
      Matter.Composite.add(engine.world, [body, floor, ...constraints]);
      Matter.Runner.run(runner, engine);

      const sync = () => {
        const { x, y } = body.position;
        const tx = x - width / 2;
        const ty = y - height / 2;
        bodyElement.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
      };
      Matter.Events.on(engine, 'afterUpdate', sync);
      sync();

      const observer = new ResizeObserver(() => {
        if (Math.abs(body.angle) < 0.02 && body.position.y < height) {
          Matter.Body.setPosition(body, { x: width / 2, y: height / 2 });
        }
      });
      observer.observe(stage);

      const syncReleased = () => {
        releasedRef.current.forEach((isReleased, index) => {
          if (isReleased && constraints[index].bodyA) {
            Matter.Composite.remove(engine.world, constraints[index]);
            constraints[index].bodyA = null;
          }
        });
      };
      const interval = window.setInterval(syncReleased, 80);

      return () => {
        window.clearInterval(interval);
        observer.disconnect();
        Matter.Events.off(engine, 'afterUpdate', sync);
        Matter.Runner.stop(runner);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
      };
    };

    const frame = window.requestAnimationFrame(setup);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const releaseScrew = (index: number) => {
    setReleased((current) => {
      if (current[index]) return current;
      const next = [...current];
      next[index] = true;
      return next;
    });
  };

  return (
    <div ref={stageRef} className={`physics-wrapper-stage ${className}`}>
      <div ref={bodyRef} className="physics-wrapper-body">
        {children}
      </div>
      <div className="physics-floor" aria-hidden="true" />
      {SCREW_NAMES.map((label, index) => (
        <button
          key={label}
          ref={(node) => { screwRefs.current[index] = node; }}
          type="button"
          aria-label={released[index] ? `${label} released` : `Loosen ${label}`}
          aria-pressed={released[index]}
          className={`physics-screw physics-screw-${index} ${released[index] ? 'is-released' : ''}`}
          onClick={() => releaseScrew(index)}
        >
          <span className="physics-screw-cross" aria-hidden="true" />
        </button>
      ))}
      <div className="physics-hint" aria-hidden="true">UNSCREW TO RELEASE</div>
    </div>
  );
}
