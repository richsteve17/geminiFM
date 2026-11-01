import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MatchEvent, Team } from '../types';
import { formationPoints, highlightPath, pointOnPath, type PitchPoint } from '../engine/matchBroadcast';
import { selectMatchKits } from '../engine/matchKits';
import { chooseFootballAction, gaitPhase, sampleFootballPose, smoothFacing, type FootballAction } from '../engine/playerMotion';
import Footballer, { createLineupNumberAtlas, type FootballerHandle } from './Footballer';

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
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function Mark({ from, to }: { from: PitchPoint; to: PitchPoint }) {
    const a = world(from), b = world(to), difference = b.clone().sub(a);
    return <mesh position={[a.x + difference.x / 2, 0.012, a.z + difference.z / 2]} rotation={[0, -Math.atan2(difference.z, difference.x), 0]}>
        <boxGeometry args={[difference.length(), 0.015, 0.035]} /><meshBasicMaterial color="#e5f4d8" />
    </mesh>;
}
function Goal({ side }: { side: number }) {
    return <group position={[side * 11.15, 0, 0]}>
        {[-0.73, 0.73].map(z => <mesh key={z} position={[0, 0.55, z]}>
            <cylinderGeometry args={[0.025, 0.025, 1.1, 8]} /><meshStandardMaterial color="#fff" />
        </mesh>)}
        <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.46, 8]} /><meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[side * 0.45, 0.52, 0]}>
            <boxGeometry args={[0.8, 1.05, 1.46]} /><meshBasicMaterial color="#d2dadf" wireframe transparent opacity={0.35} />
        </mesh>
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[26, 18]} /><meshStandardMaterial color="#123c2e" roughness={1} />
        </mesh>
        {Array.from({ length: 10 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[-9.9 + index * 2.2, 0, 0]}>
            <planeGeometry args={[2.2, 14]} /><meshStandardMaterial color={index % 2 ? '#286848' : '#327750'} roughness={1} />
        </mesh>)}
        {lines.map(([from, to], i) => <Mark key={i} from={from} to={to} />)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <ringGeometry args={[1.86, 1.89, 64]} /><meshBasicMaterial color="#e5f4d8" />
        </mesh>
        <Goal side={-1} /><Goal side={1} />
        {[-1, 1].map(side => <mesh key={side} position={[0, 1, side * 8.25]}>
            <boxGeometry args={[25, 2, 0.8]} /><meshStandardMaterial color="#243344" />
        </mesh>)}
    </>;
}

function useKitFabric(source: string | null): THREE.Texture | null {
    const [fabric, setFabric] = useState<THREE.Texture | null>(null);
    useEffect(() => {
        let cancelled = false;
        let owned: THREE.Texture | null = null;
        setFabric(null);
        if (!source) return;
        const image = new Image();
        image.onload = () => {
            if (cancelled) return;
            const canvas = document.createElement('canvas');
            canvas.width = 192; canvas.height = 256;
            const context = canvas.getContext('2d');
            if (!context) return;
            // Sample the photographed shirt's central fabric panel. This is a
            // projection approximation, not a reconstructed official garment.
            context.drawImage(image, image.naturalWidth * 0.31, image.naturalHeight * 0.20,
                image.naturalWidth * 0.38, image.naturalHeight * 0.48, 0, 0, 192, 256);
            owned = new THREE.CanvasTexture(canvas);
            owned.colorSpace = THREE.SRGBColorSpace;
            owned.minFilter = THREE.LinearMipmapLinearFilter;
            setFabric(owned);
        };
        image.onerror = () => { if (!cancelled) setFabric(null); };
        image.src = source;
        return () => { cancelled = true; owned?.dispose(); };
    }, [source]);
    return fabric;
}

