<template>
  <div class="ranking-container card">
    <h2>Mural da Fama</h2>
    <p class="subtitle">TOP 10 GUERREIROS</p>

    <div v-if="loading" class="loading-msg">BUSCANDO RANKING...</div>
    
    <div v-else-if="ranking.length === 0" class="empty-msg">
      A ARENA AINDA NÃO TEM CAMPEÕES.
    </div>

    <div v-else class="ranking-content">
      <div class="ranking-header">
        <span class="col-pos">#</span>
        <span class="col-user">LUTADOR</span>
        <span class="col-stat">VITÓRIAS</span>
        <span class="col-stat">KILLS</span>
      </div>
      
      <ul class="ranking-list">
        <li v-for="(player, index) in ranking" :key="player.userId" class="ranking-row" :class="'rank-' + (index + 1)">
          <div class="rank-pos">{{ index + 1 }}</div>
          <div class="rank-user">{{ player.username }}</div>
          <div class="rank-stat wins">{{ player.wins }}</div>
          <div class="rank-stat kills">{{ player.totalKills }}</div>
        </li>
      </ul>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('close')">VOLTAR</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { userApi } from '../api/client';
import Swal from 'sweetalert2';

const emit = defineEmits(['close']);
const ranking = ref([]);
const loading = ref(true);

const fetchRanking = async () => {
  try {
    const response = await userApi.getRanking();
    ranking.value = response.data;
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro!',
      text: 'Não foi possível carregar o ranking.',
    });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchRanking);
</script>

<style scoped>
.ranking-container {
  max-width: 700px;
  width: 100%;
  margin: 1rem auto;
  text-align: center;
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--brazil-yellow);
  margin-bottom: 2rem;
  letter-spacing: 2px;
}

.ranking-content {
  margin-bottom: 2rem;
}

.ranking-header {
  display: grid;
  grid-template-columns: 80px 1fr 140px 140px; /* Synchronized with rows */
  padding: 15px;
  font-family: var(--font-pixel);
  font-size: 0.5rem; /* Increased from 0.4rem */
  color: var(--text-secondary);
  text-align: left;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
}

.ranking-header span {
  display: block;
}

.ranking-header .col-stat { text-align: center; }

.ranking-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-row {
  display: grid;
  grid-template-columns: 80px 1fr 140px 140px; /* Synchronized with header */
  align-items: center;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.4);
  border: 3px solid black;
  box-shadow: 4px 4px 0px black;
  font-family: var(--font-mono);
  font-size: 1.6rem; /* Slightly larger for better reading */
  text-align: left;
}

.rank-pos {
  font-family: var(--font-pixel);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.rank-user {
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-stat {
  font-family: var(--font-pixel);
  font-size: 0.7rem; /* Increased from 0.6rem */
  text-align: center;
}

.rank-stat.wins { color: var(--brazil-green); }
.rank-stat.kills { color: var(--brazil-yellow); }

/* Podiums */
.rank-1 { border-color: var(--brazil-yellow); background: rgba(254, 223, 0, 0.1); }
.rank-1 .rank-pos { color: var(--brazil-yellow); }

.rank-2 { border-color: #c0c0c0; background: rgba(192, 192, 192, 0.05); }
.rank-2 .rank-pos { color: #c0c0c0; }

.rank-3 { border-color: #cd7f32; background: rgba(205, 127, 50, 0.05); }
.rank-3 .rank-pos { color: #cd7f32; }

.actions {
  margin-top: 2rem;
}

.loading-msg, .empty-msg {
  padding: 4rem 0;
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  color: var(--text-secondary);
  line-height: 2;
}
</style>