<template>
  <div class="home">
    <CreateGameForm />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import CreateGameForm from '@/components/GameForm/CreateGameForm.vue';

export default Vue.extend({
  name: 'Home',
  components: {
    CreateGameForm,
  },
});
</script>