type SceneProps = PitchViewProps & {
    path: PitchPoint[];
    cameraMode: 'broadcast' | 'tactical';
    onReady: () => void;
    onGoalChange: (active: boolean) => void;
};
function FootballScene(props: SceneProps) {
    const elapsed = useRef(0), ball = useRef<THREE.Mesh>(null);
    const homeRefs = useRef<Array<FootballerHandle | null>>([]), awayRefs = useRef<Array<FootballerHandle | null>>([]);
    const phases = useRef<number[]>(Array(22).fill(0));
    const event = props.lastEvent;
    const homePlayers = useMemo(() => props.homeTeam?.players.filter(p => p.isStarter).slice(0, 11) ?? [], [props.homeTeam?.players]);
    const awayPlayers = useMemo(() => props.awayTeam?.players.filter(p => p.isStarter).slice(0, 11) ?? [], [props.awayTeam?.players]);
    const homeShape = useMemo(() => formationPoints(props.homeTeam?.tactic.formation || '4-4-2'), [props.homeTeam?.tactic.formation]);
    const awayShape = useMemo(() => formationPoints(props.awayTeam?.tactic.formation || '4-4-2', true), [props.awayTeam?.tactic.formation]);
    const kits = useMemo(() => selectMatchKits(props.homeTeam, props.awayTeam, props.homeTeamName, props.awayTeamName), [
        props.homeTeamName, props.awayTeamName, props.homeTeam?.name, props.awayTeam?.name,
        props.homeTeam?.league, props.awayTeam?.league,
        props.homeTeam?.colors?.primary, props.homeTeam?.colors?.secondary, props.homeTeam?.colors?.third,
        props.awayTeam?.colors?.primary, props.awayTeam?.colors?.secondary, props.awayTeam?.colors?.third,
    ]);
    const homeFabric = useKitFabric(kits.home.sourceImage), awayFabric = useKitFabric(kits.away.sourceImage);
    const numbers = useMemo(createLineupNumberAtlas, []);
    const lookTarget = useRef(new THREE.Vector3());
    const previousMode = useRef(props.cameraMode);
    const cameraMoving = useRef(false), goalVisible = useRef(false);
    const hasPlay = Boolean(event?.play || event?.pitchX !== undefined);
    useEffect(() => { props.onReady(); return () => numbers.dispose(); }, [numbers]);
    useEffect(() => {
        elapsed.current = 0;
        goalVisible.current = false;
        props.onGoalChange(false);
        if (!hasPlay || !event?.player) return;
        // A highlight starts at its resolved shot/pass origin. Position its
        // named actor there rather than making a distant striker moonwalk 40m.
        const refs = event.teamName === props.homeTeamName ? homeRefs.current : awayRefs.current;
        const players = event.teamName === props.homeTeamName ? homePlayers : awayPlayers;
        const index = players.findIndex(p => p.name === event.player);
        const origin = world(props.path[Math.max(0, props.path.length - 2)]);
        origin.y = 0.025;
        if (index >= 0) refs[index]?.root.position.copy(origin);
    }, [event?.id]);
    useFrame((state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        if (!props.paused) elapsed.current += delta;
        const duration = event?.type === 'goal' ? 4.2 : 3.0;
        const progress = clamp(elapsed.current / duration, 0, 1);
        const travel = clamp(progress / 0.66, 0, 1);
        const location = pointOnPath(props.path, travel);
        const ballWorld = world(location);
        const goalNow = event?.type === 'goal' && progress >= 0.66 && progress < 1;
        if (goalNow !== goalVisible.current) {
            goalVisible.current = goalNow;
            props.onGoalChange(goalNow);
        }
        if (ball.current && (!props.paused || elapsed.current === 0)) {
            const arc = event?.play?.kind === 'cross' ? Math.sin(travel * Math.PI) * 0.65 : 0;
            ball.current.position.set(ballWorld.x, 0.07 + arc, ballWorld.z);
            if (travel < 1 && !props.paused) {
                ball.current.rotation.z += delta * 9;
                ball.current.rotation.x += delta * 12;
            }
        }
        const homeAttack = event?.teamName === props.homeTeamName;
        if (!props.paused) {
            for (const [refs, shape, players, away] of [[homeRefs.current, homeShape, homePlayers, false], [awayRefs.current, awayShape, awayPlayers, true]] as const) {
                const attacking = away ? !homeAttack : homeAttack;
                const actor = attacking ? players.findIndex(p => p.name === event?.player) : -1;
                const origin = props.path[Math.max(0, props.path.length - 2)];
                refs.forEach((handle, index) => {
                    if (!handle || !shape[index] || !players[index]) return;
                    const base = shape[index], direction = away ? -1 : 1;
                    let x = base.x, y = base.y;
                    if (hasPlay) {
                        if (index === 0) {
                            y = 50 + (location.y - 50) * 0.28;
                            if (!attacking && event?.play?.outcome === 'saved' && progress > 0.46) y = location.y;
                        } else if (attacking && index === actor) {
                            x = origin.x; y = origin.y;
                            if (event?.type === 'goal' && progress > 0.66) x += direction * 3;
                        } else {
                            x += (location.x - 50) * (attacking ? 0.30 : 0.22);
                            y += (location.y - base.y) * (attacking ? 0.13 : 0.20);
                            if (!attacking && index > 0 && index < 5) x = x * 0.80 + origin.x * 0.20;
                        }
                    }
                    const target = world({ x: clamp(x, 3, 97), y: clamp(y, 4, 96) });
                    target.y = 0.025;
                    const movement = target.clone().sub(handle.root.position);
                    const distance = Math.min(movement.length(), delta * 2.7);
                    if (distance > 0.002) handle.root.position.addScaledVector(movement.normalize(), distance);
                    const key = index + (away ? 11 : 0);
                    phases.current[key] = gaitPhase(phases.current[key], distance / 0.45, false);
                    let action = progress >= 1 || !hasPlay ? 'idle' as FootballAction
                        : chooseFootballAction(event, players[index].name, index === 0, !attacking, progress < 0.66 ? Math.min(progress, 0.57) : 0.75);
                    if (!attacking && index > 0) action = 'idle';
                    if (action === 'save' && progress < 0.42) action = 'idle';
                    let actionProgress = clamp(progress / 0.81, 0, 1);
                    if (action === 'celebrate') actionProgress = clamp((progress - 0.66) / 0.32, 0, 1);
                    if (action === 'save') actionProgress = clamp((progress - 0.42) / 0.40, 0, 1);
                    if (action === 'idle' && distance > 0.002) { action = 'run'; actionProgress = 0.5; }
                    const facingAction = action === 'pass' || action === 'shoot' || action === 'save';
                    const face = facingAction ? ballWorld.clone().sub(handle.root.position) : distance > 0.002 ? movement : new THREE.Vector3(direction, 0, 0);
                    if (face.lengthSq() > 0.0001) handle.root.rotation.y = smoothFacing(handle.root.rotation.y, Math.atan2(face.x, face.z), delta);
                    const pose = sampleFootballPose({ phase: phases.current[key], speed: distance / Math.max(delta, 0.001) / 0.45, action, actionProgress, goalkeeper: index === 0 });
                    handle.pose(pose, action, Math.sin(actionProgress * Math.PI));
                });
            }
        }
        // Calm, bounded follow framing; it never determines football results.
        if (previousMode.current !== props.cameraMode) cameraMoving.current = true;
        if (!props.paused || cameraMoving.current || elapsed.current === 0) {
            const focusX = props.cameraMode === 'broadcast' ? clamp(ballWorld.x * 0.78, -7.8, 7.8) : 0;
            const focusZ = props.cameraMode === 'broadcast' ? clamp(ballWorld.z * 0.20, -1.0, 1.0) : 0;
            const desired = props.cameraMode === 'broadcast' ? new THREE.Vector3(focusX, 8.4, 8.9 + focusZ) : new THREE.Vector3(0, 20, 15.5);
            state.camera.position.lerp(desired, 1 - Math.exp(-delta * 2.4));
            lookTarget.current.lerp(new THREE.Vector3(focusX, 0, focusZ), 1 - Math.exp(-delta * 2.4));
            state.camera.lookAt(lookTarget.current);
            previousMode.current = props.cameraMode;
            if (state.camera.position.distanceToSquared(desired) < 0.0001) cameraMoving.current = false;
        }
    });
    const renderPlayers = (players: typeof homePlayers, shape: PitchPoint[], away: boolean) => players.map((player, index) => {
        if (player.status?.type === 'SentOff') return null;
        const pos = world(shape[index]);
        return <Footballer key={`${away}-${index}-${player.name}`} ref={handle => { (away ? awayRefs.current : homeRefs.current)[index] = handle; }}
            position={[pos.x, 0.025, pos.z]} kit={index === 0 ? (away ? kits.awayKeeper : kits.homeKeeper) : (away ? kits.away : kits.home)}
            fabric={index === 0 ? null : away ? awayFabric : homeFabric} numbers={numbers} lineupMarker={index + 1}
            identity={player.name} active={hasPlay && event?.player === player.name && event?.teamName === (away ? props.awayTeamName : props.homeTeamName)} />;
    });
    return <>
        <color attach="background" args={['#111c28']} />
        <ambientLight intensity={0.85} /><directionalLight position={[-4, 12, 7]} intensity={1.75} />
        <Field />
        {renderPlayers(homePlayers, homeShape, false)}{renderPlayers(awayPlayers, awayShape, true)}
        <mesh ref={ball} position={[0, 0.07, 0]}>
            <icosahedronGeometry args={[0.072, 1]} /><meshStandardMaterial color="#f8fafc" roughness={0.82} flatShading />
        </mesh>
    </>;
}

