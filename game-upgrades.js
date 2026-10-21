export const UPGRADES = Object.freeze([
  { id: 'rapid', name: '高速給弾', text: '射撃間隔を15%短縮する', apply: state => { state.stats.fireRate = Math.max(0.03, state.stats.fireRate * 0.85); } },
  { id: 'power', name: '高密度弾頭', text: '自分の攻撃力を+35%', apply: state => { state.stats.damage *= 1.35; } },
  { id: 'endlessPower', name: '無限増幅', text: '自分の攻撃力を+5%（取得上限なし）', modes: ['endless'], maxLevel: Infinity, apply: state => { state.stats.damage *= 1.05; } },
  { id: 'twin', name: '複製銃身', text: '同時発射数を+1（最大5発）', apply: state => { state.stats.bullets = Math.min(5, state.stats.bullets + 1); state.stats.spread = Math.max(0.08, state.stats.spread - 0.01); } },
  { id: 'pierce', name: '位相貫通', text: '弾が敵を1体追加で貫通する', weapons: ['rifle', 'machinegun'], apply: state => { state.stats.pierce++; } },
  { id: 'speed', name: '時間加速', text: '移動速度を18%上昇する', apply: state => { state.stats.speed *= 1.18; } },
  { id: 'predictiveAim', name: '予測照準', text: '照準から6°→10°→14°以内の敵へ、発射角度のずれを少し補正', weapons: ['rifle', 'machinegun'], apply: state => { const level = (state.upgradeLevels.predictiveAim ?? 0) + 1; state.stats.aimAssistAngle = [0, 6, 10, 14][level] * Math.PI / 180; } },
  { id: 'precision', name: '精密射撃', text: '通常銃の5→4→3射ごとに、全銃身から威力2倍の弾を発射', weapons: ['rifle'], apply: state => { const level = (state.upgradeLevels.precision ?? 0) + 1; state.stats.precisionEvery = [0, 5, 4, 3][level]; state.rifleVolley = 0; } },
  { id: 'bulletSplit', name: '弾幕分裂', text: 'マシンガン命中時、10→15→20%で同威力の非連鎖弾を生成', weapons: ['machinegun'], apply: state => { const level = (state.upgradeLevels.bulletSplit ?? 0) + 1; state.stats.splitChance = [0, 0.10, 0.15, 0.20][level]; } },
  { id: 'chainLaser', name: '連鎖レーザー', text: '敵への命中時、最寄りの別の敵へ元威力の5→10→15%で1回連鎖', weapons: ['laser'], apply: state => { const level = (state.upgradeLevels.chainLaser ?? 0) + 1; state.stats.chainRatio = [0, 0.05, 0.10, 0.15][level]; } },
  { id: 'repair', name: 'コア修復', text: '最大耐久を15増やし、30回復。シールドも全回復する', apply: state => { const target = state.mode === 'battle' ? state.player : state.core; target.maxHp += 15; target.hp = Math.min(target.maxHp, target.hp + 30); target.shield = target.maxShield; } },
  { id: 'armor', name: '因果装甲', text: 'コアのダメージ軽減率を+8%（最大55%）', apply: state => { state.stats.coreArmor = Math.min(0.55, state.stats.coreArmor + 0.08); } },
  { id: 'shield', name: '時間障壁', text: '選択時のみシールド最大値と残量を+20', apply: state => { const target = state.mode === 'battle' ? state.player : state.core; target.maxShield += 20; target.shield += 20; } },
  { id: 'siphon', name: '再生回路', text: '撃破ごとにコア耐久を0.5回復する', apply: state => { state.stats.killHeal += 0.5; } },
  { id: 'fuelTank', name: '拡張燃料槽', text: '燃料の最大容量を+25', apply: state => { state.stats.maxFuel += 25; state.player.fuel = Math.min(state.stats.maxFuel, state.player.fuel + 25); } },
  { id: 'fuelRegen', name: '燃料再生機', text: '燃料の毎秒回復量を+6', apply: state => { state.stats.fuelRegen += 6; } },
  { id: 'autoTurret', name: '自動砲台', text: '発射間隔を5秒短縮（20→15→10→5秒）', apply: state => { state.stats.turretInterval = Math.max(5, state.stats.turretInterval - 5); state.turretCooldown = Math.min(state.turretCooldown, state.stats.turretInterval); } }
]);
