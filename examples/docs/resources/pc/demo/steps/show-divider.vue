<template>
  <tiny-time-line :data="data" :active="normalActive" type="normal" @click="normalClick" show-divider="true"
    text-position="right">
  </tiny-time-line>
</template>

<script lang="jsx">
import { TimeLine, Modal } from '@opentiny/vue'

export default {
  components: {
    TinyTimeLine: TimeLine
  },
  data() {
    return {
      normalActive: 0,
      data: [{ name: 'Basic Info.' }, { name: 'BOQ Info' }, { name: 'Involved Parties' }, { name: 'Billing' }]
    }
  },
  methods: {
    normalClick(index, node) {
      this.normalActive = index

      Modal.message(`节点index: ${index}; 节点信息: ${JSON.stringify(node)}.`)
    }
  }
}
</script>
