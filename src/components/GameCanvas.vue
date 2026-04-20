<template>
  <div class="game-wrapper">
    <!-- HUD Layer -->
    <div class="hud" v-if="!matchEnded">
      <div class="hud-section left">
        <div class="match-meta">
          <span class="label">SALA:</span>
          <span class="value">{{ matchId.slice(0, 8) }}...</span>
        </div>
        <div class="match-status" :class="lastSnapshot?.status">
          {{ statusText }}
        </div>
      </div>

      <div class="hud-section center">
        <div class="game-timer" :class="{ 'timer-low': isTimerLow }">
          {{ formattedTime }}
        </div>
      </div>

      <div class="hud-section right">
        <div v-if="myPlayer" class="player-vitals">
          <div class="stat-group">
            <span class="label">HP</span>
            <div class="pixel-hp-bar">
              <div class="hp-fill" :style="{ width: myPlayer.hp + '%', backgroundColor: hpColor }"></div>
              <span class="hp-num">{{ Math.ceil(myPlayer.hp) }}</span>
            </div>
          </div>
          <div class="stat-meta">
            <div class="meta-item">
              <span class="label">PTS:</span>
              <span class="value">{{ myPlayer.score }}</span>
            </div>
            <div class="meta-item">
              <span class="label">KOs:</span>
              <span class="value">{{ myPlayer.deaths }}</span>
            </div>
          </div>
        </div>
        <button @click="leaveMatch" class="danger leave-btn">SAIR</button>
      </div>
    </div>

    <!-- Scoreboard Mini Overlay -->
    <div class="scoreboard-mini" v-if="lastSnapshot?.players.length > 0 && !matchEnded">
      <div class="score-header">RANKING</div>
      <div v-for="p in sortedPlayers" :key="p.playerId" class="score-row" :class="{ 'is-me': p.playerId === props.myUserId }">
        <span class="rank-name">{{ p.username }}</span>
        <span class="rank-score">{{ p.score }}</span>
      </div>
    </div>

    <!-- Final Result Overlay (Fixed Modal) -->
    <div v-if="matchEnded" class="end-screen-overlay">
      <div class="end-card pixel-border">
        <h2>FIM DE JOGO</h2>
        <div class="winner-section" v-if="winnerName">
          <p class="winner-label">VENCEDOR</p>
          <h3 class="winner-name">{{ winnerName }}</h3>
        </div>
        <div class="final-report" v-if="myPlayer">
          <div class="report-item">
            <span>SEU PLACAR:</span>
            <span class="value">{{ myPlayer.score }}</span>
          </div>
          <div class="report-item">
            <span>SUAS MORTES:</span>
            <span class="value">{{ myPlayer.deaths }}</span>
          </div>
        </div>
        <button class="primary return-btn" @click="leaveMatch">VOLTAR AO LOBBY</button>
      </div>
    </div>

    <canvas 
      ref="canvasRef" 
      width="1600" 
      height="900" 
      @mousemove="handleMouseMove" 
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
    ></canvas>
    
    <div class="controls-hint" v-if="!matchEnded">WASD: MOVER | MOUSE: MIRAR E ATIRAR</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { getSocket } from '../socket';

const props = defineProps(['matchId', 'myUserId']);
const emit = defineEmits(['leave']);

const canvasRef = ref(null);
const lastSnapshot = ref(null);
const matchEnded = ref(false);
const inputSeq = ref(0);

const myPlayer = computed(() => {
  if (!lastSnapshot.value) return null;
  return lastSnapshot.value.players.find(p => p.playerId === props.myUserId);
});

const sortedPlayers = computed(() => {
  if (!lastSnapshot.value) return [];
  return [...lastSnapshot.value.players].sort((a, b) => b.score - a.score);
});

const hpColor = computed(() => {
  if (!myPlayer.value) return 'var(--brazil-green)';
  const hp = myPlayer.value.hp;
  if (hp > 50) return 'var(--brazil-green)';
  if (hp > 25) return 'var(--brazil-yellow)';
  return '#ff4444';
});

const isTimerLow = computed(() => (lastSnapshot.value?.remainingMs || 0) < 30000);

const statusText = computed(() => {
  const status = lastSnapshot.value?.status;
  if (status === 'running') return 'ARENA ABERTA';
  if (status === 'countdown') return 'PREPARE-SE!';
  if (status === 'waiting') return 'AGUARDANDO...';
  return 'FINALIZADA';
});

