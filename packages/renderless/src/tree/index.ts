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

import { getNodeKey as innerGetNodekey } from '../common/deps/tree-model/util'
import { KEY_CODE } from '../common'
import TreeStore from '../common/deps/tree-model/tree-store'
import { addClass, removeClass } from '../common/deps/dom'
import { on, off } from '../common/deps/dom'
import { getDataset } from '../common/dataset'

export const setChildren = (props) => (data) => (props.data = data)

export const getChildren = () => (props) => props.data

export const computedTreeItemArray = () => (props, state) => Array.prototype.slice.call(state.treeItems)

export const computedShowEmptyText = ({ constants, t }) => (props) => props.emptyText || t(constants.EMPTY_TEXT_LOCAL)

export const computedIsEmpty = () => (props, state) => {
  const { childNodes } = state.root

  return !childNodes || childNodes.length === 0 || childNodes.every(({ visible }) => !visible)
}

export const watchDefaultCheckedKeys = (state) => (value) => {
  state.store.setDefaultCheckedKey(value)
}

export const watchDefaultExpandedKeys = ({ state, api, nextTick }) => (value) => {
  api.expandAllNodes(false)

  nextTick(() => {
    state.store.defaultExpandedKeys = value
    state.store.setDefaultExpandedKeys(value)

    api.initIsCurrent()
  })
}

export const watchData = (state) => (value) => {
  state.store.setData(value)
}

export const watchCheckboxItems = () => (value) => {
  Array.prototype.forEach.call(value, (checkbox) => {
    checkbox.setAttribute('tabindex', -1)
  })
}

export const watchCheckStrictly = (state) => (value) => {
  state.store.checkStrictly = value
}

export const dragStart = ({ props, state, emit }) => (event, treeNode) => {
  if (typeof props.allowDrag === 'function' && !props.allowDrag(treeNode.node)) {
    event.preventDefault()
    return false
  }

  if (!event.dataTransfer) {
    return false
  }

  event.dataTransfer.effectAllowed = 'copy'

  try {
    event.dataTransfer.setData('text/plain', '')
  } catch (e) {
    // do nothing
  }

  state.dragState.draggingNode = treeNode

  emit('node-drag-start', treeNode.node, event)
}

// 移动时，判断释放在目标元素的前，后，或inner。 刚移动未离开拖动元素时，为none。
const getDropType = (dropPrev, dropInner, dropNext, dropNode) => {
  let dropType
  const targetPosition = dropNode.$el.getBoundingClientRect()
  const prevPercent = dropPrev ? (dropInner ? 0.25 : dropNext ? 0.45 : 1) : -1
  const nextPercent = dropNext ? (dropInner ? 0.75 : dropPrev ? 0.55 : 0) : 1
  const distance = event.clientY - targetPosition.top

  if (distance < targetPosition.height * prevPercent) {
    dropType = 'before'
  } else if (distance > targetPosition.height * nextPercent) {
    dropType = 'after'
  } else if (dropInner) {
    dropType = 'inner'
  } else {
    dropType = 'none'
  }

  return dropType
}

const setDropIndicatorTop = (dropNode, dropIndicator, parent, dropType) => {
  const iconElement = dropNode.$el.querySelector('.tiny-tree-node')

  if (iconElement) {
    const treePosition = parent.$el.getBoundingClientRect()
    const iconPosition = iconElement.getBoundingClientRect()
    let indicatorTop = -9999

    if (dropType === 'before') {
      indicatorTop = iconPosition.top - treePosition.top
    } else if (dropType === 'after') {
      indicatorTop = iconPosition.bottom - treePosition.top
    }

    dropIndicator.style.top = indicatorTop + 'px'
  }

  dropType === 'inner' ? addClass(dropNode.$el, 'is-drop-inner') : removeClass(dropNode.$el, 'is-drop-inner')
}

