<template>
  <div class="game-layout">
    <!-- Header HUD (External to Canvas) -->
    <header class="arena-hud" v-if="!matchEnded">
      <div class="hud-item match-meta">
        <div class="label">SALA</div>
        <div class="value">{{ matchId.slice(0, 8) }}...</div>
        <div class="status-tag" :class="lastSnapshot?.status">{{ statusText }}</div>
      </div>

      <div class="hud-item timer-box">
        <div class="game-timer" :class="{ 'timer-low': isTimerLow }">
          {{ formattedTime }}
        </div>
      </div>

      <div class="hud-item player-vitals" v-if="myPlayer">
        <div class="vital-row">
          <span class="label">HP</span>
          <div class="pixel-hp-bar">
            <div class="hp-fill" :style="{ width: myPlayer.hp + '%', backgroundColor: hpColor }"></div>
            <span class="hp-num">{{ Math.ceil(myPlayer.hp) }}</span>
          </div>
        </div>
        <div class="stats-row">
          <div class="stat"><span class="label">PTS:</span> {{ myPlayer.score }}</div>
          <div class="stat"><span class="label">KOs:</span> {{ myPlayer.deaths }}</div>
        </div>
      </div>
      
      <button @click="leaveMatch" class="danger leave-btn">SAIR</button>
    </header>

    <!-- Main Game Area -->
    <div class="arena-body">
      <div class="canvas-wrap pixel-border">
        <canvas 
          ref="canvasRef" 
          width="1600" 
          height="900" 
          @mousemove="handleMouseMove" 
          @mousedown="handleMouseDown"
          @mouseup="handleMouseUp"
        ></canvas>
        <div class="controls-hint" v-if="!matchEnded">WASD: MOVER | MOUSE: ATIRAR</div>
      </div>

      <!-- Ranking Sidebar (External to Canvas) -->
      <aside class="ranking-side pixel-border" v-if="!matchEnded">
        <div class="side-header">RANKING</div>
        <div class="scroll-area">
          <div v-for="p in sortedPlayers" :key="p.playerId" class="score-row" :class="{ 'is-me': p.playerId === props.myUserId }">
            <span class="rank-name">{{ p.username }}</span>
            <span class="rank-score">{{ p.score }}</span>
          </div>
        </div>
      </aside>
    </div>

    <!-- Final Result Modal -->
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
  if (hp > 50) return '#00ff00';
  if (hp > 25) return '#ffff00';
  return '#ff0000';
});

const isTimerLow = computed(() => (lastSnapshot.value?.remainingMs || 0) < 30000);

const statusText = computed(() => {
  if (!lastSnapshot.value) return 'CONECTANDO...';
  const status = lastSnapshot.value.status;
  if (status === 'running') return 'ARENA ABERTA';
  if (status === 'countdown') return 'PREPARE-SE!';
  if (status === 'waiting') return 'AGUARDANDO...';
  if (status === 'finished') return 'FINALIZADA';
  return 'INICIANDO...';
});

const formattedTime = computed(() => {
  if (!lastSnapshot.value) return '00:00';
  const ms = lastSnapshot.value.remainingMs || 0;
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

const joinMatch = () => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit('match:join', { matchId: props.matchId });
  } else if (socket) {
    socket.once('connect', () => {
      socket.emit('match:join', { matchId: props.matchId });
    });
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
    ctx.fillText('CONECTANDO...', canvas.width / 2, canvas.height / 2);
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
    ctx.font = '14px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, p.position.x, p.position.y - 45 * scale);

    ctx.fillStyle = '#333';
    ctx.fillRect(p.position.x - 20 * scale, p.position.y - 35 * scale, 40 * scale, 4);
    ctx.fillStyle = p.hp > 50 ? '#00ff00' : p.hp > 25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(p.position.x - 20 * scale, p.position.y - 35 * scale, (p.hp / 100) * 40 * scale, 4);
  });

  requestAnimationFrame(render);
};

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    joinMatch();
    socket.on('match:snapshot', (snapshot) => {
      lastSnapshot.value = snapshot;
      if (snapshot.status === 'finished') matchEnded.value = true;
    });
    socket.on('match:ended', () => { matchEnded.value = true; });
    socket.on('match:player:joined', () => {
      socket.emit('match:start', { matchId: props.matchId });
    });
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
.game-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 80px);
  gap: 10px;
}

/* External HUD */
.arena-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--surface-color);
  border: 3px solid black;
  padding: 10px 20px;
  box-shadow: 4px 4px 0px black;
  font-family: var(--font-pixel);
}

.hud-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.match-meta { align-items: flex-start; }
.timer-box { align-items: center; }
.player-vitals { align-items: flex-end; }

.label { color: var(--text-secondary); font-size: 0.5rem; }
.value { font-family: var(--font-mono); font-size: 1.2rem; }

.game-timer { font-size: 1.8rem; color: var(--brazil-yellow); text-shadow: 2px 2px 0px black; }
.timer-low { color: #ff0000; animation: pulse 0.5s infinite alternate; }

.pixel-hp-bar {
  width: 150px; height: 18px;
  background: #333; border: 2px solid white;
  position: relative;
}
.hp-fill { height: 100%; transition: width 0.2s; }
.hp-num {
  position: absolute; width: 100%; text-align: center;
  top: 50%; transform: translateY(-50%);
  font-size: 0.5rem; color: white; text-shadow: 1px 1px 0px black;
}

.stats-row { display: flex; gap: 15px; font-family: var(--font-mono); font-size: 1.2rem; }

/* Arena Body (Canvas + Sidebar) */
.arena-body {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
}

.canvas-wrap {
  flex: 1;
  position: relative;
  background-color: #080c14;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

/* External Ranking Sidebar */
.ranking-side {
  width: 200px;
  background-color: var(--surface-color);
  display: flex;
  flex-direction: column;
  padding: 10px;
  box-shadow: 4px 4px 0px black;
}

.side-header {
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  color: var(--brazil-yellow);
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 2px solid black;
  margin-bottom: 10px;
}

.scroll-area { flex: 1; overflow-y: auto; }

.score-row {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono); font-size: 1.3rem;
  padding: 5px 0;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}
.score-row.is-me { color: var(--brazil-yellow); background: rgba(254, 223, 0, 0.1); padding: 5px; }

.controls-hint {
  position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
  font-family: var(--font-pixel); font-size: 0.4rem;
  background: rgba(0,0,0,0.8); padding: 5px 10px; border: 1px solid white;
}

/* End Screen Modal */
.end-screen-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.end-card {
  background: var(--surface-color); padding: 2rem;
  text-align: center; max-width: 450px; width: 90%;
}

.winner-section { margin-bottom: 1.5rem; border: 3px solid var(--brazil-yellow); padding: 1rem; }
.winner-name { font-size: 1.8rem; color: var(--brazil-yellow); font-family: var(--font-pixel); }

.final-report {
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 2rem; font-family: var(--font-mono);
}
.report-item {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 2px solid #444; padding: 8px 0; font-size: 1.4rem;
}
.report-item .value { font-family: var(--font-pixel); font-size: 1rem; color: var(--brazil-yellow); }

@keyframes pulse { from { opacity: 1; } to { opacity: 0.3; } }
</style>