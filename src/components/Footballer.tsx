import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { MatchKit } from '../engine/matchKits';
import type { FootballAction, FootballPose } from '../engine/playerMotion';

export interface FootballerHandle {
    root: THREE.Group;
    pose: (pose: FootballPose, action: FootballAction, energy: number) => void;
}
interface FootballerProps {
    position: [number, number, number];
    kit: MatchKit;
    fabric: THREE.Texture | null;
    numbers: THREE.Texture;
    lineupMarker: number;
    identity: string;
    active: boolean;
}

export function createLineupNumberAtlas(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Number atlas requires a 2D canvas.');
    context.font = 'bold 44px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    for (let number = 1; number <= 11; number++) {
        context.fillText(String(number), ((number - 1) % 4) * 64 + 32, Math.floor((number - 1) / 4) * 64 + 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
}

function appearance(identity: string): { skin: string; hair: string } {
    // Stable generic avatar variation. Never inferred from nationality or claimed
    // to describe the real footballer's face, skin, hair or physical attributes.
    let hash = 0;
    for (const char of identity) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) >>> 0;
    return {
        skin: ['#c89470', '#ab795b', '#885b43', '#d2ac8d'][hash % 4],
        hair: ['#251b18', '#483025', '#392c24'][hash % 3],
    };
}