const getDragDir = ({ draggingNode, dropNode, allowDrop, emit, dragState }) => {
  let dropPrev = true
  let dropInner = true
  let dropNext = true
  let userAllowDropInner = true
  const oldDropNode = dragState.dropNode

  if (typeof allowDrop === 'function') {
    dropPrev = allowDrop(draggingNode.node, dropNode.node, 'prev')
    userAllowDropInner = dropInner = allowDrop(draggingNode.node, dropNode.node, 'inner')
    dropNext = allowDrop(draggingNode.node, dropNode.node, 'next')
  }
  // 这里访问window.event
  event.dataTransfer.dropEffect = dropInner ? 'copy' : 'none'

  if ((dropPrev || dropInner || dropNext) && oldDropNode !== dropNode) {
    oldDropNode && emit('node-drag-leave', draggingNode.node, oldDropNode.node, event)

    emit('node-drag-enter', draggingNode.node, dropNode.node, event)
  }

  if (dropPrev || dropInner || dropNext) {
    dragState.dropNode = dropNode
  }

  if (dropNode.node.previousSibling === draggingNode.node) {
    dropPrev = false
  }

  if (dropNode.node.nextSibling === draggingNode.node) {
    dropNext = false
  }

  if (dropNode.node.contains(draggingNode.node, false)) {
    dropInner = false
  }

  if (draggingNode.node === dropNode.node || draggingNode.node.contains(dropNode.node)) {
    dropPrev = false
    dropInner = false
    dropNext = false
  }

  return { dropPrev, dropInner, dropNext, userAllowDropInner }
}

export const dragOver = ({ state, emit, props, refs, vm }) => (event, dropNode) => {
  const dragState = state.dragState
  const oldDropNode = dragState.dropNode

  if (oldDropNode && oldDropNode !== dropNode) {
    removeClass(oldDropNode.$el, 'is-drop-inner')
  }

  const draggingNode = dragState.draggingNode

  if (!draggingNode || !dropNode) {
    return
  }

  const { dropPrev, dropInner, dropNext, userAllowDropInner } = getDragDir({
    draggingNode,
    dropNode,
    allowDrop: props.allowDrop,
    emit,
    dragState
  })

  const dropType = getDropType(dropPrev, dropInner, dropNext, dropNode)

  setDropIndicatorTop(dropNode, refs.dropIndicator, vm, dropType)

  dragState.showDropIndicator = dropType === 'before' || dropType === 'after'
  dragState.allowDrop = dragState.showDropIndicator || userAllowDropInner
  dragState.dropType = dropType

  emit('node-drag-over', draggingNode.node, dropNode.node, event)
}

export const dragEnd = ({ state, emit }) => (event) => {
  const dragState = state.dragState
  const { draggingNode, dropType, dropNode } = dragState

  event.preventDefault()

  if (!event.dataTransfer) {
    return
  }

  event.dataTransfer.dropEffect = 'copy'

  if (draggingNode && dropNode) {
    const draggingNodeCopy = { data: draggingNode.node.data }
    const normalType = dropType !== 'none'

    normalType && draggingNode.node.remove()

    if (dropType === 'before') {
      dropNode.node.parent.insertBefore(draggingNodeCopy, dropNode.node)
    } else if (dropType === 'after') {
      dropNode.node.parent.insertAfter(draggingNodeCopy, dropNode.node)
    } else if (dropType === 'inner') {
      dropNode.node.insertChild(draggingNodeCopy)
    }

    normalType && state.store.registerNode(draggingNodeCopy)

    removeClass(dropNode.$el, 'is-drop-inner')

    emit('node-drag-end', draggingNode.node, dropNode.node, dropType, event)

    normalType && emit('node-drop', draggingNode.node, dropNode.node, dropType, event)
  }

  if (draggingNode && !dropNode) {
    emit('node-drag-end', draggingNode.node, null, dropType, event)
  }

  dragState.draggingNode = null
  dragState.dropNode = null
  dragState.allowDrop = true
  dragState.showDropIndicator = false
}

export const created = ({ api, props, state }) => () => {
  state.isTree = true

  const { nodeKey, data, lazy, load, currentNodeKey, checkStrictly, checkDescendants } = props
  const { defaultCheckedKeys, defaultExpandedKeys, autoExpandParent, defaultExpandAll, filterNodeMethod } = props

  state.store = new TreeStore({
    key: nodeKey,
    data,
    lazy,
    props: props.props,
    load,
    currentNodeKey,
    checkStrictly,
    checkDescendants,
    defaultCheckedKeys,
    defaultExpandedKeys,
    autoExpandParent,
    defaultExpandAll,
    filterNodeMethod
  })

  state.root = state.store.root

  api.initIsCurrent()

  state.emitter.on('tree-node-drag-start', api.dragStart)
  state.emitter.on('tree-node-drag-over', api.dragOver)
  state.emitter.on('tree-node-drag-end', api.dragEnd)
}

const doClearCurrentStore = (state) => {
  if (state.currentStore.node) {
    state.currentStore.node.isCurrent = false
  }

  state.currentStore.node = null
  state.currentStore.flag = false
}

