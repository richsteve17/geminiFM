import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MatchEvent, Team } from '../types';
import { formationPoints, highlightPath, pointOnPath, type PitchPoint } from '../engine/matchBroadcast';

interface PitchViewProps {
    momentum: number;
    homeTeamName: string;
    awayTeamName: string;
    lastEvent: MatchEvent | null;
    currentMinute?: number;
    homeScore?: number;
    awayScore?: number;
    homeTeam?: Team;
    awayTeam?: Team;
    paused?: boolean;
}
const short = (name: string) => name.split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase();
const world = (point: PitchPoint) => new THREE.Vector3((point.x - 50) * 0.22, 0, (point.y - 50) * 0.14);

function Mark({ from, to }: { from: PitchPoint; to: PitchPoint }) {
    const a = world(from), b = world(to), difference = b.clone().sub(a);
    return <mesh position={[a.x + difference.x / 2, 0.012, a.z + difference.z / 2]} rotation={[0, -Math.atan2(difference.z, difference.x), 0]}><boxGeometry args={[difference.length(), 0.015, 0.035]} /><meshBasicMaterial color="#e5f4d8" /></mesh>;
}
function Goal({ side }: { side: number }) {
    return <group position={[side * 11.15, 0, 0]}>
        {[-0.73, 0.73].map(z => <mesh key={z} position={[0, 0.55, z]}><cylinderGeometry args={[0.025, 0.025, 1.1, 8]} /><meshBasicMaterial color="#fff" /></mesh>)}
        <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 1.46, 8]} /><meshBasicMaterial color="#fff" /></mesh>
        <mesh position={[side * 0.45, 0.52, 0]}><boxGeometry args={[0.8, 1.05, 1.46]} /><meshBasicMaterial color="#d2dadf" wireframe transparent opacity={0.35} /></mesh>
    </group>;
}
function Field() {
    const lines: Array<[PitchPoint, PitchPoint]> = [
        [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }],
        [{ x: 100, y: 100 }, { x: 0, y: 100 }], [{ x: 0, y: 100 }, { x: 0, y: 0 }],
        [{ x: 50, y: 0 }, { x: 50, y: 100 }],
    ];
    for (const side of [0, 100]) {
        const inside = side === 0 ? 16 : 84;
        lines.push([{ x: side, y: 21 }, { x: inside, y: 21 }], [{ x: inside, y: 21 }, { x: inside, y: 79 }], [{ x: inside, y: 79 }, { x: side, y: 79 }]);
        const six = side === 0 ? 5.5 : 94.5;
        lines.push([{ x: side, y: 36 }, { x: six, y: 36 }], [{ x: six, y: 36 }, { x: six, y: 64 }], [{ x: six, y: 64 }, { x: side, y: 64 }]);
    }
    return <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><planeGeometry args={[26, 18]} /><meshStandardMaterial color="#123c2e" roughness={1} /></mesh>
        {Array.from({ length: 10 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[-9.9 + index * 2.2, 0, 0]} receiveShadow><planeGeometry args={[2.2, 14]} /><meshStandardMaterial color={index % 2 ? '#286848' : '#327750'} roughness={1} /></mesh>)}
        {lines.map(([from, to], i) => <Mark key={i} from={from} to={to} />)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[1.86, 1.89, 64]} /><meshBasicMaterial color="#e5f4d8" /></mesh>
        <Goal side={-1} /><Goal side={1} />
        {[-1, 1].map(side => <mesh key={side} position={[0, 1, side * 8.25]}><boxGeometry args={[25, 2, 0.8]} /><meshStandardMaterial color="#243344" /></mesh>)}
    </>;
}

