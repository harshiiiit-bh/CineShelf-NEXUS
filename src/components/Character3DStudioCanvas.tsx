import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  CharacterAppearance,
  CharacterAnimationState,
} from '../types/nexus';
import {
  buildCharacterMeshGroup,
  animateCharacterFrame,
  CharacterMeshBundle,
} from '../utils/characterMeshBuilder';
import {
  RotateCcw,
  Eye,
  Sun,
  Tv,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
} from 'lucide-react';

export type StudioViewPreset = 'full_body' | 'front' | 'side' | 'back' | 'face_closeup';
export type StudioEnvironmentPreset = 'studio' | 'cinema' | 'sunset';
export type StudioLightingPreset = 'clean' | 'neon' | 'sunset' | 'spotlight';

interface Character3DStudioCanvasProps {
  appearance: CharacterAppearance;
  activeAnimation?: CharacterAnimationState;
  viewPreset?: StudioViewPreset;
  onViewPresetChange?: (preset: StudioViewPreset) => void;
  className?: string;
}

export const Character3DStudioCanvas: React.FC<Character3DStudioCanvasProps> = ({
  appearance,
  activeAnimation = 'idle',
  viewPreset = 'front',
  onViewPresetChange,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;

  const animStateRef = useRef(activeAnimation);
  animStateRef.current = activeAnimation;

  const [environmentPreset, setEnvironmentPreset] = useState<StudioEnvironmentPreset>('studio');
  const [lightingPreset, setLightingPreset] = useState<StudioLightingPreset>('clean');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(true);

  // Orbit control & camera target refs
  const dragRef = useRef<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
    rotY: number;
    rotX: number;
    zoom: number;
    targetY: number;
  }>({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rotY: 0,
    rotX: 0.1,
    zoom: 2.6,
    targetY: 1.05,
  });

  // Apply camera view presets
  const applyViewPreset = useCallback((preset: StudioViewPreset) => {
    const d = dragRef.current;
    // The character rig's facial features are built on its local -Z side.
    // The camera therefore needs to orbit to -Z for the true front view.
    if (preset === 'front') {
      d.rotY = Math.PI;
      d.rotX = 0.05;
      d.zoom = 2.6;
      d.targetY = 1.05;
    } else if (preset === 'side') {
      d.rotY = Math.PI / 2;
      d.rotX = 0.05;
      d.zoom = 2.6;
      d.targetY = 1.05;
    } else if (preset === 'back') {
      d.rotY = 0;
      d.rotX = 0.05;
      d.zoom = 2.6;
      d.targetY = 1.05;
    } else if (preset === 'face_closeup') {
      d.rotY = Math.PI;
      d.rotX = 0.02;
      d.zoom = 1.35;
      d.targetY = 1.58;
    } else {
      // Full body, facing the same direction as the front preset.
      d.rotY = Math.PI;
      d.rotX = 0.1;
      d.zoom = 2.85;
      d.targetY = 0.95;
    }
    if (onViewPresetChange) onViewPresetChange(preset);
  }, [onViewPresetChange]);

  useEffect(() => {
    applyViewPreset(viewPreset);
  }, [viewPreset, applyViewPreset]);

  // Main Three.js setup & render loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 640;
    const h = container.clientHeight || 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
    camera.position.set(0, dragRef.current.targetY, dragRef.current.zoom);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Geometry (Pedestal + Ground Grid)
    const pedestalGroup = new THREE.Group();
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.14, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.35,
      })
    );
    pedestal.position.set(0, -0.07, 0);
    pedestal.receiveShadow = true;
    pedestalGroup.add(pedestal);

    const pedestalRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 0.96, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    pedestalRing.rotation.x = -Math.PI / 2;
    pedestalRing.position.set(0, 0.005, 0);
    pedestalGroup.add(pedestalRing);

    scene.add(pedestalGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
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

    // Character Group
    let currentBundle: CharacterMeshBundle | null = null;
    const charGroupContainer = new THREE.Group();
    scene.add(charGroupContainer);

    const updateCharacterMesh = () => {
      if (currentBundle) {
        charGroupContainer.remove(currentBundle.group);
      }
      currentBundle = buildCharacterMeshGroup(appearanceRef.current, 'character-studio');
      charGroupContainer.add(currentBundle.group);
    };

    updateCharacterMesh();

    // Mouse & Touch Drag Handlers
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isMouseDown = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isMouseDown) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      dragRef.current.rotY += deltaX * 0.008;
      dragRef.current.rotX = Math.max(-0.4, Math.min(0.6, dragRef.current.rotX + deltaY * 0.005));
    };

    const handlePointerUp = () => {
      isMouseDown = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0015;
      dragRef.current.zoom = Math.max(1.1, Math.min(4.2, dragRef.current.zoom + delta));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handlePointerDown);
    domEl.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domEl.addEventListener('touchstart', handlePointerDown, { passive: true });
    domEl.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    domEl.addEventListener('wheel', handleWheel, { passive: false });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const rw = container.clientWidth || 640;
      const rh = container.clientHeight || 580;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animFrameId: number;
    let lastTimeSec = performance.now() / 1000;
    let lastAppSig = '';

    const renderLoop = () => {
      const nowSec = performance.now() / 1000;

      // Rebuild 3D model when appearance signature changes
      const currentSig = JSON.stringify(appearanceRef.current);
      if (currentSig !== lastAppSig) {
        lastAppSig = currentSig;
        updateCharacterMesh();
      }

      // Auto-rotate if enabled
      if (autoRotate && !isMouseDown) {
        dragRef.current.rotY += 0.005;
      }

      // Update camera position smoothly with damping
      const d = dragRef.current;
      const camX = Math.sin(d.rotY) * d.zoom * Math.cos(d.rotX);
      const camZ = Math.cos(d.rotY) * d.zoom * Math.cos(d.rotX);
      const camY = d.targetY + Math.sin(d.rotX) * d.zoom;

      camera.position.x += (camX - camera.position.x) * 0.1;
      camera.position.y += (camY - camera.position.y) * 0.1;
      camera.position.z += (camZ - camera.position.z) * 0.1;
      camera.lookAt(0, d.targetY, 0);

      // Animate character limbs & props
      if (currentBundle && isPlayingAnimation) {
        animateCharacterFrame(currentBundle, animStateRef.current, nowSec);
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', handlePointerDown);
      domEl.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domEl.removeEventListener('touchstart', handlePointerDown);
      domEl.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      domEl.removeEventListener('wheel', handleWheel);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate, isPlayingAnimation]);

  return (
    <div className={`relative w-full h-full min-h-[480px] bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Top Studio Header overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-xl pointer-events-auto shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            3D Character Studio Viewport
          </span>
        </div>

        {/* View Camera Presets Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-1 rounded-xl pointer-events-auto shadow-lg">
          {(['full_body', 'front', 'side', 'back', 'face_closeup'] as StudioViewPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyViewPreset(preset)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all capitalize ${
                viewPreset === preset
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {preset.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive 3D WebGL Canvas mount container */}
      <div ref={mountRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Bottom Floating Toolbar overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Left: Auto-rotate & Animation play/pause controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-xl pointer-events-auto shadow-lg">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              autoRotate ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>360° Spin</span>
          </button>

          <button
            onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-all"
          >
            {isPlayingAnimation ? <Pause className="w-3.5 h-3.5 text-rose-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isPlayingAnimation ? 'Pause Motion' : 'Play Motion'}</span>
          </button>
        </div>

        {/* Right: Reset Camera Angle Button */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-xl pointer-events-auto shadow-lg">
          <button
            onClick={() => applyViewPreset('front')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-all"
            title="Reset camera to default front view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
