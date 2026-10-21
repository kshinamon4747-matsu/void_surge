export const GAME_CONFIG = Object.freeze({
  UPGRADE_TIME: 30,
  BOSS_INTERVAL: 60,
  FINAL_BOSS_TIME: 300,
  ENDLESS_NORMAL_TIME: 60,
  BOSS_BULLET_LIFETIME: 8,
  MAX_UPGRADE_LEVEL: 3,
  TURRET_RANGE: 96,
  ENEMY_DURABILITY: 1.5,
  BOSS_DURABILITY: 2,
  AIMED_BURST_INTERVAL: 2.5,
  LASER_SPECIAL_CHARGE_TIME: 2,
  LASER_SPECIAL_MIN: 0.4,
  LASER_SPECIAL_FUEL: 20,
  LASER_SPECIAL_COOLDOWN: 3,
  BATTLE_RIVALS: 5,
  BATTLE_HP: 100,
  BATTLE_AI_DAMAGE: 0.75,
  BATTLE_AI_AIM_ERROR: 8 * Math.PI / 180,
  BATTLE_SUPPLY_HP: 25,
  BATTLE_ZONE_START: 90,
  BATTLE_ZONE_DURATION: 90,
  BATTLE_ZONE_INITIAL_RADIUS: 620,
  BATTLE_ZONE_FINAL_RADIUS: 150,
  STEP: 1 / 60
});

export const STORAGE_KEYS = Object.freeze({
  NORMAL_TOTAL_KILLS: 'soloWardNormalTotalKills',
  ENDLESS_TIME: 'soloWardEndlessTime',
  ENDLESS_KILLS: 'soloWardEndlessKills',
  ENDLESS_BOSSES: 'soloWardEndlessBosses'
});

export const WEAPONS = Object.freeze({
  rifle: Object.freeze({ weapon: 'rifle', fireRate: 0.22, damage: 2, bullets: 1, spread: 0.15, bulletSpeed: 620 }),
  machinegun: Object.freeze({ weapon: 'machinegun', fireRate: 0.07, damage: 0.63, bullets: 1, spread: 0.09, bulletSpeed: 760 }),
  laser: Object.freeze({ weapon: 'laser', fireRate: 0.055, damage: 0.68, bullets: 1, spread: 0.04, bulletSpeed: 0 })
});
