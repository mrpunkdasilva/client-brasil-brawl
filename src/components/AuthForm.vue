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
import Swal from 'sweetalert2';

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
      // Use SweetAlert2 to show success message
      Swal.fire({
        icon: 'success',
        title: 'Registro concluído!',
        text: 'Agora faça login.',
      });
      isLogin.value = true;
    }
  } catch (err) {
    // Use SweetAlert2 to show error message
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: err.response?.data?.error?.message || 'Erro na autenticação',
    });
  }
};
</script>

<style scoped>
.auth-container {
  max-width: 350px; /* Reduced from 450px */
  width: 100%;
  margin: 1.5rem auto;
  padding: 1.5rem; /* Reduced padding */
  background-color: var(--surface-color);
  border: 3px solid black;
  box-shadow: 4px 4px 0px 0px black;
  text-align: left;
}

h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  text-align: center;
  color: var(--brazil-yellow);
  font-size: 1rem; /* Better visibility for Press Start 2P */
  line-height: 1.5;
}

.field {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 1.2rem; /* Readable VT323 size */
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-family: var(--font-mono);
}

button {
  width: 100%;
  margin-top: 0.75rem;
  padding: 1rem;
  font-size: 0.7rem; /* Balanced pixel font size */
}

p {
  margin-top: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  text-align: center;
  font-size: 1.2rem; /* Clear mono font size */
  font-family: var(--font-mono);
}
</style>
