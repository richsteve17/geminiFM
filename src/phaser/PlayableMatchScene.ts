
import Phaser from 'phaser';
import type { Player, Team, Fixture, Formation } from '../types';
import { FORMATION_SLOTS } from '../utils';

export interface PlayMatchConfig {
    homeTeam: Team;
    awayTeam: Team;
    fixture: Fixture;
    userTeamName: string;
    controlledPlayerName: string;
    onMatchEnd: (result: PlayMatchResult) => void;
}

export interface GoalEvent {
    scorerName: string;
    teamName: string;
    isHome: boolean;
    minute: number;
}

export interface PlayMatchResult {
    homeScore: number;
    awayScore: number;
    goalEvents: GoalEvent[];
    playerConditions: Record<string, number>;
    injuries: string[];
}

// Mentality → press distance (how close ball must be before non-possessing AI presses)
function mentalityPressDistance(mentality: import('../types').Mentality): number {
    switch (mentality) {
        case 'All-Out Attack': return 350;
        case 'Attacking': return 280;
        case 'Balanced': return 200;
        case 'Defensive': return 140;
        case 'Park the Bus': return 90;
    }
}

// Mentality → forward run offset multiplier for supporting players
function mentalityForwardBias(mentality: import('../types').Mentality): number {
    switch (mentality) {
        case 'All-Out Attack': return 1.6;
        case 'Attacking': return 1.25;
        case 'Balanced': return 1.0;
        case 'Defensive': return 0.6;
        case 'Park the Bus': return 0.25;
    }
}

const PITCH_W = 800;
const PITCH_H = 520;
const GOAL_DEPTH = 20;
const GOAL_W = 100;

function ratingToSpeed(rating: number): number {
    return 120 + (rating - 60) * 2.2;
}

function ratingToShootPower(rating: number): number {
    return 280 + (rating - 60) * 3;
}

function ratingToPassSharpness(rating: number): number {
    return 0.7 + (rating - 60) * 0.004;
}

function getFormationPositions(formation: Formation, isHome: boolean): { x: number; y: number }[] {
    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    const positions: { x: number; y: number }[] = [];

    const roleBase: Record<string, { xPct: number; yPct: number }> = {
        GK:  { xPct: 0.06, yPct: 0.50 },
        LB:  { xPct: 0.20, yPct: 0.20 },
        CB:  { xPct: 0.20, yPct: 0.50 },
        RB:  { xPct: 0.20, yPct: 0.80 },
        LWB: { xPct: 0.28, yPct: 0.15 },
        RWB: { xPct: 0.28, yPct: 0.85 },
        DM:  { xPct: 0.35, yPct: 0.50 },
        CM:  { xPct: 0.45, yPct: 0.50 },
        AM:  { xPct: 0.57, yPct: 0.50 },
        LM:  { xPct: 0.45, yPct: 0.20 },
        RM:  { xPct: 0.45, yPct: 0.80 },
        LW:  { xPct: 0.60, yPct: 0.18 },
        RW:  { xPct: 0.60, yPct: 0.82 },
        ST:  { xPct: 0.75, yPct: 0.50 },
        CF:  { xPct: 0.70, yPct: 0.50 },
    };

    const roleCount: Record<string, number> = {};
    slots.forEach(r => { roleCount[r] = (roleCount[r] || 0) + 1; });
    const roleIdx: Record<string, number> = {};

    for (const role of slots) {
        const base = roleBase[role] || { xPct: 0.4, yPct: 0.5 };
        const total = roleCount[role];
        const idx = roleIdx[role] || 0;
        roleIdx[role] = idx + 1;

        let yPct = base.yPct;
        if (total === 2) yPct = idx === 0 ? 0.30 : 0.70;
        else if (total === 3) yPct = idx === 0 ? 0.20 : idx === 1 ? 0.50 : 0.80;
        else if (total === 4) yPct = idx === 0 ? 0.15 : idx === 1 ? 0.38 : idx === 2 ? 0.62 : 0.85;

        if (isHome) {
            positions.push({ x: base.xPct * PITCH_W, y: yPct * PITCH_H });
        } else {
            positions.push({ x: (1 - base.xPct) * PITCH_W, y: yPct * PITCH_H });
        }
    }
    return positions;
}

interface AIPlayer {
    sprite: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    player: Player;
    isHome: boolean;
    isUserControlled: boolean;
    baseX: number;
    baseY: number;
    stamina: number;
    staminaBar: Phaser.GameObjects.Rectangle;
    staminaBg: Phaser.GameObjects.Rectangle;
    state: 'idle' | 'chase' | 'support' | 'defend' | 'celebrate';
    hasBall: boolean;
    isBonded?: boolean;
    // Reaction delay accumulator: rifted players skip AI updates for N frames
    riftDelayFrames?: number;
    riftDelayCounter?: number;
}

