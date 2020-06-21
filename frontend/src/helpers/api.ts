import axios, { AxiosInstance } from 'axios';

const baseURL = new URL('/api/v1', process.env.VUE_APP_BACKEND_URL || window.location.origin).toString();

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
});

export default axiosInstance;