const formattedTime = computed(() => {
  const ms = lastSnapshot.value?.remainingMs || 0;
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const winnerName = computed(() => {
  if (!lastSnapshot.value || lastSnapshot.value.status !== 'finished') return null;
  const winner = lastSnapshot.value.players.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current
  );
  return winner ? winner.username : null;
});

const keys = { up: false, down: false, left: false, right: false };
const mousePos = { x: 0, y: 0 };
const isShooting = ref(false);
const canShoot = ref(true);
const hitPlayers = ref(new Set());

const imageCache = new Map();

const getPlayerImage = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageCache.has(imageUrl)) return imageCache.get(imageUrl);
  const img = new Image();
  img.src = imageUrl;
  imageCache.set(imageUrl, img);
  return img;
};

const handleKeyDown = (e) => {
  if (e.key.toLowerCase() === 'w') keys.up = true;
  if (e.key.toLowerCase() === 's') keys.down = true;
  if (e.key.toLowerCase() === 'a') keys.left = true;
  if (e.key.toLowerCase() === 'd') keys.right = true;
};

const handleKeyUp = (e) => {
  if (e.key.toLowerCase() === 'w') keys.up = false;
  if (e.key.toLowerCase() === 's') keys.down = false;
  if (e.key.toLowerCase() === 'a') keys.left = false;
  if (e.key.toLowerCase() === 'd') keys.right = false;
};

const handleMouseMove = (e) => {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const scaleX = canvasRef.value.width / rect.width;
  const scaleY = canvasRef.value.height / rect.height;
  mousePos.x = (e.clientX - rect.left) * scaleX;
  mousePos.y = (e.clientY - rect.top) * scaleY;
};

const handleMouseDown = () => isShooting.value = true;
const handleMouseUp = () => isShooting.value = false;

let inputInterval = null;

const sendInput = () => {
  const socket = getSocket();
  if (!socket || !lastSnapshot.value || matchEnded.value) return;

  const myPlayer = lastSnapshot.value.players.find(p => p.playerId === props.myUserId);
  if (!myPlayer) return;

  const dx = mousePos.x - myPlayer.position.x;
  const dy = mousePos.y - myPlayer.position.y;
  const angle = Math.atan2(dy, dx);

  inputSeq.value++;
  socket.emit('match:input', {
    matchId: props.matchId,
    seq: inputSeq.value,
    action: 'move',
    payload: {
      input: { ...keys, shooting: isShooting.value },
      aimDirection: angle
    }
  });

  if (isShooting.value && canShoot.value) {
    socket.emit('match:input', {
      matchId: props.matchId,
      seq: ++inputSeq.value,
      action: 'shoot',
      payload: { direction: angle }
    });
    canShoot.value = false;
  } else {
    canShoot.value = true;
  }
};

const leaveMatch = () => {
  const socket = getSocket();
  if (socket) socket.emit('match:leave', { matchId: props.matchId });
  emit('leave');
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!lastSnapshot.value) {
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('CONECTANDO À ARENA...', canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(render);
    return;
  }

  hitPlayers.value.clear();
  const playerSize = 36;

  lastSnapshot.value.projectiles.forEach(prj => {
    lastSnapshot.value.players.forEach(p => {
      if (!p.isAlive || p.playerId === prj.ownerPlayerId) return;
      const halfSize = playerSize / 2;
      if (prj.position.x >= p.position.x - halfSize && prj.position.x <= p.position.x + halfSize &&
          prj.position.y >= p.position.y - halfSize && prj.position.y <= p.position.y + halfSize) {
        hitPlayers.value.add(p.playerId);
      }
    });
  });

  // Render Projectiles
  ctx.fillStyle = '#ffff00';
  lastSnapshot.value.projectiles.forEach(prj => {
    ctx.beginPath();
    ctx.arc(prj.position.x, prj.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Render Players
  lastSnapshot.value.players.forEach(p => {
    if (!p.isAlive) return;
    const isMe = p.playerId === props.myUserId;
    const img = getPlayerImage(p.imageUrl);
    const isRunning = lastSnapshot.value.status === 'running';
    const scale = isRunning ? 1.5 : 1;

    ctx.save();
    ctx.translate(p.position.x, p.position.y);
    ctx.rotate(p.direction);

    if (img && img.complete) {
      const size = 50 * scale;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = isMe ? '#00ccff' : '#ff3333';
      ctx.beginPath();
      ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // Player HUD on Canvas
    ctx.fillStyle = 'white';
    ctx.font = '12px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, p.position.x, p.position.y - 45 * scale);

    ctx.fillStyle = '#333';
    ctx.fillRect(p.position.x - 20 * scale, p.position.y - 35 * scale, 40 * scale, 4);
    ctx.fillStyle = p.hp > 50 ? '#00ff00' : p.hp > 25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(p.position.x - 20 * scale, p.position.y - 35 * scale, (p.hp / 100) * 40 * scale, 4);

    if (hitPlayers.value.has(p.playerId)) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.position.x - 25 * scale, p.position.y - 25 * scale, 50 * scale, 50 * scale);
    }
  });

  requestAnimationFrame(render);
};

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.emit('match:join', { matchId: props.matchId });
    socket.on('match:snapshot', (snapshot) => {
      lastSnapshot.value = snapshot;
      if (snapshot.status === 'finished') matchEnded.value = true;
    });
    socket.on('match:ended', () => { matchEnded.value = true; });
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  inputInterval = setInterval(sendInput, 50);
  render();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  clearInterval(inputInterval);
});
</script>