const setIsCurrent = (root, defaultExpandedKeys, defaultExpandedKeysHighlight, currentStore, nodeKey = 'id') => {
  if (currentStore.flag || !Array.isArray(root.childNodes)) {
    return
  }

  for (let i = 0; i < root.childNodes.length; i++) {
    const child = root.childNodes[i]

    if (child.data && child.data[nodeKey] && child.data[nodeKey] === defaultExpandedKeysHighlight) {
      child.isCurrent = true
      currentStore.flag = true
      currentStore.node = child

      break
    }

    setIsCurrent(child, defaultExpandedKeys, defaultExpandedKeysHighlight, currentStore, nodeKey)
  }
}

export const initIsCurrent = ({ props, state }) => () => {
  if (state.currentStore.flag) {
    doClearCurrentStore(state)
  }

  if (state.store.getCurrentNode() && props.defaultExpandedKeysHighlight) {
    state.store.setCurrentNode(null)
  }

  if (
    props.defaultExpandedKeysHighlight &&
    Array.isArray(props.defaultExpandedKeys) &&
    ~props.defaultExpandedKeys.indexOf(props.defaultExpandedKeysHighlight)
  ) {
    setIsCurrent(state.root, props.defaultExpandedKeys, props.defaultExpandedKeysHighlight, state.currentStore, props.nodeKey)
  }
}

export const mounted = ({ api, vm }) => () => {
  api.initTabIndex()
  on(vm.$el, 'keydown', api.handleKeydown)
}

export const beforeUnmount = ({ api, vm }) => () => {
  off(vm.$el, 'keydown', api.handleKeydown)
}

export const wrapMounted = ({ api, props, service }) => () => {
  const { data, nodeKey: key, parentKey } = props

  if (!data && props.dataset) {
    const dataset = {
      service,
      dataset: props.dataset,
      tree: { key, parentKey }
    }

    getDataset(dataset).then(api.watchData)
  }

  api.mounted()
}

export const updated = ({ vm, state }) => () => {
  state.treeItems = vm.$el.querySelectorAll('[role=treeitem]')
  state.checkboxItems = vm.$el.querySelectorAll('input[type=checkbox]')
}

export const filter = ({ props, state }) => (value) => {
  if (!props.filterNodeMethod) {
    throw new Error('[Tree] filterNodeMethod is required when filter')
  }

  state.store.filter(value)
}

export const getNodeKey = (props) => (node) => innerGetNodekey(props.nodekey, node.data)

export const getNodePath = ({ props, state }) => (data) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in getNodePath')
  }

  const node = state.store.getNode(data)

  if (!node) {
    return []
  }

  const path = [node.data]
  let parent = node.parent

  while (parent && parent !== state.root) {
    path.push(parent.data)
    parent = parent.parent
  }

  return path.reverse()
}

export const getCheckedNodes = (state) => (leafOnly, includeHalfChecked) => state.store.getCheckedNodes(leafOnly, includeHalfChecked)

export const getCheckedKeys = (state) => (leafOnly) => state.store.getCheckedKeys(leafOnly)

export const getCurrentNode = (state) => () => {
  const currentNode = state.store.getCurrentNode()

  return currentNode ? currentNode.data : null
}

export const getCurrentKey = ({ api, props }) => () => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in getCurrentKey')
  }

  const currentNode = api.getCurrentNode()

  return currentNode ? currentNode[props.nodeKey] : null
}

export const setCheckedNodes = ({ props, state }) => (nodes, leafOnly) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in setCheckedNodes')
  }

  state.store.setCheckedNodes(nodes, leafOnly)
}

export const setCheckedKeys = ({ props, state }) => (keys, leafOnly) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in setCheckedKeys')
  }

  state.store.setCheckedKeys(keys, leafOnly)
}

export const setChecked = (state) => (data, checked, deep) => {
  state.store.setChecked(data, checked, deep)
}

export const getHalfCheckedNodes = (state) => () => state.store.getHalfCheckedNodes()

export const getHalfCheckedKeys = (state) => () => state.store.getHalfCheckedKeys()

export const setCurrentNode = ({ props, state }) => (node) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in setCurrentNode')
  }

  state.store.setUserCurrentNode(node)
}

export const setCurrentKey = ({ props, state }) => (key) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in setCurrentKey')
  }

  state.store.setCurrentNodeKey(key)
}

export const getNode = (state) => (data) => state.store.getNode(data)

export const remove = (state) => (data) => {
  state.store.remove(data)
}

export const append = (state) => (data, parentNode) => {
  state.store.append(data, parentNode)
}

export const insertBefore = (state) => (data, refNode) => {
  state.store.insertBefore(data, refNode)
}

export const insertAfter = (state) => (data, refNode) => {
  state.store.insertAfter(data, refNode)
}