export class PlayableMatchScene extends Phaser.Scene {
    private config!: PlayMatchConfig;
    private ball!: Phaser.Physics.Arcade.Image;
    private ballOwner: AIPlayer | null = null;
    private players: AIPlayer[] = [];
    private userPlayer!: AIPlayer;
    private joystick!: { base: Phaser.GameObjects.Arc; thumb: Phaser.GameObjects.Arc; active: boolean; pointerId: number; startX: number; startY: number; dx: number; dy: number };
    private passBtn!: Phaser.GameObjects.Arc;
    private shootBtn!: Phaser.GameObjects.Arc;
    private tackleBtn!: Phaser.GameObjects.Arc;
    private passLabel!: Phaser.GameObjects.Text;
    private shootLabel!: Phaser.GameObjects.Text;
    private tackleLabel!: Phaser.GameObjects.Text;
    private shootCharging = false;
    private shootPower = 0;
    private shootChargeBar!: Phaser.GameObjects.Rectangle;
    private shootChargeBg!: Phaser.GameObjects.Rectangle;
    private scoreboard!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private matchMinute = 0;
    private matchTimer = 0;
    private homeScore = 0;
    private awayScore = 0;
    private goalEvents: GoalEvent[] = [];
    private userMentality!: import('../types').Mentality;
    private oppMentality!: import('../types').Mentality;
    private injuries: string[] = [];
    private matchEnded = false;
    private lastGoalTime = 0;
    private isHome = false;
    private userRating = 75;
    private userSpeed = 0;
    private userShootPower = 0;
    private userPassSharpness = 0;
    private goalFlash!: Phaser.GameObjects.Rectangle;
    private goalText!: Phaser.GameObjects.Text;
    private matchCamera!: Phaser.Cameras.Scene2D.Camera;
    private userStaminaHudBg!: Phaser.GameObjects.Rectangle;
    private userStaminaHudBar!: Phaser.GameObjects.Rectangle;
    private userStaminaLabel!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'PlayableMatchScene' });
    }

    init(data: PlayMatchConfig) {
        this.config = data;
    }

    preload() {}

    create() {
        if (!this.config) {
            console.error('[PlayableMatchScene] No config provided — aborting create()');
            return;
        }
        const { homeTeam, awayTeam, fixture, userTeamName, controlledPlayerName } = this.config;
        this.isHome = fixture.homeTeam === userTeamName;
        const userTeam = this.isHome ? homeTeam : awayTeam;
        const oppTeam = this.isHome ? awayTeam : homeTeam;
        this.userMentality = userTeam.tactic.mentality;
        this.oppMentality = oppTeam.tactic.mentality;

        this.cameras.main.setBackgroundColor('#1a6b2a');
        this.matchCamera = this.cameras.main;

        this.drawPitch();

        const ballGfx = this.make.graphics({ x: 0, y: 0 });
        ballGfx.fillStyle(0xffffff);
        ballGfx.fillCircle(8, 8, 8);
        ballGfx.generateTexture('ball', 16, 16);
        ballGfx.destroy();

        this.ball = this.physics.add.image(PITCH_W / 2, PITCH_H / 2, 'ball');
        this.ball.setCircle(8);
        this.ball.setBounce(0.6);
        this.ball.setDamping(true);
        this.ball.setDrag(0.92);
        this.ball.setMaxVelocity(600, 600);
        this.ball.setDepth(10);
        this.ball.setCollideWorldBounds(true);

        const homePositions = getFormationPositions(homeTeam.tactic.formation, true);
        const awayPositions = getFormationPositions(awayTeam.tactic.formation, false);
        const homeStarters = homeTeam.players.filter(p => p.isStarter).slice(0, 11);
        const awayStarters = awayTeam.players.filter(p => p.isStarter).slice(0, 11);

        // bondedNames = set of user-squad players who share TeammateBond with another user-squad player
        const bondedNames = new Set<string>();
        const userSquadNames = new Set(userTeam.players.map(p => p.name));
        userTeam.players.forEach(p => {
            p.effects.forEach(e => {
                if (e.type === 'TeammateBond' && userSquadNames.has(e.with)) {
                    bondedNames.add(p.name);
                    bondedNames.add(e.with);
                }
            });
        });

        homeStarters.forEach((player, i) => {
            const pos = homePositions[i] || { x: 100 + i * 30, y: PITCH_H / 2 };
            const isUser = this.isHome && player.name === controlledPlayerName;
            // Home players are bonded if they're on user's team (isHome) AND in the bonded set
            const isBonded = this.isHome && bondedNames.has(player.name);
            const ai = this.createPlayer(player, pos.x, pos.y, true, isUser, isBonded);
            if (isUser) this.userPlayer = ai;
        });

        awayStarters.forEach((player, i) => {
            const pos = awayPositions[i] || { x: PITCH_W - 100 - i * 30, y: PITCH_H / 2 };
            const isUser = !this.isHome && player.name === controlledPlayerName;
            // Away players are bonded if they're on user's team (!isHome) AND in the bonded set
            const isBonded = !this.isHome && bondedNames.has(player.name);
            const ai = this.createPlayer(player, pos.x, pos.y, false, isUser, isBonded);
            if (isUser) this.userPlayer = ai;
        });

        if (!this.userPlayer) {
            const fallback = homeStarters[1] || homeStarters[0];
            this.players.forEach(p => {
                if (p.player.name === fallback?.name) this.userPlayer = p;
            });
        }

        const userP = userTeam.players.find(p => p.name === controlledPlayerName);
        this.userRating = userP?.rating || 75;
        this.userSpeed = ratingToSpeed(this.userRating);
        this.userShootPower = ratingToShootPower(this.userRating);
        this.userPassSharpness = ratingToPassSharpness(this.userRating);

        this.createControls();
        this.createHUD();
        this.setupPhysics();

        this.ball.setPosition(PITCH_W / 2, PITCH_H / 2);

        this.time.addEvent({
            delay: 1000,
            callback: this.tickMinute,
            callbackScope: this,
            loop: true
        });

        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
    }

    private drawPitch() {
        const g = this.add.graphics();
        g.fillStyle(0x1a6b2a);
        g.fillRect(0, 0, PITCH_W, PITCH_H);

        const stripes = this.add.graphics();
        stripes.fillStyle(0x1e7a30, 0.4);
        for (let i = 0; i < 8; i++) {
            stripes.fillRect(i * 100, 0, 50, PITCH_H);
        }

        const lines = this.add.graphics();
        lines.lineStyle(2, 0xffffff, 0.8);
        lines.strokeRect(20, 20, PITCH_W - 40, PITCH_H - 40);
        lines.moveTo(PITCH_W / 2, 20); lines.lineTo(PITCH_W / 2, PITCH_H - 20); lines.strokePath();

        lines.strokeCircle(PITCH_W / 2, PITCH_H / 2, 60);
        lines.strokeRect(20, PITCH_H / 2 - 80, 100, 160);
        lines.strokeRect(20, PITCH_H / 2 - 40, 50, 80);
        lines.strokeRect(PITCH_W - 120, PITCH_H / 2 - 80, 100, 160);
        lines.strokeRect(PITCH_W - 70, PITCH_H / 2 - 40, 50, 80);

        const goalG = this.add.graphics();
        goalG.fillStyle(0xffffff, 0.15);
        goalG.fillRect(0, PITCH_H / 2 - GOAL_W / 2, GOAL_DEPTH, GOAL_W);
        goalG.fillRect(PITCH_W - GOAL_DEPTH, PITCH_H / 2 - GOAL_W / 2, GOAL_DEPTH, GOAL_W);
        goalG.lineStyle(3, 0xffffff, 0.9);
        goalG.strokeRect(0, PITCH_H / 2 - GOAL_W / 2, GOAL_DEPTH, GOAL_W);
        goalG.strokeRect(PITCH_W - GOAL_DEPTH, PITCH_H / 2 - GOAL_W / 2, GOAL_DEPTH, GOAL_W);
    }

    private createPlayer(player: Player, x: number, y: number, isHome: boolean, isUser: boolean, isBonded: boolean): AIPlayer {
        const color = isHome ? 0x3b82f6 : 0xef4444;
        const highlightColor = isHome ? 0x60a5fa : 0xfca5a5;

        const sprite = this.add.rectangle(x, y, 18, 18, isUser ? 0xfacc15 : (isBonded ? highlightColor : color));
        sprite.setStrokeStyle(2, isUser ? 0xffffff : 0x000000);
        sprite.setDepth(5);

        this.physics.add.existing(sprite);
        const body = sprite.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setDamping(true);
        body.setDrag(isUser ? 0.88 : 0.92);
        body.setMaxVelocity(ratingToSpeed(player.rating) * 1.2);

        const label = this.add.text(x, y - 14, player.name.split(' ').pop() || player.name, {
            fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(6);

        const staminaBg = this.add.rectangle(x, y + 14, 20, 3, 0x111111).setDepth(6);
        const staminaBar = this.add.rectangle(x - 10, y + 14, 20, 3, 0x22c55e).setDepth(7).setOrigin(0, 0.5);

        // Detect rift effects — rifted players have a reaction delay penalty
        const hasRift = player.effects.some(e => e.type === 'InternationalRift' || e.type === 'BadChemistry');
        // riftDelayFrames: number of physics frames to skip AI decisions (simulates sluggish reaction)
        const riftDelayFrames = hasRift ? 8 : 0;

        const ai: AIPlayer = {
            sprite, label, player, isHome, isUserControlled: isUser,
            baseX: x, baseY: y, stamina: 100,
            staminaBar, staminaBg, state: 'idle', hasBall: false, isBonded,
            riftDelayFrames, riftDelayCounter: 0
        };

        this.players.push(ai);
        return ai;
    }

    private createControls() {
        const joyX = 80;
        const joyY = this.scale.height - 80;
        const joyBase = this.add.circle(joyX, joyY, 44, 0x000000, 0.3).setDepth(20).setScrollFactor(0);
        joyBase.setStrokeStyle(2, 0xffffff, 0.4);
        const joyThumb = this.add.circle(joyX, joyY, 20, 0xffffff, 0.6).setDepth(21).setScrollFactor(0);

        this.joystick = { base: joyBase, thumb: joyThumb, active: false, pointerId: -1, startX: joyX, startY: joyY, dx: 0, dy: 0 };

        const btnR = 36;
        const btnAreaX = this.scale.width - 60;
        const btnAreaY = this.scale.height - 80;

        this.passBtn = this.add.circle(btnAreaX - 80, btnAreaY, btnR, 0x3b82f6, 0.7).setDepth(20).setScrollFactor(0).setInteractive();
        this.shootBtn = this.add.circle(btnAreaX, btnAreaY - 40, btnR, 0xef4444, 0.7).setDepth(20).setScrollFactor(0).setInteractive();
        this.tackleBtn = this.add.circle(btnAreaX, btnAreaY + 20, btnR, 0xf59e0b, 0.7).setDepth(20).setScrollFactor(0).setInteractive();

        this.passLabel = this.add.text(this.passBtn.x, this.passBtn.y, 'PASS', { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
        this.shootLabel = this.add.text(this.shootBtn.x, this.shootBtn.y, 'SHOOT', { fontSize: '10px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
        this.tackleLabel = this.add.text(this.tackleBtn.x, this.tackleBtn.y, 'TACKLE', { fontSize: '9px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(21).setScrollFactor(0);

        this.shootChargeBg = this.add.rectangle(this.shootBtn.x, this.shootBtn.y - 55, 80, 8, 0x111111, 0.8).setDepth(20).setScrollFactor(0);
        this.shootChargeBar = this.add.rectangle(this.shootBtn.x - 40, this.shootBtn.y - 55, 0, 8, 0xef4444).setDepth(21).setScrollFactor(0).setOrigin(0, 0.5);
        this.shootChargeBg.setVisible(false);
        this.shootChargeBar.setVisible(false);

        this.passBtn.on('pointerdown', () => this.handlePass());
        this.tackleBtn.on('pointerdown', () => this.handleTackle());
        this.shootBtn.on('pointerdown', () => { this.shootCharging = true; this.shootPower = 0; this.shootChargeBg.setVisible(true); this.shootChargeBar.setVisible(true); });
        this.shootBtn.on('pointerup', () => this.releaseShoot());
        this.shootBtn.on('pointerout', () => this.releaseShoot());
    }

    private createHUD() {
        this.scoreboard = this.add.text(PITCH_W / 2, 14, '0 - 0', {
            fontSize: '18px', color: '#facc15', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

        this.timerText = this.add.text(PITCH_W / 2, 30, `0'`, {
            fontSize: '11px', color: '#aaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

        this.goalFlash = this.add.rectangle(PITCH_W / 2, PITCH_H / 2, PITCH_W, PITCH_H, 0x22c55e, 0).setDepth(30);
        this.goalText = this.add.text(PITCH_W / 2, PITCH_H / 2, 'GOAL!', {
            fontSize: '48px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(31).setAlpha(0);

        const homeLabel = this.config.homeTeam.name;
        const awayLabel = this.config.awayTeam.name;
        this.add.text(80, 14, homeLabel, { fontSize: '10px', color: '#60a5fa', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(20).setScrollFactor(0);
        this.add.text(PITCH_W - 80, 14, awayLabel, { fontSize: '10px', color: '#f87171', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

        const exitBtn = this.add.text(PITCH_W - 10, 8, '✕ EXIT', {
            fontSize: '10px', color: '#ffffff', backgroundColor: '#1f2937', padding: { x: 6, y: 3 }
        }).setOrigin(1, 0).setDepth(25).setScrollFactor(0).setInteractive({ useHandCursor: true });
        exitBtn.on('pointerdown', () => this.endMatch());

        // User stamina HUD — vertical bar on left side, always visible during play
        const hudX = 14;
        const hudH = 80;
        this.userStaminaHudBg = this.add.rectangle(hudX, PITCH_H / 2, 10, hudH, 0x111111, 0.7)
            .setDepth(20).setScrollFactor(0);
        // Bar grows upward from bottom: use top-left origin trick with yOffset
        this.userStaminaHudBar = this.add.rectangle(hudX, PITCH_H / 2 + hudH / 2, 10, hudH, 0x22c55e)
            .setDepth(21).setScrollFactor(0).setOrigin(0.5, 1);
        this.userStaminaLabel = this.add.text(hudX, PITCH_H / 2 - hudH / 2 - 8, 'STA', {
            fontSize: '7px', color: '#aaaaaa', stroke: '#000', strokeThickness: 1
        }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
    }

    private updateUserStaminaHud() {
        if (!this.userPlayer || !this.userStaminaHudBar) return;
        const pct = Math.max(0, Math.min(100, this.userPlayer.stamina)) / 100;
        const hudH = 80;
        this.userStaminaHudBar.setDisplaySize(10, hudH * pct);
        // Color shift: green → yellow → red as stamina depletes
        const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xfacc15 : 0xef4444;
        this.userStaminaHudBar.setFillStyle(color);
    }

    private setupPhysics() {
        const worldBounds = this.physics.world.bounds;
        worldBounds.setTo(GOAL_DEPTH, 0, PITCH_W - GOAL_DEPTH * 2, PITCH_H);

        this.players.forEach(ai => {
            const body = ai.sprite.body as Phaser.Physics.Arcade.Body;
            body.setCollideWorldBounds(true);

            this.physics.add.overlap(this.ball, ai.sprite, () => {
                if (!ai.hasBall && this.ballOwner !== ai) {
                    this.claimBall(ai);
                }
            });
        });
    }

    private claimBall(ai: AIPlayer) {
        if (this.ballOwner) this.ballOwner.hasBall = false;
        this.ballOwner = ai;
        ai.hasBall = true;
        this.ball.setVelocity(0, 0);
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        const joyX = 80;
        const joyY = this.scale.height - 80;
        const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, joyX, joyY);
        if (d < 80 && !this.joystick.active) {
            this.joystick.active = true;
            this.joystick.pointerId = pointer.id;
            this.joystick.startX = pointer.x;
            this.joystick.startY = pointer.y;
        }
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.joystick.active && pointer.id === this.joystick.pointerId) {
            const dx = pointer.x - this.joystick.startX;
            const dy = pointer.y - this.joystick.startY;
            const mag = Math.sqrt(dx * dx + dy * dy);
            const maxR = 40;
            const clampedMag = Math.min(mag, maxR);
            const angle = Math.atan2(dy, dx);
            this.joystick.dx = (clampedMag / maxR) * Math.cos(angle);
            this.joystick.dy = (clampedMag / maxR) * Math.sin(angle);
            this.joystick.thumb.setPosition(this.joystick.startX + Math.cos(angle) * clampedMag, this.joystick.startY + Math.sin(angle) * clampedMag);
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (pointer.id === this.joystick.pointerId) {
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            this.joystick.thumb.setPosition(this.joystick.base.x, this.joystick.base.y);
        }
    }

    private handlePass() {
        if (!this.userPlayer?.hasBall) return;
        const teammates = this.players.filter(p => p.isHome === this.userPlayer.isHome && !p.isUserControlled);
        if (teammates.length === 0) return;

        let best: AIPlayer | null = null;
        let bestScore = -Infinity;
        const userX = this.userPlayer.sprite.x;
        const userY = this.userPlayer.sprite.y;
        const fwdDir = this.isHome ? 1 : -1;

        teammates.forEach(tm => {
            const dx = tm.sprite.x - userX;
            const dy = tm.sprite.y - userY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const fwdBonus = dx * fwdDir * 0.5;
            const bondBonus = tm.isBonded ? 80 : 0;
            const score = fwdBonus + bondBonus - dist * 0.3;
            if (score > bestScore) { bestScore = score; best = tm; }
        });

        if (best) {
            const targetAI = best as AIPlayer;
            const dx = targetAI.sprite.x - userX;
            const dy = targetAI.sprite.y - userY;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const accuracy = this.userPassSharpness + (Math.random() - 0.5) * 0.3;
            const speed = 350 * accuracy;
            this.ball.setPosition(userX, userY);
            this.ball.setVelocity((dx / dist) * speed, (dy / dist) * speed);
            this.userPlayer.hasBall = false;
            this.ballOwner = null;
        }
    }

    private releaseShoot() {
        if (!this.shootCharging) return;
        this.shootCharging = false;
        this.shootChargeBg.setVisible(false);
        this.shootChargeBar.setVisible(false);

        if (!this.userPlayer?.hasBall) { this.shootPower = 0; return; }

        const power = Math.min(this.shootPower, 1);
        const goalX = this.isHome ? PITCH_W - GOAL_DEPTH : GOAL_DEPTH;
        const goalY = PITCH_H / 2 + (Math.random() - 0.5) * GOAL_W * 0.8;
        const userX = this.userPlayer.sprite.x;
        const userY = this.userPlayer.sprite.y;
        const dx = goalX - userX;
        const dy = goalY - userY;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const spd = this.userShootPower * power;

        this.ball.setPosition(userX, userY);
        this.ball.setVelocity((dx / dist) * spd, (dy / dist) * spd);
        this.userPlayer.hasBall = false;
        this.ballOwner = null;
        this.shootPower = 0;
    }

    private handleTackle() {
        if (this.userPlayer?.hasBall) {
            const userBody = this.userPlayer.sprite.body as Phaser.Physics.Arcade.Body;
            const boostX = this.joystick.dx * this.userSpeed * 1.5;
            const boostY = this.joystick.dy * this.userSpeed * 1.5;
            userBody.setVelocity(boostX, boostY);
            this.userPlayer.stamina = Math.max(0, this.userPlayer.stamina - 3);
            return;
        }

        const nearby = this.players.filter(p => {
            if (p.isHome === this.userPlayer.isHome) return false;
            const d = Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, this.userPlayer.sprite.x, this.userPlayer.sprite.y);
            return d < 50;
        });

        if (nearby.length > 0 && nearby[0].hasBall) {
            const target = nearby[0];
            const tackleSuccess = 0.55 + this.userRating * 0.003;
            const succeeded = Math.random() < tackleSuccess;
            if (succeeded) {
                this.claimBall(this.userPlayer);
                // Ball carrier can pick up injury from a successful hard tackle (lower chance)
                const carrierInjuryChance = 0.03;
                if (Math.random() < carrierInjuryChance && !this.injuries.includes(target.player.name)) {
                    this.injuries.push(target.player.name);
                }
            } else {
                // Failed tackle: tackler more likely to be injured; ball carrier less so
                const tacklerInjuryChance = 0.05;
                const carrierInjuryChance = 0.02;
                if (Math.random() < tacklerInjuryChance && !this.injuries.includes(this.userPlayer.player.name)) {
                    this.injuries.push(this.userPlayer.player.name);
                }
                if (Math.random() < carrierInjuryChance && !this.injuries.includes(target.player.name)) {
                    this.injuries.push(target.player.name);
                }
            }
        }
    }

    private tickMinute() {
        if (this.matchEnded) return;
        this.matchMinute++;
        this.timerText.setText(`${this.matchMinute}'`);
        if (this.matchMinute >= 90) {
            this.endMatch();
        }
    }

    private endMatch() {
        if (this.matchEnded) return;
        this.matchEnded = true;

        const conditions: Record<string, number> = {};
        this.players.forEach(ai => {
            conditions[ai.player.name] = Math.round(ai.stamina);
        });

        this.config.onMatchEnd({
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            goalEvents: this.goalEvents,
            playerConditions: conditions,
            injuries: this.injuries
        });
    }

    private scoreGoal(scoringTeamIsHome: boolean, scorer: AIPlayer) {
        if (scoringTeamIsHome) this.homeScore++; else this.awayScore++;
        const teamName = scoringTeamIsHome ? this.config.fixture.homeTeam : this.config.fixture.awayTeam;
        this.goalEvents.push({
            scorerName: scorer.player.name,
            teamName,
            isHome: scoringTeamIsHome,
            minute: this.matchMinute
        });
        this.scoreboard.setText(`${this.homeScore} - ${this.awayScore}`);

        this.tweens.add({ targets: this.goalFlash, alpha: 0.4, duration: 200, yoyo: true });
        this.tweens.add({ targets: this.goalText, alpha: 1, y: PITCH_H / 2 - 30, duration: 300, ease: 'Back.Out', onComplete: () => {
            this.time.delayedCall(1500, () => {
                this.tweens.add({ targets: this.goalText, alpha: 0, duration: 400 });
                this.goalText.setY(PITCH_H / 2);
            });
        }});

        this.resetAfterGoal();
    }

    private resetAfterGoal() {
        this.time.delayedCall(2000, () => {
            this.ball.setPosition(PITCH_W / 2, PITCH_H / 2);
            this.ball.setVelocity(0, 0);
            if (this.ballOwner) this.ballOwner.hasBall = false;
            this.ballOwner = null;

            this.players.forEach(ai => {
                ai.sprite.setPosition(ai.baseX, ai.baseY);
                const body = ai.sprite.body as Phaser.Physics.Arcade.Body;
                body.setVelocity(0, 0);
                ai.state = 'idle';
            });
        });
    }

    private updateAI(ai: AIPlayer, delta: number) {
        if (ai.isUserControlled || this.matchEnded) return;

        // Rifted players have reduced reaction: skip AI decisions for N frames
        if (ai.riftDelayFrames && ai.riftDelayFrames > 0) {
            ai.riftDelayCounter = (ai.riftDelayCounter || 0) + 1;
            if (ai.riftDelayCounter < ai.riftDelayFrames) {
                // Apply deceleration but skip new targeting decisions
                const body = ai.sprite.body as Phaser.Physics.Arcade.Body;
                body.setVelocity(body.velocity.x * 0.85, body.velocity.y * 0.85);
                return;
            }
            ai.riftDelayCounter = 0;
        }

        const body = ai.sprite.body as Phaser.Physics.Arcade.Body;
        const ballX = this.ball.x;
        const ballY = this.ball.y;
        const aiX = ai.sprite.x;
        const aiY = ai.sprite.y;
        const dToBall = Phaser.Math.Distance.Between(aiX, aiY, ballX, ballY);
        const spd = ratingToSpeed(ai.player.rating) * (ai.stamina / 100);

        const allyHasBall = this.ballOwner?.isHome === ai.isHome;

        let targetX = ai.baseX;
        let targetY = ai.baseY;

        // Determine which mentality applies to this AI's team
        const aiMentality = (ai.isHome === this.isHome) ? this.userMentality : this.oppMentality;
        const pressDistance = mentalityPressDistance(aiMentality);
        const fwdBias = mentalityForwardBias(aiMentality);

        if (this.ballOwner === ai) {
            this.ball.setPosition(aiX + (ai.isHome ? 12 : -12), aiY);
            this.ball.setVelocity(0, 0);
            const goalX = ai.isHome ? PITCH_W - GOAL_DEPTH : GOAL_DEPTH;
            const distToGoal = Phaser.Math.Distance.Between(aiX, aiY, goalX, PITCH_H / 2);
            // Shooting threshold scales with mentality: attacking mentalities shoot earlier
            const shootThreshold = 120 + (fwdBias * 60);
            if (distToGoal < shootThreshold && Math.random() < 0.012) {
                const dx = goalX - aiX;
                const dy = PITCH_H / 2 - aiY + (Math.random() - 0.5) * GOAL_W * 0.6;
                const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const shotPower = ratingToShootPower(ai.player.rating);
                this.ball.setVelocity((dx / d) * shotPower * 0.85, (dy / d) * shotPower * 0.85);
                ai.hasBall = false;
                this.ballOwner = null;
            } else {
                const dribbleStep = 80 * fwdBias;
                targetX = ai.isHome ? Math.min(PITCH_W - 100, aiX + dribbleStep) : Math.max(100, aiX - dribbleStep);
                targetY = aiY + (PITCH_H / 2 - aiY) * 0.08;
            }
        } else if (allyHasBall) {
            // Bonded teammates make deeper forward runs; mentality scales the offset
            const baseFwd = ai.isBonded ? 110 : 60;
            const fwdOffset = (ai.isHome ? 1 : -1) * baseFwd * fwdBias;
            targetX = Math.min(PITCH_W - 40, Math.max(40, ai.baseX + fwdOffset));
            targetY = ai.baseY;
            ai.state = 'support';
        } else {
            // Not ally's possession — press (mentality-driven) or retreat to shape
            if (dToBall < pressDistance) {
                targetX = ballX; targetY = ballY;
                ai.state = 'chase';
            } else {
                // Defensive mentalities retreat deeper than formation base
                const retreatBias = 1 - (fwdBias - 1) * 0.5;
                const defX = ai.isHome
                    ? Math.max(40, ai.baseX * retreatBias)
                    : Math.min(PITCH_W - 40, PITCH_W - (PITCH_W - ai.baseX) * retreatBias);
                targetX = defX;
                targetY = ai.baseY;
                ai.state = 'defend';
            }
        }

        const dx = targetX - aiX;
        const dy = targetY - aiY;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        if (dist > 5) {
            body.setVelocity((dx / dist) * spd * 0.7, (dy / dist) * spd * 0.7);
        } else {
            body.setVelocity(0, 0);
        }

        ai.stamina = Math.max(0, ai.stamina - delta * 0.00015);
    }

    update(time: number, delta: number) {
        if (!this.config || this.matchEnded) return;

        if (this.shootCharging) {
            this.shootPower = Math.min(1, this.shootPower + delta * 0.001);
            this.shootChargeBar.width = this.shootPower * 80;
        }

        if (this.userPlayer && !this.matchEnded) {
            const body = this.userPlayer.sprite.body as Phaser.Physics.Arcade.Body;
            const sprinting = this.joystick.active && Math.abs(this.joystick.dx) + Math.abs(this.joystick.dy) > 0.7;
            const effSpeed = this.userSpeed * (sprinting ? 1.35 : 1) * (this.userPlayer.stamina / 100);

            if (this.joystick.active && (this.joystick.dx !== 0 || this.joystick.dy !== 0)) {
                body.setVelocity(this.joystick.dx * effSpeed, this.joystick.dy * effSpeed);
                if (sprinting) {
                    this.userPlayer.stamina = Math.max(0, this.userPlayer.stamina - delta * 0.006);
                } else {
                    this.userPlayer.stamina = Math.min(100, this.userPlayer.stamina + delta * 0.001);
                }
            } else {
                body.setVelocity(body.velocity.x * 0.85, body.velocity.y * 0.85);
                this.userPlayer.stamina = Math.min(100, this.userPlayer.stamina + delta * 0.002);
            }

            if (this.userPlayer.hasBall) {
                this.ball.setPosition(this.userPlayer.sprite.x + (this.isHome ? 12 : -12), this.userPlayer.sprite.y);
                this.ball.setVelocity(0, 0);
            }
        }

        this.players.forEach(ai => {
            if (!ai.isUserControlled) this.updateAI(ai, delta);
            ai.label.setPosition(ai.sprite.x, ai.sprite.y - 14);
            ai.staminaBg.setPosition(ai.sprite.x, ai.sprite.y + 14);
            ai.staminaBar.setPosition(ai.sprite.x - 10, ai.sprite.y + 14);
            ai.staminaBar.width = (ai.stamina / 100) * 20;
            const staminaColor = ai.stamina > 60 ? 0x22c55e : ai.stamina > 30 ? 0xf59e0b : 0xef4444;
            ai.staminaBar.setFillStyle(staminaColor);
        });

        this.updateUserStaminaHud();

        const bx = this.ball.x;
        const by = this.ball.y;
        const now = this.time.now;

        if (now - this.lastGoalTime > 3000) {
            if (bx <= GOAL_DEPTH && by > PITCH_H / 2 - GOAL_W / 2 && by < PITCH_H / 2 + GOAL_W / 2) {
                this.lastGoalTime = now;
                const lastOwner = this.ballOwner;
                if (this.ballOwner) this.ballOwner.hasBall = false;
                this.ballOwner = null;
                const scorer = lastOwner || this.players.find(p => !p.isHome) || this.players[0];
                this.scoreGoal(false, scorer);
            } else if (bx >= PITCH_W - GOAL_DEPTH && by > PITCH_H / 2 - GOAL_W / 2 && by < PITCH_H / 2 + GOAL_W / 2) {
                this.lastGoalTime = now;
                const lastOwner = this.ballOwner;
                if (this.ballOwner) this.ballOwner.hasBall = false;
                this.ballOwner = null;
                const scorer = lastOwner || this.players.find(p => p.isHome) || this.players[0];
                this.scoreGoal(true, scorer);
            }
        }

        if (this.ball.x <= 0 || this.ball.x >= PITCH_W) {
            this.ball.setVelocityX(-this.ball.body!.velocity.x * 0.7);
        }
        if (this.ball.y <= 0 || this.ball.y >= PITCH_H) {
            this.ball.setVelocityY(-this.ball.body!.velocity.y * 0.7);
        }
    }

    shutdown() {
        this.input.off('pointermove', this.handlePointerMove, this);
        this.input.off('pointerup', this.handlePointerUp, this);
        this.input.off('pointerdown', this.handlePointerDown, this);
    }
}
