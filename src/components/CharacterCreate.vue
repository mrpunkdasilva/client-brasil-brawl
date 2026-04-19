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
.character-create { max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
.field { margin-bottom: 20px; display: flex; flex-direction: column; text-align: left; }
.field label { font-weight: bold; margin-bottom: 5px; }
input { padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.preview { margin: 20px 0; }
.preview img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #42b983; }
.actions { display: flex; gap: 10px; justify-content: flex-end; }
button { padding: 10px 20px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
.save-btn { background: #42b983; color: white; }
.cancel-btn { background: #eee; color: #333; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.error-message { color: red; margin-top: 10px; }
</style>