<style scoped>
.game-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 120px);
  background-color: #000;
  border: 4px solid black;
  box-shadow: 8px 8px 0px 0px black;
  overflow: hidden;
  margin-top: 10px;
}

/* HUD Re-Design */
.hud {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 4px solid black;
  z-index: 50;
  font-family: var(--font-pixel);
}

.hud-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud-section.center {
  align-items: center;
  justify-content: center;
}

.hud-section.right {
  align-items: flex-end;
}

.label { color: var(--text-secondary); font-size: 0.5rem; margin-right: 5px; }
.value { color: var(--text-primary); font-size: 0.6rem; }

.match-status { font-size: 0.6rem; color: var(--brazil-green); }
.game-timer { font-size: 1.5rem; color: var(--brazil-yellow); text-shadow: 3px 3px 0px black; }
.timer-low { animation: pulse 0.5s infinite alternate; color: #ff4444; }

@keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }

.pixel-hp-bar {
  width: 150px;
  height: 20px;
  background: #333;
  border: 3px solid white;
  position: relative;
  box-shadow: 3px 3px 0px black;
}

.hp-fill { height: 100%; transition: width 0.3s; }
.hp-num {
  position: absolute; width: 100%; text-align: center;
  top: 50%; transform: translateY(-50%);
  font-size: 0.5rem; color: white; text-shadow: 2px 2px 0px black;
}

.stat-meta { display: flex; gap: 15px; margin-top: 5px; }

/* Scoreboard Overlay */
.scoreboard-mini {
  position: absolute;
  top: 100px; right: 20px;
  width: 180px;
  background: rgba(0,0,0,0.85);
  border: 3px solid black;
  padding: 0.75rem;
  z-index: 40;
  box-shadow: 4px 4px 0px black;
}

.score-header {
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  color: var(--brazil-yellow);
  border-bottom: 2px solid #444;
  padding-bottom: 5px;
  margin-bottom: 8px;
}

.score-row {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 1.2rem;
  padding: 2px 0;
}

.score-row.is-me { color: var(--brazil-green); }

/* End Screen Modal */
.end-screen-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.end-card {
  background: var(--surface-color);
  padding: 3rem;
  text-align: center;
  max-width: 500px;
  width: 90%;
}

.end-card h2 { font-size: 1.5rem; margin-bottom: 2rem; }

.winner-section { margin-bottom: 2rem; border: 3px solid var(--brazil-yellow); padding: 1.5rem; }
.winner-label { font-family: var(--font-pixel); font-size: 0.6rem; color: var(--text-secondary); margin-bottom: 10px; }
.winner-name { font-size: 2rem; color: var(--brazil-yellow); }

.final-report {
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 2.5rem;
  font-family: var(--font-mono); font-size: 1.5rem;
}

.report-item { display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding: 5px 0; }

canvas {
  width: 100%; height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.controls-hint {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  font-family: var(--font-pixel); font-size: 0.5rem;
  background: rgba(0,0,0,0.7); padding: 8px 15px; border: 2px solid white;
}
</style>