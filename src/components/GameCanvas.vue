<template>
  <div class="game-wrapper">
    <div class="hud">
      <div class="hud-left">
        <div class="match-info">
          <p class="match-id">Sala: {{ matchId }}</p>
          <p class="match-status" :class="lastSnapshot?.status">
            {{ lastSnapshot?.status === 'running' ? 'Em Progresso' : 
               lastSnapshot?.status === 'countdown' ? 'Contagem Regressiva' : 
               lastSnapshot?.status === 'waiting' ? 'Aguardando' : 'Finalizada' }}
          </p>
        </div>
      </div>

      <div class="hud-center">
        <div class="game-timer" :class="{ 'timer-low': (lastSnapshot?.remainingMs || 0) < 30000 }">
          {{ formattedTime }}
        </div>
      </div>

      <div class="hud-right">
        <div v-if="myPlayer" class="player-stats">
          <div class="stat-item">
            <span class="stat-label">HP</span>
            <div class="hp-bar-container">
              <div class="hp-bar-fill" :style="{ width: myPlayer.hp + '%', backgroundColor: hpColor }"></div>
              <span class="hp-text">{{ Math.ceil(myPlayer.hp) }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-label">Placar</span>
            <span class="stat-value">{{ myPlayer.score }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mortes</span>
            <span class="stat-value">{{ myPlayer.deaths }}</span>
          </div>
        </div>
        <button @click="leaveMatch" class="leave-btn">Sair</button>
      </div>
    </div>

    <!-- Scoreboard Overlay -->
    <div class="scoreboard-mini" v-if="lastSnapshot?.players.length > 0">
      <div v-for="p in sortedPlayers" :key="p.playerId" class="score-row" :class="{ 'is-me': p.playerId === props.myUserId }">
        <span class="rank-name">{{ p.username }}</span>
        <span class="rank-score">{{ p.score }}</span>
      </div>
    </div>

    <div v-if="matchEnded" class="end-screen">
      <h2>Partida Finalizada!</h2>
      <div class="winner-announcement" v-if="winnerName">
        <p>VENCEDOR</p>
        <h3>{{ winnerName }}</h3>
      </div>
      <div class="final-stats" v-if="myPlayer">
        <p>Seu Placar: {{ myPlayer.score }}</p>
        <p>Suas Mortes: {{ myPlayer.deaths }}</p>
      </div>
      <button @click="leaveMatch">Voltar ao Lobby</button>
    </div>

    <canvas 
      ref="canvasRef" 
      width="1600" 
      height="900" 
      @mousemove="handleMouseMove" 
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
    ></canvas>
    
    <div class="controls-hint">WASD para mover | Mouse para mirar e atirar</div>
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
  if (!myPlayer.value) return '#00ff00';
  const hp = myPlayer.value.hp;
  if (hp > 50) return '#42b983';
  if (hp > 25) return '#ffaa00';
  return '#ff4444';
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

  if (isShooting.value) {
    socket.emit('match:input', {
      matchId: props.matchId,
      seq: ++inputSeq.value,
      action: 'shoot',
      payload: { direction: angle }
    });
  }
};

const leaveMatch = () => {
  const socket = getSocket();
  if (socket) {
    socket.emit('match:leave', { matchId: props.matchId });
  }
  emit('leave');
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Desenha fundo sempre
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!lastSnapshot.value) {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Aguardando snapshot do servidor...', canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(render);
    return;
  }

  // Projéteis
  ctx.fillStyle = '#ffff00';
  lastSnapshot.value.projectiles.forEach(prj => {
    ctx.beginPath();
    ctx.arc(prj.position.x, prj.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Jogadores
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

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(25 * scale, 0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${p.username}`, p.position.x, p.position.y - 55 * scale);

    ctx.fillStyle = '#333';
    ctx.fillRect(p.position.x - 25 * scale, p.position.y - 35 * scale, 50 * scale, 6);
    ctx.fillStyle = p.hp > 50 ? '#42b983' : p.hp > 25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(p.position.x - 25 * scale, p.position.y - 35 * scale, (p.hp / 100) * 50 * scale, 6);
  });

  requestAnimationFrame(render);
};

onMounted(() => {
  console.log('GameCanvas Mounted. MyUserId:', props.myUserId, 'MatchId:', props.matchId);
  const socket = getSocket();
  if (socket) {
    socket.emit('match:join', { matchId: props.matchId });
    socket.on('match:snapshot', (snapshot) => {
      console.log('Snapshot recebido:', snapshot);
      lastSnapshot.value = snapshot;
      if (snapshot.status === 'finished') matchEnded.value = true;
    });
    socket.on('match:ended', () => {
      matchEnded.value = true;
    });
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
.game-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-family: 'Arial', sans-serif;
  z-index: 10;
}

.hud-left {
  display: flex;
  align-items: center;
}

.match-info {
  margin-right: 20px;
}

.match-id {
  font-size: 18px;
  margin: 0;
}

.match-status {
  font-size: 14px;
  margin: 0;
}

.hud-center {
  flex-grow: 1;
  text-align: center;
}

.game-timer {
  font-size: 24px;
  font-weight: bold;
}

.timer-low {
  color: #ff4444;
}

.hud-right {
  display: flex;
  align-items: center;
}

.player-stats {
  display: flex;
  gap: 10px;
  margin-right: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #ccc;
}

.hp-bar-container {
  width: 100px;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.hp-bar-fill {
  height: 100%;
  transition: width 0.2s;
}

.hp-text {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: white;
}

.leave-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: white;
  background: #e63946;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.leave-btn:hover {
  background: #d62839;
}

/* Scoreboard styles */
.scoreboard-mini {
  position: absolute;
  top: 60px;
  right: 20px;
  width: 200px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  overflow: hidden;
  z-index: 10;
}

.score-row {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.score-row:last-child {
  border-bottom: none;
}

.is-me {
  font-weight: bold;
  color: #00ccff;
}

/* End screen styles */
.end-screen {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-family: 'Arial', sans-serif;
  z-index: 20;
}

.winner-announcement {
  margin-bottom: 20px;
}

.final-stats {
  margin-bottom: 20px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  color: white;
  background: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background: #0056b3;
}

/* Canvas styles */
canvas {
  display: block;
  background: #1a1a1a;
  max-width: 100%;
  max-height: calc(100vh - 50px);
  border: 1px solid #333;
  margin: 0 auto;
}

/* Controls hint styles */
.controls-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: #ccc;
  text-align: center;
}
</style>
