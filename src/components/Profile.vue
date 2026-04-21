<template>
  <div class="profile-container">
    <h2>Meu Perfil</h2>
    <form @submit.prevent="handleSubmit" class="profile-form">
      <div class="avatar-section">
        <div class="avatar-preview">
          <img :src="avatarPreview || userProfile.avatarUrl || '/icons.svg#user'" alt="Avatar" />
        </div>
        <div class="file-input-wrapper">
          <button type="button" class="secondary-btn" @click="$refs.fileInput.click()">
            Alterar Foto
          </button>
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileChange" 
            accept="image/*" 
            style="display: none" 
          />
        </div>
      </div>

      <div class="form-group">
        <label for="username">Nome de Usuário</label>
        <input 
          id="username" 
          v-model="formData.username" 
          type="text" 
          placeholder="Seu nome"
          required
        />
      </div>

      <div class="form-group">
        <label for="email">E-mail (não editável)</label>
        <input 
          id="email" 
          :value="userProfile.email" 
          type="email" 
          disabled 
          class="disabled-input"
        />
      </div>

      <!-- Statistics Section -->
      <div v-if="userProfile.stats" class="stats-section">
        <h3>Estatísticas de Combate</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">VITÓRIAS</span>
            <span class="stat-value wins">{{ userProfile.stats.wins }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">DERROTAS</span>
            <span class="stat-value losses">{{ userProfile.stats.losses }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">KILLS</span>
            <span class="stat-value kills">{{ userProfile.stats.totalKills }}</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="loading" class="primary-btn">
          {{ loading ? 'Salvando...' : 'Salvar Alterações' }}
        </button>
        <button type="button" @click="$emit('close')" class="cancel-btn">
          Voltar
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { userApi } from '../api/client';
import Swal from 'sweetalert2';

const emit = defineEmits(['close', 'updated']);

const userProfile = ref({});
const formData = ref({
  username: ''
});
const avatarFile = ref(null);
const avatarPreview = ref(null);
const loading = ref(false);

const fetchProfile = async () => {
  try {
    const response = await userApi.getProfile();
    userProfile.value = response.data;
    formData.value.username = response.data.username;
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Erro ao carregar perfil.',
    });
  }
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    avatarFile.value = file;
    avatarPreview.value = URL.createObjectURL(file);
  }
};

const handleSubmit = async () => {
  loading.value = true;

  try {
    const data = new FormData();
    if (formData.value.username !== userProfile.value.username) {
      data.append('username', formData.value.username);
    }
    if (avatarFile.value) {
      data.append('avatar', avatarFile.value);
    }

    if (data.entries().next().done) {
      Swal.fire({
        icon: 'info',
        title: 'Informação',
        text: 'Nenhuma alteração detectada.',
      });
      loading.value = false;
      return;
    }

    const response = await userApi.updateProfile(data);
    userProfile.value = response.data;
    Swal.fire({
      icon: 'success',
      title: 'Sucesso!',
      text: 'Perfil atualizado com sucesso!',
    });
    emit('updated', response.data);
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: err.response?.data?.error || 'Erro ao atualizar perfil.',
    });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProfile);
</script>

<style scoped>
.profile-container {
  max-width: 500px;
  width: 100%;
  margin: 2rem auto;
  padding: 2.5rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
}

h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 2rem;
  color: var(--brazil-yellow);
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.avatar-preview {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid var(--brazil-green);
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--glow-green);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.disabled-input {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  cursor: not-allowed;
  border-style: dashed;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.form-actions button {
  width: 100%;
}

.cancel-btn {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  transition: color 0.2s;
}

.cancel-btn:hover {
  color: var(--text-primary);
}

.stats-section {
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 3px solid black;
}

.stats-section h3 {
  font-family: var(--font-pixel);
  font-size: 0.8rem;
  color: var(--brazil-yellow);
  margin-bottom: 1.5rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background-color: rgba(0, 0, 0, 0.3);
  border: 3px solid black;
  padding: 10px;
  text-align: center;
  box-shadow: 2px 2px 0px black;
}

.stat-label {
  display: block;
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-family: var(--font-pixel);
  font-size: 0.9rem;
}

.stat-value.wins { color: var(--brazil-green); }
.stat-value.losses { color: var(--danger); }
.stat-value.kills { color: var(--brazil-yellow); }
</style>
