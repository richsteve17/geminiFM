import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    CLUB_IDENTITIES,
    CLUB_IDENTITY_ASSET_PROVENANCE,
    CLUB_IDENTITY_COVERAGE,
    getClubIdentity,
} from '../data/clubIdentity';

const projectRoot = resolve(import.meta.dirname, '../..');

describe('club identity data', () => {
    it('provides exact-name local identities, including the supplementary English crest aliases', () => {
        const manchesterCity = getClubIdentity('Manchester City');
        expect(manchesterCity).toEqual({
            name: 'Manchester City',
            imageUrl: '/assets/crests/manchester-city.svg',
            sourceUrl: expect.stringContaining('/FCLOGO/fclogo.top/'),
            sourceName: 'FCLOGO',
            kind: 'club',
        });

        expect(getClubIdentity('England')).toEqual({
            name: 'England',
            imageUrl: '/assets/crests/national-england.svg',
            sourceUrl: expect.stringContaining('/lipis/flag-icons/'),
            sourceName: 'Flag Icons (national flag)',
            kind: 'national',
        });

        expect(getClubIdentity('Norwich City')).toEqual({
            name: 'Norwich City',
            imageUrl: '/assets/crests/norwich-city.png',
            sourceUrl: 'https://assets.football-logos.cc/logos/england/256x256/norwich-city.5cf24a54.png',
            sourceName: 'football-logos.cc (England catalogue)',
            kind: 'club',
        });
        expect(getClubIdentity('West Brom')).toMatchObject({
            name: 'West Brom',
            imageUrl: '/assets/crests/west-brom.png',
            sourceName: 'football-logos.cc (England catalogue)',
            kind: 'club',
        });
        expect(getClubIdentity('manchester city')).toBeNull();
        expect(getClubIdentity('West Bromwich Albion')).toBeNull();
    });

    it('matches the verified club and international coverage contract', () => {
        const clubRecords = CLUB_IDENTITIES.filter((record) => record.kind === 'club');
        const nationalRecords = CLUB_IDENTITIES.filter((record) => record.kind === 'national');

        expect(CLUB_IDENTITY_COVERAGE).toEqual({
            playableClubCount: 82,
            clubCrestCount: 82,
            missingClubNames: [],
            internationalTeamCount: 64,
            nationalFlagCount: 64,
        });
        expect(clubRecords).toHaveLength(82);
        expect(nationalRecords).toHaveLength(64);
        expect(new Set(CLUB_IDENTITIES.map((record) => record.name)).size).toBe(CLUB_IDENTITIES.length);
        expect(new Set(CLUB_IDENTITIES.map((record) => record.imageUrl)).size).toBe(CLUB_IDENTITIES.length);
    });

    it('ships integrity-checked local SVG and PNG assets whose hashes match generated provenance', () => {
        expect(CLUB_IDENTITY_ASSET_PROVENANCE).toHaveLength(146);

        for (const record of CLUB_IDENTITY_ASSET_PROVENANCE) {
            const localPath = resolve(projectRoot, 'public', record.imageUrl.replace(/^\//, ''));
            expect(existsSync(localPath), `${record.name} asset should exist`).toBe(true);

            const content = readFileSync(localPath);
            expect(createHash('sha256').update(content).digest('hex')).toBe(record.sha256);

            if (record.imageUrl.endsWith('.svg')) {
                expect(content.subarray(0, 4096).toString('utf8').toLowerCase()).toContain('<svg');
                expect(record.sourceUrl).toContain(`/${record.sourceCommit}/`);
            } else {
                expect(record.imageUrl).toMatch(/^\/assets\/crests\/(norwich-city|watford|sheffield-united|middlesbrough|west-brom|stoke-city|coventry-city)\.png$/);
                expect(content.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
                expect(record.sourceName).toBe('football-logos.cc (England catalogue)');
                expect(record.sourceUrl).toMatch(/^https:\/\/assets\.football-logos\.cc\/logos\/england\/256x256\/.+\.png$/);
                expect(record.sourceCommit).toBe('d94162a038024fd2fb378333432076c60646f1e0');
            }
        }
    });
});
