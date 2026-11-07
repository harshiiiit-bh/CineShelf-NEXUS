import React, { useCallback, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import {
  CameraRelativeMovementVector,
  mapJoystickVectorToCamera3D,
} from '../utils/socialEngine';

export interface VirtualJoystickProps {
  /** Current horizontal camera yaw in radians so movement is mapped relative to camera orientation */
  cameraYaw?: number;
  /** Optional sensitivity multiplier (default 1.0) */
  sensitivity?: number;
  /** Invoked whenever the normalized (x, y) vector or camera-relative 3D movement vector changes */
  onMove: (
    vector2D: { x: number; y: number },
    movement3D: CameraRelativeMovementVector
  ) => void;
  /** Optional label below joystick */
  label?: string;
  /** Optional size in pixels (default 116) */
  size?: number;
}

/**
 * Dedicated React Virtual Joystick for NexusSocialView.
 * Maps mobile touch events and pointer drags to normalized 2D movement vectors (x, y) in [-1, 1]
 * and 3D world movement vectors (worldX, worldZ) relative to the active camera orientation.
 */
export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  cameraYaw = 0,
  sensitivity = 1.0,
  onMove,
  label = 'Move',
  size = 116,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const [knobState, setKnobState] = useState<{
    active: boolean;
    dx: number;
    dy: number;
    normX: number;
    normY: number;
  }>({
    active: false,
    dx: 0,
    dy: 0,
    normX: 0,
    normY: 0,
  });

  const computeAndEmitVector = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = Math.max(24, rect.width / 2 - 16);

      const rawDx = clientX - centerX;
      const rawDy = clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(maxRadius, dist);
      const angle = Math.atan2(rawDy, rawDx);

      const dx = Math.cos(angle) * clampedDist;
      const dy = Math.sin(angle) * clampedDist;

      const normX = Number((dx / maxRadius).toFixed(3));
      const normY = Number((dy / maxRadius).toFixed(3));

      setKnobState({
        active: true,
        dx,
        dy,
        normX,
        normY,
      });

      const mapped3D = mapJoystickVectorToCamera3D(normX, normY, cameraYaw, sensitivity);
      onMove({ x: mapped3D.joystickX, y: mapped3D.joystickY }, mapped3D);
    },
    [cameraYaw, onMove, sensitivity]
  );

  const resetJoystick = useCallback(() => {
    activeTouchIdRef.current = null;
    activePointerIdRef.current = null;
    setKnobState({
      active: false,
      dx: 0,
      dy: 0,
      normX: 0,
      normY: 0,
    });
    const zero3D = mapJoystickVectorToCamera3D(0, 0, cameraYaw, sensitivity);
    onMove({ x: 0, y: 0 }, zero3D);
  }, [cameraYaw, onMove, sensitivity]);

  // Mobile Touch Event Handlers (multi-touch safe: tracks the specific touch identifier started on the joystick)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch) return;
    activeTouchIdRef.current = touch.identifier;
    computeAndEmitVector(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current === null) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === activeTouchIdRef.current) {
        computeAndEmitVector(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleTouchEndOrCancel = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current === null) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        resetJoystick();
        break;
      }
    }
  };

  // Pointer Event Handlers (desktop mouse & unified pointer fallback)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' && activeTouchIdRef.current !== null) return;
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if synthetic event in test environment
    }
    computeAndEmitVector(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    computeAndEmitVector(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    resetJoystick();
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none touch-none">
      <div
        ref={containerRef}
        data-testid="virtual-joystick"
        role="slider"
        aria-label="360-degree character movement joystick"
        aria-valuetext={`X ${knobState.normX}, Y ${knobState.normY}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEndOrCancel}
        onTouchCancel={handleTouchEndOrCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className={`relative rounded-full bg-slate-950/80 backdrop-blur-md border transition-colors shadow-2xl flex items-center justify-center cursor-pointer touch-none ${
          knobState.active
            ? 'border-blue-500/80 shadow-blue-500/20'
            : 'border-slate-700/80 hover:border-slate-600'
        }`}
      >
        {/* Subtle inner guide ring and cardinal axes */}
        <div className="absolute inset-3 rounded-full border border-slate-800/70 pointer-events-none" />
        <div className="absolute w-full h-px bg-slate-800/50 pointer-events-none" />
        <div className="absolute h-full w-px bg-slate-800/50 pointer-events-none" />

        {/* Draggable Thumb Stick Knob */}
        <div
          data-testid="virtual-joystick-knob"
          style={{
            transform: `translate3d(${knobState.dx}px, ${knobState.dy}px, 0)`,
          }}
          className={`w-12 h-12 rounded-full transition-colors pointer-events-none flex items-center justify-center shadow-lg ${
            knobState.active
              ? 'bg-blue-500 border-2 border-white shadow-blue-500/50'
              : 'bg-slate-800/95 border border-slate-600'
          }`}
        >
          <Compass className="w-5 h-5 text-white/90" />
        </div>
      </div>

      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/75 px-2 py-0.5 rounded border border-slate-800/80">
        {knobState.active
          ? `${knobState.normX.toFixed(1)}, ${knobState.normY.toFixed(1)}`
          : label}
      </span>
    </div>
  );
};
