<template>
  <div class="character-create">
    <h3>Criar Novo Lutador</h3>
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label>Nome do Personagem</label>
        <input v-model="name" type="text" placeholder="Ex: Galvão Bueno" required />
      </div>
      
      <div class="field">
        <label>Foto do Lutador</label>
        <input type="file" @change="handleFileChange" accept="image/*" required />
      </div>

      <div v-if="previewUrl" class="preview">
        <p>Prévia:</p>
        <img :src="previewUrl" alt="Preview" />
      </div>

      <div class="actions">
        <button type="button" @click="$emit('cancel')" class="cancel-btn">Cancelar</button>
        <button type="submit" :disabled="loading" class="save-btn">
          {{ loading ? 'Enviando...' : 'Salvar Lutador' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { characterApi } from '../api/client';
import Swal from 'sweetalert2';

const emit = defineEmits(['cancel', 'created']);
const name = ref('');
const imageFile = ref(null);
const previewUrl = ref(null);
const loading = ref(false);

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    imageFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
};

const handleSubmit = async () => {
  if (!name.value || !imageFile.value) return;

  loading.value = true;
  const formData = new FormData();
  formData.append('name', name.value);
  formData.append('image', imageFile.value);

  try {
    await characterApi.create(formData);
    Swal.fire({
      icon: 'success',
      title: 'Sucesso!',
      text: 'Lutador criado com sucesso!',
    });
    emit('created');
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: err.response?.data?.error || 'Erro ao criar lutador. Verifique se o nome já existe.',
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.character-create {
  max-width: 500px;
  width: 100%;
  margin: 2rem auto;
  padding: 2.5rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
}

h3 {
  margin-top: 0;
  margin-bottom: 2rem;
  color: var(--brazil-yellow);
  font-size: 1.5rem;
  text-align: center;
}

.field {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.preview p {
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.preview img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 16px;
  border: 3px solid var(--brazil-green);
  box-shadow: var(--glow-green);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.actions button {
  flex: 1;
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  box-shadow: none;
}

.cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: var(--text-secondary);
  color: var(--text-primary);
  box-shadow: none;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
</style>
