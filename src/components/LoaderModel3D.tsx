'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

type LoaderModel3DProps = {
  reduced?: boolean;
  onReady?: () => void;
};

export default function LoaderModel3D({ reduced = false, onReady }: LoaderModel3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { readyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let model: THREE.Group | null = null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0, 0.1, 4.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'loader-model-canvas';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xd9f8ff, 0x28163d, 2.8));
    const key = new THREE.DirectionalLight(0x42dcff, 4.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff5cbb, 3.4);
    rim.position.set(-4, 1, -2);
    scene.add(rim);
    const warm = new THREE.PointLight(0xffd84d, 6, 12);
    warm.position.set(0, -2, 3);
    scene.add(warm);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      '/assets/m-hilmi-loader.glb',
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 2.8 / Math.max(size.x, size.y, size.z, 0.001);
        model.position.sub(center);
        model.scale.setScalar(scale);
        model.rotation.set(-0.08, -0.35, -0.03);
        scene.add(model);
        renderer.render(scene, camera);
        setLoaded(true);
        readyRef.current?.();

        if (!reduced) {
          const started = performance.now();
          const animateModel = (now: number) => {
            if (disposed || !model) return;
            const time = (now - started) / 1000;
            model.rotation.y = -0.35 + Math.sin(time * 0.72) * 0.34;
            model.rotation.x = -0.08 + Math.sin(time * 0.9) * 0.06;
            model.position.y = Math.sin(time * 1.35) * 0.08;
            model.position.x = Math.cos(time * 0.68) * 0.025;
            renderer.render(scene, camera);
            frame = requestAnimationFrame(animateModel);
          };
          frame = requestAnimationFrame(animateModel);
        }
      },
      undefined,
      () => readyRef.current?.(),
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose();
          });
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduced]);

  return (
    <div ref={mountRef} className={`loader-model-3d ${loaded ? 'is-loaded' : ''}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- local fallback if WebGL is unavailable */}
      <img src="/assets/loader-h-3d.svg" alt="" className="loader-model-fallback" />
    </div>
  );
}
