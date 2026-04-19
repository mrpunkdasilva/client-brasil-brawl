import Swal from 'sweetalert2';

export const showError = (message) => {
  Swal.fire({
    icon: 'error',
    title: 'Erro',
    text: message,
    confirmButtonText: 'OK'
  });
};

export const showSuccess = (message) => {
  Swal.fire({
    icon: 'success',
    title: 'Sucesso',
    text: message,
    confirmButtonText: 'OK'
  });
};

export const showWarning = (message) => {
  Swal.fire({
    icon: 'warning',
    title: 'Aviso',
    text: message,
    confirmButtonText: 'OK'
  });
};

export const showInfo = (message) => {
  Swal.fire({
    icon: 'info',
    title: 'Informação',
    text: message,
    confirmButtonText: 'OK'
  });
};
