
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { Team, Fixture, MatchState } from '../types';
import { PlayableMatchScene, type PlayMatchConfig, type PlayMatchResult } from '../phaser/PlayableMatchScene';

interface PlayableMatchProps {
    homeTeam: Team;
    awayTeam: Team;
    fixture: Fixture;
    userTeamName: string;
    controlledPlayerName: string;
    onMatchEnd: (result: PlayMatchResult, matchState: MatchState) => void;
}

export default function PlayableMatch({ homeTeam, awayTeam, fixture, userTeamName, controlledPlayerName, onMatchEnd }: PlayableMatchProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const handleMatchEnd = (result: PlayMatchResult) => {
            const isHome = fixture.homeTeam === userTeamName;
            const userGoals = isHome ? result.homeScore : result.awayScore;
            const oppGoals = isHome ? result.awayScore : result.homeScore;

            const events: import('../types').MatchEvent[] = [];

            let runningHome = 0;
            let runningAway = 0;
            result.goalEvents.forEach((ge, i) => {
                if (ge.isHome) runningHome++; else runningAway++;
                events.push({
                    id: i + 1,
                    minute: ge.minute,
                    type: 'goal',
                    teamName: ge.teamName,
                    player: ge.scorerName,
                    description: `GOAL! ${ge.scorerName} scores for ${ge.teamName}!`,
                    scoreAfter: `${runningHome}-${runningAway}`
                });
            });

            result.injuries.forEach((playerName, i) => {
                events.push({
                    id: 100 + i,
                    minute: 80 + i,
                    type: 'injury',
                    player: playerName,
                    description: `${playerName} picks up an injury after a heavy challenge — will need assessment.`,
                });
            });

            const matchState: MatchState = {
                currentMinute: 90,
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                events,
                isFinished: true,
                subsUsed: { home: 0, away: 0 },
                momentum: userGoals > oppGoals ? 5 : userGoals < oppGoals ? -5 : 0,
                tacticalAnalysis: `Play mode match result: ${result.homeScore}-${result.awayScore}. ${result.goalEvents.length} goal(s) scored.`
            };

            onMatchEnd(result, matchState);
        };

        const matchConfig: PlayMatchConfig = {
            homeTeam, awayTeam, fixture, userTeamName, controlledPlayerName,
            onMatchEnd: handleMatchEnd
        };

        // BootScene: starts the real scene with data; avoids the Phaser scene
        // auto-start with missing config that occurs when listing the class directly.
        class BootScene extends Phaser.Scene {
            constructor() { super({ key: 'BootScene', active: true }); }
            create() {
                this.scene.add('PlayableMatchScene', PlayableMatchScene, false);
                this.scene.start('PlayableMatchScene', matchConfig);
            }
        }

        const phaserConfig: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 800,
            height: 520,
            parent: containerRef.current,
            backgroundColor: '#1a6b2a',
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 800,
                height: 520,
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false,
                }
            },
            input: { activePointers: 4 },
            scene: [BootScene],
        };

        const game = new Phaser.Game(phaserConfig);
        gameRef.current = game;

        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ touchAction: 'none' }}
            />
        </div>
    );
}
