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
  const [released, setReleased] = useState([false, false, false, false]);
  const turnsRef = useRef(turns);
  const releasedRef = useRef(released);
  const animatingRef = useRef([false, false, false, false]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

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
      let physicsWidth = width;
      let physicsHeight = height;
      stage.style.minHeight = `${height + 72}px`;

      const engine = Matter.Engine.create({ enableSleeping: false });
      engine.gravity.y = 1;
      engine.gravity.scale = 0.0048;
      const runner = Matter.Runner.create();
      const body = Matter.Bodies.rectangle(width / 2, height / 2, width, height, {
        friction: 0.1,
        frictionAir: 0.012,
        restitution: 0.34,
        density: 0.002,
        chamfer: { radius: 18 },
      });
      const floor = Matter.Bodies.rectangle(width / 2, height + 22, width * 1.6, 36, {
        isStatic: true,
        restitution: 0.5,
        friction: 0.1,
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
        const tx = x - physicsWidth / 2;
        const ty = y - physicsHeight / 2;
        bodyElement.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
        const drop = Math.max(0, Math.min(1, ty / 72));
        bodyElement.style.filter = `drop-shadow(0 ${8 + drop * 10}px ${drop * 12}px rgba(21, 19, 41, ${0.2 + drop * 0.28}))`;
        raf = window.requestAnimationFrame(sync);
      };
      let raf = window.requestAnimationFrame(sync);

      const observer = new ResizeObserver(() => {
        const nextWidth = bodyElement.offsetWidth;
        const nextHeight = bodyElement.offsetHeight;
        if (!nextWidth || !nextHeight || (nextWidth === physicsWidth && nextHeight === physicsHeight)) return;
        const scaleX = nextWidth / physicsWidth;
        const scaleY = nextHeight / physicsHeight;
        Matter.Body.scale(body, scaleX, scaleY);
        Matter.Body.setPosition(floor, { x: nextWidth / 2, y: nextHeight + 22 });
        const nextAnchors = [
          { x: 0, y: 0 }, { x: nextWidth, y: 0 },
          { x: 0, y: nextHeight }, { x: nextWidth, y: nextHeight },
        ];
        const nextLocalPoints = [
          { x: -nextWidth / 2, y: -nextHeight / 2 },
          { x: nextWidth / 2, y: -nextHeight / 2 },
          { x: -nextWidth / 2, y: nextHeight / 2 },
          { x: nextWidth / 2, y: nextHeight / 2 },
        ];
        constraints.forEach((constraint, index) => {
          constraint.pointA = nextLocalPoints[index];
          constraint.pointB = nextAnchors[index];
        });
        physicsWidth = nextWidth;
        physicsHeight = nextHeight;
        stage.style.minHeight = `${nextHeight + 72}px`;
      });
      observer.observe(stage);

      const syncReleased = () => {
        releasedRef.current.forEach((isReleased, index) => {
          if (isReleased && constraints[index].bodyA) {
            Matter.Composite.remove(engine.world, constraints[index]);
            constraints[index].bodyA = null;
            const horizontalKick = index % 2 === 0 ? -0.0008 : 0.0008;
            const angularKick = index < 2 ? (index === 0 ? 0.012 : -0.012) : (index === 2 ? -0.012 : 0.012);
            Matter.Body.applyForce(body, body.position, { x: horizontalKick, y: 0.0012 });
            Matter.Body.setAngularVelocity(body, body.angularVelocity + angularKick);
          }
        });
      };
      const interval = window.setInterval(syncReleased, 40);

      return () => {
        window.clearInterval(interval);
        observer.disconnect();
        window.cancelAnimationFrame(raf);
        Matter.Runner.stop(runner);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
      };
    };

    const frame = window.requestAnimationFrame(setup);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const turnScrew = (index: number) => {
    if (animatingRef.current[index] || releasedRef.current[index]) return;
    const nextTurns = Math.min(4, turnsRef.current[index] + 1);
    const next = [...turnsRef.current];
    next[index] = nextTurns;
    turnsRef.current = next;
    animatingRef.current[index] = true;
    setTurns(next);
    window.setTimeout(() => {
      animatingRef.current[index] = false;
      if (nextTurns === 4) {
        setReleased((current) => {
          const releasedNext = [...current];
          releasedNext[index] = true;
          return releasedNext;
        });
      }
    }, 600);
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
          aria-label={released[index] ? `${label} released` : `${label}, turn ${turns[index]} of 4`}
          aria-pressed={released[index]}
          data-turns={turns[index]}
          className={`physics-screw physics-screw-${index} ${released[index] ? 'is-released' : ''}`}
          onClick={() => turnScrew(index)}
        >
          <svg className="physics-screw-icon" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="physics-screw-turns" aria-hidden="true">{turns[index]}/4</span>
        </button>
      ))}
      <div className="physics-hint" aria-hidden="true">UNSCREW TO RELEASE</div>
    </div>
  );
}
