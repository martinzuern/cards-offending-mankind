import axios from 'axios'

const baseURL = (new URL(
  '/api/v1',
  process.env.VUE_APP_BACKEND_URL || window.location.origin,
)).toString()

export default() => {
  return axios.create({
    baseURL,
  })
}
