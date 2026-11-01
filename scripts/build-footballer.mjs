import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Adapt the catalog's actual anatomical geometry. No source scripts are executed.
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/build-footballer.mjs /absolute/path/stylized_human_basemesh_mtype.glb');
const source = await fs.readFile(sourcePath);
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
if (sourceHash !== '63747ff30fd1f02fe2bbff5f9e48e6d2a829e999d5c903ec819bd3b06ba65a5a') {
    throw new Error('This adaptation requires the pinned catalog male basemesh, not an arbitrary model.');
}
const gltf = await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
const sourceMesh = gltf.scene.getObjectByName('skin');
if (!sourceMesh?.isMesh) throw new Error('Pinned source is missing its anatomical skin mesh.');
const geometry = sourceMesh.geometry.clone();
geometry.translate(0, -0.001788496971130371, -0.16);
const positions = geometry.getAttribute('position');
const normals = geometry.getAttribute('normal');

// Authored adaptation pivots in metres, measured against this A-pose source.
// They are visual rig parameters, not player height/identity facts.
const rig = [
    ['Root', -1, [0, 0.95, 0]],
    ['Spine', 0, [0, 1.14, 0]],
    ['Chest', 1, [0, 1.38, 0]],
    ['Head', 2, [0, 1.53, 0.015]],
    ['LeftUpperArm', 2, [0.17, 1.405, 0]],
    ['LeftForearm', 4, [0.34, 1.215, 0]],
    ['LeftHand', 5, [0.49, 1.025, 0]],
    ['RightUpperArm', 2, [-0.17, 1.405, 0]],
    ['RightForearm', 7, [-0.34, 1.215, 0]],
    ['RightHand', 8, [-0.49, 1.025, 0]],
    ['LeftThigh', 0, [0.09, 0.925, 0]],
    ['LeftShin', 10, [0.09, 0.49, 0]],
    ['LeftFoot', 11, [0.09, 0.09, -0.01]],
    ['RightThigh', 0, [-0.09, 0.925, 0]],
    ['RightShin', 13, [-0.09, 0.49, 0]],
    ['RightFoot', 14, [-0.09, 0.09, -0.01]],
];
const bones = rig.map(([name]) => { const bone = new THREE.Bone(); bone.name = name; return bone; });
rig.forEach(([, parent, point], i) => {
    const parentPoint = parent < 0 ? [0, 0, 0] : rig[parent][2];
    bones[i].position.set(point[0] - parentPoint[0], point[1] - parentPoint[1], point[2] - parentPoint[2]);
    if (parent >= 0) bones[parent].add(bones[i]);
});
const jointWeight = (coordinate, joint, width) => Math.max(0, Math.min(1, (coordinate - joint + width) / (width * 2)));
const weights = [], indices = [], regions = [], uv = [];
for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const ax = Math.abs(x), left = x >= 0;
    let ids = [0, 1], w = 0, region = 0;
    const arm = y > 0.9 && y < 1.47 && ax > (y > 1.32 ? 0.195 : 0.22);
    if (arm) {
        const upper = left ? 4 : 7, fore = left ? 5 : 8, hand = left ? 6 : 9;
        const distance = Math.hypot(ax - 0.17, y - 1.405);
        if (distance < 0.34) {
            ids = [upper, fore]; w = jointWeight(distance, 0.255, 0.075);
        } else {
            ids = [fore, hand]; w = jointWeight(distance, 0.5, 0.035);
        }
        region = distance < 0.165 ? 1 : 0; // Short sleeves, exposed forearms.
    } else if (y < 0.99) {
        const thigh = left ? 10 : 13, shin = left ? 11 : 14, foot = left ? 12 : 15;
        if (y > 0.58) {
            ids = [thigh, 0]; w = jointWeight(y, 0.91, 0.065);
        } else if (y > 0.16) {
            ids = [shin, thigh]; w = jointWeight(y, 0.49, 0.07);
        } else {
            ids = [foot, shin]; w = jointWeight(y, 0.105, 0.04);
        }
        region = y > 0.71 ? 2 : y < 0.10 ? 4 : y < 0.45 ? 3 : 0;
    } else if (y > 1.50) {
        ids = [3, 2]; w = 1 - jointWeight(y, 1.54, 0.025);
        region = y > 1.695 && z < 0.058 ? 5 : 0;
    } else {
        ids = y > 1.27 ? [1, 2] : [0, 1];
        w = jointWeight(y, y > 1.27 ? 1.30 : 1.09, 0.10);
        region = y < 1.475 ? 1 : 0;
    }
    indices.push(ids[0], ids[1], 0, 0);
    weights.push(1 - w, w, 0, 0);
    regions.push(region);
    // A reusable projection coordinate, not the source's face/body UV layout.
    uv.push(Math.max(0, Math.min(1, x / 0.36 + 0.5)), Math.max(0, Math.min(1, (y - 0.99) / 0.48)));
    if (region === 1 || region === 2) {
        // Small normal offset gives clothing room without inventing new anatomy.
        const pad = region === 1 ? 0.009 : 0.013;
        positions.setXYZ(i, x + normals.getX(i) * pad, y + normals.getY(i) * pad, z + normals.getZ(i) * pad);
    }
}
geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
// Custom underscore attributes survive glTF import without becoming standard UVs.
geometry.setAttribute('clothregion', new THREE.Float32BufferAttribute(regions, 1));
geometry.setAttribute('restposition', positions.clone());
geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
geometry.computeBoundingSphere();
const material = new THREE.MeshStandardMaterial({ color: '#d2a987', roughness: 0.92, metalness: 0 });
const player = new THREE.SkinnedMesh(geometry, material);
player.name = 'Footballer';
player.add(bones[0]);
player.updateMatrixWorld(true);
player.bind(new THREE.Skeleton(bones));
player.userData = {
    source: 'https://hiamboz.itch.io/human-body-base-mesh',
    sourceLicense: 'CC0-1.0',
    sourceSha256: sourceHash,
    adaptation: 'Anatomical source skin, 16-bone visual rig, garment regions and projected-shirt UV; no real-player likeness.',
};

// Node shim for the standard Three.js binary exporter; no textures are embedded.
globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
        blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); });
    }
    readAsDataURL(blob) {
        blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); });
    }
};
const binary = await new GLTFExporter().parseAsync(player, { binary: true, onlyVisible: true });
const output = path.resolve('public/models/footballer-v1.glb');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, Buffer.from(binary));
const hash = crypto.createHash('sha256').update(Buffer.from(binary)).digest('hex');
const report = {
    source: player.userData.source, sourceLicense: 'CC0-1.0', sourceSha256: sourceHash,
    derivative: '/models/footballer-v1.glb', sha256: hash, bytes: binary.byteLength,
    vertices: positions.count, triangles: geometry.index.count / 3, bones: bones.length,
    rig: rig.map(([name, parent, pivot]) => ({ name, parent, pivot })),
    excluded: 'Source eyeball, eyebrow, eyelash, teeth and tongue meshes omitted for broadcast-size cost; no animation or face likeness claimed.',
    runtime: 'One shared geometry, per-player skeleton, source-photo shirt projection and deterministic event poses.',
};
await fs.writeFile('docs/footballer-adaptation.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, bytes: report.bytes, vertices: report.vertices, triangles: report.triangles, bones: report.bones, sha256: hash }));