function makeMaterial(kit: MatchKit, identity: string, marker: number, numbers: THREE.Texture) {
    const avatar = appearance(identity);
    const uniforms = {
        uShirt: { value: new THREE.Color(kit.shirt) },
        uTrim: { value: new THREE.Color(kit.trim) },
        uShorts: { value: new THREE.Color(kit.shorts) },
        uSocks: { value: new THREE.Color(kit.socks) },
        uSkin: { value: new THREE.Color(avatar.skin) },
        uHair: { value: new THREE.Color(avatar.hair) },
        uInk: { value: new THREE.Color(kit.numberInk) },
        uFabric: { value: numbers as THREE.Texture },
        uHasFabric: { value: 0 },
        uNumbers: { value: numbers },
        uMarker: { value: marker - 1 },
        uKeeper: { value: kit.kind === 'goalkeeper' ? 1 : 0 },
    };
    const material = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0, color: '#ffffff' });
    material.customProgramCacheKey = () => 'manus-footballer-v1';
    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `
            #include <common>
            attribute float _clothregion;
            attribute vec3 _restposition;
            varying float vClothRegion;
            varying vec3 vRestPosition;
        `).replace('#include <begin_vertex>', `
            #include <begin_vertex>
            vClothRegion = _clothregion;
            vRestPosition = _restposition;
        `);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
            #include <common>
            uniform vec3 uShirt, uTrim, uShorts, uSocks, uSkin, uHair, uInk;
            uniform sampler2D uFabric, uNumbers;
            uniform float uHasFabric, uMarker, uKeeper;
            varying float vClothRegion;
            varying vec3 vRestPosition;
        `).replace('#include <color_fragment>', `
            #include <color_fragment>
            vec3 kitColor = uSkin;
            float r = vClothRegion;
            if (r > 0.5 && r < 1.5) {
                kitColor = uShirt;
                vec2 panel = vec2(clamp(vRestPosition.x / 0.36 + 0.5, 0.0, 1.0), clamp((vRestPosition.y - 0.99) / 0.48, 0.0, 1.0));
                if (uHasFabric > 0.5 && vRestPosition.z > 0.015 && abs(vRestPosition.x) < 0.20) {
                    // A real photograph's fabric crop, not generated branding.
                    vec3 referenceColor = texture2D(uFabric, panel).rgb;
                    kitColor = mix(uShirt, referenceColor, 0.92);
                }
                if (vRestPosition.y > 1.448 && abs(vRestPosition.x) < 0.08) kitColor = uTrim;
                if (vRestPosition.z < -0.018 && vRestPosition.y > 1.12 && vRestPosition.y < 1.37 && abs(vRestPosition.x) < 0.115) {
                    vec2 marker = vec2((0.115 - vRestPosition.x) / 0.23, (vRestPosition.y - 1.12) / 0.25);
                    vec2 atlas = vec2((mod(uMarker, 4.0) + marker.x) / 4.0, (2.0 - floor(uMarker / 4.0) + marker.y) / 3.0);
                    kitColor = mix(kitColor, uInk, texture2D(uNumbers, atlas).a);
                }
            } else if (r >= 1.5 && r < 2.5) kitColor = uShorts;
            else if (r >= 2.5 && r < 3.5) {
                kitColor = uSocks;
                if (vRestPosition.y > 0.405) kitColor = uTrim;
            } else if (r >= 3.5 && r < 4.5) {
                kitColor = vec3(0.028, 0.034, 0.043);
                if (vRestPosition.y < 0.022) kitColor = vec3(0.09, 0.105, 0.12);
            } else if (r >= 4.5) kitColor = uHair;
            if (uKeeper > 0.5 && r < 0.5 && abs(vRestPosition.x) > 0.24 && vRestPosition.y > 0.92) {
                kitColor = abs(vRestPosition.x) > 0.475 ? vec3(0.83, 0.85, 0.88) : uShirt;
            }
            diffuseColor.rgb *= kitColor;
        `);
    };
    return { material, uniforms };
}

const Footballer = forwardRef<FootballerHandle, FootballerProps>(function Footballer(props, ref) {
    const gltf = useLoader(GLTFLoader, '/models/footballer-v1.glb');
    const root = useMemo(() => new THREE.Group(), []);
    const rig = useMemo(() => {
        const model = clone(gltf.scene);
        model.scale.setScalar(0.45);
        const bones: Record<string, THREE.Bone> = {};
        model.traverse(object => {
            if ((object as THREE.Bone).isBone) bones[object.name] = object as THREE.Bone;
            if ((object as THREE.Mesh).isMesh) {
                (object as THREE.Mesh).frustumCulled = false;
            }
        });
        bones.LeftUpperArm.rotation.z = -0.70;
        bones.RightUpperArm.rotation.z = 0.70;
        return { model, bones };
    }, [gltf.scene]);
    const surface = useMemo(() => makeMaterial(props.kit, props.identity, props.lineupMarker, props.numbers), [props.kit, props.identity, props.lineupMarker, props.numbers]);
    useEffect(() => {
        rig.model.traverse(object => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).material = surface.material; });
        return () => { surface.material.dispose(); };
    }, [rig, surface]);
    surface.uniforms.uFabric.value = props.fabric ?? props.numbers;
    surface.uniforms.uHasFabric.value = props.fabric ? 1 : 0;
    useImperativeHandle(ref, () => ({
        root,
        pose: (pose, action, energy) => {
            const b = rig.bones;
            const raised = action === 'save' || action === 'celebrate';
            const armSign = raised ? 1 : -1;
            b.Chest.rotation.set(pose.bodyLean, pose.bodyYaw ?? 0, 0);
            b.LeftUpperArm.rotation.set(armSign * pose.leftUpperArm, 0, -0.70 + (action === 'celebrate' ? 1.9 * energy : 0));
            b.RightUpperArm.rotation.set(armSign * pose.rightUpperArm, 0, 0.70 - (action === 'celebrate' ? 1.9 * energy : 0));
            b.LeftForearm.rotation.x = pose.leftForearm;
            b.RightForearm.rotation.x = pose.rightForearm;
            b.LeftThigh.rotation.x = -pose.leftThigh;
            b.RightThigh.rotation.x = -pose.rightThigh;
            b.LeftShin.rotation.x = pose.leftShin;
            b.RightShin.rotation.x = pose.rightShin;
            b.LeftFoot.rotation.x = -pose.leftFoot;
            b.RightFoot.rotation.x = -pose.rightFoot;
            rig.model.position.y = pose.bodyBob * 0.3;
        },
    }), [root, rig]);
    return <primitive object={root} position={props.position} dispose={null}>
        <primitive object={rig.model} dispose={null} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} scale={[1.15, 0.75, 1]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#081d14" transparent opacity={0.28} depthWrite={false} />
        </mesh>
        {props.active && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
            <ringGeometry args={[0.18, 0.205, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} depthWrite={false} />
        </mesh>}
    </primitive>;
});
export default Footballer;
