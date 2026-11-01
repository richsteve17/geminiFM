import type { MatchEvent } from '../types';

export type FootballAction = 'idle' | 'run' | 'pass' | 'shoot' | 'save' | 'celebrate';

/**
 * Additive local rig values for the catalog-defined footballer bones.
 *
 * All joint values, bodyLean, and bodyYaw are radians. bodyBob is the sole
 * non-angular value: a small local vertical offset, normalized to torso height.
 * World translation and world-facing rotation intentionally remain outside this
 * module so the visual pose cannot alter match simulation state.
 */
export interface FootballPose {
    bodyLean: number;
    bodyBob: number;
    leftUpperArm: number;
    rightUpperArm: number;
    leftForearm: number;
    rightForearm: number;
    leftThigh: number;
    rightThigh: number;
    leftShin: number;
    rightShin: number;
    leftFoot: number;
    rightFoot: number;
    /** Small additive torso twist. Apply world-facing separately with smoothFacing. */
    bodyYaw?: number;
}

export interface FootballPoseInput {
    phase: number;
    speed: number;
    action: FootballAction;
    actionProgress: number;
    goalkeeper?: boolean;
}

const TAU = Math.PI * 2;
const MAX_SPEED = 12;
const MAX_VISUAL_DISTANCE = 25;
const STRIDE_DISTANCE = 0.75;
const TURN_RESPONSE = 10;
const MAX_JOINT_ANGLE = 1.65;
const MAX_BODY_LEAN = 0.65;
const MAX_BODY_YAW = 0.5;
const MAX_BODY_BOB = 0.12;

function finite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, finite(value, minimum)));
}

function clean(value: number, limit: number): number {
    const bounded = clamp(value, -limit, limit);
    return bounded === 0 ? 0 : bounded;
}

function phaseAngle(value: number): number {
    const safe = finite(value);
    const wrapped = safe % TAU;
    return wrapped < 0 ? wrapped + TAU : wrapped;
}

function signedAngle(value: number): number {
    const wrapped = phaseAngle(value + Math.PI) - Math.PI;
    return wrapped === 0 ? 0 : wrapped;
}

function smoothStep(start: number, end: number, value: number): number {
    if (start === end) return value >= end ? 1 : 0;
    const t = clamp((value - start) / (end - start), 0, 1);
    return t * t * (3 - 2 * t);
}

function bell(value: number, center: number, halfWidth: number): number {
    const distance = Math.abs(value - center) / halfWidth;
    return distance >= 1 ? 0 : smoothStep(0, 1, 1 - distance);
}

function neutralPose(): FootballPose {
    return {
        bodyLean: 0,
        bodyBob: 0,
        leftUpperArm: 0,
        rightUpperArm: 0,
        leftForearm: 0,
        rightForearm: 0,
        leftThigh: 0,
        rightThigh: 0,
        leftShin: 0,
        rightShin: 0,
        leftFoot: 0,
        rightFoot: 0,
        bodyYaw: 0,
    };
}

function boundedPose(pose: FootballPose): FootballPose {
    return {
        bodyLean: clean(pose.bodyLean, MAX_BODY_LEAN),
        bodyBob: clean(pose.bodyBob, MAX_BODY_BOB),
        leftUpperArm: clean(pose.leftUpperArm, MAX_JOINT_ANGLE),
        rightUpperArm: clean(pose.rightUpperArm, MAX_JOINT_ANGLE),
        leftForearm: clean(pose.leftForearm, MAX_JOINT_ANGLE),
        rightForearm: clean(pose.rightForearm, MAX_JOINT_ANGLE),
        leftThigh: clean(pose.leftThigh, MAX_JOINT_ANGLE),
        rightThigh: clean(pose.rightThigh, MAX_JOINT_ANGLE),
        leftShin: clean(pose.leftShin, MAX_JOINT_ANGLE),
        rightShin: clean(pose.rightShin, MAX_JOINT_ANGLE),
        leftFoot: clean(pose.leftFoot, MAX_JOINT_ANGLE),
        rightFoot: clean(pose.rightFoot, MAX_JOINT_ANGLE),
        bodyYaw: clean(pose.bodyYaw ?? 0, MAX_BODY_YAW),
    };
}

/**
 * Advances a gait strictly from the visual distance actually travelled. It does
 * not accept elapsed time by design, and a paused render preserves the phase.
 */
