<template>
  <div class="character-select">
    <h3>Selecione seu Personagem</h3>
    <div class="characters-grid" v-if="characters.length">
      <div 
        v-for="char in characters" 
        :key="char.id" 
        :class="['char-card', { selected: selectedId === char.id, 'animate-select': selectedId === char.id }]"
        @click="selectChar(char.id)"
      >
        <img :src="char.imageUrl" :alt="char.name" />
        <p>{{ char.name }}</p>
      </div>
    </div>
    <div v-else>
      <p>Nenhum personagem encontrado. Crie um novo!</p>
      <input v-model="newName" placeholder="Nome do Personagem" />
      <button @click="createTestCharacter">Criar Personagem de Teste</button>
    </div>
    <button v-if="selectedId" class="ready-btn" @click="confirmSelection">Estou Pronto!</button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { characterApi } from '../api/client';
import { getSocket } from '../socket';
import Swal from 'sweetalert2';

const props = defineProps(['matchId']);
const emit = defineEmits(['character-confirmed']);
const characters = ref([]);
const selectedId = ref(null);
const newName = ref('');

const loadCharacters = async () => {
  try {
    const { data } = await characterApi.list();
    characters.value = data;
  } catch (err) {
    console.error('Erro ao carregar personagens');
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Erro ao carregar personagens',
    });
  }
};

onMounted(loadCharacters);

const selectChar = (id) => {
  selectedId.value = id;
};

const createTestCharacter = async () => {
  if (!newName.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Aviso',
      text: 'Dê um nome ao herói!',
    });
    return;
  }

  // Como o backend exige um arquivo real via multer, vamos usar um mock ou alertar
  // Para simplificar, vou assumir que você vai criar via Postman ou eu crio uma rota de semente depois
  Swal.fire({
    icon: 'info',
    title: 'Informação',
    text: 'Funcionalidade de upload requer um arquivo. Por favor, use um personagem já existente ou adicione um via API.',
  });
};

const confirmSelection = () => {
  const socket = getSocket();
  socket.emit('match:select_character', { 
    matchId: props.matchId, 
    characterId: selectedId.value 
  }, (res) => {
    if (res.ok) {
      emit('character-confirmed');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: res.reason || 'Erro ao selecionar personagem',
      });
    }
  });
};
</script>

<style scoped>
.character-select {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

h3 {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.char-card {
  background-color: var(--surface-color);
  border: 4px solid black;
  padding: 1.5rem;
  cursor: pointer;
  box-shadow: 4px 4px 0px 0px black;
  transition: transform 0.1s;
}

.char-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px 0px black;
  border-color: var(--brazil-green);
}

.char-card img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 4px solid black;
  margin-bottom: 1rem;
  image-rendering: pixelated;
}

.char-card p {
  margin: 0;
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  color: var(--text-secondary);
}

.char-card.selected {
  border-color: var(--brazil-yellow);
  background-color: rgba(254, 223, 0, 0.1);
  box-shadow: 8px 8px 0px 0px black;
  transform: translate(-4px, -4px);
}

.char-card.selected img {
  border-color: var(--brazil-yellow);
}

.char-card.selected p {
  color: var(--brazil-yellow);
}

.ready-btn {
  margin-top: 3rem;
  padding: 1.5rem 3rem;
  font-size: 1rem;
}

.animate-select {
  animation: selectAnimation 0.2s steps(2);
}

@keyframes selectAnimation {
  0% { transform: translate(-2px, -2px); }
  100% { transform: translate(-4px, -4px); }
}

.empty-state {
  padding: 3rem;
  border: 4px dashed #555;
  background-color: var(--surface-color);
}
</style>
