(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const overlay = $('#overlay');
  const upgradeOverlay = $('#upgradeOverlay');
  const titleEl = $('#overlayTitle');
  const textEl = $('#overlayText');
  const startButton = $('#startButton');
  const restartButton = $('#restartButton');
  const choicesEl = $('#upgradeChoices');
  const skipUpgradeButton = $('#skipUpgradeButton');
  const resultEl = $('#loopResult');
  const upgradeEyebrow = $('#upgradeEyebrow');
  const upgradeTitle = $('#upgradeTitle');
  const bestEl = $('#bestScore');
  const soundButton = $('#soundButton');
  const fireButton = $('#fireButton');
  const specialButton = $('#specialButton');
  const joystick = $('#joystick');
  const stick = $('#stick');
  const modeSelect = $('#modeSelect');
  const modeButtons = [...document.querySelectorAll('.mode-card')];
  const weaponSelect = $('#weaponSelect');
  const weaponButtons = [...document.querySelectorAll('.weapon-card')];
  const autoFireToggle = $('#autoFireToggle');
  const autoFireState = $('#autoFireState');
  const speedToggle = $('#speedToggle');
  const speedState = $('#speedState');

  const W = canvas.width, H = canvas.height, CX = W / 2, CY = H / 2;
  const UPGRADE_TIME = 30, BOSS_INTERVAL = 60, FINAL_BOSS_TIME = 300, ENDLESS_NORMAL_TIME = 60, MAX_UPGRADE_LEVEL = 3, TURRET_RANGE = 96, ENEMY_DURABILITY = 1.5, BOSS_DURABILITY = 2, AIMED_BURST_INTERVAL = 2.5, LASER_SPECIAL_CHARGE_TIME = 2, LASER_SPECIAL_MIN = .4, LASER_SPECIAL_FUEL = 20, LASER_SPECIAL_COOLDOWN = 3, STEP = 1 / 60, STORAGE_KEY = 'soloWardBest', ENDLESS_TIME_KEY = 'soloWardEndlessTime', ENDLESS_KILLS_KEY = 'soloWardEndlessKills', ENDLESS_BOSSES_KEY = 'soloWardEndlessBosses';
  const keys = new Set();
  const touchMove = { x: 0, y: 0 };
  const takenUnique = new Set();
  let touchFire = false, touchSpecial = false, joyPointer = null, raf = 0, last = 0, accumulator = 0;
  let resultOverlayTimer = 0, runId = 0;
  let audio = null, soundOn = true, state = null, selectedWeapon = 'rifle', selectedMode = 'normal', autoFire = false, doubleSpeed = false;
  const WEAPONS = {
    rifle: { weapon:'rifle', fireRate:.255, damage:1, bullets:1, spread:.15, bulletSpeed:620 },
    machinegun: { weapon:'machinegun', fireRate:.07, damage:.63, bullets:1, spread:.09, bulletSpeed:760 },
    laser: { weapon:'laser', fireRate:.055, damage:.34, bullets:1, spread:.04, bulletSpeed:0 }
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function safeBest() { try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; } }
  function saveBest(value) { try { localStorage.setItem(STORAGE_KEY, String(value)); } catch {} bestEl.textContent = value; }
  function safeStoredNumber(key) { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } }
  function saveStoredNumber(key,value) { try { localStorage.setItem(key,String(value)); } catch {} }
  function clearResultOverlayTimer() {
    if (!resultOverlayTimer) return;
    clearTimeout(resultOverlayTimer);
    resultOverlayTimer = 0;
  }
  function showResultOverlayAfter(delay, completedRunId) {
    clearResultOverlayTimer();
    resultOverlayTimer = setTimeout(() => {
      resultOverlayTimer = 0;
      if (completedRunId === runId && state && !state.running) overlay.classList.remove('hidden');
    }, delay);
  }
  bestEl.textContent = safeBest();

  for (const button of modeButtons) button.onclick = () => {
    selectedMode = button.dataset.mode;
    for (const option of modeButtons) { const active = option === button; option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active)); }
    textEl.textContent = selectedMode === 'endless' ? '最終ボスの先へ進み、強力なボス編隊を繰り返し退けながら、できるだけ長くコアを守ろう。' : '敵と敵弾の両方へ自動照準。30秒ごとに装備を強化し、激しくなる攻撃を5分間耐え抜いて最終ボスを撃破しよう。';
    tone(selectedMode === 'endless' ? 520 : 320, .08, .022, 'triangle');
  };

  for (const button of weaponButtons) button.onclick = () => {
    selectedWeapon = button.dataset.weapon;
    for (const option of weaponButtons) { const active = option === button; option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active)); }
    specialButton.hidden = selectedWeapon !== 'laser';
    tone(selectedWeapon === 'laser' ? 760 : selectedWeapon === 'machinegun' ? 360 : 240, .07, .02, 'triangle');
  };

  autoFireToggle.onclick = () => {
    autoFire = !autoFire;
    autoFireToggle.classList.toggle('active', autoFire);
    autoFireToggle.setAttribute('aria-pressed', String(autoFire));
    autoFireState.textContent = autoFire ? 'ON' : 'OFF';
    tone(autoFire ? 640 : 220, .06, .018, 'triangle');
  };

  speedToggle.onclick = () => {
    doubleSpeed = !doubleSpeed;
    speedToggle.classList.toggle('active', doubleSpeed);
    speedToggle.setAttribute('aria-pressed', String(doubleSpeed));
    speedState.textContent = doubleSpeed ? 'ON' : 'OFF';
    tone(doubleSpeed ? 780 : 240, .07, .02, 'triangle');
  };

  function tone(frequency, duration = .05, volume = .025, type = 'square') {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type; osc.frequency.value = frequency; gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
      osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch {}
  }

  soundButton.onclick = () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
    if (soundOn) tone(440, .06);
  };

  function newState() {
    return {
      running: true, paused: false, choosing: false, mode:selectedMode, elapsed: 0, upgradeClock: 0, periodKills: 0,
      runKills: 0, enemyKills:0, bossKills:0, bestPeriod: safeBest(), tier: 1, nextBossAt: BOSS_INTERVAL, finalBossSpawned: false, swarmTriggered: false, swarmUntil: 0, endlessStarted:false, endlessPhase:'initial', endlessPairIndex:0, endlessNextBossAt:Infinity, endlessBossesRemaining:0, warning: null, shake: 0, flash: 0, spawnClock: .6, turretCooldown:0, turretAngle:-Math.PI/2,
      powerOrb: null, nextOrbAt: rand(18,22), choiceMode: 'interval', finalDeath: null,
      player: { x: CX, y: H - 120, r: 12, cooldown: 0, inv: 0, stun: 0, specialCharge: 0, specialCooldown: 0, facing: -Math.PI / 2, fuel:100, fuelLocked:false },
      core: { x: CX, y: CY, r: 42, hp: 240, maxHp: 240, shield: 0, maxShield: 0 },
      stats: { speed:255, ...WEAPONS[selectedWeapon], pierce:0, homing:0, homingRange:0, precisionEvery:0, splitChance:0, chainRatio:0, coreArmor:0, killHeal:0, maxFuel:100, fuelDrain:10, fuelRegen:18, turretInterval:20 },
      rifleVolley: 0,
      upgradeLevels: {},
      enemies: [], bullets: [], beams: [], enemyBullets: [], particles: [],
      stars: Array.from({ length: 110 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.3, 1.8), a: rand(.08, .5) }))
    };
  }

  function startGame() {
    clearResultOverlayTimer();
    runId++;
    state = newState(); takenUnique.clear(); keys.clear(); touchFire = false; touchSpecial = false; specialButton.classList.remove('active'); specialButton.hidden = selectedWeapon !== 'laser';
    titleEl.innerHTML = '敵機を撃ち抜き、<br><em>コアを守れ。</em>';
    startButton.textContent = '防衛を開始';
    restartButton.hidden = true;
    overlay.classList.add('hidden'); upgradeOverlay.classList.add('hidden');
    last = performance.now(); accumulator = 0; cancelAnimationFrame(raf); tone(280, .12, .035, 'sawtooth');
    raf = requestAnimationFrame(loop);
  }
  startButton.onclick = () => state?.paused ? resume() : startGame();
  restartButton.onclick = () => startGame();

  addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Escape' && state?.running && !state.choosing) { event.preventDefault(); state.paused ? resume() : pause(); return; }
    if (state?.choosing && /^Digit[1-3]$/.test(event.code)) { choicesEl.children[Number(event.code.at(-1)) - 1]?.click(); return; }
    keys.add(event.code);
  });
  addEventListener('keyup', event => { keys.delete(event.code); if((event.code==='ShiftLeft'||event.code==='ShiftRight')&&!keys.has('ShiftLeft')&&!keys.has('ShiftRight'))releaseLaserSpecial(); });
  addEventListener('blur', () => { if (state?.running && !state.paused && !state.choosing) pause(); });

  function pause() {
    state.paused = true; keys.clear();
    weaponSelect.hidden = true;modeSelect.hidden=true;
    titleEl.innerHTML = '防衛線を<br><em>一時停止。</em>';
    textEl.textContent = `生存時間 ${formatTime(state.elapsed)} — コア耐久 ${Math.ceil(state.core.hp)}。準備ができたら防衛に戻ろう。`;
    startButton.textContent = '防衛に戻る';restartButton.hidden=false;overlay.classList.remove('hidden');
  }
  function resume() { state.paused = false;restartButton.hidden=true;overlay.classList.add('hidden'); last = performance.now(); accumulator = 0; raf = requestAnimationFrame(loop); }
  function gameOver() {
    state.running = false; keys.clear();
    restartButton.hidden=true;
    weaponSelect.hidden = false;modeSelect.hidden=false;
    const record = Math.max(state.bestPeriod, state.periodKills); if (state.mode==='normal'&&record > safeBest()) saveBest(record);
    titleEl.innerHTML = '防衛線が<br><em>崩壊した。</em>';
    if(state.mode==='endless'){
      const survived=Math.floor(state.elapsed),bestTime=Math.max(survived,safeStoredNumber(ENDLESS_TIME_KEY)),bestKills=Math.max(state.enemyKills,safeStoredNumber(ENDLESS_KILLS_KEY)),bestBosses=Math.max(state.bossKills,safeStoredNumber(ENDLESS_BOSSES_KEY));
      saveStoredNumber(ENDLESS_TIME_KEY,bestTime);saveStoredNumber(ENDLESS_KILLS_KEY,bestKills);saveStoredNumber(ENDLESS_BOSSES_KEY,bestBosses);
      textEl.textContent=`生存時間 ${formatTime(survived)}（BEST ${formatTime(bestTime)}）／ 敵撃破 ${state.enemyKills}（BEST ${bestKills}）／ ボス撃破 ${state.bossKills}（BEST ${bestBosses}）。`;
    }else textEl.textContent = `生存時間 ${formatTime(state.elapsed)} ／ 総撃破 ${state.runKills} ／ 30秒間最高 ${record}。装備の組み合わせを変えて、もう一度挑戦しよう。`;
    startButton.textContent = '最初から再挑戦'; showResultOverlayAfter(450, runId); tone(80, .6, .05, 'sawtooth');
  }

  function gameClear() {
    state.running = false; state.choosing = false; keys.clear();
    restartButton.hidden=true;
    weaponSelect.hidden = false;modeSelect.hidden=false;
    const record = Math.max(state.bestPeriod, state.periodKills); if (record > safeBest()) saveBest(record);
    upgradeOverlay.classList.add('hidden');
    titleEl.innerHTML = '防衛完了。<br><em>MISSION CLEAR</em>';
    textEl.textContent = `最終ボス撃破 ／ 総撃破 ${state.runKills} ／ 30秒間最高 ${record}。コアは守り抜かれた。`;
    startButton.textContent = 'もう一度プレイ';
    showResultOverlayAfter(650, runId);
    tone(660, .65, .06, 'triangle');
  }

  function loop(now) {
    if (!state?.running || state.paused || state.choosing) return;
    accumulator += Math.min((now - last) / 1000, .08) * (doubleSpeed ? 2 : 1); last = now;
    while (accumulator >= STEP && state.running && !state.choosing) { update(STEP); accumulator -= STEP; }
    draw(); if (state.running && !state.paused && !state.choosing) raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const s = state;if(s.finalDeath){updateFinalDeath(dt);return}s.elapsed += dt; s.upgradeClock += dt; s.shake = Math.max(0, s.shake - dt); s.flash = Math.max(0, s.flash - dt); if(s.warning){s.warning.life-=dt;if(s.warning.life<=0)s.warning=null}
    s.player.cooldown -= dt; s.player.inv = Math.max(0, s.player.inv - dt); s.player.stun = Math.max(0, s.player.stun - dt); s.player.specialCooldown = Math.max(0, s.player.specialCooldown - dt);
    const chargingSpecial=s.stats.weapon==='laser'&&s.player.specialCooldown<=0&&s.player.stun<=0&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||touchSpecial);
    if(chargingSpecial)s.player.specialCharge=Math.min(1,s.player.specialCharge+dt/LASER_SPECIAL_CHARGE_TIME);
    let dx = ((keys.has('KeyD') || keys.has('ArrowRight')) ? 1 : 0) - ((keys.has('KeyA') || keys.has('ArrowLeft')) ? 1 : 0) + touchMove.x;
    let dy = ((keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0) - ((keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0) + touchMove.y;
    const length = Math.hypot(dx, dy);
    if (length && s.player.stun<=0) { dx /= Math.max(1, length); dy /= Math.max(1, length); s.player.x = clamp(s.player.x + dx * s.stats.speed * dt, 18, W - 18); s.player.y = clamp(s.player.y + dy * s.stats.speed * dt, 18, H - 18); s.player.facing = Math.atan2(dy, dx); }
    const firing = s.player.stun<=0 && (keys.has('Space') || touchFire || autoFire);
    let weaponActive=false;
    if(s.player.fuelLocked){s.player.fuel=Math.min(s.stats.maxFuel,s.player.fuel+s.stats.fuelRegen*dt);if(s.player.fuel>=s.stats.maxFuel*.3)s.player.fuelLocked=false}
    else{s.player.fuel=Math.min(s.stats.maxFuel,s.player.fuel+s.stats.fuelRegen*dt);if(firing&&s.player.fuel>0){s.player.fuel=Math.max(0,s.player.fuel-s.stats.fuelDrain*s.stats.bullets*dt);weaponActive=s.player.fuel>0;if(!weaponActive){s.player.fuelLocked=true;tone(105,.22,.035,'sawtooth')}}}
    if (weaponActive && s.player.cooldown <= 0) { shoot(s.player); s.player.cooldown = s.stats.fireRate; }
    updateSpawns(dt); updateTurret(dt); updateEntities(dt);
    if (!s.running) return;
    if (s.core.hp <= 0) { gameOver(); return; }
    updatePowerOrb();
    if (s.choosing) return;
    if (s.upgradeClock >= UPGRADE_TIME) finishInterval();
  }

  function updateSpawns(dt) {
    const s = state;
    if(s.mode==='endless'&&s.endlessStarted){
      if(s.endlessPhase==='normal'&&s.elapsed>=s.endlessNextBossAt){startEndlessBossPair();return}
      if(s.endlessPhase==='boss')return;
    }
    if (!s.finalBossSpawned && s.elapsed >= FINAL_BOSS_TIME) {
      s.finalBossSpawned = true;
      s.nextBossAt = Infinity;
      s.enemies = [];
      s.enemyBullets = [];
      spawnEnemy('finalBoss');
      s.flash = .55; s.shake = .65; tone(68, .8, .075, 'sawtooth');
    } else if (!s.swarmTriggered && s.elapsed >= 240) {
      s.swarmTriggered = true;
      s.nextBossAt = Infinity;
      s.enemies = s.enemies.filter(enemy => enemy.type !== 'boss');
      s.enemyBullets = [];
      s.swarmUntil = 270;
      s.spawnClock = 0;
      s.warning = { text:'WARNING // SMALL HOSTILE SWARM', life:2.4, max:2.4 };
      s.flash=.3;s.shake=.45;tone(110,.55,.065,'sawtooth');
    } else if (s.elapsed >= s.nextBossAt && s.nextBossAt < FINAL_BOSS_TIME) {
      const bossStage = Math.round(s.nextBossAt / BOSS_INTERVAL);
      s.nextBossAt += BOSS_INTERVAL;
      if (!s.enemies.some(enemy => !enemy.dead && (enemy.type === 'boss' || enemy.type === 'finalBoss'))) {
        const minions = s.enemies.filter(enemy => !enemy.dead && enemy.type !== 'boss' && enemy.type !== 'finalBoss');
        for (const enemy of minions) enemy.dead = true;
        s.enemyBullets = [];
        spawnEnemy('boss', null, bossStage); s.flash = .25; tone(92, .42, .06, 'sawtooth');
      }
    }
    const finalBossActive = s.enemies.some(enemy => !enemy.dead && enemy.type === 'finalBoss');
    if (finalBossActive) return;
    const bossActive = s.enemies.some(enemy => !enemy.dead && enemy.type === 'boss');
    if (bossActive) return;
    const swarmActive = s.swarmTriggered && s.elapsed < s.swarmUntil;
    s.spawnClock -= dt; if (s.spawnClock > 0) return;
    const pressure = Math.min(1, s.elapsed / FINAL_BOSS_TIME);
    const endlessRamp=endlessNormalSpawnRamp(s),normalCount=1+(Math.random()<pressure*.75?1:0),rushCount=Math.random()<.4?11:10;
    const count=swarmActive?rushCount:Math.round(normalCount+(rushCount-normalCount)*endlessRamp);
    const swarmPhase = Math.random();
    for(let i=0;i<count;i++){
      const rushStyle=swarmActive||Math.random()<endlessRamp,spawnPoint=swarmActive||endlessRamp>0?perimeterPoint(swarmPhase+i/count,30):null;
      if(rushStyle)spawnEnemy(Math.random()<.72?'runner':'drone',spawnPoint);
      else{const r=Math.random();spawnEnemy(s.tier>=7&&r<.16?'splitter':s.tier>=3&&r<.38?'shooter':r<.62?'runner':'drone',spawnPoint)}
    }
    if((swarmActive||endlessRamp>0)&&Math.random()<.4*(swarmActive?1:endlessRamp))spawnEnemy('splitter',perimeterPoint(swarmPhase+Math.random(),30));
    const normalInterval=Math.max(.55,rand(1.35,1.85)/(1+s.tier*.055+pressure*.12)),rushInterval=rand(.8,1);
    s.spawnClock=swarmActive?rushInterval:normalInterval+(rushInterval-normalInterval)*endlessRamp;
  }

  function endlessNormalSpawnRamp(s){
    if(s.mode!=='endless'||!s.endlessStarted||s.endlessPhase!=='normal')return 0;
    return clamp((s.endlessPairIndex-1)/8,0,1);
  }

  function startEndlessBossPair(){
    const s=state,pair=s.endlessPairIndex%2===0?[1,2]:[2,3];s.endlessPairIndex++;s.endlessPhase='boss';s.endlessBossesRemaining=2;s.enemies=[];s.enemyBullets=[];s.bullets=[];s.spawnClock=.6;
    spawnEnemy('boss',null,pair[0]);const first=s.enemies[s.enemies.length-1];spawnEnemy('boss',null,pair[1]);const second=s.enemies[s.enemies.length-1];second.orbitAngle=first.orbitAngle+Math.PI;second.orbitDirection=-first.orbitDirection;second.x=CX+Math.cos(second.orbitAngle)*(W/2-72);second.y=CY+Math.sin(second.orbitAngle)*(H/2-64);
    s.warning={text:`ENDLESS // BOSS ${pair[0]} + BOSS ${pair[1]}`,life:2.2,max:2.2};s.flash=.4;s.shake=.55;tone(82,.65,.065,'sawtooth');
  }

  function finishEndlessBossPair(){
    const s=state;s.endlessPhase='normal';s.endlessNextBossAt=s.elapsed+ENDLESS_NORMAL_TIME;s.spawnClock=.35;s.warning={text:'ENDLESS // 60 SEC DEFENSE',life:1.8,max:1.8};tone(520,.25,.04,'triangle');
  }

  function edgePoint(margin) {
    const side = Math.floor(rand(0, 4));
    if (side === 0) return { x: rand(0, W), y: -margin };
    if (side === 1) return { x: W + margin, y: rand(0, H) };
    if (side === 2) return { x: rand(0, W), y: H + margin };
    return { x: -margin, y: rand(0, H) };
  }
  function perimeterPoint(progress,margin) {
    const width=W+margin*2,height=H+margin*2,perimeter=2*(width+height);let d=((progress%1)+1)%1*perimeter;
    if(d<width)return{x:-margin+d,y:-margin};d-=width;
    if(d<height)return{x:W+margin,y:-margin+d};d-=height;
    if(d<width)return{x:W+margin-d,y:H+margin};d-=width;
    return{x:-margin,y:H+margin-d};
  }
  function spawnEnemy(type,spawnPoint=null,bossStage=0) {
    const isBoss = type === 'boss' || type === 'finalBoss';
    const p = spawnPoint ? {...spawnPoint} : edgePoint(isBoss ? 70 : 30), scale = type === 'finalBoss' ? 1 : 1 + Math.max(0, state.tier - 1) * .07;
    const orbitAngle = type === 'boss' ? rand(0, Math.PI * 2) : 0;
    if (type === 'boss') { p.x = CX + Math.cos(orbitAngle) * (W / 2 - 72); p.y = CY + Math.sin(orbitAngle) * (H / 2 - 64); }
    const spec = { drone:[2.4,54,12,4], runner:[1.5,93,9,3], shooter:[3.8,39,14,5], splitter:[5.5,45,17,6], boss:[48 + state.tier * 5,24,47,14], finalBoss:[260 + state.tier * 12,18,60,18] }[type];
    const health = spec[0] * scale * ENEMY_DURABILITY * (isBoss ? BOSS_DURABILITY : 1);
    const shield = (type === 'finalBoss' ? 220 + state.tier * 14 : 0) * ENEMY_DURABILITY * BOSS_DURABILITY;
    state.enemies.push({ type, bossStage, activeAttackStyle:0, x:p.x, y:p.y, hp:health, maxHp:health, shield, maxShield:shield, speed:spec[1], r:spec[2], damage:spec[3], cooldown:rand(.3,.7), aimCooldown:5, laserCooldown:2, sweepAttack:null, spiralAngle:rand(0,Math.PI*2), phase:rand(0,7), orbitAngle, orbitDirection:Math.random()<.5?-1:1, dead:false });
  }

  function updatePowerOrb(){
    const s=state;
    if(!s.powerOrb&&s.elapsed>=s.nextOrbAt){
      let point;
      do point={x:rand(55,W-55),y:rand(55,H-55)};while(dist(point,s.core)<125);
      s.powerOrb={...point,r:16,phase:rand(0,Math.PI*2)};
      tone(820,.16,.025,'sine');
    }
    if(s.powerOrb&&dist(s.player,s.powerOrb)<s.player.r+s.powerOrb.r){
      const orb=s.powerOrb;s.powerOrb=null;s.nextOrbAt=s.elapsed+rand(18,22);burst(orb.x,orb.y,'#6ea8ff',28);openOrbUpgrade();
    }
  }

  function openOrbUpgrade(){
    const s=state;s.choosing=true;s.choiceMode='orb';upgradeEyebrow.textContent='BLUE ORB ACQUIRED';upgradeTitle.textContent='補給物資';resultEl.textContent='青い球の力で、ランダムな強化を1つ獲得できる。';
    showUpgradeChoices(1);
    upgradeOverlay.classList.remove('hidden');tone(760,.2,.04,'triangle');
  }

  function shoot(source) {
    const s = state;
    if (s.stats.weapon === 'laser') { fireLaser(source); return; }
    let angle = source.facing, nearest = findTarget(source);
    if (nearest) angle = Math.atan2(nearest.y - source.y, nearest.x - source.x); source.facing = angle;
    let precisionShot = false;
    if (s.stats.weapon === 'rifle' && s.stats.precisionEvery > 0) {
      s.rifleVolley++;
      precisionShot = s.rifleVolley % s.stats.precisionEvery === 0;
    }
    for (let i = 0; i < s.stats.bullets; i++) {
      const offset = s.stats.bullets === 1 ? 0 : (i - (s.stats.bullets - 1) / 2) * s.stats.spread;
      const a = angle + offset + (s.stats.weapon === 'machinegun' ? rand(-.065,.065) : 0);
      s.bullets.push({ x:source.x+Math.cos(a)*16, y:source.y+Math.sin(a)*16, vx:Math.cos(a)*s.stats.bulletSpeed, vy:Math.sin(a)*s.stats.bulletSpeed, r:precisionShot?5:4, damage:s.stats.damage*(precisionShot?2:1), pierce:s.stats.pierce, homing:s.stats.homing, homingRange:s.stats.homingRange, precision:precisionShot, canSplit:s.stats.weapon==='machinegun', splitChance:s.stats.splitChance, dead:false });
    }
    tone(precisionShot ? 470 : s.stats.weapon === 'machinegun' ? 260 : 190, precisionShot?.045:.025, precisionShot?.02:.012);
  }

  function findTarget(source) {
    let nearest=null,nearestD=Infinity;
    for(const enemy of state.enemies){const d=dist(source,enemy);if(!enemy.dead&&d<nearestD){nearest=enemy;nearestD=d}}
    for(const hostile of state.enemyBullets){
      if(hostile.uncancellable)continue;
      const bossBulletOutsideTurretRange=state.stats.weapon==='rifle'&&hostile.fromBoss&&dist(state.core,hostile)>TURRET_RANGE;
      if(bossBulletOutsideTurretRange)continue;
      const d=dist(source,hostile);if(!hostile.dead&&d<nearestD){nearest=hostile;nearestD=d}
    }
    return nearest;
  }

  function fireLaser(source) {
    const target=findTarget(source);let angle=source.facing,x2=source.x+Math.cos(angle)*520,y2=source.y+Math.sin(angle)*520;
    if(target){angle=Math.atan2(target.y-source.y,target.x-source.x);source.facing=angle;const length=Math.hypot(W,H)*1.35;x2=source.x+Math.cos(angle)*length;y2=source.y+Math.sin(angle)*length;
      if(state.enemyBullets.includes(target)){target.dead=true;particle(target.x,target.y,'#66f6de',7)}
      const dx=x2-source.x,dy=y2-source.y,lineLengthSquared=dx*dx+dy*dy,hits=[];
      for(const enemy of state.enemies){if(enemy.dead||enemy.dying)continue;const t=((enemy.x-source.x)*dx+(enemy.y-source.y)*dy)/lineLengthSquared;if(t<0||t>1)continue;const px=source.x+dx*t,py=source.y+dy*t;if(Math.hypot(enemy.x-px,enemy.y-py)<=enemy.r+4)hits.push({enemy,t})}
      hits.sort((a,b)=>a.t-b.t);const mainDamage=state.stats.damage*state.stats.bullets,chainOrigin=hits[0]?.enemy;
      for(const hit of hits){hurtEnemy(hit.enemy,mainDamage,hit.enemy.x,hit.enemy.y);if(state.finalDeath)break}
      if(chainOrigin&&state.stats.chainRatio>0&&!state.finalDeath){let chainTarget=null,chainDistance=Infinity;for(const enemy of state.enemies){const d=dist(chainOrigin,enemy);if(enemy!==chainOrigin&&!enemy.dead&&!enemy.dying&&d<chainDistance){chainTarget=enemy;chainDistance=d}}if(chainTarget){hurtEnemy(chainTarget,mainDamage*state.stats.chainRatio,chainTarget.x,chainTarget.y);state.beams.push({x1:chainOrigin.x,y1:chainOrigin.y,x2:chainTarget.x,y2:chainTarget.y,life:.12,max:.12,chain:true})}}
    }
    for(let i=0;i<state.stats.bullets;i++){const offset=(i-(state.stats.bullets-1)/2)*3,px=-Math.sin(angle)*offset,py=Math.cos(angle)*offset;state.beams.push({x1:source.x+px,y1:source.y+py,x2:x2+px,y2:y2+py,life:.09,max:.09})}tone(720,.035,.009,'sine');
  }

  function releaseLaserSpecial(){
    const s=state;if(!s?.running||s.paused||s.choosing||s.stats.weapon!=='laser')return;
    const charge=s.player.specialCharge;s.player.specialCharge=0;
    if(charge<LASER_SPECIAL_MIN||s.player.specialCooldown>0||s.player.stun>0)return;
    let target=null,nearest=Infinity;
    for(const enemy of s.enemies){const d=dist(s.player,enemy);if(!enemy.dead&&d<nearest){target=enemy;nearest=d}}
    if(!target||s.player.fuel<LASER_SPECIAL_FUEL){tone(110,.12,.025,'sawtooth');return}
    const angle=Math.atan2(target.y-s.player.y,target.x-s.player.x),length=Math.hypot(W,H)*1.35,x2=s.player.x+Math.cos(angle)*length,y2=s.player.y+Math.sin(angle)*length,damage=s.stats.damage*10*charge;
    s.player.facing=angle;s.player.fuel=Math.max(0,s.player.fuel-LASER_SPECIAL_FUEL);s.player.specialCooldown=LASER_SPECIAL_COOLDOWN;
    s.beams.push({x1:s.player.x,y1:s.player.y,x2,y2,life:.32,max:.32,special:true});
    for(const enemy of s.enemies){if(enemy.dead)continue;const dx=x2-s.player.x,dy=y2-s.player.y,t=((enemy.x-s.player.x)*dx+(enemy.y-s.player.y)*dy)/(dx*dx+dy*dy);if(t<0||t>1)continue;const px=s.player.x+dx*t,py=s.player.y+dy*t;if(Math.hypot(enemy.x-px,enemy.y-py)<=enemy.r+14){hurtEnemy(enemy,damage,enemy.x,enemy.y);ring(enemy.x,enemy.y,'#bdfcff',enemy.r+18);if(!s.running)break}}
    s.flash=Math.max(s.flash,.12);s.shake=Math.max(s.shake,.3);tone(960,.28,.055,'sawtooth');
  }

  function updateTurret(dt){
    const s=state;s.turretCooldown-=dt;
    let target=null,closest=Infinity;
    for(const enemy of s.enemies){const d=dist(s.core,enemy);if(!enemy.dead&&d<closest){target=enemy;closest=d}}
    for(const bullet of s.enemyBullets){const d=dist(s.core,bullet);if(!bullet.dead&&d<closest){target=bullet;closest=d}}
    if(!target)return;
    s.turretAngle=Math.atan2(target.y-s.core.y,target.x-s.core.x);
    if(closest>TURRET_RANGE||s.turretCooldown>0)return;
    const angle=s.turretAngle,speed=720,muzzle=20;
    s.bullets.push({x:s.core.x+Math.cos(angle)*muzzle,y:s.core.y+Math.sin(angle)*muzzle,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:4,damage:s.stats.damage*3,pierce:0,homing:0,homingRange:0,turret:true,dead:false});
    s.turretCooldown=s.stats.turretInterval;tone(560,.055,.018,'triangle');
  }

  function updateEntities(dt) {
    const s = state;
    for (const bullet of s.bullets) {
      if (bullet.dead) continue;
      if (bullet.homing) {
        let target = null, closest = bullet.homingRange;
        for (const enemy of s.enemies) { const d = dist(bullet, enemy); if (!enemy.dead && d < closest) { target = enemy; closest = d; } }
        if (target) { const speed = Math.hypot(bullet.vx,bullet.vy), desired = Math.atan2(target.y-bullet.y,target.x-bullet.x), current = Math.atan2(bullet.vy,bullet.vx); let delta = ((desired-current+Math.PI*3)%(Math.PI*2))-Math.PI; const a = current+clamp(delta,-bullet.homing*dt,bullet.homing*dt); bullet.vx=Math.cos(a)*speed; bullet.vy=Math.sin(a)*speed; }
      }
      bullet.x += bullet.vx*dt; bullet.y += bullet.vy*dt;
      for (const hostile of s.enemyBullets) {
        if (!hostile.dead && !bullet.dead && dist(bullet,hostile) < bullet.r+hostile.r) {
          bullet.dead=true;
          if(hostile.uncancellable){particle(hostile.x,hostile.y,'#ffad66',4);tone(120,.04,.012,'sawtooth')}
          else{hostile.dead=true;particle(hostile.x,hostile.y,'#66f6de',7);tone(470,.025,.008,'triangle')}
        }
      }
      for (const enemy of s.enemies) {
        if (enemy.dead || bullet.dead || enemy===bullet.ignoredEnemy || dist(bullet,enemy)>=bullet.r+enemy.r) continue;
        hurtEnemy(enemy,bullet.damage,bullet.x,bullet.y);
        if(bullet.canSplit&&bullet.splitChance>0&&Math.random()<bullet.splitChance){const a=rand(0,Math.PI*2),speed=Math.hypot(bullet.vx,bullet.vy),clearance=enemy.r+bullet.r+4;s.bullets.push({x:enemy.x+Math.cos(a)*clearance,y:enemy.y+Math.sin(a)*clearance,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:bullet.r,damage:bullet.damage,pierce:0,homing:0,homingRange:0,canSplit:false,ignoredEnemy:enemy,dead:false});particle(bullet.x,bullet.y,'#9fe8ff',4)}
        if(bullet.turret&&!enemy.dead){const push=Math.atan2(enemy.y-s.core.y,enemy.x-s.core.x);enemy.x=s.core.x+Math.cos(push)*TURRET_RANGE;enemy.y=s.core.y+Math.sin(push)*TURRET_RANGE;burst(enemy.x,enemy.y,'#ff6c7b',7)}
        if (bullet.pierce>0) bullet.pierce--; else bullet.dead=true;
      }
      if (bullet.x < -60 || bullet.x > W+60 || bullet.y < -60 || bullet.y > H+60) bullet.dead=true;
    }
    for (const enemy of s.enemies) {
      if (enemy.dead||enemy.dying) continue;
      const angle = Math.atan2(CY-enemy.y,CX-enemy.x), wobble = enemy.type==='runner' ? Math.sin(s.elapsed*7+enemy.phase)*.38 : 0;
      if (enemy.type==='boss') {
        enemy.orbitAngle += enemy.orbitDirection * .27 * dt;
        enemy.x = CX + Math.cos(enemy.orbitAngle) * (W / 2 - 72);
        enemy.y = CY + Math.sin(enemy.orbitAngle) * (H / 2 - 64);
      } else if (enemy.type!=='finalBoss' || dist(enemy,s.core)>175) {
        enemy.x += Math.cos(angle+wobble)*enemy.speed*dt; enemy.y += Math.sin(angle+wobble)*enemy.speed*dt;
      }
      if (enemy.type==='boss'||enemy.type==='finalBoss') updateBossAttack(enemy,dt);
      else { enemy.cooldown -= dt; if(enemy.type==='shooter'&&enemy.cooldown<=0){enemyShoot(enemy);enemy.cooldown=rand(1.8,2.6)} }
      if (enemy.type!=='boss' && enemy.type!=='finalBoss' && dist(enemy,s.core)<enemy.r+s.core.r) { damageCore(enemy.damage); enemy.dead=true; burst(enemy.x,enemy.y,'#ff5d73',14); }
      else if (dist(enemy,s.player)<enemy.r+s.player.r && s.player.inv<=0) { s.player.inv=1; const push=Math.atan2(s.player.y-enemy.y,s.player.x-enemy.x); s.player.x=clamp(s.player.x+Math.cos(push)*45,18,W-18); s.player.y=clamp(s.player.y+Math.sin(push)*45,18,H-18); damageCore(3); }
    }
    for (const bullet of s.enemyBullets) {
      if (bullet.turn) { const speed=Math.hypot(bullet.vx,bullet.vy),a=Math.atan2(bullet.vy,bullet.vx)+bullet.turn*dt;bullet.vx=Math.cos(a)*speed;bullet.vy=Math.sin(a)*speed; }
      bullet.x+=bullet.vx*dt; bullet.y+=bullet.vy*dt;
      if (!bullet.dead && dist(bullet,s.player)<bullet.r+s.player.r && s.player.inv<=0) { bullet.dead=true; s.player.inv=1; damageCore(bullet.damage??3); }
      if (!bullet.dead && dist(bullet,s.core)<bullet.r+s.core.r) { bullet.dead=true; damageCore(bullet.coreDamage??2.5); }
      if (bullet.x < -40 || bullet.x > W+40 || bullet.y < -40 || bullet.y > H+40) bullet.dead=true;
    }
    for (const p of s.particles) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=.96; p.vy*=.96; p.life-=dt; }
    for(const beam of s.beams)beam.life-=dt;
    s.bullets=s.bullets.filter(b=>!b.dead); s.beams=s.beams.filter(b=>b.life>0); s.enemyBullets=s.enemyBullets.filter(b=>!b.dead); s.enemies=s.enemies.filter(e=>!e.dead); s.particles=s.particles.filter(p=>p.life>0);
  }

  function enemyShoot(enemy) {
    const angle=Math.atan2(CY-enemy.y,CX-enemy.x),speed=145;
    state.enemyBullets.push({x:enemy.x,y:enemy.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:5,turn:0,fromBoss:false,dead:false});
  }

  function bossAttackStyle(enemy){
    if(enemy.type!=='finalBoss')return enemy.bossStage||1;
    const ratio=Math.max(0,enemy.hp/enemy.maxHp);
    return ratio>.7?1:ratio>.3?2:3;
  }

  function updateBossAttack(enemy,dt){
    const style=bossAttackStyle(enemy),final=enemy.type==='finalBoss';
    if(enemy.activeAttackStyle!==style){
      enemy.activeAttackStyle=style;enemy.sweepAttack=null;enemy.cooldown=Math.min(enemy.cooldown,.35);
      enemy.aimCooldown=style===2?(final?1:AIMED_BURST_INTERVAL):Infinity;enemy.laserCooldown=style===3?(final?1:2):Infinity;
      if(final&&enemy.shield<=0){state.warning={text:`FINAL BOSS // PHASE ${style}`,life:1.5,max:1.5};tone(95+style*35,.3,.04,'sawtooth')}
    }
    if(style<=2){enemy.cooldown-=dt;if(enemy.cooldown<=0){fireSpiralBarrage(enemy);enemy.cooldown=final?.38:.48}}
    if(style===2){enemy.aimCooldown-=dt;if(enemy.aimCooldown<=0){fireAimedBurst(enemy);enemy.aimCooldown=AIMED_BURST_INTERVAL}}
    if(style===3)updateSweepAttack(enemy,dt);
  }

  function usesReducedEndlessRifleBossFire(enemy){
    return state.mode==='endless'&&state.stats.weapon==='rifle'&&enemy.type==='boss'&&(enemy.bossStage===1||enemy.bossStage===2);
  }

  function fireSpiralBarrage(enemy){
    const final=enemy.type==='finalBoss',firstBoss=enemy.type==='boss'&&enemy.bossStage===1,count=firstBoss||usesReducedEndlessRifleBossFire(enemy)?5:final?10:8,speed=final?145:126,base=enemy.spiralAngle;
    enemy.spiralAngle+=enemy.orbitDirection*(final?.27:.34);
    for(let i=0;i<count;i++){const a=base+i/count*Math.PI*2,turn=enemy.orbitDirection*(.42+(i%2)*.08);state.enemyBullets.push({x:enemy.x,y:enemy.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:final?6:5,turn,fromBoss:true,dead:false})}
  }

  function fireAimedBurst(enemy){
    const base=Math.atan2(state.player.y-enemy.y,state.player.x-enemy.x),speed=235;
    const spreads=usesReducedEndlessRifleBossFire(enemy)?[-.1,.1]:[-.14,0,.14];
    for(const spread of spreads){const a=base+spread;state.enemyBullets.push({x:enemy.x,y:enemy.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,turn:0,fromBoss:true,highPower:true,uncancellable:true,damage:8,coreDamage:7,dead:false})}
    tone(145,.22,.045,'sawtooth');
  }

  function updateSweepAttack(enemy,dt){
    enemy.laserCooldown-=dt;
    if(!enemy.sweepAttack&&enemy.laserCooldown<=0)startSweepTelegraph(enemy);
    const attack=enemy.sweepAttack;if(!attack)return;
    attack.time-=dt;
    if(attack.phase==='telegraph'&&attack.time<=0){attack.phase='firing';attack.time=1;attack.duration=1;attack.angle=attack.start;tone(880,.18,.055,'sawtooth')}
    if(attack.phase!=='firing')return;
    const progress=clamp(1-attack.time/attack.duration,0,1);attack.angle=attack.start+(attack.end-attack.start)*progress;
    const finalSweep=enemy.type==='finalBoss';
    if(!attack.hitPlayer&&laserHitsCircle(enemy,attack.angle,state.player)){attack.hitPlayer=true;state.player.inv=Math.max(state.player.inv,1);stunPlayer(2);damageCore(finalSweep?40:7)}
    if(!attack.hitCore&&laserHitsCircle(enemy,attack.angle,state.core)){attack.hitCore=true;damageCore(finalSweep?40:10)}
    if(attack.time<=0)startSweepTelegraph(enemy);
  }

  function startSweepTelegraph(enemy){
    const coreAngle=Math.atan2(state.core.y-enemy.y,state.core.x-enemy.x),playerAngle=Math.atan2(state.player.y-enemy.y,state.player.x-enemy.x),difference=((playerAngle-coreAngle+Math.PI*3)%(Math.PI*2))-Math.PI,half=enemy.type==='finalBoss'?Math.PI/3:Math.PI/6;
    const center=coreAngle+(Math.abs(difference)<=half*2?difference/2:Math.sign(difference)*half),reverse=enemy.orbitDirection<0;
    enemy.sweepAttack={phase:'telegraph',time:1.2,duration:1.2,center,start:center+(reverse?half:-half),end:center+(reverse?-half:half),angle:center,hitPlayer:false,hitCore:false};
    enemy.laserCooldown=0;tone(210,.32,.035,'sawtooth');
  }

  function stunPlayer(duration){
    state.player.stun=Math.max(state.player.stun,duration);
    particle(state.player.x,state.player.y,'#8fdcff',12);ring(state.player.x,state.player.y,'#8fdcff',28);tone(105,.22,.035,'sawtooth');
  }

  function laserHitsCircle(enemy,angle,target){
    const length=W/2,x2=enemy.x+Math.cos(angle)*length,y2=enemy.y+Math.sin(angle)*length,dx=x2-enemy.x,dy=y2-enemy.y,t=clamp(((target.x-enemy.x)*dx+(target.y-enemy.y)*dy)/(dx*dx+dy*dy),0,1),x=enemy.x+dx*t,y=enemy.y+dy*t;
    return Math.hypot(target.x-x,target.y-y)<=target.r+5;
  }
  function hurtEnemy(enemy,amount,x,y) {
    if(enemy.dead||enemy.dying)return;
    if(enemy.shield>0){enemy.shield=Math.max(0,enemy.shield-amount);particle(x,y,'#66f6de',2);if(enemy.shield===0){burst(enemy.x,enemy.y,'#66f6de',42);state.flash=.2;tone(880,.28,.045,'triangle')}return}
    enemy.hp-=amount; particle(x,y,'#e9fbff',2); if(enemy.hp>0)return;enemy.hp=0;
    const boss=enemy.type==='boss'||enemy.type==='finalBoss',value=boss?10:1; state.periodKills+=value; state.runKills+=value;if(boss)state.enemyBullets=state.enemyBullets.filter(bullet=>!bullet.fromBoss);
    if(boss)state.bossKills++;else state.enemyKills++;
    if(state.stats.killHeal&&(state.mode!=='endless'||Math.random()<.2)) state.core.hp=Math.min(state.core.maxHp,state.core.hp+state.stats.killHeal);
    if(enemy.type==='finalBoss'){startFinalBossDeath(enemy);return}
    enemy.dead=true;burst(enemy.x,enemy.y,boss?'#ffad66':'#66f6de',boss?55:10);
    if(enemy.type==='splitter') for(let i=0;i<2;i++) state.enemies.push({...enemy,type:'runner',x:enemy.x+(i?12:-12),hp:1.2*ENEMY_DURABILITY,maxHp:1.2*ENEMY_DURABILITY,r:8,speed:105,damage:6,dead:false});
    tone(boss?520:310,boss?.3:.035,boss?.05:.009,'triangle');
    if(boss&&state.mode==='endless'&&state.endlessPhase==='boss'){state.endlessBossesRemaining=Math.max(0,state.endlessBossesRemaining-1);if(state.endlessBossesRemaining===0)finishEndlessBossPair()}
  }
  function startFinalBossDeath(enemy){
    enemy.dying=true;enemy.sweepAttack=null;state.finalDeath={enemy,x:enemy.x,y:enemy.y,time:0,sparkClock:0,exploded:false};state.enemyBullets=[];state.warning=null;keys.clear();touchFire=false;touchSpecial=false;state.shake=.2;state.flash=.08;tone(135,.45,.04,'sawtooth');
  }
  function updateFinalDeath(dt){
    const s=state,d=s.finalDeath;d.time+=dt;s.shake=Math.max(0,s.shake-dt);s.flash=Math.max(0,s.flash-dt);d.sparkClock-=dt;
    if(!d.exploded&&d.sparkClock<=0){d.sparkClock=.11;particle(d.x+rand(-34,34),d.y+rand(-34,34),Math.random()<.5?'#8fdcff':'#fff0a8',4);s.shake=Math.max(s.shake,.09)}
    if(!d.exploded&&d.time>=1.25){d.exploded=true;d.enemy.hidden=true;burst(d.x,d.y,'#fff0a8',115);particle(d.x,d.y,'#ff7a55',45);ring(d.x,d.y,'#fff7cf',105);s.flash=.65;s.shake=.9;tone(58,.72,.075,'sawtooth')}
    for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt}
    for(const beam of s.beams)beam.life-=dt;
    s.particles=s.particles.filter(p=>p.life>0);s.beams=s.beams.filter(b=>b.life>0);
    if(d.time>=1.9){if(s.mode==='endless')beginEndlessLoop(d);else gameClear()}
  }
  function beginEndlessLoop(death){
    const s=state;death.enemy.dead=true;s.enemies=s.enemies.filter(enemy=>enemy!==death.enemy);s.finalDeath=null;s.endlessStarted=true;s.endlessPhase='normal';s.endlessPairIndex=0;s.endlessBossesRemaining=0;s.endlessNextBossAt=s.elapsed+ENDLESS_NORMAL_TIME;s.spawnClock=.35;s.player.inv=Math.max(s.player.inv,1);s.warning={text:'ENDLESS MODE // LOOP START',life:2.4,max:2.4};s.flash=.25;s.shake=.35;tone(640,.42,.055,'triangle');
  }
  function damageCore(raw) {
    const damage=Math.max(1,raw*(1-state.stats.coreArmor));
    if(state.core.shield>0){const blocked=Math.min(state.core.shield,damage);state.core.shield-=blocked;state.core.hp-=damage-blocked;}else state.core.hp-=damage;
    state.shake=.25;state.flash=.08;tone(72,.12,.035,'sawtooth');
  }
  function particle(x,y,color,count=1){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),speed=rand(25,150);state.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:rand(.2,.65),max:.65,r:rand(1,3.5),color});}}
  function burst(x,y,color,count){particle(x,y,color,count);state.shake=Math.max(state.shake,count>30?.45:.12);}
  function ring(x,y,color,radius){state.particles.push({x,y,vx:0,vy:0,life:.3,max:.3,r:radius,color,ring:true});}

  const upgrades=[
    {id:'rapid',name:'高速給弾',text:'射撃間隔を15%短縮する',apply:s=>s.stats.fireRate=Math.max(.03,s.stats.fireRate*.85)},
    {id:'power',name:'高密度弾頭',text:'自分の攻撃力を+35%',apply:s=>s.stats.damage*=1.35},
    {id:'twin',name:'複製銃身',text:'同時発射数を+1（最大5発）',apply:s=>{s.stats.bullets=Math.min(5,s.stats.bullets+1);s.stats.spread=Math.max(.08,s.stats.spread-.01)}},
    {id:'pierce',name:'位相貫通',text:'弾が敵を1体追加で貫通する',weapons:['rifle','machinegun'],apply:s=>s.stats.pierce++},
    {id:'speed',name:'時間加速',text:'移動速度を18%上昇する',apply:s=>s.stats.speed*=1.18},
    {id:'homing',name:'予測照準',text:'弾が近くの敵の動きを予測し旋回',weapons:['rifle','machinegun'],apply:s=>{s.stats.homing=3.2;s.stats.homingRange=160+(s.upgradeLevels.homing??0)*80}},
    {id:'precision',name:'精密射撃',text:'通常銃の5→4→3射ごとに、全銃身から威力2倍の弾を発射',weapons:['rifle'],apply:s=>{const level=(s.upgradeLevels.precision??0)+1;s.stats.precisionEvery=[0,5,4,3][level];s.rifleVolley=0}},
    {id:'bulletSplit',name:'弾幕分裂',text:'マシンガン命中時、10→15→20%で同威力の非連鎖弾を生成',weapons:['machinegun'],apply:s=>{const level=(s.upgradeLevels.bulletSplit??0)+1;s.stats.splitChance=[0,.10,.15,.20][level]}},
    {id:'chainLaser',name:'連鎖レーザー',text:'敵への命中時、最寄りの別の敵へ元威力の5→10→15%で1回連鎖',weapons:['laser'],apply:s=>{const level=(s.upgradeLevels.chainLaser??0)+1;s.stats.chainRatio=[0,.05,.10,.15][level]}},
    {id:'repair',name:'コア修復',text:'最大耐久を15増やし、30回復。シールドも全回復する',apply:s=>{s.core.maxHp+=15;s.core.hp=Math.min(s.core.maxHp,s.core.hp+30);s.core.shield=s.core.maxShield}},
    {id:'armor',name:'因果装甲',text:'コアのダメージ軽減率を+8%（最大55%）',apply:s=>s.stats.coreArmor=Math.min(.55,s.stats.coreArmor+.08)},
    {id:'shield',name:'時間障壁',text:'選択時のみシールド最大値と残量を+20',apply:s=>{s.core.maxShield+=20;s.core.shield+=20}},
    {id:'siphon',name:'再生回路',text:'撃破ごとにコア耐久を0.5回復する',apply:s=>s.stats.killHeal+=.5},
    {id:'fuelTank',name:'拡張燃料槽',text:'燃料の最大容量を+25',apply:s=>{s.stats.maxFuel+=25;s.player.fuel=Math.min(s.stats.maxFuel,s.player.fuel+25)}},
    {id:'fuelRegen',name:'燃料再生機',text:'燃料の毎秒回復量を+6',apply:s=>s.stats.fuelRegen+=6},
    {id:'autoTurret',name:'自動砲台',text:'発射間隔を5秒短縮（20→15→10→5秒）',apply:s=>{s.stats.turretInterval=Math.max(5,s.stats.turretInterval-5);s.turretCooldown=Math.min(s.turretCooldown,s.stats.turretInterval)}}
  ];

  function finishInterval(){
    const s=state;s.choosing=true;s.choiceMode='interval';s.bestPeriod=Math.max(s.bestPeriod,s.periodKills);if(s.mode==='normal'&&s.bestPeriod>safeBest())saveBest(s.bestPeriod);upgradeEyebrow.textContent='30 SECONDS SURVIVED';upgradeTitle.textContent='装備を強化';
    resultEl.textContent=`直近30秒：${s.periodKills}体分を撃破。戦場はこのまま継続する。`;
    showUpgradeChoices();upgradeOverlay.classList.remove('hidden');tone(620,.16,.04,'triangle');
  }
  function showUpgradeChoices(limit=3){
    const levelOf=u=>state.upgradeLevels[u.id]??0;
    const pool=upgrades.filter(u=>levelOf(u)<MAX_UPGRADE_LEVEL&&(!u.weapons||u.weapons.includes(state.stats.weapon))),picks=[];while(picks.length<limit&&pool.length)picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    choicesEl.classList.toggle('single-choice',limit===1);
    choicesEl.replaceChildren(...picks.map((u,i)=>{const level=levelOf(u),b=document.createElement('button'),description=u.id==='siphon'&&state.mode==='endless'?'敵撃破時20%の確率でコア耐久を0.5回復する':u.text;b.type='button';b.className='upgrade-card';b.setAttribute('data-upgrade',u.id);b.innerHTML=`<span class="upgrade-number">${i+1}</span><span class="upgrade-level">LV ${level} → ${level+1} / ${MAX_UPGRADE_LEVEL}</span><strong>${u.name}</strong><small>${description}</small>`;b.onclick=()=>chooseUpgrade(u);return b;}));
    return picks.length;
  }
  function chooseUpgrade(u){
    if(!state?.choosing)return;const level=state.upgradeLevels[u.id]??0;if(level>=MAX_UPGRADE_LEVEL)return;const mode=state.choiceMode;u.apply(state);state.upgradeLevels[u.id]=level+1;closeUpgradeChoice(mode);
  }
  function chooseRecovery(){if(!state?.choosing)return;const mode=state.choiceMode;state.core.hp=Math.min(state.core.maxHp,state.core.hp+15);particle(state.core.x,state.core.y,'#66f6de',16);ring(state.core.x,state.core.y,'#66f6de',52);closeUpgradeChoice(mode)}
  function closeUpgradeChoice(mode){if(mode==='interval'){state.tier++;state.upgradeClock=0;state.periodKills=0}state.player.cooldown=0;state.player.inv=Math.max(state.player.inv,.6);state.choosing=false;state.choiceMode='interval';upgradeOverlay.classList.add('hidden');last=performance.now();accumulator=0;tone(420,.13,.04,'triangle');raf=requestAnimationFrame(loop)}
  skipUpgradeButton.onclick=chooseRecovery;

  function draw(){
    const s=state;ctx.save();if(s.shake>0)ctx.translate(rand(-5,5),rand(-5,5));const bg=ctx.createRadialGradient(CX,CY,20,CX,CY,620);bg.addColorStop(0,'#111d32');bg.addColorStop(1,'#050813');ctx.fillStyle=bg;ctx.fillRect(-10,-10,W+20,H+20);drawGrid();
    for(const star of s.stars){ctx.fillStyle=`rgba(210,230,255,${star.a})`;ctx.fillRect(star.x,star.y,star.r,star.r)}for(const e of s.enemies)if(!e.hidden)drawBossAttack(e);drawTurretRange();drawCore();drawTurretOrb();if(s.powerOrb)drawPowerOrb(s.powerOrb);for(const beam of s.beams)drawBeam(beam);for(const b of s.bullets)drawBullet(b);for(const b of s.enemyBullets)drawEnemyBullet(b);for(const e of s.enemies)if(!e.hidden)drawEnemy(e);if(s.finalDeath)drawFinalBossDeath(s.finalDeath);for(const p of s.particles)drawParticle(p);drawAgent(s.player,false);if(s.player.stun>0)drawPlayerStun(s.player);drawFuelGauge(s.player);if(s.stats.weapon==='laser')drawLaserSpecialGauge(s.player);drawHud();if(s.warning)drawWarning(s.warning);if(s.flash>0){ctx.fillStyle=`rgba(255,93,115,${s.flash*1.8})`;ctx.fillRect(0,0,W,H)}ctx.restore();
  }
  function drawGrid(){const pulse=(state.elapsed*18)%42;ctx.strokeStyle='rgba(110,168,255,.075)';ctx.lineWidth=1;for(let x=-42+pulse;x<W+42;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=-42+pulse;y<H+42;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.strokeStyle='rgba(102,246,222,.07)';ctx.beginPath();ctx.arc(CX,CY,115+Math.sin(state.elapsed*2)*3,0,Math.PI*2);ctx.stroke()}
  function drawTurretRange(){ctx.save();ctx.strokeStyle='rgba(255,93,115,.24)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(state.core.x,state.core.y,TURRET_RANGE,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawCore(){const c=state.core;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(state.elapsed*.18);ctx.shadowBlur=28;ctx.shadowColor=c.hp<c.maxHp*.3?'#ff5d73':'#66f6de';ctx.strokeStyle=ctx.shadowColor;ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?31:43;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.stroke();ctx.rotate(-state.elapsed*.36);ctx.fillStyle='#eefcff';ctx.beginPath();ctx.arc(0,0,15+Math.sin(state.elapsed*4)*2,0,Math.PI*2);ctx.fill();if(c.shield>0){ctx.strokeStyle='#6ea8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,51,0,Math.PI*2);ctx.stroke()}ctx.restore()}
  function drawTurretOrb(){const c=state.core;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(state.turretAngle);ctx.shadowBlur=14;ctx.shadowColor='#ff5d73';ctx.fillStyle='#38141d';ctx.strokeStyle='#ff6b7d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#a92e41';ctx.fillRect(2,-4,19,8);ctx.strokeRect(2,-4,19,8);ctx.fillStyle='#ff8a9b';ctx.fillRect(18,-5,6,10);ctx.fillStyle='#ff5d73';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawAgent(a,echo){if(!echo&&a.inv>0&&Math.floor(a.inv*12)%2)return;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.facing||0);ctx.globalAlpha=echo?.46:1;ctx.shadowBlur=echo?12:18;ctx.shadowColor=echo?'#6ea8ff':'#66f6de';ctx.fillStyle=echo?'#85b8ff':'#e9fffa';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-11,11);ctx.lineTo(-6,0);ctx.lineTo(-11,-11);ctx.closePath();ctx.fill();if(echo){ctx.strokeStyle='#b6d4ff';ctx.stroke()}ctx.restore()}
  function drawPlayerStun(player){ctx.save();ctx.translate(player.x,player.y);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=9;ctx.shadowColor='#8fdcff';ctx.strokeStyle='#b9ecff';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const base=state.elapsed*9+i*Math.PI*2/3,r1=16+(i%2)*2,r2=23;ctx.beginPath();ctx.moveTo(Math.cos(base)*r1,Math.sin(base)*r1);ctx.lineTo(Math.cos(base+.22)*r2,Math.sin(base+.22)*r2);ctx.lineTo(Math.cos(base+.43)*(r1+1),Math.sin(base+.43)*(r1+1));ctx.stroke()}ctx.restore()}
  function drawFinalBossDeath(death){if(death.exploded)return;ctx.save();ctx.translate(death.x,death.y);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=15;ctx.shadowColor='#8fdcff';ctx.strokeStyle='#d9f7ff';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=death.time*13+i*Math.PI/3,r1=28+(i%2)*7,r2=68+(i%3)*6;ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a+.1)*((r1+r2)*.5),Math.sin(a+.1)*((r1+r2)*.5));ctx.lineTo(Math.cos(a-.08)*r2,Math.sin(a-.08)*r2);ctx.stroke()}ctx.strokeStyle='rgba(255,240,168,.75)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,64+Math.sin(death.time*22)*7,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawFuelGauge(player){const ratio=clamp(player.fuel/state.stats.maxFuel,0,1),width=46,x=player.x-width/2,y=player.y+22;ctx.save();ctx.fillStyle='rgba(3,7,16,.85)';ctx.fillRect(x-2,y-2,width+4,8);ctx.strokeStyle=player.fuelLocked?'#ff5d73':'rgba(230,242,255,.45)';ctx.lineWidth=1;ctx.strokeRect(x-2,y-2,width+4,8);if(ratio>0){ctx.fillStyle=ratio>.75?'#55ed82':ratio>.5?'#58a9ff':ratio>.25?'#ffd45d':'#ff5d73';ctx.fillRect(x,y,width*ratio,4)}ctx.restore()}
  function drawLaserSpecialGauge(player){const width=46,x=player.x-width/2,y=player.y+32,charge=player.specialCharge,cooling=player.specialCooldown>0,hasFuel=player.fuel>=LASER_SPECIAL_FUEL;ctx.save();ctx.fillStyle='rgba(3,7,16,.88)';ctx.fillRect(x-2,y-2,width+4,8);ctx.strokeStyle=cooling?'#786888':charge>=LASER_SPECIAL_MIN&&hasFuel?'#66f6de':'rgba(150,180,225,.55)';ctx.strokeRect(x-2,y-2,width+4,8);if(cooling){ctx.fillStyle='#665b78';ctx.fillRect(x,y,width*(1-player.specialCooldown/LASER_SPECIAL_COOLDOWN),4)}else if(charge>0){ctx.fillStyle=!hasFuel?'#ff5d73':charge>=1?'#efffff':charge>=LASER_SPECIAL_MIN?'#66f6de':'#6ea8ff';ctx.fillRect(x,y,width*charge,4)}ctx.restore()}
  function drawBullet(b){ctx.save();ctx.shadowBlur=b.precision?18:10;ctx.shadowColor=b.precision?'#ffdf72':'#66f6de';ctx.fillStyle=b.precision?'#fff3b0':'#dffff8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawPowerOrb(orb){const pulse=orb.r+Math.sin(state.elapsed*5+orb.phase)*2;ctx.save();ctx.translate(orb.x,orb.y);ctx.shadowBlur=32;ctx.shadowColor='#4d9dff';ctx.rotate(state.elapsed*.8);ctx.strokeStyle='rgba(119,184,255,.75)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?orb.r+4:orb.r+10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.stroke();ctx.rotate(-state.elapsed*1.6);ctx.strokeStyle='#9dcdff';ctx.beginPath();ctx.arc(0,0,orb.r+5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#eef8ff';ctx.beginPath();ctx.arc(0,0,pulse*.72,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6ea8ff';ctx.beginPath();ctx.arc(0,0,pulse*.34,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawBeam(b){ctx.save();ctx.globalAlpha=clamp(b.life/b.max,0,1);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=b.special?50:b.chain?10:18;ctx.shadowColor=b.special?'#ffd85c':b.chain?'#6ea8ff':'#66f6de';ctx.strokeStyle=b.special?'#ffcf3c':b.chain?'#8fc3ff':'#bafff4';ctx.lineWidth=b.special?28:b.chain?2:5;ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();ctx.strokeStyle=b.special?'#fff8cf':'#fff';ctx.lineWidth=b.special?7:b.chain?.7:1.5;ctx.stroke();ctx.restore()}
  function drawEnemyBullet(b){ctx.save();ctx.shadowBlur=b.highPower?22:10;ctx.shadowColor=b.highPower?'#ffad66':'#ff5d73';ctx.fillStyle=b.highPower?'#fff0bd':'#ffd2d8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();if(b.highPower){ctx.strokeStyle='#ff6b45';ctx.lineWidth=2;ctx.stroke()}ctx.restore()}
  function drawBossAttack(enemy){const attack=enemy.sweepAttack;if(!attack)return;const radius=W/2,low=Math.min(attack.start,attack.end),high=Math.max(attack.start,attack.end);ctx.save();ctx.beginPath();ctx.moveTo(enemy.x,enemy.y);ctx.arc(enemy.x,enemy.y,radius,low,high);ctx.closePath();ctx.fillStyle=attack.phase==='telegraph'?`rgba(255,50,72,${.09+.04*Math.sin(state.elapsed*12)})`:'rgba(255,35,55,.055)';ctx.fill();ctx.strokeStyle=attack.phase==='telegraph'?'rgba(255,90,105,.38)':'rgba(255,70,90,.18)';ctx.lineWidth=2;ctx.stroke();if(attack.phase==='firing'){const x2=enemy.x+Math.cos(attack.angle)*radius,y2=enemy.y+Math.sin(attack.angle)*radius;ctx.globalCompositeOperation='lighter';ctx.shadowBlur=28;ctx.shadowColor='#ff304f';ctx.strokeStyle='#ff304f';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(enemy.x,enemy.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#fff1f3';ctx.lineWidth=3;ctx.stroke()}ctx.restore()}
  function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(CY-e.y,CX-e.x));const final=e.type==='finalBoss',boss=e.type==='boss'||final;ctx.shadowBlur=final?34:boss?24:11;ctx.shadowColor=final?'#fff0a8':boss?'#ffad66':'#ff5d73';ctx.fillStyle=final?'#604315':boss?'#552a20':e.type==='shooter'?'#3f2240':'#351d2b';ctx.strokeStyle=final?'#fff0a8':boss?'#ffad66':'#ff7890';ctx.lineWidth=final?6:boss?4:2;const sides=final?12:boss?10:e.type==='runner'?3:e.type==='splitter'?6:4;ctx.beginPath();for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,r=e.r*(i%2&&boss?.72:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#fff2e8';ctx.beginPath();ctx.arc(0,0,final?14:boss?10:4,0,Math.PI*2);ctx.fill();if(final&&e.shield>0){ctx.rotate(-Math.atan2(CY-e.y,CX-e.x));ctx.strokeStyle='#66f6de';ctx.lineWidth=4;ctx.globalAlpha=.65+.25*Math.sin(state.elapsed*8);ctx.beginPath();ctx.arc(0,0,e.r+15,0,Math.PI*2);ctx.stroke()}ctx.restore();if(e.hp<e.maxHp||final){const width=e.r*2,shielded=final&&e.shield>0,ratio=shielded?e.shield/e.maxShield:e.hp/e.maxHp;ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(e.x-e.r,e.y-e.r-14,width,6);ctx.fillStyle=shielded?'#66f6de':final?'#fff0a8':boss?'#ffad66':'#ff5d73';ctx.fillRect(e.x-e.r,e.y-e.r-14,width*Math.max(0,ratio),6)}}
  function drawParticle(p){ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1-p.life/p.max),0,Math.PI*2);ctx.stroke()}else{ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.r,p.r)}ctx.restore()}
  function drawHud(){const s=state,remain=Math.max(0,UPGRADE_TIME-s.upgradeClock),final=s.enemies.some(e=>!e.dead&&e.type==='finalBoss'),bossActive=final||s.enemies.some(e=>!e.dead&&e.type==='boss');ctx.fillStyle='rgba(5,8,18,.72)';ctx.fillRect(18,16,275,78);ctx.fillRect(W-279,16,261,78);ctx.font='700 12px ui-monospace,monospace';ctx.fillStyle='#66f6de';ctx.fillText(`SURVIVE ${formatTime(s.elapsed)}`,32,39);ctx.fillStyle='#eef8ff';ctx.font='800 27px ui-monospace,monospace';ctx.fillText(`${remain.toFixed(1)}s`,32,70);ctx.fillStyle='#7e8cab';ctx.font='700 11px ui-monospace,monospace';ctx.fillText(`KILLS ${s.periodKills}`,150,68);ctx.textAlign='right';ctx.fillStyle='#eef8ff';ctx.font='800 16px ui-monospace,monospace';ctx.fillText(`CORE ${Math.ceil(Math.max(0,s.core.hp))}/${s.core.maxHp}`,W-32,42);ctx.fillStyle='#17233a';ctx.fillRect(W-249,56,217,9);ctx.fillStyle=s.core.hp<s.core.maxHp*.3?'#ff5d73':'#66f6de';ctx.fillRect(W-249,56,217*clamp(s.core.hp/s.core.maxHp,0,1),9);if(s.core.shield>0){ctx.fillStyle='#6ea8ff';ctx.font='700 10px ui-monospace,monospace';ctx.fillText(`SHIELD +${Math.ceil(s.core.shield)}`,W-32,82)}ctx.textAlign='left';if(bossActive){ctx.textAlign='center';ctx.fillStyle=final?'#fff0a8':'#ffad66';ctx.font='900 12px ui-monospace,monospace';ctx.fillText(final?'FINAL BOSS':'BOSS SIGNAL',CX,32);ctx.textAlign='left'}}

  function drawWarning(warning){const alpha=clamp(warning.life/.35,0,1)*clamp((warning.max-warning.life)/.18,0,1);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(70,5,18,.8)';ctx.fillRect(0,CY-52,W,104);ctx.strokeStyle='#ff5d73';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,CY-52);ctx.lineTo(W,CY-52);ctx.moveTo(0,CY+52);ctx.lineTo(W,CY+52);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 24px ui-monospace,monospace';ctx.fillText(warning.text,CX,CY+8);ctx.restore()}

  function formatTime(seconds){const total=Math.max(0,Math.floor(seconds));return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`}

  function updateJoystick(event){const rect=joystick.getBoundingClientRect();let x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+rect.height/2);const length=Math.hypot(x,y),max=rect.width*.31;if(length>max){x=x/length*max;y=y/length*max}touchMove.x=x/max;touchMove.y=y/max;stick.style.transform=`translate(${x}px, ${y}px)`}
  joystick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoystick(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoystick(e)});
  const releaseJoy=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;touchMove.x=0;touchMove.y=0;stick.style.transform='translate(0, 0)'};joystick.addEventListener('pointerup',releaseJoy);joystick.addEventListener('pointercancel',releaseJoy);
  fireButton.addEventListener('pointerdown',e=>{e.preventDefault();touchFire=true;fireButton.classList.add('active');fireButton.setPointerCapture(e.pointerId)});const releaseFire=()=>{touchFire=false;fireButton.classList.remove('active')};fireButton.addEventListener('pointerup',releaseFire);fireButton.addEventListener('pointercancel',releaseFire);
  specialButton.addEventListener('pointerdown',e=>{e.preventDefault();touchSpecial=true;specialButton.classList.add('active');specialButton.setPointerCapture(e.pointerId)});specialButton.addEventListener('pointerup',()=>{touchSpecial=false;specialButton.classList.remove('active');releaseLaserSpecial()});specialButton.addEventListener('pointercancel',()=>{touchSpecial=false;specialButton.classList.remove('active');if(state)state.player.specialCharge=0});
  ctx.fillStyle='#070b16';ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(CX,CY,20,CX,CY,240);glow.addColorStop(0,'rgba(102,246,222,.18)');glow.addColorStop(1,'rgba(102,246,222,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
})();
