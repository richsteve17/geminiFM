import type { Player } from '../types';

/** A numeric simulation age remains necessary; missing real-world age must stay visibly estimated. */
export function formatRosterAge(player: Pick<Player, 'age'>): string {
    const derived = (player as Pick<Player, 'age'> & { gameDerived?: { ageFallback?: boolean } }).gameDerived;
    return derived?.ageFallback ? `${player.age} (est.)` : String(player.age);
}
