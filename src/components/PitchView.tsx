import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FootballIcon } from './icons/FootballIcon';
import type { MatchEvent } from '../types';

interface PitchViewProps {
    momentum: number;
    homeTeamName: string;
    awayTeamName: string;
    lastEvent: MatchEvent | null;
    currentMinute?: number;
}

type Point = { x: number; z: number };

const HOME_SHAPE: Point[] = [
    { x: -9.2, z: 0 },
    { x: -6.9, z: -4.1 }, { x: -6.4, z: -1.4 }, { x: -6.4, z: 1.4 }, { x: -6.9, z: 4.1 },
    { x: -2.9, z: -3.2 }, { x: -2.4, z: 0 }, { x: -2.9, z: 3.2 },
    { x: 1.1, z: -2.1 }, { x: 1.1, z: 2.1 }, { x: 4.2, z: 0 },
];

const shortName = (name: string) => name.split(/\s+/).map(part => part[0] || '').join('').slice(0, 3).toUpperCase();
const worldPoint = (x: number, y: number): Point => ({ x: (x - 50) * 0.2, z: (y - 50) * 0.12 });

function CameraRig() {
    const { camera } = useThree();
    useFrame(({ clock }) => {
        camera.position.x = Math.sin(clock.getElapsedTime() * 0.08) * 1.2;
        camera.lookAt(0, 0, 0);
    });
    return null;
}

function PlayerToken({ position, color, index, attacking }: { position: Point; color: string; index: number; attacking: boolean }) {
    const ref = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (!ref.current) return;
        ref.current.position.y = 0.18 + Math.sin(clock.getElapsedTime() * 1.7 + index) * 0.018;
        ref.current.rotation.y = attacking ? 0.1 : -0.1;
    });
    return (
        <group ref={ref} position={[position.x, 0.18, position.z]}>
            <mesh castShadow><cylinderGeometry args={[0.22, 0.27, 0.36, 12]} /><meshStandardMaterial color={color} metalness={0.2} roughness={0.45} /></mesh>
            <mesh position={[0, 0.28, 0]}><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color="#f4d6b3" roughness={0.9} /></mesh>
        </group>
    );
}

function Ball({ target }: { target: Point }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (!ref.current) return;
        ref.current.position.lerp(new THREE.Vector3(target.x, 0.22, target.z), 0.08);
        ref.current.rotation.x += 0.05;
        ref.current.rotation.z += 0.04;
    });
    return <mesh ref={ref} position={[target.x, 0.22, target.z]} castShadow><sphereGeometry args={[0.16, 16, 16]} /><meshStandardMaterial color="#f8fafc" roughness={0.38} metalness={0.08} /></mesh>;
}

function StadiumScene({ momentum, lastEvent }: { momentum: number; lastEvent: MatchEvent | null }) {
    const target = lastEvent?.pitchX !== undefined && lastEvent?.pitchY !== undefined
        ? worldPoint(lastEvent.pitchX, lastEvent.pitchY)
        : { x: Math.max(-4, Math.min(4, momentum * 0.42)), z: 0 };
    const shift = Math.max(-1.5, Math.min(1.5, momentum * 0.12));
    const home = HOME_SHAPE.map(point => ({ x: Math.max(-9.5, Math.min(9.5, point.x + shift)), z: point.z }));
    const away = HOME_SHAPE.map(point => ({ x: Math.max(-9.5, Math.min(9.5, -point.x + shift)), z: point.z }));

    return (
        <>
            <color attach="background" args={["#030712"]} />
            <fog attach="fog" args={["#030712", 16, 34]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 13, 5]} intensity={2.6} castShadow />
            <pointLight position={[-8, 7, -5]} color="#4fd1c5" intensity={18} distance={18} />
            <pointLight position={[8, 7, 5]} color="#d4a72c" intensity={12} distance={17} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[22, 14]} /><meshStandardMaterial color="#0d6b48" roughness={0.78} /></mesh>
            <mesh position={[0, 0.016, 0]}><boxGeometry args={[0.055, 0.025, 14]} /><meshBasicMaterial color="#d7ffe8" /></mesh>
            <mesh position={[-7.95, 0.016, 0]}><boxGeometry args={[4.1, 0.025, 7.1]} /><meshBasicMaterial color="#d7ffe8" wireframe /></mesh>
            <mesh position={[7.95, 0.016, 0]}><boxGeometry args={[4.1, 0.025, 7.1]} /><meshBasicMaterial color="#d7ffe8" wireframe /></mesh>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.27, 48]} /><meshBasicMaterial color="#d7ffe8" /></mesh>
            <mesh position={[-10.95, 0.55, 0]}><boxGeometry args={[0.08, 1.1, 2.5]} /><meshStandardMaterial color="#e5e7eb" emissive="#64748b" /></mesh>
            <mesh position={[10.95, 0.55, 0]}><boxGeometry args={[0.08, 1.1, 2.5]} /><meshStandardMaterial color="#e5e7eb" emissive="#64748b" /></mesh>
            {home.map((point, index) => <PlayerToken key={`home-${index}`} position={point} color="#fb3f62" index={index} attacking={momentum > 0} />)}
            {away.map((point, index) => <PlayerToken key={`away-${index}`} position={point} color="#2cb9f2" index={index + 20} attacking={momentum < 0} />)}
            <Ball target={target} />
            <CameraRig />
        </>
    );
}

export default function PitchView({ momentum, homeTeamName, awayTeamName, lastEvent, currentMinute = 0 }: PitchViewProps) {
    const [goalTeam, setGoalTeam] = useState<string | null>(null);
    useEffect(() => {
        if (lastEvent?.type !== 'goal') return;
        setGoalTeam(lastEvent.teamName || homeTeamName);
        const timer = window.setTimeout(() => setGoalTeam(null), 2600);
        return () => window.clearTimeout(timer);
    }, [lastEvent, homeTeamName]);

    const scoreCue = useMemo(() => lastEvent?.scoreAfter || '0-0', [lastEvent]);
    return (
        <section className="relative w-full aspect-[16/9] max-h-[350px] rounded-lg overflow-hidden border border-emerald-950 shadow-2xl bg-slate-950 select-none mx-auto" aria-label="3D match broadcast pitch">
            <Canvas shadows camera={{ position: [0, 16, 16], fov: 43 }} dpr={[1, 1.75]}><StadiumScene momentum={momentum} lastEvent={lastEvent} /></Canvas>
            <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between bg-gradient-to-b from-black/75 to-transparent pointer-events-none text-[10px] font-black tracking-widest uppercase text-white">
                <span>{shortName(homeTeamName)}</span><span className="rounded bg-black/70 px-2 py-1 text-emerald-300">{currentMinute}' · {scoreCue}</span><span>{shortName(awayTeamName)}</span>
            </div>
            <div className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/85 pointer-events-none">Pressure Tilt {momentum > 0 ? `+${momentum}` : momentum}</div>
            {goalTeam && <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px] animate-in fade-in duration-200 pointer-events-none"><div className="text-center"><FootballIcon className="w-14 h-14 text-white mx-auto mb-1 animate-bounce" /><h2 className="text-4xl font-black text-white uppercase tracking-tight">Goal</h2><p className="text-lg text-emerald-300 font-bold">{goalTeam}</p></div></div>}
        </section>
    );
}
