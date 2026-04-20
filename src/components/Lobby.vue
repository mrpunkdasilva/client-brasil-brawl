<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h2>Sala de Espera - {{ socketState.onlineUsers.length }} online</h2>
      <div class="header-btns">
        <button @click="createMatch" class="primary">Criar Nova Partida</button>
        <button @click="refreshOnlineList" class="secondary">Atualizar Lista</button>
      </div>
    </div>


    <div class="lists">
      <div class="card online-card">
        <h3>Lutadores Online</h3>
        <ul>
          <li v-for="user in sortedOnlineUsers" :key="user.userId" class="user-item" :class="{ 'is-me': user.userId === props.myUserId }">
            <div class="user-info">
              <span class="status-dot"></span>
              <img v-if="user.imageUrl" :src="user.imageUrl" :alt="user.username" class="user-avatar">
              <div v-else class="user-avatar-placeholder"></div>
              <div class="user-details">
                <strong class="username">{{ user.username || 'Desconhecido' }}</strong>
                <span v-if="user.userId === props.myUserId" class="me-tag">(Você)</span>
              </div>
            </div>
            <button
              @click="invitePlayer(user.userId)"
              v-if="currentMatchId && user.userId !== props.myUserId"
              class="invite-btn accent"
            >
              Desafiar!
            </button>
          </li>
          <li v-if="socketState.onlineUsers.length === 0" class="empty-msg">
            Ninguém por aqui ainda...
          </li>
        </ul>
      </div>

      <div class="card invites-card">
        <h3>Desafios Recebidos</h3>
        <ul>
          <li v-for="invite in socketState.invites" :key="invite.inviteId" class="invite-item">
            <div class="invite-info">
              <span><strong>{{ getSenderName(invite.fromUserId) }}</strong> te chamou pro pau!</span>
            </div>
            <div class="invite-actions">
              <button @click="acceptInvite(invite.inviteId)" class="primary">Aceitar</button>
            </div>
          </li>
          <li v-if="socketState.invites.length === 0" class="empty-msg">
            Sem desafios por enquanto.
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed } from 'vue';
import { socketState, getSocket } from '../socket';
import { matchApi } from '../api/client';
import Swal from 'sweetalert2';

const props = defineProps(['myUserId']);
const emit = defineEmits(['match-joined']);
const currentMatchId = ref(null);

const sortedOnlineUsers = computed(() => {
  return [...socketState.onlineUsers].sort((a, b) => {
    if (a.userId === props.myUserId) return -1;
    if (b.userId === props.myUserId) return 1;
    return 0;
  });
});
const getSenderName = (userId) => {
  const user = socketState.onlineUsers.find(u => u.userId === userId);
  return user ? user.username : `Jogador #${userId.slice(0, 4)}`;
};

const refreshOnlineList = () => {
  const socket = getSocket();
  if (socket) {
    socket.emit('lobby:onlineUsers', {}, (res) => {
      if (res.ok) socketState.onlineUsers = res.data.users;
    });
  }
};

const handleInviteAccepted = (data) => {
  emit('match-joined', data.matchId);
};

const joinLobby = () => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit('lobby:join', {}, (res) => {
      if (res.ok) socketState.onlineUsers = res.data.users;
    });
  } else if (socket) {
    // If socket exists but not yet connected, wait for it
    socket.once('connect', () => {
      socket.emit('lobby:join', {}, (res) => {
        if (res.ok) socketState.onlineUsers = res.data.users;
      });
    });
  }
};

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    joinLobby();
    socket.on('invite:accepted', handleInviteAccepted);
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('invite:accepted', handleInviteAccepted);
  }
  socketState.invites = [];
});

const createMatch = async () => {
  try {
    const { data } = await matchApi.create({
      name: `Arena de Desafio`,
      password: '123',
      maxPlayers: 2
    });
    currentMatchId.value = data.matchId;
    Swal.fire({
      icon: 'success',
      title: 'Sala criada!',
      text: 'Agora clique em "Desafiar!" ao lado do nome de alguém.',
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Erro ao criar partida',
    });
  }
};

const invitePlayer = (userId) => {
  const socket = getSocket();
  socket.emit('invite:send', { toUserId: userId, matchId: currentMatchId.value });
  Swal.fire({
    icon: 'info',
    title: 'Desafio enviado!',
    text: 'Aguarde o oponente aceitar.',
  });
};

const acceptInvite = (inviteId) => {
  const socket = getSocket();
  socket.emit('invite:accept', { inviteId });
  socketState.invites = socketState.invites.filter(i => i.inviteId !== inviteId);
};
</script>

<style scoped>
.lobby-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background-color: var(--surface-color);
  border: 3px solid black;
  box-shadow: 4px 4px 0px 0px black;
  flex-wrap: wrap;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .lobby-header {
    flex-direction: column;
    text-align: center;
  }
  
  .header-btns {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .lists {
    grid-template-columns: 1fr !important;
  }
}

.lobby-header h2 {
  font-size: 0.8rem;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 200px;
  letter-spacing: 2px;
}

.header-btns {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.card {
  background: var(--surface-color);
  border: 3px solid black;
  padding: 1.5rem;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 4px 0px 0px black;
  position: relative;
  overflow: hidden;
}

h3 {
  margin-top: 0;
  color: var(--brazil-yellow);
  font-size: 0.7rem;
  margin-bottom: 1.5rem;
  border-left: 8px solid var(--brazil-yellow);
  padding-left: 10px;
  letter-spacing: 2px;
}

li {
  padding: 1rem;
  border-bottom: 3px solid black;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  background-color: rgba(0,0,0,0.3);
  transition: transform 0.1s;
  position: relative;
  z-index: 2;
}

li.is-me {
  background-color: rgba(0, 155, 58, 0.2);
  border: 3px solid var(--brazil-green);
  box-shadow: inset 0 0 10px rgba(0, 155, 58, 0.3);
  animation: mePulse 2s infinite ease-in-out;
}

@keyframes mePulse {
  0% { border-color: var(--brazil-green); }
  50% { border-color: var(--brazil-yellow); }
  100% { border-color: var(--brazil-green); }
}

li.is-me .username {
  color: var(--brazil-green);
  text-shadow: 2px 2px 0px black;
}

li:hover {
  transform: translateX(5px);
  background-color: rgba(255, 255, 255, 0.05);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-dot {
  width: 10px;
  height: 10px;
  background-color: var(--brazil-green);
  box-shadow: 2px 2px 0px 0px black;
  flex-shrink: 0;
}

.user-avatar, .user-avatar-placeholder {
  width: 44px;
  height: 44px;
  border: 3px solid black;
  flex-shrink: 0;
  image-rendering: pixelated;
  object-fit: cover;
}

.user-avatar-placeholder {
  background-color: #555;
}

.user-details {
  display: flex;
  align-items: center;
}

.username {
  font-size: 1.4rem;
  font-family: var(--font-mono);
  color: var(--text-primary);
  letter-spacing: 2px;
}

.me-tag {
  color: var(--brazil-yellow);
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  margin-left: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.invite-btn {
  padding: 10px 14px;
  font-size: 0.5rem;
  letter-spacing: 1px;
}

.empty-msg {
  font-size: 1.4rem;
  padding: 4rem 1rem;
  font-family: var(--font-mono);
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  letter-spacing: 2px;
  position: relative;
  z-index: 2;
}
</style>