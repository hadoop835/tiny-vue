/**
* Copyright (c) 2022 - present TinyVue Authors.
* Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
*
* Use of this source code is governed by an MIT-style license.
*
* THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
* BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
* A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
*
*/

import debounce from '../common/deps/debounce'
import {
  computedShowEmptyText,
  closeMenu,
  setChildren,
  getChildren,
  computedTreeItemArray,
  computedIsEmpty,
  watchDefaultCheckedKeys,
  watchDefaultExpandedKeys,
  watchData,
  watchCheckboxItems,
  watchCheckStrictly,
  created,
  mounted,
  updated,
  filter,
  getNode,
  remove,
  append,
  getNodeKey,
  getNodePath,
  getHalfCheckedNodes,
  getHalfCheckedKeys,
  getCheckedNodes,
  getCheckedKeys,
  getCurrentNode,
  getCurrentKey,
  setCheckedNodes,
  setCheckedKeys,
  setChecked,
  setCurrentNode,
  setCurrentKey,
  insertBefore,
  insertAfter,
  handleNodeExpand,
  updateKeyChildren,
  initTabIndex,
  handleKeydown,
  setCurrentRadio,
  expandAllNodes,
  dragStart,
  dragOver,
  dragEnd,
  clearCurrentStore,
  initIsCurrent,
  beforeUnmount,
  wrapMounted
} from './index'

export const api = [
  'state',
  'closeMenu',
  'filter',
  'getNodeKey',
  'getNodePath',
  'getCheckedNodes',
  'getCheckedKeys',
  'getCurrentNode',
  'getCurrentKey',
  'setCheckedNodes',
  'setCheckedKeys',
  'setChecked',
  'getHalfCheckedNodes',
  'getHalfCheckedKeys',
  'setCurrentNode',
  'setCurrentKey',
  'getNode',
  'remove',
  'append',
  'insertBefore',
  'insertAfter',
  'handleNodeExpand',
  'updateKeyChildren',
  'initTabIndex',
  'handleKeydown',
  'setCurrentRadio',
  'expandAllNodes',
  'clearCurrentStore'
]

const initState = ({ reactive, emitter, props, computed, api }) => {
  const state = reactive({
    root: null,
    store: null,
    treeItems: null,
    currentNode: null,
    checkboxItems: [],
    emitter: emitter(),
    expandIcon: props.expandIcon,
    shrinkIcon: props.shrinkIcon,
    expandIconColor: props.expandIconColor,
    shrinkIconColor: props.shrinkIconColor,
    dragState: { showDropIndicator: false, draggingNode: null, dropNode: null, allowDrop: true },
    currentRadio: { value: null },
    children: computed({
      get: () => api.getChildren(props, state),
      set: (data) => api.setChildren(data)
    }),
    treeItemArray: computed(() => api.computedTreeItemArray(props, state)),
    isEmpty: computed(() => api.computedIsEmpty(props, state)),
    showEmptyText: computed(() => api.computedShowEmptyText(props, state)),
    currentStore: { flag: false, node: null }
  })

  return state
}

const initApi = ({ state, dispatch, broadcast, props, vm, constants, t, emit, refs }) => ({
  state,
  dispatch,
  broadcast,
  setChildren: setChildren(props),
  getChildren: getChildren(),
  computedTreeItemArray: computedTreeItemArray(),
  computedIsEmpty: computedIsEmpty(),
  watchDefaultCheckedKeys: watchDefaultCheckedKeys(state),
  watchData: watchData(state),
  watchCheckboxItems: watchCheckboxItems(state),
  watchCheckStrictly: watchCheckStrictly(state),
  updated: updated({ vm, state }),
  filter: filter({ props, state }),
  getNodeKey: getNodeKey(props),
  getNodePath: getNodePath({ props, state }),
  getCheckedNodes: getCheckedNodes(state),
  getCheckedKeys: getCheckedKeys(state),
  getCurrentNode: getCurrentNode(state),
  setCheckedNodes: setCheckedNodes({ props, state }),
  setCheckedKeys: setCheckedKeys({ props, state }),
  setChecked: setChecked(state),
  getHalfCheckedNodes: getHalfCheckedNodes(state),
  getHalfCheckedKeys: getHalfCheckedKeys(state),
  setCurrentNode: setCurrentNode({ props, state }),
  setCurrentKey: setCurrentKey({ props, state }),
  getNode: getNode(state),
  remove: remove(state),
  append: append(state),
  insertBefore: insertBefore(state),
  insertAfter: insertAfter(state),
  updateKeyChildren: updateKeyChildren({ props, state }),
  initTabIndex: initTabIndex({ vm, state }),
  handleKeydown: handleKeydown({ vm, state }),
  computedShowEmptyText: computedShowEmptyText({ constants, t }),
  setCurrentRadio: setCurrentRadio({ props, state }),
  expandAllNodes: expandAllNodes({ state }),
  dragStart: dragStart({ props, state, emit }),
  dragOver: dragOver({ props, state, emit, refs, vm }),
  dragEnd: dragEnd({ state, emit }),
  clearCurrentStore: clearCurrentStore(state),
  initIsCurrent: debounce(20, initIsCurrent({ props, state }))
})

const initWatcher = ({ watch, props, api }) => {
  watch(() => props.defaultCheckedKeys, api.watchDefaultCheckedKeys)

  watch(() => props.defaultExpandedKeys, api.watchDefaultExpandedKeys)

  watch(() => props.defaultExpandedKeysHighlight, api.initIsCurrent)

  watch(() => props.data, api.watchData)

  watch(() => props.checkboxItems, api.watchCheckboxItems)

  watch(() => props.checkStrictly, api.watchCheckStrictly)

  watch(() => props.defaultCheckedKeys, api.setCurrentRadio, { immediate: true })
}

export const renderless = (
  props,
  { computed, onMounted, onUpdated, reactive, watch, provide, onBeforeUnmount },
  { vm, t, refs, emit, constants, broadcast, dispatch, service, emitter, nextTick }
) => {
  const api = {}
  const state = initState({ reactive, emitter, props, computed, api })

  provide('parentEmitter', state.emitter)

  Object.assign(api, initApi({ state, dispatch, broadcast, props, vm, constants, t, emit, refs }), {
    closeMenu: closeMenu(state),
    mounted: mounted({ api, vm }),
    created: created({ api, props, state }),
    getCurrentKey: getCurrentKey({ api, props }),
    handleNodeExpand: handleNodeExpand(emit),
    beforeUnmount: beforeUnmount({ api, vm }),
    wrapMounted: wrapMounted({ api, props, service }),
    watchDefaultExpandedKeys: watchDefaultExpandedKeys({ state, api, nextTick })
  })

  api.created()

  initWatcher({ watch, props, api })

  onMounted(api.wrapMounted)

  onUpdated(api.updated)

  onBeforeUnmount(api.beforeUnmount)

  return api
}