type SceneProps = PitchViewProps & { path: PitchPoint[] };
function FootballScene(props: SceneProps) {
    const start = useRef(0), elapsed = useRef(0), ball = useRef<THREE.Mesh>(null);
    const homeRefs = useRef<Array<THREE.Group | null>>([]), awayRefs = useRef<Array<THREE.Group | null>>([]);
    const homePlayers = props.homeTeam?.players.filter(p => p.isStarter).slice(0, 11) || [];
    const awayPlayers = props.awayTeam?.players.filter(p => p.isStarter).slice(0, 11) || [];
    const homeShape = useMemo(() => formationPoints(props.homeTeam?.tactic.formation || '4-4-2'), [props.homeTeam?.tactic.formation]);
    const awayShape = useMemo(() => formationPoints(props.awayTeam?.tactic.formation || '4-4-2', true), [props.awayTeam?.tactic.formation]);
    const event = props.lastEvent;
    useEffect(() => { start.current = 0; elapsed.current = 0; }, [event?.id]);
    useFrame((state, delta) => {
        if (!start.current) start.current = state.clock.elapsedTime;
        if (!props.paused) elapsed.current += delta;
        const duration = event?.type === 'goal' ? 2.65 : 1.5;
        const progress = Math.min(1, elapsed.current / duration);
        const location = pointOnPath(props.path, progress);
        const ballWorld = world(location);
        if (ball.current) {
            ball.current.position.set(ballWorld.x, 0.09 + (event?.play?.kind === 'cross' ? Math.sin(progress * Math.PI) * 0.9 : 0), ballWorld.z);
            if (progress < 1 && !props.paused) { ball.current.rotation.z += delta * 9; ball.current.rotation.x += delta * 12; }
        }
        const homeAttack = event?.teamName === props.homeTeamName;
        for (const [refs, shape, players, away] of [[homeRefs.current, homeShape, homePlayers, false], [awayRefs.current, awayShape, awayPlayers, true]] as const) {
            const attacking = away ? !homeAttack : homeAttack;
            const receiver = players.findIndex(p => p.name === event?.player);
            const origin = props.path[Math.max(0, props.path.length - 2)];
            refs.forEach((ref, index) => {
                if (!ref) return;
                const base = shape[index];
                const direction = away ? -1 : 1;
                let x = base.x, y = base.y;
                if (event?.pitchX !== undefined) {
                    if (index === 0) {
                        y = 50 + (location.y - 50) * 0.24;
                        x += direction * (attacking ? 1.5 : 0);
                    } else if (attacking && index === (receiver >= 0 ? receiver : 9)) {
                        x = origin.x; y = origin.y;
                        if (event.type === 'goal' && progress > 0.9) x += direction * 3;
                    } else {
                        const push = (location.x - 50) * (attacking ? 0.35 : 0.24);
                        x += push;
                        y += (location.y - base.y) * (attacking ? 0.15 : 0.22);
                        if (!attacking && index > 0 && index < 5) x = x * 0.75 + origin.x * 0.25;
                    }
                }
                const target = world({ x: Math.max(3, Math.min(97, x)), y: Math.max(4, Math.min(96, y)) });
                target.y = 0.025;
                const distance = ref.position.distanceTo(target);
                if (!props.paused) ref.position.lerp(target, 1 - Math.exp(-delta * 4));
                const angle = Math.atan2(ballWorld.x - ref.position.x, ballWorld.z - ref.position.z);
                ref.rotation.y = angle;
                ref.children.slice(-2).forEach((leg, legIndex) => { leg.rotation.x = distance > 0.15 && !props.paused ? Math.sin(elapsed.current * 12 + legIndex * Math.PI) * 0.42 : 0; });
            });
        }
    });
    const renderPlayer = (base: PitchPoint, index: number, away: boolean) => {
        const color = (away ? props.awayTeam?.colors?.secondary : props.homeTeam?.colors?.primary) || (away ? '#46b5ef' : '#e33351');
        const pos = world(base);
        return <group key={`${away}-${index}`} ref={ref => { (away ? awayRefs.current : homeRefs.current)[index] = ref; }} position={[pos.x, 0.025, pos.z]}>
            <mesh castShadow position={[0, 0.36, 0]}><boxGeometry args={[0.19, 0.23, 0.12]} /><meshStandardMaterial color={index === 0 ? '#ffc84a' : color} /></mesh>
            <mesh position={[0, 0.56, 0]}><sphereGeometry args={[0.075, 10, 8]} /><meshStandardMaterial color="#d6a882" /></mesh>
            {[-1, 1].map(side => <mesh key={`arm${side}`} position={[side * 0.13, 0.36, 0]} rotation={[0, 0, side * -0.12]}><cylinderGeometry args={[0.026, 0.026, 0.2, 6]} /><meshStandardMaterial color="#d6a882" /></mesh>)}
            {[-1, 1].map(side => <mesh key={`leg${side}`} position={[side * 0.055, 0.14, 0]}><boxGeometry args={[0.055, 0.24, 0.065]} /><meshStandardMaterial color={away ? '#e8f2ff' : '#162238'} /></mesh>)}
        </group>;
    };
    return <>
        <color attach="background" args={['#111c28']} />
        <ambientLight intensity={1.3} /><directionalLight position={[3, 12, 7]} intensity={2} />
        <Field />
        {homeShape.map((base, index) => renderPlayer(base, index, false))}
        {awayShape.map((base, index) => renderPlayer(base, index, true))}
        <mesh ref={ball} position={[0, 0.09, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#fff" /></mesh>
    </>;
}

export default function PitchView(props: PitchViewProps) {
    const { lastEvent: event, homeTeamName: home, awayTeamName: away } = props;
    const path = useMemo(() => highlightPath(event, home), [event?.id, home]);
    const [goal, setGoal] = useState(false);
    useEffect(() => {
        setGoal(false);
        if (event?.type !== 'goal') return;
        const show = setTimeout(() => setGoal(true), 1650), hide = setTimeout(() => setGoal(false), 4100);
        return () => { clearTimeout(show); clearTimeout(hide); };
    }, [event?.id]);
    const cue = event?.play ? `${event.play.kind.replace('-', ' ')} · ${event.play.outcome}` : props.paused ? 'Match paused' : 'Waiting for next highlight';
    return <section className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950" aria-label="Match highlight reconstruction">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold bg-slate-950 text-slate-100">
            <span>{short(home)} <span className="text-slate-500">v</span> {short(away)}</span>
            <span className="tabular-nums text-base">{props.homeScore ?? 0} – {props.awayScore ?? 0}</span>
            <span className="text-emerald-400">{props.currentMinute ?? 0}' {props.paused ? 'PAUSED' : 'LIVE'}</span>
        </div>
        <div className="relative aspect-[16/10] max-h-[410px]">
            <Canvas camera={{ position: [0, 20, 15.5], fov: 43 }} dpr={[1, 1.5]} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}><FootballScene {...props} path={path} /></Canvas>
            {goal && <div className="absolute inset-x-0 bottom-2 mx-4 py-3 px-4 bg-emerald-950/95 border-l-4 border-emerald-400 pointer-events-none"><strong className="text-xl text-white">GOAL — {event?.player}</strong><p className="text-xs text-emerald-200">{event?.teamName}</p></div>}
        </div>
        <div className="flex justify-between gap-2 items-center px-3 py-2 border-t border-slate-800 text-xs"><span className="text-slate-200 capitalize truncate">{event?.player ? `${event.player} · ` : ''}{cue}</span>{event?.xG !== undefined && <span className="text-amber-300 shrink-0">{event.xG.toFixed(2)} xG</span>}</div>
    </section>;
}
