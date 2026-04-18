<template>
  <div class="auth-container">
    <h2>{{ isLogin ? 'Login' : 'Registro' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="field" v-if="!isLogin">
        <label>Username</label>
        <input v-model="form.username" type="text" required />
      </div>
      <div class="field">
        <label>Email</label>
        <input v-model="form.email" type="email" required />
      </div>
      <div class="field">
        <label>Senha</label>
        <input v-model="form.password" type="password" required />
      </div>
      <button type="submit">{{ isLogin ? 'Entrar' : 'Cadastrar' }}</button>
    </form>
    <p @click="isLogin = !isLogin">
      {{ isLogin ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login' }}
    </p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { authApi } from '../api/client';
import { setAuthSession, setUserProfile } from '../utils/storage.js';

const emit = defineEmits(['auth-success']);
const isLogin = ref(true);
const form = reactive({
  username: '',
  email: '',
  password: '',
});

const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      const { data } = await authApi.login({ email: form.email, password: form.password });

      // Store auth session securely
      setAuthSession(data.data.userId, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });

      // Store user profile securely
      if (data.data.user) {
        setUserProfile(data.data.userId, {
          userId: data.data.userId,
          username: data.data.user.username,
          email: data.data.user.email,
          imageUrl: data.data.user.imageUrl || data.data.user.avatarUrl,
        });
      }

      emit('auth-success', data.data.accessToken);
    } else {
      await authApi.register(form);
      alert('Registro concluído! Agora faça login.');
      isLogin.value = true;
    }
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Erro na autenticação');
  }
};
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f9f9f9;
}
.field { margin-bottom: 15px; display: flex; flex-direction: column; }
input { padding: 8px; border-radius: 4px; border: 1px solid #ddd; }
button { padding: 10px; background: #42b983; color: white; border: none; border-radius: 4px; cursor: pointer; }
p { margin-top: 15px; cursor: pointer; color: #42b983; text-align: center; }
</style>
