<template>
  <tiny-popover placement="top-start" title="标题" width="200" trigger="hover" :close-delay="delayTimes" content="这是一段内容,这是一段内容,这是一段内容,这是一段内容。">
    <template #reference>
      <tiny-button>提示</tiny-button>
    </template>
  </tiny-popover>
</template>

<script>
import { Popover, Button } from '@opentiny/vue'

export default {
  components: {
    TinyPopover: Popover,
    TinyButton: Button
  },
  data() {
    return {
      delayTimes: 3000
    }
  }
}
</script>
