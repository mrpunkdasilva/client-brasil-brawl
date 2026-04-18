<template>
  <div class="character-select">
    <h3>Selecione seu Personagem</h3>
    <div class="characters-grid" v-if="characters.length">
      <div 
        v-for="char in characters" 
        :key="char.id" 
        :class="['char-card', { selected: selectedId === char.id }]"
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
  }
};

onMounted(loadCharacters);

const selectChar = (id) => {
  selectedId.value = id;
};

const createTestCharacter = async () => {
  if (!newName.value) return alert('Dê um nome ao herói!');
  
  // Como o backend exige um arquivo real via multer, vamos usar um mock ou alertar
  // Para simplificar, vou assumir que você vai criar via Postman ou eu crio uma rota de semente depois
  alert('Funcionalidade de upload requer um arquivo. Por favor, use um personagem já existente ou adicione um via API.');
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
      alert(res.reason || 'Erro ao selecionar personagem');
    }
  });
};
</script>

<style scoped>
.character-select { text-align: center; padding: 20px; }
.characters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; margin: 20px 0; }
.char-card { border: 2px solid transparent; padding: 10px; cursor: pointer; transition: 0.3s; }
.char-card img { width: 100px; height: 100px; object-fit: cover; border-radius: 50%; }
.char-card.selected { border-color: #42b983; background: #e7f9f1; }
.ready-btn { margin-top: 20px; padding: 10px 20px; background: #42b983; color: white; border: none; border-radius: 4px; font-weight: bold; }
</style>
