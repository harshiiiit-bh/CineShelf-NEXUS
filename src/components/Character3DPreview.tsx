import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterAppearance } from '../types/nexus';
import { buildCharacterMeshGroup, animateCharacterFrame, CharacterMeshBundle } from '../utils/characterMeshBuilder';

interface Character3DPreviewProps {
  appearance: CharacterAppearance;
  onAppearanceChange?: (updated: CharacterAppearance) => void;
  width?: number | string;
  height?: number | string;
}

export const Character3DPreview: React.FC<Character3DPreviewProps> = ({
  appearance,
  width = '100%',
  height = 360,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;

  const dragRef = useRef<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
    rotY: number;
    rotX: number;
    zoom: number;
  }>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rotY: 0,
    rotX: 0.1,
    zoom: 2.8,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);

    const w = container.clientWidth || 320;
    const h = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
    camera.position.set(0, 1.25, dragRef.current.zoom);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xec4899, 0.8, 10);
    fillLight.position.set(0, 0.5, 2);
    scene.add(fillLight);

    // Pedestal Platform
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.12, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.35,
      })
    );
    pedestal.position.set(0, -0.06, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const pedestalRing = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 0.86, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    pedestalRing.rotation.x = -Math.PI / 2;
    pedestalRing.position.set(0, 0.005, 0);
    scene.add(pedestalRing);

    // Character Model Group using unified characterMeshBuilder
    let bundle: CharacterMeshBundle | null = null;
    const charGroup = new THREE.Group();
    scene.add(charGroup);

    const rebuildCharacterMesh = (app: CharacterAppearance) => {
      if (bundle) charGroup.remove(bundle.group);
      bundle = buildCharacterMeshGroup(app, 'preview');
      charGroup.add(bundle.group);
    };

    rebuildCharacterMesh(appearanceRef.current);

    // Mouse drag rotation
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      dragRef.current.rotY += dx * 0.01;
      dragRef.current.rotX = Math.max(-0.3, Math.min(0.5, dragRef.current.rotX + dy * 0.01));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animFrameId: number;
    let lastAppSig = '';

    const renderLoop = () => {
      const nowSec = performance.now() / 1000;
      const currentSig = JSON.stringify(appearanceRef.current);
      if (currentSig !== lastAppSig) {
        lastAppSig = currentSig;
        rebuildCharacterMesh(appearanceRef.current);
      }

      const d = dragRef.current;
      camera.position.x = Math.sin(d.rotY) * d.zoom * Math.cos(d.rotX);
      camera.position.z = Math.cos(d.rotY) * d.zoom * Math.cos(d.rotX);
      camera.position.y = 1.05 + Math.sin(d.rotX) * d.zoom;
      camera.lookAt(0, 1.05, 0);

      if (bundle) {
        animateCharacterFrame(bundle, 'idle', nowSec);
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width, height }}
      className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl cursor-grab active:cursor-grabbing"
    />
  );
};
