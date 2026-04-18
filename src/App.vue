<template>
  <div id="app">
    <header>
      <div class="logo-title">
        <img src="./assets/logo.svg" alt="Brasil Brawl Logo" class="logo-img" />
        <h1>Brasil Brawl</h1>
      </div>
      <div class="header-actions" v-if="user">
        <button v-if="view === 'LOBBY'" @click="view = 'CHAR_CREATE'">Novo Lutador</button>
        <button v-if="view === 'LOBBY'" @click="view = 'PROFILE'">Meu Perfil</button>
        <button @click="logout">Sair</button>
      </div>
    </header>

    <main>
      <AuthForm v-if="view === 'AUTH'" @auth-success="handleAuthSuccess" />
      
      <Lobby 
        v-else-if="view === 'LOBBY'" 
        :myUserId="user?.id" 
        @match-joined="handleMatchJoined" 
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
import { connectSocket, disconnectSocket } from './socket';
import { getAuthSession, clearAuthSession } from './utils/storage.js';

const view = ref('AUTH');
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

const handleAuthSuccess = (token) => {
  const payload = parseJwt(token);
  user.value = { id: payload.sub, username: payload.name };
  connectSocket(token);
  view.value = 'LOBBY';
};

const handleProfileUpdated = (updatedUser) => {
  user.value = { ...user.value, username: updatedUser.username };
};

const handleMatchJoined = (id) => {
  matchId.value = id;
  view.value = 'CHAR_SELECT';
};

const handleCharacterCreated = () => {
  view.value = 'LOBBY';
};

const logout = () => {
  clearAuthSession();
  user.value = null;
  disconnectSocket();
  view.value = 'AUTH';
};

onMounted(() => {
  // Try to restore session from secure storage
  const authSession = getAuthSession();
  if (authSession && authSession.accessToken) {
    handleAuthSuccess(authSession.accessToken);
  }
});
</script>

<style>
#app { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
header { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: #2c3e50; color: white; }
header h1 { margin: 0; font-size: 1.5rem; }
.logo-title { display: flex; align-items: center; gap: 15px; }
.logo-img { width: 40px; height: 40px; }
.header-actions { display: flex; gap: 10px; }
main { padding: 20px; }
button { cursor: pointer; padding: 8px 15px; border-radius: 4px; border: none; background: #42b983; color: white; font-weight: bold; }
button:hover { background: #3aa876; }
</style>
