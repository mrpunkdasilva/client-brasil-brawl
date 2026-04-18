<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h2>Sala de Espera - {{ socketState.onlineUsers.length }} online</h2>
      <div class="header-btns">
        <button @click="createMatch" class="primary-btn">Criar Nova Partida</button>
        <button @click="refreshOnlineList" class="secondary-btn">Atualizar Lista</button>
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
              class="invite-btn"
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
              <button @click="acceptInvite(invite.inviteId)" class="accept-btn">Aceitar</button>
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

onMounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.emit('lobby:join', {}, (res) => {
      if (res.ok) socketState.onlineUsers = res.data.users;
    });
    socket.on('invite:accepted', handleInviteAccepted);
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('invite:accepted', handleInviteAccepted);
  }
});

const createMatch = async () => {
  try {
    const { data } = await matchApi.create({
      name: `Arena de Desafio`,
      password: '123',
      maxPlayers: 2
    });
    currentMatchId.value = data.matchId;
    alert('Sala criada! Agora clique em "Desafiar!" ao lado do nome de alguém.');
  } catch (err) {
    alert('Erro ao criar partida');
  }
};

const invitePlayer = (userId) => {
  const socket = getSocket();
  socket.emit('invite:send', { toUserId: userId, matchId: currentMatchId.value });
  alert('Desafio enviado! Aguarde o oponente aceitar.');
};

const acceptInvite = (inviteId) => {
  const socket = getSocket();
  socket.emit('invite:accept', { inviteId });
};
</script>

<style scoped>
.lobby-container { max-width: 1000px; margin: 0 auto; padding: 20px; color: #fff; }
.lobby-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #42b983; padding-bottom: 15px; }
.header-btns { display: flex; gap: 10px; }

.lists { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; min-height: 300px; }
h3 { margin-top: 0; color: #42b983; font-size: 1.2rem; margin-bottom: 20px; }

ul { list-style: none; padding: 0; margin: 0; }
li { padding: 12px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
li:last-child { border-bottom: none; }

.user-info { display: flex; align-items: center; gap: 10px; }
.status-dot { width: 10px; height: 10px; background: #42b983; border-radius: 50%; box-shadow: 0 0 5px #42b983; flex-shrink: 0; }
.user-avatar { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.user-avatar-placeholder { width: 40px; height: 40px; border-radius: 6px; background: #333; flex-shrink: 0; }
.user-details { display: flex; flex-direction: column; gap: 4px; }
.me-tag { color: #888; font-size: 0.8rem; }
.username { font-size: 1.1rem; }

.empty-msg { color: #666; font-style: italic; justify-content: center; padding: 40px 0; }

button { cursor: pointer; border-radius: 6px; border: none; font-weight: bold; transition: 0.2s; }
.primary-btn { background: #42b983; color: #fff; padding: 10px 20px; }
.secondary-btn { background: #333; color: #ccc; padding: 10px 20px; }
.invite-btn { background: #ff9800; color: #fff; padding: 6px 12px; font-size: 0.9rem; }
.accept-btn { background: #42b983; color: #fff; padding: 8px 16px; }

button:hover { filter: brightness(1.2); transform: translateY(-1px); }
button:active { transform: translateY(0); }
</style>