export function gaitPhase(previous: number, distance: number, paused: boolean): number {
    const phase = phaseAngle(previous);
    if (paused) return phase;

    const visualDistance = clamp(distance, 0, MAX_VISUAL_DISTANCE);
    return phaseAngle(phase + visualDistance * TAU / STRIDE_DISTANCE);
}

/**
 * Smoothly turns toward target using the shortest angular path. Delta is in
 * seconds and is bounded to keep malformed frame timing from snapping a model.
 */
export function smoothFacing(current: number, target: number, delta: number): number {
    const from = signedAngle(current);
    const shortest = signedAngle(finite(target) - from);
    const frameSeconds = clamp(delta, 0, 1);
    const blend = 1 - Math.exp(-TURN_RESPONSE * frameSeconds);
    return signedAngle(from + shortest * blend);
}

function runPose(phase: number, speed: number, actionProgress: number): FootballPose {
    const settle = 1 - smoothStep(0.92, 1, actionProgress);
    const intensity = clamp(speed / 6.5, 0, 1) * settle;
    if (intensity === 0) return neutralPose();

    const stride = Math.sin(phase) * intensity;
    const leftKnee = Math.max(0, -stride) * 0.8;
    const rightKnee = Math.max(0, stride) * 0.8;

    return boundedPose({
        bodyLean: 0.12 * intensity,
        bodyBob: 0.032 * intensity * (1 - Math.cos(phase * 2)),
        leftUpperArm: -stride * 0.58,
        rightUpperArm: stride * 0.58,
        leftForearm: -stride * 0.26,
        rightForearm: stride * 0.26,
        leftThigh: stride * 0.92,
        rightThigh: -stride * 0.92,
        leftShin: leftKnee,
        rightShin: rightKnee,
        leftFoot: -leftKnee * 0.36 - stride * 0.08,
        rightFoot: -rightKnee * 0.36 + stride * 0.08,
        bodyYaw: 0,
    });
}

function kickPose(phase: number, actionProgress: number, power: number): FootballPose {
    const onset = smoothStep(0, 0.06, actionProgress);
    const settle = 1 - smoothStep(0.8, 1, actionProgress);
    const envelope = onset * settle;
    const windUp = bell(actionProgress, 0.24, 0.27) * envelope;
    const strike = bell(actionProgress, 0.54, 0.24) * envelope;
    const rightKicking = Math.sin(phase) >= 0;
    const kickThigh = power * (-0.62 * windUp + 1.12 * strike);
    const kickShin = power * (0.74 * windUp - 0.3 * strike);
    const kickFoot = power * (0.2 * windUp - 0.2 * strike);
    const supportThigh = -0.3 * power * strike;
    const supportShin = 0.42 * power * strike;
    const supportFoot = -0.16 * power * strike;

    return boundedPose({
        bodyLean: power * (0.15 * strike - 0.05 * windUp),
        bodyBob: 0.018 * envelope,
        leftUpperArm: power * (-0.28 * windUp + 0.24 * strike),
        rightUpperArm: power * (0.28 * windUp - 0.24 * strike),
        leftForearm: power * (-0.14 * windUp + 0.18 * strike),
        rightForearm: power * (0.14 * windUp - 0.18 * strike),
        leftThigh: rightKicking ? supportThigh : kickThigh,
        rightThigh: rightKicking ? kickThigh : supportThigh,
        leftShin: rightKicking ? supportShin : kickShin,
        rightShin: rightKicking ? kickShin : supportShin,
        leftFoot: rightKicking ? supportFoot : kickFoot,
        rightFoot: rightKicking ? kickFoot : supportFoot,
        bodyYaw: (rightKicking ? 1 : -1) * 0.12 * power * strike,
    });
}

function savePose(phase: number, actionProgress: number, goalkeeper: boolean): FootballPose {
    const reachIn = smoothStep(0, 0.16, actionProgress);
    const returnToRest = 1 - smoothStep(0.78, 0.96, actionProgress);
    const reach = reachIn * returnToRest * (goalkeeper ? 1 : 0.45);
    const direction = Math.sin(phase) >= 0 ? 1 : -1;

    return boundedPose({
        bodyLean: 0.34 * reach,
        bodyBob: 0.045 * reach,
        leftUpperArm: (-0.9 - direction * 0.23) * reach,
        rightUpperArm: (-0.9 + direction * 0.23) * reach,
        leftForearm: (-0.54 - direction * 0.2) * reach,
        rightForearm: (-0.54 + direction * 0.2) * reach,
        leftThigh: (0.28 - direction * 0.16) * reach,
        rightThigh: (0.28 + direction * 0.16) * reach,
        leftShin: -0.52 * reach,
        rightShin: -0.52 * reach,
        leftFoot: 0.18 * reach,
        rightFoot: 0.18 * reach,
        bodyYaw: direction * 0.17 * reach,
    });
}

