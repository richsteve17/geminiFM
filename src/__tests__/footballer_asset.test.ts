import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const file = fs.readFileSync('public/models/footballer-v1.glb');
const report = JSON.parse(fs.readFileSync('docs/footballer-adaptation.json', 'utf8'));

describe('sourced pitch footballer integration', () => {
    it('pins the runtime derivative to the actual anatomical source rather than a fake likeness', () => {
        expect(crypto.createHash('sha256').update(file).digest('hex')).toBe(report.sha256);
        expect(report.sourceSha256).toBe('63747ff30fd1f02fe2bbff5f9e48e6d2a829e999d5c903ec819bd3b06ba65a5a');
        expect(report.sourceLicense).toBe('CC0-1.0');
        expect(report.bytes).toBeLessThan(650_000);
        expect(report.vertices).toBeLessThan(8_000);
    });
    it('loads the real 16-bone skin and shader-compatible garment attributes with normalized weights', async () => {
        const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
        const gltf = await new GLTFLoader().parseAsync(buffer, '');
        let mesh: THREE.SkinnedMesh | undefined;
        gltf.scene.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) mesh = object as THREE.SkinnedMesh; });
        expect(mesh).toBeDefined();
        const skin = mesh!;
        expect(skin.skeleton.bones).toHaveLength(16);
        expect(skin.skeleton.bones.map(bone => bone.name)).toContain('LeftForearm');
        expect(skin.skeleton.bones.map(bone => bone.name)).toContain('RightShin');
        expect(skin.geometry.attributes._clothregion).toBeDefined();
        expect(skin.geometry.attributes._restposition).toBeDefined();
        const weights = skin.geometry.attributes.skinWeight;
        for (let index = 0; index < weights.count; index++) {
            const sum = weights.getX(index) + weights.getY(index) + weights.getZ(index) + weights.getW(index);
            expect(sum).toBeCloseTo(1, 5);
        }
        skin.geometry.computeBoundingBox();
        const bounds = skin.geometry.boundingBox!;
        expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1.7);
        expect(bounds.max.y - bounds.min.y).toBeLessThan(1.85);
        const shader = fs.readFileSync('src/components/Footballer.tsx', 'utf8');
        expect(shader).toContain('attribute float _clothregion;');
        expect(shader).toContain('attribute vec3 _restposition;');
        expect(shader).toContain('rig.model.position.y = pose.bodyBob');
    });
});
