<template>
  <div class="split-value">
    <tiny-split modelValue="200px">
      <template #left>
        <div class="demo-split-pane">左面板</div>
      </template>
      <template #right>
        <div class="demo-split-pane">右面板</div>
      </template>
    </tiny-split>
  </div>
</template>

<script lang="jsx">
import { Split } from '@opentiny/vue'

export default {
  components: {
    TinySplit: Split
  }
}
</script>

<style scoped>
.split-value {
  height: 200px;
  border: 1px solid #d9d9d9;
}

.demo-split-pane {
  padding: 10px;
}
</style>
