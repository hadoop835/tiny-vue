<template>
  <div>
    <tiny-select v-model="value" placeholder="请选择" clearable :options="options" :cache-op="cacheOp"
      @change="cacheChange"></tiny-select>
    <p class="cache-value">
      {{ cacheValue }}
    </p>
  </div>
</template>

<script lang="jsx">
import { Select } from '@opentiny/vue'

export default {
  components: {
    TinySelect: Select
  },
  data() {
    return {
      cacheOp: {
        key: 'test'
      },
      cacheValue: '',
      options: [
        { value: '选项1', label: '黄金糕' },
        { value: '选项2', label: '双皮奶' },
        { value: '选项3', label: '蚵仔煎' },
        { value: '选项4', label: '龙须面' },
        { value: '选项5', label: '北京烤鸭' }
      ],
      value: '选项3'
    }
  },
  methods: {
    cacheChange() {
      this.cacheValue = window.localStorage.getItem(`tiny_memorize_${this.cacheOp.key}`)
    }
  }
}
</script>
