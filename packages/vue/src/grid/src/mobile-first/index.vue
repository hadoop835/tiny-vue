<template>
  <div data-tag="tiny-table-wrapper" class="scrollbar-size-0" :class="wrapperClass" :style="wrapperStyle">
    <exception aui_mode="mobile-first" v-if="exceptionVisible" class="min-h-[theme(spacing.72)]" component-page type="nodata"></exception>
    <div data-tag="tiny-table" :class="tableClass" :style="listView || ganttView ? '' : 'grid-template-columns: repeat(auto-fit, minmax(theme(spacing.80), 1fr))'" ref="table">
      <template v-if="listView">
        <list-view />
      </template>
      <template v-else-if="ganttView">
        <gantt-view />
      </template>
      <template v-else>
        <table-row v-for="(row, i) in tableData" :key="`${rowKey}${i}`" :datas="cfg(row)" :current-row-id="currentRowId" @card-click="handleCardClick" />
      </template>
    </div>
    <tooltip ref="tooltip" v-model="tooltipVisible" :content="tooltipContent" manual></tooltip>
  </div>
</template>

<script lang="ts">
import { emitEvent, isScale, getRowid } from '@opentiny/vue-renderless/grid/utils'
import { toNumber } from '@opentiny/vue-renderless/grid/static'
import { hooks, defineComponent, mergeClass, $props } from '@opentiny/vue-common'
import Tooltip from '@opentiny/vue-tooltip'
import Exception from '@opentiny/vue-exception'
import type { Column, CardConfig, Datas } from './type'
import { fnField, fnFields } from './utils'
import TableRow from './table-row.vue'
import GlobalConfig from '../config'
import ListView from './list-view.vue'
import GanttView from './gantt-view.vue'

