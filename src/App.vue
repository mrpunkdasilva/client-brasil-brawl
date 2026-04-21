<template>
  <div id="app">
    <header>
      <div class="logo-title">
        <img src="./assets/logo.svg" alt="Brasil Brawl Logo" class="logo-img" />
        <h1>Brasil Brawl</h1>
      </div>
      <div class="header-actions" v-if="user">
        <button class="accent" v-if="view === 'LOBBY'" @click="navigateToRanking">Ranking</button>
        <button class="primary" v-if="view === 'LOBBY'" @click="view = 'CHAR_CREATE'">Novo Lutador</button>
        <button class="secondary" v-if="view === 'LOBBY'" @click="view = 'PROFILE'">Meu Perfil</button>
        <button class="danger" @click="logout">Sair</button>
      </div>
    </header>

    <main>
      <div v-if="view === 'LOADING'" class="loading-screen">
        <h2>CARREGANDO...</h2>
      </div>

      <AuthForm v-else-if="view === 'AUTH'" @auth-success="handleAuthSuccess" />
      
      <Lobby 
        v-else-if="view === 'LOBBY'" 
        :myUserId="user?.id" 
        @match-joined="handleMatchJoined" 
      />

      <Ranking 
        v-else-if="view === 'RANKING'" 
        @close="navigateToLobby" 
      />

      <CharacterCreate 
        v-else-if="view === 'CHAR_CREATE'" 
        @cancel="view = 'LOBBY'" 
        @created="handleCharacterCreated"
      />

      <Profile 
        v-else-if="view === 'PROFILE'" 
        @close="view = 'LOBBY'" 
        @updated="handleProfileUpdated"
      />

      <CharacterSelect 
        v-else-if="view === 'CHAR_SELECT'" 
        :matchId="matchId" 
        @character-confirmed="view = 'ARENA'" 
      />

      <GameCanvas 
        v-else-if="view === 'ARENA'" 
        :matchId="matchId" 
        :myUserId="user?.id" 
        @leave="view = 'LOBBY'"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AuthForm from './components/AuthForm.vue';
import Lobby from './components/Lobby.vue';
import CharacterSelect from './components/CharacterSelect.vue';
import CharacterCreate from './components/CharacterCreate.vue';
import GameCanvas from './components/GameCanvas.vue';
import Profile from './components/Profile.vue';
import Ranking from './components/Ranking.vue';
import { connectSocket, disconnectSocket } from './socket';
import { getAuthSession, clearAuthSession } from './utils/storage.js';

const view = ref('LOADING');
const user = ref(null);
const matchId = ref(null);

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Immediate state initialization to prevent flashing
const authSession = getAuthSession();
if (authSession && authSession.accessToken) {
  const payload = parseJwt(authSession.accessToken);
  if (payload) {
    user.value = { id: payload.sub, username: payload.name };
    connectSocket(authSession.accessToken);

    const path = window.location.pathname;
    if (path.startsWith('/match/')) {
      matchId.value = path.split('/')[2];
      view.value = 'CHAR_SELECT';
    } else if (path === '/ranking') {
      view.value = 'RANKING';
    } else {
      view.value = 'LOBBY';
    }
  } else {
    view.value = 'AUTH';
  }
} else {
  view.value = 'AUTH';
}

const handleAuthSuccess = (token) => {
  const payload = parseJwt(token);
  user.value = { id: payload.sub, username: payload.name };
  connectSocket(token);
  view.value = 'LOBBY';
  window.history.pushState({}, '', '/lobby');
};

const handleProfileUpdated = (updatedUser) => {
  user.value = { ...user.value, username: updatedUser.username };
};

const handleMatchJoined = (id) => {
  matchId.value = id;
  view.value = 'CHAR_SELECT';
  window.history.pushState({}, '', `/match/${id}`);
};

const handleCharacterCreated = () => {
  navigateToLobby();
};

const navigateToLobby = () => {
  view.value = 'LOBBY';
  window.history.pushState({}, '', '/lobby');
};

const navigateToRanking = () => {
  view.value = 'RANKING';
  window.history.pushState({}, '', '/ranking');
};

const logout = () => {
  clearAuthSession();
  user.value = null;
  disconnectSocket();
  view.value = 'AUTH';
  window.history.pushState({}, '', '/login');
};

onMounted(() => {
  // Sync URL state if necessary
  const path = window.location.pathname;
  if (view.value === 'AUTH' && path !== '/login') {
    window.history.replaceState({}, '', '/login');
  } else if (view.value === 'LOBBY' && (path === '/' || path === '')) {
    window.history.replaceState({}, '', '/lobby');
  }

  // Handle browser back/forward buttons
  window.onpopstate = () => {
    const path = window.location.pathname;
    if (path === '/login') view.value = 'AUTH';
    else if (path === '/lobby') view.value = 'LOBBY';
    else if (path === '/ranking') view.value = 'RANKING';
    else if (path.startsWith('/match/')) {
      matchId.value = path.split('/')[2];
      view.value = 'CHAR_SELECT';
    }
  };
});
</script>

<style>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background-color: var(--surface-color);
  border: 3px solid black;
  margin-top: 5px;
  box-shadow: 3px 3px 0px 0px black;
  position: sticky;
  top: 5px;
  z-index: 100;
}

.logo-img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

main {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

@media (max-width: 768px) {
  header {
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
    position: relative;
    top: 0;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>