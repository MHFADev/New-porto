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
  const [turns, setTurns] = useState([0, 0, 0, 0]);
  const turnsRef = useRef(turns);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

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
      engine.gravity.scale = 0.0048;
      const runner = Matter.Runner.create();
      const body = Matter.Bodies.rectangle(width / 2, height / 2, width, height, {
        friction: 0.6,
        frictionAir: 0.012,
        restitution: 0.34,
        density: 0.002,
        chamfer: { radius: 18 },
      });
      const floor = Matter.Bodies.rectangle(width / 2, height + 22, width * 1.6, 36, {
        isStatic: true,
        restitution: 0.48,
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
        stiffness: 0.48,
        damping: 0.045,
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
        turnsRef.current.forEach((screwTurns, index) => {
          if (screwTurns >= 4 && constraints[index].bodyA) {
            Matter.Composite.remove(engine.world, constraints[index]);
            constraints[index].bodyA = null;
            const horizontalKick = index % 2 === 0 ? -0.0008 : 0.0008;
            const angularKick = index < 2 ? (index === 0 ? 0.012 : -0.012) : (index === 2 ? -0.012 : 0.012);
            Matter.Body.applyForce(body, body.position, { x: horizontalKick, y: 0.0012 });
            Matter.Body.setAngularVelocity(body, body.angularVelocity + angularKick);
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

  const turnScrew = (index: number) => {
    setTurns((current) => {
      if (current[index] >= 4) return current;
      const next = [...current];
      next[index] = Math.min(4, next[index] + 1);
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
          type="button"
          aria-label={turns[index] >= 4 ? `${label} released` : `${label}, turn ${turns[index]} of 4`}
          aria-pressed={turns[index] >= 4}
          data-turns={turns[index]}
          className={`physics-screw physics-screw-${index} ${turns[index] >= 4 ? 'is-released' : ''}`}
          onClick={() => turnScrew(index)}
        >
          <span className="physics-screw-cross" aria-hidden="true" />
          <span className="physics-screw-turns" aria-hidden="true">{turns[index]}/4</span>
        </button>
      ))}
      <div className="physics-hint" aria-hidden="true">UNSCREW TO RELEASE</div>
    </div>
  );
}
