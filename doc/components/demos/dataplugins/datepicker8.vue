<template>
  <div>
      <DatePicker v-model="value" placeholder="请选择日期" :no-border="true"></DatePicker>
  </div>
</template>

<script>
import manba from 'manba';

export default {
  data() {
    return {
      value: ''
    }
  }
}
</script>