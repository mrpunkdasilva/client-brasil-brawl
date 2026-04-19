import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import Swal from 'sweetalert2';

const app = createApp(App);

// Global error handler for unhandled errors
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err, info);
  // Use SweetAlert2 to show error message
  Swal.fire({
    icon: 'error',
    title: 'Erro Inesperado',
    text: 'Ocorreu um erro inesperado. Verifique o console para mais detalhes.',
  });
};

app.mount('#app')
