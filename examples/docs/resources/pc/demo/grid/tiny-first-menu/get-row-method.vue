<template>
  <div>
    <tiny-button @click="getCurrentRow()">当前行</tiny-button>
    <tiny-button @click="getRowIndex">当前行号</tiny-button>
    <tiny-button @click="getRadioRow">Radio单选选中行</tiny-button>
    <tiny-button @click="getRowById">rowId获取当前行</tiny-button>
    <tiny-button @click="getRowNode">tr元素获取行信息</tiny-button>
    <br /><br />
    <tiny-grid ref="theGrid" :data="tableData" highlight-current-row>
      <tiny-grid-column type="index" width="60"></tiny-grid-column>
      <tiny-grid-column type="radio" width="60"></tiny-grid-column>
      <tiny-grid-column field="name" title="名称"></tiny-grid-column>
      <tiny-grid-column field="area" title="区域"></tiny-grid-column>
      <tiny-grid-column field="address" title="地址"></tiny-grid-column>
      <tiny-grid-column field="introduction" title="公司简介" show-overflow="ellipsis"></tiny-grid-column>
    </tiny-grid>
  </div>
</template>

<script lang="jsx">
import { Grid, GridColumn, Button } from '@opentiny/vue'
import { alert } from '@opentiny/vue-modal'

export default {
  components: {
    TinyButton: Button,
    TinyGrid: Grid,
    TinyGridColumn: GridColumn
  },
  data() {
    return {
      tableData: [
        {
          id: '1',
          name: 'GFD科技YX公司',
          area: '华东区',
          address: '福州',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        },
        {
          id: '2',
          name: 'WWWW科技YX公司',
          area: '华南区',
          address: '深圳福田区',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        },
        {
          id: '3',
          name: 'RFV有限责任公司',
          area: '华南区',
          address: '中山市',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        },
        {
          id: '4',
          name: 'TGBYX公司',
          area: '华北区',
          address: '梅州',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        },
        {
          id: '5',
          name: 'YHN科技YX公司',
          area: '华南区',
          address: '韶关',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        },
        {
          id: '6',
          name: '康康物业YX公司',
          area: '华北区',
          address: '广州天河区',
          introduction: '公司技术和研发实力雄厚，是国家863项目的参与者，并被政府认定为“高新技术企业”。'
        }
      ]
    }
  },
  methods: {
    getCurrentRow(hideMessage) {
      const data = this.$refs.theGrid.getCurrentRow()

      !hideMessage && alert(`当前行数据是：${JSON.stringify(data)}`)

      return data
    },
    getRadioRow() {
      const data = this.$refs.theGrid.getRadioRow()

      alert(`单选选中行数据是：${JSON.stringify(data)}`)
    },
    getRowIndex() {
      const row = this.getCurrentRow(true)
      const data = this.$refs.theGrid.getRowIndex(row)

      alert(`当前选中行号是：${JSON.stringify(data)}`)
    },
    getRowById() {
      const row = this.getCurrentRow(true) || {}
      const data = this.$refs.theGrid.getRowById(row._RID)

      alert(`根据 rowId 获取的当前行：${JSON.stringify(data)}`)
    },
    getRowNode() {
      const tr = this.$el.querySelector('.tiny-grid-body__row')
      const data = this.$refs.theGrid.getRowNode(tr)

      alert(`根据 tr 元素获取对应的 row 信息：${JSON.stringify(data)}`)
    }
  }
}
</script>