function celebrationPose(phase: number, actionProgress: number): FootballPose {
    const rise = smoothStep(0.03, 0.17, actionProgress);
    const settle = 1 - smoothStep(0.78, 0.96, actionProgress);
    const energy = rise * settle;
    const hop = 0.5 + 0.5 * Math.sin(phase * 2);

    return boundedPose({
        bodyLean: -0.1 * energy,
        bodyBob: 0.075 * energy * (0.55 + 0.45 * hop),
        leftUpperArm: (-1.22 - 0.08 * hop) * energy,
        rightUpperArm: (-1.22 + 0.08 * hop) * energy,
        leftForearm: (-0.72 - 0.12 * hop) * energy,
        rightForearm: (-0.72 + 0.12 * hop) * energy,
        leftThigh: 0.22 * energy * hop,
        rightThigh: -0.22 * energy * hop,
        leftShin: -0.18 * energy * hop,
        rightShin: 0.18 * energy * hop,
        leftFoot: 0.08 * energy,
        rightFoot: -0.08 * energy,
        bodyYaw: 0.14 * Math.sin(phase) * energy,
    });
}

/**
 * Samples a deterministic local pose. It has no renderer, world, score, timer,
 * or random dependency; catalog geometry determines the physical bone lengths.
 */
export function sampleFootballPose(input: FootballPoseInput): FootballPose {
    const phase = phaseAngle(input.phase);
    const speed = clamp(input.speed, 0, MAX_SPEED);
    const actionProgress = clamp(input.actionProgress, 0, 1);
    const goalkeeper = input.goalkeeper === true;

    switch (input.action) {
        case 'run':
            return runPose(phase, speed, actionProgress);
        case 'pass':
            return kickPose(phase, actionProgress, 0.72);
        case 'shoot':
            return kickPose(phase, actionProgress, 1);
        case 'save':
            return savePose(phase, actionProgress, goalkeeper);
        case 'celebrate':
            return celebrationPose(phase, actionProgress);
        case 'idle':
        default:
            return neutralPose();
    }
}

function isNamedActor(event: MatchEvent, playerName: string): boolean {
    return playerName.length > 0 && event.player === playerName;
}

/**
 * Selects a presentational action from an already-resolved event. Only the
 * explicit event actor receives a kicking or celebration action. A defending
 * goalkeeper may save only when the resolved play outcome is literally saved;
 * this prevents an on-target goal from being animated as a save.
 */
export function chooseFootballAction(
    event: MatchEvent | null,
    playerName: string,
    goalkeeper: boolean,
    defending: boolean,
    progress: number,
): FootballAction {
    const actionProgress = clamp(progress, 0, 1);
    if (!event || actionProgress >= 0.93) return 'idle';

    const resolvedOutcome = event.play?.outcome ?? (event.type === 'goal' ? 'goal' : undefined);
    if (goalkeeper && defending && resolvedOutcome === 'saved' && actionProgress >= 0.24 && actionProgress < 0.84) {
        return 'save';
    }

    // Opposing names are not actor identity. A defending player can only use
    // the explicitly resolved keeper-save branch above, never shoot/celebrate.
    if (defending) return 'idle';
    if (!isNamedActor(event, playerName)) return 'idle';
    if (resolvedOutcome === 'goal') {
        if (actionProgress < 0.58) return 'shoot';
        return actionProgress >= 0.58 && actionProgress < 0.93 ? 'celebrate' : 'idle';
    }

    if (!event.play || resolvedOutcome === 'foul') return 'idle';
    if (event.play.kind === 'shot' || resolvedOutcome === 'saved' || resolvedOutcome === 'wide' || resolvedOutcome === 'blocked') {
        return actionProgress < 0.72 ? 'shoot' : 'idle';
    }

    return actionProgress < 0.72 ? 'pass' : 'idle';
}
