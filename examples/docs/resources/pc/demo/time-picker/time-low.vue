<template>
  <div>
    <tiny-time-picker v-model="value1" format="hh:mm:ss a" placeholder="任意时间点"></tiny-time-picker>
    <tiny-time-picker v-model="value1" format="HH:mm:ss a" placeholder="任意时间点"></tiny-time-picker>
  </div>
</template>

<script lang="jsx">
import { TimePicker } from '@opentiny/vue'

export default {
  components: {
    TinyTimePicker: TimePicker
  },
  data() {
    return {
      value1: new Date(2016, 9, 10, 18, 40)
    }
  }
}
</script>