export const handleNodeExpand = (emit) => (nodeData, node, instance) => {
  emit('node-expand', nodeData, node, instance)
}

export const updateKeyChildren = ({ props, state }) => (key, data) => {
  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in updateKeyChild')
  }

  state.store.updateChildren(key, data)
}

export const initTabIndex = ({ vm, state }) => () => {
  state.treeItems = vm.$el.querySelectorAll('.is-focusable[role=treeitem]')
  state.checkboxItems = vm.$el.querySelectorAll('input[type=checkbox]')

  const checkedItem = vm.$el.querySelectorAll('.is-checked[role=treeitem]')

  if (checkedItem.length) {
    checkedItem[0].setAttribute('tabindex', 0)
    return
  }

  state.treeItems[0] && state.treeItems[0].setAttribute('tabindex', 0)
}

export const handleKeydown = ({ vm, state }) => (event) => {
  const currentItem = event.target

  if (!JSON.stringify(currentItem.className).includes('tiny-tree-node')) {
    return
  }

  const keyCode = event.keyCode

  state.treeItems = vm.$el.querySelectorAll('.is-focusable[role=treeitem]')

  if ([KEY_CODE.ArrowUp, KEY_CODE.ArrowDown].includes(keyCode)) {
    let nextIndex
    const currentIndex = state.treeItemArray.indexOf(currentItem)

    event.preventDefault()

    if (keyCode === KEY_CODE.ArrowUp) {
      nextIndex = currentIndex !== 0 ? currentIndex - 1 : 0
    } else {
      nextIndex = currentIndex < state.treeItemArray.length - 1 ? currentIndex + 1 : 0
    }

    state.treeItemArray[nextIndex].focus()
  } else if ([KEY_CODE.ArrowLeft, KEY_CODE.ArrowRight].includes(keyCode)) {
    event.preventDefault()
    currentItem.click()
  } else if ([KEY_CODE.NumpadEnter, KEY_CODE.Space].includes(keyCode)) {
    const hasInput = currentItem.querySelector('[type="checkbox"]')

    if (hasInput) {
      // space enter选中checkbox
      event.preventDefault()
      hasInput.click()
    }
  }
}

const initRadio = ({ node, nodeKey, checkedKey, state }) => {
  let isFound = false

  if (node.data[nodeKey] === checkedKey) {
    state.currentRadio.value = node.id
    isFound = true
    return isFound
  }

  if (node.childNodes && node.childNodes.length) {
    const childNodes = node.childNodes

    for (let i = 0; i < childNodes.length; i++) {
      isFound = initRadio({ node: childNodes[i], nodeKey, checkedKey, state })
      if (isFound) {
        break
      }
    }
  }

  return isFound
}

const init = ({ state, nodeKey, checkedKey }) => {
  let isFound = false

  if (state.root && state.root.childNodes && state.root.childNodes.length) {
    const rootChildNodes = state.root.childNodes

    for (let i = 0; i < rootChildNodes.length; i++) {
      isFound = initRadio({
        node: rootChildNodes[i],
        nodeKey,
        checkedKey,
        state
      })
      if (isFound) {
        break
      }
    }
  }
}

export const setCurrentRadio = ({ props, state }) => () => {
  if (!props.showRadio) {
    return
  }

  if (!props.nodeKey) {
    throw new Error('[Tree] nodeKey is required in setCurrentRadio')
  }

  const nodeKey = props.nodeKey
  const defaultCheckedKeys = props.defaultCheckedKeys || []
  const checkedKey = defaultCheckedKeys.length ? defaultCheckedKeys[0] : null

  if (!checkedKey) {
    return
  }

  init({ state, nodeKey, checkedKey })
}

export const closeMenu = (state) => () => state.emitter.emit('closeMenu')

export const clearCurrentStore = (state) => (node) => {
  if (state.currentStore.flag && state.currentStore.node && state.currentStore.node.id !== node.id) {
    doClearCurrentStore(state)
  }
}

const innerExpandAllNodes = (nodes, expandFlag) => {
  nodes.forEach((node) => {
    if (expandFlag) {
      if (node.childNodes.length && node.level > 1) {
        node.expand()
      }
    } else {
      node.collapse()
    }

    innerExpandAllNodes(node.childNodes, expandFlag)
  })
}

export const expandAllNodes = ({ state }) => (expandFlag) => {
  const nodes = state.root.childNodes

  if (Array.isArray(nodes) && nodes.length) {
    innerExpandAllNodes(nodes, expandFlag)

    nodes.forEach((node) => {
      if (expandFlag && node.childNodes.length) {
        node.expand()
      }
    })
  }
}
