<template>
  <div class="home">
    <Form />
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import Vue from 'vue';
import Form from '@/components/NewGame/Form.vue';

export default Vue.extend({
  name: 'Home',
  components: {
    Form,
  },
});
</script>
