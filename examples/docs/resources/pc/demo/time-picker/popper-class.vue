<template>
  <div>
    <tiny-time-picker v-model="value1" popper-class="pickerClass" :popper-append-to-body="false" placeholder="选择时间"></tiny-time-picker>
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

<style>
.pickerClass {
  background: #dddddd;
}
</style>
