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

      <div class="form-actions">
        <button type="submit" :disabled="loading" class="primary-btn">
          {{ loading ? 'Salvando...' : 'Salvar Alterações' }}
        </button>
        <button type="button" @click="$emit('close')" class="cancel-btn">
          Voltar
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="success" class="success-msg">{{ success }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { userApi } from '../api/client';

const emit = defineEmits(['close', 'updated']);

const userProfile = ref({});
const formData = ref({
  username: ''
});
const avatarFile = ref(null);
const avatarPreview = ref(null);
const loading = ref(false);
const error = ref('');
const success = ref('');

const fetchProfile = async () => {
  try {
    const response = await userApi.getProfile();
    userProfile.value = response.data;
    formData.value.username = response.data.username;
  } catch (err) {
    error.value = 'Erro ao carregar perfil.';
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
  error.value = '';
  success.value = '';

  try {
    const data = new FormData();
    if (formData.value.username !== userProfile.value.username) {
      data.append('username', formData.value.username);
    }
    if (avatarFile.value) {
      data.append('avatar', avatarFile.value);
    }

    if (data.entries().next().done) {
      success.value = 'Nenhuma alteração detectada.';
      loading.value = false;
      return;
    }

    const response = await userApi.updateProfile(data);
    userProfile.value = response.data;
    success.value = 'Perfil atualizado com sucesso!';
    emit('updated', response.data);
  } catch (err) {
    error.value = err.response?.data?.error || 'Erro ao atualizar perfil.';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProfile);
</script>

<style scoped>
.profile-container {
  max-width: 400px;
  margin: 0 auto;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

h2 {
  text-align: center;
  margin-bottom: 25px;
  color: #2c3e50;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #42b983;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: bold;
  font-size: 0.9rem;
  color: #666;
}

input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.disabled-input {
  background: #f5f5f5;
  color: #888;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.primary-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.secondary-btn {
  background: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.cancel-btn {
  background: transparent;
  color: #666;
  border: none;
  padding: 8px;
  cursor: pointer;
  text-decoration: underline;
}

.error-msg {
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
}

.success-msg {
  color: #27ae60;
  font-size: 0.9rem;
  text-align: center;
}
</style>
