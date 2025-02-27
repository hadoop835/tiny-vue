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

import { on, off } from '../common/deps/dom'
import PopupManager from '../common/deps/popup-manager'
import { isObject, typeOf } from '../common/type'

export const handleChange = ({ emit, state }) => (event) => {
  const value = event.target.value
  emit('change', state.searchValue, value)
}

export const handleInput = ({ emit, state }) => (event) => {
  const value = event.target.value
  emit('update:modelValue', value, state.searchValue)
}

export const showSelector = ({ refs, state }) => () => {
  refs.selector.style.zIndex = PopupManager.nextZIndex()
  state.show = true
}

export const changeKey = ({ emit, state }) => (key) => {
  state.searchValue = key
  state.show = false

  emit('select', key)
}

export const searchClick = ({ emit, props, state }) => () => {
  if (props.mini && state.collapse) {
    state.collapse = false
  } else {
    emit('search', state.searchValue, state.currentValue)
  }
}

export const searchEnterKey = ({ api, props, refs, nextTick }) => () => {
  if (props.isEnterSearch) {
    api.searchClick()
    nextTick(() => refs.input.blur())
  }
}

export const clickOutside = ({ parent, props, state }) => (event) => {
  if (!parent.$el.contains(event.target)) {
    state.show = false
    props.mini && !state.currentValue && (state.collapse = true)
  }
}

export const setDefaultType = (searchTypes) => {
  let type = {}

  for (let i = 0, len = searchTypes.length; i < len; i++) {
    if (isObject(searchTypes[i]) && typeOf(searchTypes[i].value) !== 'undefined' && typeOf(searchTypes[i].text) !== 'undefined') {
      type = searchTypes[i]
      break
    }
  }

  return type
}

export const formatSearchTypes = (searchTypes) => {
  const types = []

  for (let i = 0, len = searchTypes.length; i < len; i++) {
    if (isObject(searchTypes[i]) && typeOf(searchTypes[i].value) !== 'undefined' && typeOf(searchTypes[i].text) !== 'undefined') {
      types.push(searchTypes[i])
    }
  }

  return types
}

/* istanbul ignore next */
export const mounted = (api) => () => {
  on(document.body, 'click', api.clickOutside)
}

/* istanbul ignore next */
export const beforeDestroy = (api) => () => {
  off(document.body, 'click', api.clickOutside)
}

export const clear = ({ emit, refs, state }) => () => {
  state.currentValue = ''
  refs.input.focus()
  state.focus = true

  emit('change', [], '')
  emit('update:modelValue', '', state.searchValue)
  emit('clear')
}