class RendererBoundary extends React.Component<{ children: React.ReactNode; onFailure: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onFailure(); }
    render() {
        if (this.state.failed) return <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">3D player renderer unavailable. Match clock, commentary and controls remain active.</div>;
        return this.props.children;
    }
}

export default function PitchView(props: PitchViewProps) {
    const { lastEvent: event, homeTeamName: home, awayTeamName: away } = props;
    const path = useMemo(() => highlightPath(event, home), [event?.id, home]);
    const [cameraMode, setCameraMode] = useState<'broadcast' | 'tactical'>('broadcast');
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [goal, setGoal] = useState(false);
    const cue = event?.play ? `${event.play.kind.replace('-', ' ')} · ${event.play.outcome}` : props.paused ? 'Match paused' : 'Waiting for next highlight';
    return <section className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950" aria-label="Match highlight reconstruction">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold bg-slate-950 text-slate-100">
            <span>{short(home)} <span className="text-slate-500">v</span> {short(away)}</span>
            <span className="tabular-nums text-base">{props.homeScore ?? 0} – {props.awayScore ?? 0}</span>
            <span className="text-emerald-400">{props.currentMinute ?? 0}' {props.paused ? 'PAUSED' : 'LIVE'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] border-t border-slate-800">
            <span className="text-slate-400">LIVE RECONSTRUCTION</span>
            <div className="flex gap-1" aria-label="Pitch camera">
                {(['broadcast', 'tactical'] as const).map(mode => <button key={mode} type="button" onClick={() => setCameraMode(mode)} aria-pressed={cameraMode === mode}
                    className={`px-2 py-1 rounded capitalize ${cameraMode === mode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{mode}</button>)}
            </div>
        </div>
        <div className="relative aspect-[16/10] max-h-[440px]">
            <RendererBoundary onFailure={() => setFailed(true)}>
                <Canvas camera={{ position: [0, 8.4, 8.9], fov: 43 }} dpr={[1, 1.25]} gl={{ antialias: true, powerPreference: 'high-performance' }}
                    fallback={<div className="p-6 text-sm text-slate-300">WebGL unavailable. Match commentary and controls remain active.</div>}
                    onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
                    <Suspense fallback={null}><FootballScene {...props} path={path} cameraMode={cameraMode} onReady={() => setReady(true)} onGoalChange={setGoal} /></Suspense>
                </Canvas>
            </RendererBoundary>
            {!ready && !failed && <div className="absolute left-3 top-3 text-xs text-slate-300 pointer-events-none">Loading footballer model…</div>}
            {goal && <div className="absolute inset-x-0 bottom-2 mx-4 py-3 px-4 bg-emerald-950/95 border-l-4 border-emerald-400 pointer-events-none">
                <strong className="text-xl text-white">GOAL — {event?.player}</strong><p className="text-xs text-emerald-200">{event?.teamName}</p>
            </div>}
        </div>
        <div className="flex justify-between gap-2 items-center px-3 py-2 border-t border-slate-800 text-xs">
            <span className="text-slate-200 capitalize truncate">{event?.player ? `${event.player} · ` : ''}{cue}</span>
            {event?.xG !== undefined && <span className="text-amber-300 shrink-0">{event.xG.toFixed(2)} xG</span>}
        </div>
        <p className="px-3 pb-2 text-[10px] leading-relaxed text-slate-500">Generic footballer avatars · projected kit references; shorts / socks / keeper colours approximate · numbers identify lineup slots, not verified squad numbers.</p>
    </section>;
}