export default defineComponent({
  components: { TableRow, Tooltip, Exception, ListView, GanttView },
  provide() {
    return { $mftable: this }
  },
  props: {
    ...$props,
    tableData: Array,
    cardConfig: Object,
    listConfig: Object,
    ganttConfig: Object
  },
  data() {
    return {
      primaryColumn: null,
      contentColumns: null,
      operationColumn: null,
      selectionColumn: null,
      slotLink: null,
      rowKey: 0,
      wrapperHeight: 0,
      tooltipVisible: false,
      tooltipContent: '',
      currentRow: null,
      currentRowId: ''
    }
  },
  computed: {
    config() {
      const { $parent: vm, cardConfig, listConfig } = this as any
      return { tableVm: hooks.markRaw(vm), cardConfig, listConfig }
    },
    cardView() {
      const { config } = this as any
      const { viewType, mfShow } = config?.tableVm?.$grid
      const { CARD, MF, MF_SHOW_CARD } = GlobalConfig.viewConfig

      return viewType === CARD || (viewType === MF && mfShow === MF_SHOW_CARD)
    },
    listView() {
      const { config } = this as any
      const { viewType } = config?.tableVm?.$grid
      const { LIST } = GlobalConfig.viewConfig

      return viewType === LIST
    },
    ganttView() {
      const { config } = this as any
      const { viewType } = config?.tableVm?.$grid
      const { GANTT } = GlobalConfig.viewConfig

      return viewType === GANTT
    },
    wrapperClass() {
      const { config } = this as any
      return mergeClass(
        'w-full h-full overflow-y-auto',
        config?.tableVm?.viewCls('mfTable'),
        this.exceptionVisible ? 'border border-solid border-color-border-separator rounded-sm' : ''
      )
    },
    tableClass() {
      const { cardView } = this as any
      const tableCls = 'w-full px-3.5 sm:px-0'

      return cardView ? mergeClass(tableCls, 'grid gap-3') : tableCls
    },
    rowClass() {
      const { cardView } = this as any
      let rowCls = 'border-b border-solid border-color-border-separator last:border-white py-3'

      if (cardView) {
        rowCls =
          'border-0.5 sm:border border-solid border-color-border-separator p-3 rounded min-w-[theme(spacing.80)] hover:shadow-lg'
      }

      return rowCls
    },
    wrapperStyle() {
      const { config, wrapperHeight } = this as any
      const defaultView = config?.tableVm?.$grid?.viewType === GlobalConfig.viewConfig.DEFAULT
      const displayStyle = defaultView ? 'display:none;' : ''
      const heightStyle = wrapperHeight ? `height:${wrapperHeight}px;` : ''

      return `${displayStyle}${heightStyle}`
    },
    exceptionVisible() {
      const { config, tableData } = this as any
      const { viewType } = config?.tableVm?.$grid
      const { CARD, LIST, GANTT } = GlobalConfig.viewConfig
      const isException = tableData.length === 0

      return isException && (viewType === CARD || viewType === LIST || viewType === GANTT)
    }
  },
  watch: {
    'config.tableVm.tableColumn': function () {
      this.mapColumns()
    },
    'config.tableVm.viewType': function () {
      this.rowKey++
    },
    'config.tableVm.height': function () {
      this.getWrapperHeight()
    },
    'config.tableVm.currentRow': {
      handler(value) {
        this.currentRow = value
      },
      immediate: true
    },
    currentRow: {
      handler(value) {
        if (value) {
          const { config } = this as any
          this.currentRowId = getRowid(config.tableVm, value)
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.$nextTick(this.getWrapperHeight)
  },
  methods: {
    mapColumns() {
      const { config, typeColumns, firstFewPropertyColumn } = this as any
      const { cardConfig = {}, listConfig = {}, ganttConfig = {} } = this as any
      const tableColumn: Array<Column> = config?.tableVm?.tableColumn
      const { primaryField, contentFields, selectable, renderLink, operable, few = 4 } = cardConfig as CardConfig
      const { renderList } = listConfig
      const { renderGantt } = ganttConfig
      let fieldName = ''
      let fieldNames: Array<string> = []
      let propCols: Array<Column> = firstFewPropertyColumn(tableColumn, few)

      let primaryColumn: Column | undefined
      let contentColumns: Array<Column>
      let operationColumn: Column | undefined
      let selectionColumn: Column | undefined
      let slotLink: Function
      let slotList: Function
      let slotGantt: Function

      if (primaryField) {
        fieldName = fnField(primaryField)
        primaryColumn = (typeColumns(tableColumn, [fieldName]) as Array<Column>).find(
          (column) => column.property === fieldName
        )
      } else {
        primaryColumn = propCols && propCols.length > 0 ? propCols[0] : undefined
      }

      if (contentFields && contentFields.length) {
        fieldNames = fnFields(contentFields)
        contentColumns = typeColumns(tableColumn, fieldNames) as Array<Column>
      } else {
        contentColumns = propCols && propCols.length > 1 ? propCols.slice(1) : []
      }

      if (typeof operable === 'undefined' || operable) {
        operationColumn = (typeColumns(tableColumn, ['operation'], 'type') as Array<Column>).find(
          (column) => column.type === 'operation'
        )
      }

      if (typeof selectable === 'undefined' || selectable) {
        selectionColumn = (typeColumns(tableColumn, ['selection'], 'type') as Array<Column>).find(
          (column) => column.type === 'selection'
        )
      }

      slotLink = config?.tableVm?.$grid?.slots?.link || renderLink
      slotList = config?.tableVm?.$grid?.slots?.list || renderList
      slotGantt = config?.tableVm?.$grid?.slots?.gantt || renderGantt

      Object.assign(this, { primaryColumn, contentColumns, operationColumn, selectionColumn })
      Object.assign(this, { slotLink, slotList, slotGantt })
    },
    typeColumns(columns: Array<Column>, types: Array<String>, field?: string) {
      const cols = types.map((type) => columns.find((column) => column.visible && column[field || 'property'] === type))
      const res: Array<Column> = []

      cols.forEach((col) => col && res.push(col))

      return res
    },
    firstFewPropertyColumn(columns: Array<Column>, few: number) {
      return columns.filter((column) => column.visible && !column.type && column.property).slice(0, few)
    },
    genParams(column: Object, row?: Object) {
      const { config, tableData } = this as any
      const $table = config.tableVm
      const tableColumn = $table.tableColumn
      const $columnIndex = tableColumn.indexOf(column)
      const columnIndex = $table.getColumnIndex(column)
      const p = { column, $table, $columnIndex, columnIndex, data: tableData }

      if (row) {
        const $rowIndex = tableData.indexOf(row)
        const rowIndex = $table.getRowIndex(row)
        const seq = $rowIndex + 1

        Object.assign(p, { row, $rowIndex, rowIndex, $seq: '', seq })
      }

      return p
    },
    emitEvent(type: string, args: Array<any>) {
      const { config } = this as any
      emitEvent(config?.tableVm, type, args)
    },
    handleCardClick(row: Object, e: Object) {
      const { config, emitEvent } = this as any
      const { highlightCurrentRow } = config?.tableVm

      if (highlightCurrentRow) {
        this.currentRow = row
        config?.tableVm?.triggerCurrentRowEvent(e, { $table: config?.tableVm, row })
      }

      emitEvent.call(this, 'card-click', [row, e])
    },
    cfg(row: Object): Datas {
      const { config, cardView, selectionColumn, slotLink, primaryColumn } = this as any
      const { operationColumn, contentColumns, genParams, rowClass } = this as any

      const hasType = !!selectionColumn
      const hasLink = !!slotLink
      const hasOperation = !!operationColumn

      const res: Datas = {
        row,
        config,
        cardView,
        selectionColumn,
        slotLink,
        primaryColumn,
        operationColumn,
        contentColumns,
        genParams,
        hasType,
        hasOperation,
        hasLink,
        rowClass
      }

      return res
    },
    getWrapperHeight() {
      const { config } = this as any
      const $grid = config?.tableVm?.$grid
      const height = $grid?.height
      const parentHeight = config?.tableVm?.parentHeight

      this.wrapperHeight = isScale(height) ? Math.floor((parseInt(height) / 100) * parentHeight) : toNumber(height)
    },
    showTooltip(e: any) {
      const { $refs, cardConfig = {} } = this as any
      const { showTip } = cardConfig as CardConfig

      if (!showTip) return

      const { tooltip } = $refs
      const dom = e.target
      const text = dom.textContent
      const rect = dom.getBoundingClientRect()
      const range = document.createRange()

      range.setStart(dom, 0)
      range.setEnd(dom, dom.childNodes.length)

      const rangeRect = range.getBoundingClientRect()

      if (
        rangeRect.x + rangeRect.width < rect.x ||
        rangeRect.x + rangeRect.width > rect.x + rect.width ||
        rangeRect.y + rangeRect.height < rect.y ||
        rangeRect.y + rangeRect.height > rect.y + rect.height
      ) {
        tooltip.state.referenceElm = dom
        tooltip.state.popperElm && (tooltip.state.popperElm.style.display = 'none')
        tooltip.doDestroy()

        this.tooltipContent = text
        this.tooltipVisible = true

        setTimeout(tooltip.updatePopper, 20)
      }
    },
    hideTooltip() {
      this.tooltipVisible = false
      this.tooltipContent = ''
    }
  }
})
</script>
