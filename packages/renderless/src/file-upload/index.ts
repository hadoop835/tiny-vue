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

import { extend } from '../common/object'
import { xss, log } from '../common/xss'
import uploadAjax from '../common/deps/upload-ajax'
import { isObject } from '../common/type'
import { isEmptyObject } from '../common/type'

let initTokenPromise = null

const noopFnCreator = (fn, propName) => {
  const noFn = () => {
    if (propName) {
      return Promise.reject(new Error(`[TINY Error][FileUpload] Prop ${propName} is not configured`))
    } else {
      return Promise.reject(
        new Error(
          '[TINY Error][FileUpload] This component depends on @opentiny/vue-service, Currently unable to generate a default gateway, please set a value for the action'
        )
      )
    }
  }

  return fn || noFn
}

export const initService = ({ props, service }) => {
  const { network = {}, common = {} } = service || {}
  const { request, get, post, all, spread, CancelToken = {} } = network
  let requestFn
  if (!isEmptyObject(props.hwh5)) {
    const { HWH5 } = props.hwh5
    const { uploadToEDM } = HWH5()
    requestFn = props.httpRequest || uploadToEDM
  } else if (request) {
    requestFn = props.httpRequest || request
  } else {
    requestFn = props.httpRequest || uploadAjax
  }

  return {
    get: noopFnCreator(get),
    post: noopFnCreator(post),
    request: noopFnCreator(request),
    all: noopFnCreator(all),
    spread: noopFnCreator(spread),
    cancelToken: noopFnCreator(CancelToken.source),
    getSingleUploadUrl: noopFnCreator(common.getSingleUploadUrl),
    getFileUploadUrl: noopFnCreator(common.getFileUploadUrl),
    getFileDownloadUrl: noopFnCreator(common.getFileDownloadUrl),
    getSingleDownloadUrl: noopFnCreator(common.getSingleDownloadUrl),
    getPackageDownloadUrl: noopFnCreator(common.getPackageDownloadUrl),
    getLargeFileInitUrl: noopFnCreator(common.getLargeFileInitUrl),
    getChunkUploadUrl: noopFnCreator(common.getChunkUploadUrl),
    getPreviewUrl: noopFnCreator(common.getPreviewUrl),
    getDocumentInfoUrl: noopFnCreator(common.getDocumentInfoUrl),
    getPreviewUrlBatch: noopFnCreator(common.getPreviewUrlBatch),
    httpRequest: noopFnCreator(requestFn, 'httpRequest')
  }
}

export const computedUploadDisabled = ({ props, state }) => () => props.disabled || (state.elForm || {}).disabled

export const computedUploadingSize = ({ state, constants }) => () =>
  state.uploadingFiles.reduce((total, file) => (total + file.status !== constants.FILE_STATUS.FAIL ? file.size : 0), 0)

export const watchListType = ({ constants, state }) => (type) => {
  if (
    [
      constants.LIST_TYPE.PICTURE_CARD,
      constants.LIST_TYPE.PICTURE,
      constants.LIST_TYPE.PICTURE_SINGLE,
      constants.LIST_TYPE.DRAG_SINGLE
    ].includes(type)
  ) {
    state.uploadFiles = state.uploadFiles.map((file) => {
      if (!file.url && file.raw) {
        try {
          file.url = URL.createObjectURL(file.raw)
        } catch (err) {
          return
        }
      }

      return file
    })
  }
}

export const watchFileList = ({ constants, state, props }) => (fileList) => {
  let uploadFiles =
    fileList &&
    fileList.map((item) => {
      item.uid = item.uid || Date.now() + state.tempIndex++
      item.status = item.status || constants.FILE_STATUS.SUCESS

      return item
    })
  if ([constants.LIST_TYPE.PICTURE_SINGLE, constants.LIST_TYPE.DRAG_SINGLE].includes(props.listType)) {
    uploadFiles = uploadFiles.slice(0, 1)
  }

  state.uploadFiles = uploadFiles
}

const isNonFuncPropBeforeUpload = ({ flag, doUpload, file }) => !flag && doUpload(file)

const onBeforeIsPromise = ({ before, rawFile, file, doUpload, autoRemove, api }) => {
  before.then(
    (processedFile) => {
      const fileType = Object.prototype.toString.call(processedFile)

      if (fileType === '[object File]' || fileType === '[object Blob]') {
        if (fileType === '[object Blob]') {
          processedFile = new File([processedFile], rawFile.name, { type: rawFile.type })
        }

        for (const p in rawFile) {
          Object.prototype.hasOwnProperty.call(rawFile, p) && (processedFile[p] = rawFile[p])
        }

        file.raw = processedFile
      }

      doUpload(file)
    },
    () => {
      if (autoRemove) {
        if (!Array.isArray(rawFile)) {
          api.handleRemove(null, rawFile)
        } else {
          rawFile.forEach((raw) => api.handleRemove(null, raw))
        }
      }
    }
  )
}

const getFileType = ({ file }) => file.name && file.name.split('.')[file.name.split('.').length - 1].toLowerCase()

const remove = ({ api, file, autoRemove }) => {
  if (autoRemove) {
    const rawFile = file.raw
    if (Array.isArray(rawFile)) {
      rawFile.forEach((raw) => api.handleRemove(null, raw))
    } else {
      api.handleRemove(null, rawFile)
    }
  }
}

export const beforeUpload = ({ props, api, Modal, constants, t, state }) => (file, autoRemove, doUpload) => {
  if (state.isEdm && file.name.length > 255) {
    remove({ api, file, autoRemove })
    return Modal.message({
      message: `${t(constants.EDM.THEFILENAME)}"${file.name}"${t(constants.EDM.FILENAMEEXCEEDS)}`,
      status: 'warning'
    })
  }

  if (file) {
    const accept = state.isEdm ? state.accept : props.accept
    const fileType = getFileType({ file })
    const isExist =
      accept &&
      accept.split(',').some((type) => {
        if (type.toLowerCase() === constants.IMAGE_TYPE) {
          return constants.IMAGE_TYPES.includes(fileType.toLowerCase())
        }
        return new RegExp(type.trim(), 'i').test(`.${fileType}` || file.raw.type)
      })

    if (accept && !isExist) {
      remove({ api, file, autoRemove })
      return Modal.message({
        message: t('ui.fileUpload.notSupport'),
        status: 'warning'
      })
    }
  }

  let flag = typeof props.beforeUpload === 'function'

  isNonFuncPropBeforeUpload({ flag, doUpload, file })

  if (flag) {
    const { rawFile = file.raw, before = props.beforeUpload(rawFile) } = {}

    if (before && before.then) {
      onBeforeIsPromise({ before, rawFile, file, doUpload, autoRemove, api })
    } else if (before !== false) {
      doUpload(file)
    } else {
      if (autoRemove) {
        if (Array.isArray(rawFile)) {
          rawFile.forEach((raw) => api.handleRemove(null, raw))
        } else {
          api.handleRemove(null, rawFile)
        }
      }
    }
  }
}

export const startUpload = ({ state, constants, vm, Modal, api, t }) => (file, isList) => {
  if (state.isHwh5) {
    vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw)
    return
  }
  if (file.size > state.docSize && file.size > state.chunkSize) {
    file.isLargeFile = true

    isList &&
      state.uploadFiles.forEach((f) => {
        if (f.cacheSign === file.cacheSign) {
          f.percentage = 0
        }
      })

    api.largeDocumentUpload(file)

    Modal.message({
      message: `${file.name}${t(constants.EDM.LARGEFILEKEY)}`,
      status: 'warning'
    })
  } else {
    vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw)
  }
}

const calcFileForMobile = (rawFile, file) => {
  const fileName = rawFile.name.lastIndexOf('.')
  const fileNameLen = rawFile.name.length

  file.fileType = rawFile.name.substring(fileName + 1, fileNameLen)

  const size = rawFile.size / 1024

  if (size < 1024) {
    file.size = Math.round(size * 10 ** 1) / 10 ** 1 + 'KB'
  } else {
    const fileSize = size / 1024
    file.size = Math.round(fileSize * 10 ** 1) / 10 ** 1 + 'MB'
  }
}

export const properFileSize = ({ props, state, constants, Modal, t }) => (file) => {
  if ([undefined, null].includes(file.size)) return true

  let maxSize = 0

  if (Array.isArray(props.fileSize) && props.fileSize[1]) {
    maxSize = Math.min(state.singleMaxSize, props.fileSize[1] / 1024).toFixed(2)
  } else {
    maxSize = Math.min(state.singleMaxSize)
  }

  if (state.isEdm || (!state.isEdm && Array.isArray(props.fileSize) && props.fileSize[1])) {
    if (file.size > maxSize * 1024 * 1024) {
      Modal.message({
        message: `${file.name} ${t(constants.EDM.EXCEED)} ${maxSize} MB`,
        status: 'warning'
      })

      return false
    }
  }

  if (file.size <= 0) {
    Modal.message({
      message: `${file.name} ${t(constants.EDM.FILEEMPTY)}`,
      status: 'warning'
    })

    return false
  }

  const userMin = (props.fileSize && (props.fileSize[0] || props.fileSize)) || 0

  if (file.size <= userMin * 1024) {
    Modal.message({
      message: `${t(constants.EDM.SIZE).replace(/{name}/, file.name)} ${userMin} KB`,
      status: 'warning'
    })

    return false
  }

  return true
}

export const addFileToList = ({ api, constants, emit, props, state, mode }) => (rawFile, updateId, reUpload) => {
  !reUpload && (rawFile.uid = Date.now() + state.tempIndex++)

  let file = { status: constants.FILE_STATUS.READY, name: rawFile.name, size: rawFile.size }

  Object.assign(file, { percentage: 0, uid: rawFile.uid, raw: rawFile, response: {} })

  if (state.isEdm) {
    let fileBase = { serverName: '', docRelativePath: '', docId: '', docVersion: '', cacheSign: rawFile.uid }

    file = Object.assign(file, fileBase)

    props.edm.upload.isFolder && (file.path = rawFile.webkitRelativePath.match(/.*\//g)[0])
  }

  state.cacheDocuments[file.uid] = file

  mode === 'mobile' && calcFileForMobile(rawFile, file)

  if (
    [
      constants.LIST_TYPE.PICTURE_CARD,
      constants.LIST_TYPE.PICTURE,
      constants.LIST_TYPE.PICTURE_SINGLE,
      constants.LIST_TYPE.DRAG_SINGLE
    ].includes(props.listType) &&
    !state.isHwh5
  ) {
    try {
      if (state.isHwh5) {
        file.url = rawFile.filePath
      } else {
        file.url = URL.createObjectURL(rawFile)
      }
    } catch (err) {
      return
    }
  }

  if (state.isEdm && state.isSuccess) {
    const proper = api.properFileSize(file)
    if (!proper) {
      return
    }

    state.updateId = updateId || props.edm.updateId || ''

    if (reUpload) {
      const index = state.uploadFiles.findIndex((item) => item.uid === file.uid)
      state.uploadFiles.splice(index, 1)
    } else if (state.updateId) {
      const index = state.uploadFiles.findIndex((item) => item.docId === updateId)
      state.uploadFiles.splice(index, 1, file)
      emit('change', file, state.uploadFiles)
      return
    }
  }

  if (!state.isEdm) {
    const proper = api.properFileSize(file)
    if (!proper) {
      return
    }
  }

  state.uploadFiles.push(file)
  state.currentUploadingFileUids.push(file.uid)
  emit('change', file, state.uploadFiles)
}

export const getFileHash = ({ emit, Modal, constants, t, CryptoJS, state }) => ({ file, chunkSize, showTips }) => {
  if (showTips) {
    Modal.message({
      message: `${t(constants.EDM.CALCHASH)}`,
      status: 'warning'
    })
  }

  const chunks = Math.ceil(file.size / chunkSize)
  let chunkIndex = 0
  let start = chunkIndex * chunkSize
  let end = Math.min(file.size, start + chunkSize)
  let chunk = file.raw.slice(start, end)

  const hasher = CryptoJS.algo.SHA256.create()
  let calculated = 0

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(chunk)
    reader.onload = (e) => {
      if (file.status === constants.FILE_STATUS.FAIL) return
      chunkIndex++

      let wordArray = CryptoJS.lib.WordArray.create(e.target.result)
      hasher.update(wordArray)
      wordArray = null

      if (chunkIndex < chunks) {
        start = chunkIndex * chunkSize
        end = Math.min(file.size, start + chunkSize)
        calculated += end - start
        emit('hash-progress', Math.min(Math.floor((calculated / file.size) * 100), 100))
        chunk = file.raw.slice(start, end)
        reader.readAsArrayBuffer(chunk)
      } else {
        const hash = hasher.finalize().toString()
        file.hash = file.raw.hash = hash
        resolve(hash)
        emit('hash-progress', 100)
      }
    }
    reader.onerror = (err) => {
      file.status = constants.FILE_STATUS.FAIL
      emit('error', err, file, state.uploadFiles)
    }
  })
}

const handleHwh5Files = (files) => {
  return files.map((file) => {
    if (file instanceof File) return file
    let f = {}
    if (isObject(file)) {
      const { fileName, fileSize, filePath } = file
      f = {
        ...file,
        name: fileName,
        size: fileSize,
        webkitRelativePath: filePath
      }
    } else {
      const [name, index] = file.match(/[^/]*$/)
      const [type] = file.match(/\.[^.]*$/)
      const filePath = file.substring(0, index)
      f = { type, name, filePath, webkitRelativePath: filePath }
    }
    return f
  })
}

export const handleStart = ({ api, constants, props, state, vm }) => (rawFiles, updateId, reUpload = false) => {
  if (state.isHwh5) {
    rawFiles = handleHwh5Files(rawFiles)
  }
  state.currentUploadingFileUids = []
  rawFiles.forEach((rawFile) => api.addFileToList(rawFile, updateId, reUpload))

  const { UPLOADING, READY } = constants.FILE_STATUS
  state.uploadingFiles = state.uploadFiles.filter((file) => [UPLOADING, READY].includes(file.status))

  if (state.isEdm && state.isSuccess) {
    rawFiles.forEach((rawFile) => {
      const file = api.getFile(rawFile)

      if (!file) return

      api.beforeUpload(file, true, (file) => {
        typeof props.edm.upload.loading === 'function' && props.edm.upload.loading(file)

        new Promise((resolve) => {
          if (state.isHwh5) return resolve()

          let isLargeFileHash = false
          if (props.edm.isCheckCode !== true) return resolve()
          if (file.size > state.docSize && file.size > state.chunkSize) {
            if (!state.isEntireCheckCode) {
              return resolve()
            } else {
              isLargeFileHash = true
            }
          }

          api.getFileHash({ file, chunkSize: state.chunkSize, showTips: isLargeFileHash }).then((hash) => resolve(hash))
        }).then(() => {
          if (props.autoUpload) {
            const tokenParams = { token: props.edm.upload.token, file, type: 'upload' }
            api.getToken(tokenParams).then((data) => {
              if (data) {
                file.status = constants.FILE_STATUS.UPLOADING
                api.startUpload(file, true)
              }
            })
          }
        })
      })
    })
  }

  if (!state.isEdm && props.autoUpload) {
    if (props.multiple && props.mergeService) {
      const handler = (file) => (
        vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw), undefined
      )

      rawFiles.length && api.beforeUpload({ raw: rawFiles }, true, handler)
    } else {
      rawFiles.forEach((rawFile) => {
        const file = api.getFile(rawFile)
        if (!file) return
        const handler = (file) => (
          vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw), undefined
        )

        api.beforeUpload(file, true, handler)
      })
    }
  }
}

export const calcUploadingFilesInfo = ({ state, constants }) => () => {
  let percentage
  if (state.isHwh5) {
    const totalPercentage = state.uploadingFiles.reduce((total, file) => {
      const curPercentage = file.status !== constants.FILE_STATUS.FAIL ? file.percentage / 100 : 0
      return total + curPercentage
    }, 0)

    percentage = Math.floor((totalPercentage / state.uploadingFiles.length) * 100)
  } else {
    const totalLoadedSize = state.uploadingFiles.reduce((loadedSize, file) => {
      const loaded = file.status !== constants.FILE_STATUS.FAIL ? (file.size * file.percentage) / 100 : 0
      return loadedSize + loaded
    }, 0)

    percentage = Math.floor((totalLoadedSize / state.uploadingSize) * 100)
  }

  percentage = Math.min(percentage, 100)
  const uploadedFiles = state.uploadingFiles.filter((file) => file.percentage === 100)

  return {
    percentage,
    uploadList: state.uploadingFiles,
    uploadedCount: uploadedFiles.length
  }
}

export const handleProgress = ({ api, constants, emit, state }) => (event, rawFile) => {
  if (Array.isArray(rawFile)) {
    state.uploadFiles.forEach((file) => {
      if (rawFile.some((raw) => file.uid === raw.uid)) {
        file.status = constants.FILE_STATUS.UPLOADING

        if (event.lengthComputable) {
          file.percentage = Math.floor((event.loaded * 100) / event.total) || 0
        }

        emit('progress', file, state.uploadFiles, api.calcUploadingFilesInfo())
      }
    })
  } else {
    const file = api.getFile(rawFile)

    if (file) {
      file.status = constants.FILE_STATUS.UPLOADING
      if (state.isHwh5) {
        const { progress } = JSON.parse(event)
        file.percentage = progress
        if (file.percentage >= 100) {
          file.isFinished = true
        }
        emit('progress', file, state.uploadFiles, api.calcUploadingFilesInfo())
      } else {
        if (event.lengthComputable && !file.isLargeFile) {
          file.percentage = Math.floor((event.loaded * 100) / event.total) || 0
          if (file.percentage >= 100) {
            file.isFinished = true
          }
          emit('progress', file, state.uploadFiles, api.calcUploadingFilesInfo())
        }
      }
    }
  }
}

export const handleSuccess = ({ api, constants, emit, state, props }) => (res, rawFile) => {
  const currentUploadFiles = state.uploadFiles.filter((file) => state.currentUploadingFileUids.includes(file.uid))
  if (Array.isArray(rawFile)) {
    state.uploadFiles.forEach((file) => {
      if (rawFile.some((raw) => file.uid === raw.uid)) {
        file.status = constants.FILE_STATUS.SUCESS
        file.percentage = 100
        file.response = res

        emit('success', res, file, currentUploadFiles)
        emit('change', file, state.uploadFiles)

        delete file.cancelToken
      }
    })
  } else {
    const file = api.getFile(rawFile)

    delete file.cancelToken

    if (props.edm.upload && file && res.data && res.data.status !== 200) {
      file.status = constants.FILE_STATUS.FAIL
      emit('error', res, file, state.uploadFiles)
      return
    }

    if (file) {
      file.status = constants.FILE_STATUS.SUCESS
      file.percentage = 100
      if (!file.isFinished) {
        emit('progress', file, state.uploadFiles, api.calcUploadingFilesInfo())
      }

      file.isLargeFile && delete res.config
      file.response = res

      if (state.isEdm) {
        const result = state.isHwh5 ? res : res.data.result

        if (!result) return

        file.serverName = result.serverName
        file.docRelativePath = result.docRelativePath
        file.docId = result.docId
        file.docVersion = result.version
        file.docSize = result.docSize
        file.isLargeFile && delete file.raw

        Object.assign(file, result)
      }

      emit('success', res, file, currentUploadFiles)
      emit('change', file, state.uploadFiles)
    }
  }
  api.clearUploadingFiles()
}

export const handleError = ({ api, constants, emit, state }) => (err, rawFile) => {
  const file = api.getFile(rawFile)
  if (!file) return

  file.status = constants.FILE_STATUS.FAIL
  file.percentage = 100

  if (!state.isEdm) {
    state.uploadFiles.splice(state.uploadFiles.indexOf(file), 1)
  }

  api.clearUploadingFiles()
  emit('error', err, file, state.uploadFiles)
  emit('change', file, state.uploadFiles)
}

export const handleRemove = ({ api, emit, props, state, constants }) => (file, raw) => {
  if (raw) {
    file = api.getFile(raw)
  }

  let doRemove = () => {
    api.abort(file)
    let fileList = state.uploadFiles

    fileList.splice(fileList.indexOf(file), 1)
    emit('remove', { ...file, status: constants.FILE_STATUS.FAIL }, fileList)
  }

  if (!props.beforeRemove) {
    doRemove()
  } else if (typeof props.beforeRemove === 'function') {
    const before = props.beforeRemove(file, state.uploadFiles)

    if (before && before.then) {
      before.then(
        () => {
          doRemove()
        },
        () => undefined
      )
    } else if (before !== false) {
      doRemove()
    }
  }
}

export const clearUploadingFiles = ({ constants, state }) => () => {
  const { SUCESS, FAIL } = constants.FILE_STATUS
  const isUploadComplete = state.uploadingFiles.every((file) => [SUCESS, FAIL].includes(file.status))

  if (isUploadComplete) {
    state.uploadingFiles = []
  }
}

export const getFile = (state) => (rawFile) => {
  let fileList = state.uploadFiles
  let target

  fileList.every((item) => {
    target = rawFile.uid === item.uid ? item : null
    return !target
  })

  return target
}

export const abort = ({ constants, vm, state }) => (file) => {
  const { READY, UPLOADING, FAIL } = constants.FILE_STATUS
  if (file) {
    state.uploadingFiles.forEach((f) => {
      const uid = file.uid || file
      if (f.uid === uid && [READY, UPLOADING].includes(f.status)) {
        f.status = FAIL
      }
    })
  } else {
    state.uploadingFiles.forEach((f) => {
      if ([READY, UPLOADING].includes(f.status)) {
        f.status = FAIL
      }
    })
  }

  vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].abort(file)
}

export const abortDownload = ({ state }) => (file, batch = false) => {
  const cancel = (docId) => {
    if (!docId) return
    const cancels = state.downloadCancelToken[docId]
    cancels && cancels.forEach((cancel) => cancel())
    delete state.downloadCancelToken[docId]

    const clearDataFn = state.downloadCancelData[docId]
    clearDataFn && clearDataFn(docId)
  }

  if (Array.isArray(file)) {
    if (batch) {
      cancel(
        file
          .map((f) => f.docId || f)
          .sort()
          .join(',')
      )
    } else {
      file.forEach((f) => f && cancel(file.docId || file))
    }
  } else if (file) {
    cancel(file.docId || file)
  } else {
    Object.keys(state.downloadCancelToken).forEach((docId) => {
      cancel(docId)
    })
  }
}

export const clearFiles = (state) => () => {
  state.uploadFiles = []
}

export const submit = ({ api, constants, vm, state, props }) => () => {
  const files = state.uploadFiles.filter((file) => file.status === constants.FILE_STATUS.READY)

  if (state.isEdm && state.isSuccess) {
    files.forEach((file) => {
      api
        .getToken({
          token: props.edm.upload.token,
          file,
          type: 'upload'
        })
        .then((data) => {
          if (data) {
            api.beforeUpload(file, false, (file) => {
              api.startUpload(file)
            })
          }
        })
    })
  } else {
    if (props.multiple && props.mergeService) {
      const rawFiles = files.map((file) => file.raw)
      rawFiles.length &&
        api.beforeUpload({ raw: rawFiles }, false, (file) => {
          vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw)
        })
    } else {
      files.forEach((file) => {
        api.beforeUpload(file, false, (file) => {
          vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(file.raw)
        })
      })
    }
  }
}

export const handleClick = ({ constants, vm }) => () =>
  vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].handleClick()

export const getFileUploadUrl = (service) => () => service.getFileUploadUrl()

export const updateUrl = ({ api, props, state }) => () => {
  if (props.action) {
    state.url = props.action
  } else {
    api.getFileUploadUrl().then((url) => (state.url = url))
  }
}

const getTranslateFile = ({ api, isChunk, isLessThan17G, file, state }) => (data, type, index) => {
  if (isChunk) {
    if (index === 0) {
      state.downloadCancelData[file.docId] = api.setWriterFile({ data, index, isLessThan17G, file })
    }
  } else {
    const content = data.headers['content-disposition']
    const name = content.match(/fileName.?=(.*)/)[1] || content.match(/fileName=(.*)/)[1]
    const blob = new Blob([data.data], { type: type !== 'zip' ? 'application / x - xls' : 'application/zip' })
    aLinkDownload({ blob, name })
  }
}

const aLinkDownload = ({ blob, name }) => {
  if (window && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, decodeURIComponent(name))
    return
  }

  const url = window.URL || window.webkitURL || window.moxURL
  const downloadHref = xss.filterUrl(url.createObjectURL(blob))
  let downloadLink = document.createElement('a')

  downloadLink.href = downloadHref
  downloadLink.download = decodeURIComponent(name)
  downloadLink.click()
  url.revokeObjectURL && url.revokeObjectURL(downloadHref)
}

const getHandleSuccess = ({ state, downloadOps, file, translateFile, isChunk, isLessThan17G }) => (
  data,
  type,
  index
) => {
  if (isChunk) {
    const res = isLessThan17G ? data.data : new Uint8Array(data.data)
    let downloadChunkFile = state.downloadChunkFile[file.docId]
    if (!downloadChunkFile) {
      downloadChunkFile = {}
    }
    downloadChunkFile[index] = res
    translateFile(data, type, index)
  } else {
    typeof downloadOps.loading === 'function' && downloadOps.loading(file)
    translateFile(data, type)
  }

  return true
}

const getCalcProgress = () => (evt) => {
  let total
  if (evt.target && evt.target.getResponseHeader) {
    total = Number(evt.target.getResponseHeader('Content-Size'))
  } else {
    total = Number(evt.total)
  }
  total = Math.max(total, evt.loaded)

  let progress = Math.ceil((evt.loaded / total) * 100) || 0
  progress = Math.max(progress, 0)
  progress = Math.min(progress, 100)

  return progress
}

export const modifyServiceUrlSingle = ({ constants }) => ({ file, serviceUrl, range }) => {
  if (typeof file === 'object') {
    let tempFile = Object.assign({}, file, range)

    delete tempFile.docId
    delete tempFile.docVersion
    delete tempFile['x-download-sign']

    for (let key in tempFile) {
      const value = tempFile[key]
      const dataType = typeof value

      if (!~['undefined', 'object', 'function'].indexOf(dataType)) {
        serviceUrl += `&${key}=${value}`
      }
    }

    file.status = constants.FILE_STATUS.DOWNLOADING
    file.percentage = 0
  }

  return serviceUrl
}

export const getKiaScanTip = ({ Modal, constants, t }) => ({ data }) => {
  if (data.status === constants.EDM.KIASTATUS) {
    return Modal.message({
      message: `${t(constants.EDM.KIASCANTIP)}`,
      status: 'warning'
    })
  }
}

export const validateDownloadStatus = ({ state, Modal }) => ({ downloadOps, file, isLessThan17G, data }) => {
  const errorHandle = ({ state, file, errRes, Modal, downloadOps }) => {
    if (state.currentDownloadFiles && state.currentDownloadFiles.docId === file.docId) return

    if (errRes && errRes.message) {
      Modal.message({
        message: errRes.message,
        status: 'warning'
      })
    }

    state.currentDownloadFiles = file

    if (typeof downloadOps.fail === 'function') {
      downloadOps.fail(errRes, file)
    }
  }

  if (data.data && data.data.type && data.data.type.includes('application/json')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const errRes = JSON.parse(e.target.result)
      errorHandle({ state, file, errRes, Modal, downloadOps })
    }
    reader.readAsText(data.data)
    return true
  }

  if (!isLessThan17G && data.headers['content-type'].includes('application/json')) {
    const errRes = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(data.data)))
    errorHandle({ state, file, errRes, Modal, downloadOps })
    return true
  }
}

export const createDownloadCancelToken = ({ state, service }) => (file) => {
  let docId
  if (Array.isArray(file)) {
    docId = file
      .map((f) => f.docId || f)
      .sort()
      .join(',')
  } else {
    docId = file.docId || file
  }

  if (!state.downloadCancelToken[docId]) {
    state.downloadCancelToken[docId] = []
  }

  const { cancel, token } = service.cancelToken()
  state.downloadCancelToken[docId].push(cancel)

  return token
}

export const downloadFileSingle = ({ service, constants, props, state, api, emit }) => (args) => {
  let { file, batchIndex, isChunk, calcProgress, handleSuccess, range = {}, isBatch, isLessThan17G } = args
  let getServiceUrl = ({ url, file }) =>
    url.replace(/{docId}/, file.docId || file) +
    `${~url.indexOf('?') ? '&' : '?'}x-download-sign=true&docVersion=${file.docVersion || ''}`
  let sdResolver = (url) => {
    let serviceUrl = getServiceUrl({ url, file })

    serviceUrl = api.modifyServiceUrlSingle({ file, serviceUrl, range })
    serviceUrl = xss.filterUrl(serviceUrl)

    let params = {
      withCredentials: props.withCredentials,
      headers: Object.assign(props.headers, state.headers),
      responseType: isChunk && !isLessThan17G ? 'arraybuffer' : 'blob',
      hideErr: true,
      cancelToken: api.createDownloadCancelToken(file),
      onDownloadProgress(evt) {
        let progress = calcProgress(evt, isChunk)
        if (progress !== 100) {
          !isChunk && emit('download', progress, evt)
        }

        if (typeof file === 'object') {
          file.percentage = progress
        }
      }
    }

    service
      .get(serviceUrl, params)
      .then((data) => {
        if (api.getKiaScanTip({ data })) return
        if (api.validateDownloadStatus({ downloadOps: props.edm.download || {}, file, isLessThan17G, data })) return

        handleSuccess(data, '', range.index)

        const { checkcode, 'content-size': fileSize } = data.headers
        !isChunk && emit('download', 100, '', { checkcode, fileSize })

        if (typeof file === 'object') {
          file.percentage = 100

          setTimeout(() => (file.status = constants.FILE_STATUS.SUCESS), 1000)
        }

        api.afterDownload({ batchIndex, data, file })
      })
      .catch((data) => {
        if (data.response && state.errorStatusCodes.includes(data.response.status)) {
          const downloadOps = props.edm.download || {}
          const tokenParams = { token: downloadOps.token, file, type: 'download' }
          api.getToken(tokenParams).then((data) => {
            api.afterDownload({ batchIndex, data, file, range, isChunk, isBatch, isLessThan17G })
          })
        }
      })
  }

  service.getSingleDownloadUrl().then(sdResolver)
}

export const downloadFileBatch = ({ api, service, props, state, emit }) => (args) => {
  let { downloadOps, file, calcProgress, handleSuccess, range = {} } = args
  let tokenParams = { token: downloadOps.packageToken, file, type: 'download' }
  api.getToken(tokenParams).then((data) => {
    if (!data) {
      return
    }

    const params = { downloadTOs: [], attachdownloadTOs: [], isZip: 'true', transformType: 'sync', type: 'package' }
    file.forEach((item) => {
      if (item.wmType) {
        params.attachdownloadTOs.push(item)
      } else {
        params.downloadTOs.push(item)
      }
    })

    service.getPackageDownloadUrl().then((url) => {
      url += `${~url.indexOf('?') ? '&' : '?'}x-download-sign=true`
      url = xss.filterUrl(url)

      service
        .post(
          url,
          { ...params, ...range },
          {
            withCredentials: props.withCredentials,
            headers: Object.assign(props.headers, state.headers),
            responseType: 'blob',
            cancelToken: api.createDownloadCancelToken(file),
            onDownloadProgress(evt) {
              let progress = calcProgress(evt)
              if (progress !== 100) {
                emit('download', progress, evt)
              }
            }
          }
        )
        .then((data) => {
          if (api.getKiaScanTip({ data })) return
          const { 'content-size': fileSize, checkcode } = data.headers
          emit('download', 100, '', { fileSize, checkcode })
          handleSuccess(data, 'zip')
        })
    })
  })
}

export const downloadFileSingleHwh5 = ({ state, props, emit, constants }) => ({ file }) => {
  const { HWH5, appId } = props.hwh5
  const { downloadToEDM } = HWH5()
  const options = {
    edmAuth: {
      edmToken: state.headers[constants.EDM.EDMTOKEN],
      appId
    },
    docId: file.docId || file,
    docVersion: file.docVersion,
    filePath: file.filePath,
    progress: 1,
    onProgress: (event) => {
      const { progress } = JSON.parse(event)
      if (progress * 1 !== 100) {
        emit('download', progress)
      }
    }
  }

  downloadToEDM(options).then((data) => {
    emit('download', 100, '', { data })
  })
}

export const downloadFile = ({ api, state }) => (file) => {
  state.currentDownloadFiles = ''

  if (!state.isEdm) {
    api.ordinaryDownload(file)
  } else {
    const isBatch = Array.isArray(file)

    if (state.isHwh5) {
      let files = file
      if (!isBatch) {
        files = [file]
      }
      files.forEach((f) => api.downloadFileSingleInner({ file: f, isBatch: false }))
      return
    }

    if (isBatch) {
      api.downloadFileInner({ file, isBatch })
    } else {
      api.downloadFileSingleInner({ file, isBatch })
    }
  }
}

export const downloadFileSingleInner = ({ props, state, api, constants }) => ({ file, isBatch }) => {
  const { SIZE_17G } = constants.EDM
  const downloadOps = props.edm.download || {}
  let tokenParams = { token: downloadOps.token, file, type: 'download' }
  api.getToken(tokenParams).then((data) => {
    if (!data) return
    if (state.isHwh5) {
      api.downloadFileSingleHwh5({ file })
      return
    }

    if (state.hasFileInfoInterface) {
      api.getDownloadFileInfo({ docId: file.docId }).then((res) => {
        let fileInfo
        if (res && res.outDocQueryList[0].verInfo[0]) {
          fileInfo = res.outDocQueryList[0].verInfo[0].docInfo[0]
        }
        const { fileSize } = fileInfo
        const isLargeFile = fileSize > state.docSize && fileSize > state.chunkSize
        const isLessThan17G = fileSize < SIZE_17G * 1024

        if (isLargeFile) {
          api.largeDocumentDownload({ file: fileInfo, isBatch, isLessThan17G })
        } else {
          api.downloadFileInner({ file, isBatch })
        }
      })
    } else {
      api.downloadFileInner({ file, isBatch })
    }
  })
}

export const getDownloadFileInfo = ({ api, state, props, service }) => ({ docId }) => {
  return service.getDocumentInfoUrl().then((url) => {
    return new Promise((resolve, reject) => {
      service
        .request({
          method: 'post',
          url: xss.filterUrl(url),
          withCredentials: props.withCredentials,
          headers: Object.assign(props.headers, state.headers),
          cancelToken: api.createDownloadCancelToken({ docId }),
          data: { docInfoVO: { ids: [docId], docType: '', docVersion: '' } }
        })
        .then((res) => {
          if (res.data.status === 200) {
            resolve(res.data.result)
          } else {
            reject(res)
          }
        })
    })
  })
}

export const largeDocumentDownload = ({ api, state }) => ({ file, isBatch, isLessThan17G }) => {
  const { fileSize, docId, docName } = file
  const chunkSize = Math.ceil(fileSize / state.chunkSize)
  state.downloadChunkFile[docId] = { chunkNum: chunkSize, fileSize, docName }

  file.chunkSize = chunkSize
  const batches = api.sliceDownloadChunk(file)
  api.batchSegmentDownload({ batchIndex: 0, batches, docId: file.docId, isBatch, isLessThan17G })
}

export const sliceDownloadChunk = ({ state }) => (file) => {
  const chunkSize = file.chunkSize
  const downloadChunkArray = [[]]

  state.downloadBatchQueue[file.docId + '-0'] = 0
  state.downloadBatchQueueListen[file.docId + '-0'] = 0

  let startRange = 0
  let endRange = -1

  for (let i = 0; i < chunkSize; i++) {
    startRange = endRange + 1
    endRange = Math.min(file.fileSize, startRange + state.chunkSize)

    if (endRange < startRange) {
      return downloadChunkArray
    }

    const lastIndex = downloadChunkArray.length - 1

    if (downloadChunkArray[lastIndex].length < state.downloadChunkLimit) {
      downloadChunkArray[lastIndex].push({ startRange, endRange, index: i })
    } else {
      state.downloadBatchQueue[file.docId + '-' + downloadChunkArray.length] = 0
      state.downloadBatchQueueListen[file.docId + '-' + downloadChunkArray.length] = 0
      downloadChunkArray.push([])
      downloadChunkArray[lastIndex + 1].push({
        startRange,
        endRange,
        index: i
      })
    }
  }

  return downloadChunkArray
}

export const batchSegmentDownload = ({ state, api }) => ({ batchIndex, batches, docId, isBatch, isLessThan17G }) => {
  if (batchIndex < batches.length) {
    const batch = batches[batchIndex]
    const key = docId + '-' + batchIndex

    Object.defineProperty(state.downloadBatchQueue, key, {
      get() {
        return state.downloadBatchQueueListen[key]
      },
      set(value) {
        state.downloadBatchQueueListen[key] = value

        if (value >= batch.length) {
          api.batchSegmentDownload({
            docId,
            batchIndex: ++batchIndex,
            batches,
            isBatch,
            isLessThan17G
          })
        }
      }
    })

    let index = 0
    while (batch.length - index > 0) {
      api.downloadFileInner({
        batchIndex,
        range: batch[index++],
        file: { docId },
        isBatch,
        isChunk: true,
        isLessThan17G
      })
    }
  }
}

export const downloadFileInner = ({ api, props, state }) => ({
  batchIndex,
  file,
  range,
  isBatch,
  isChunk,
  isLessThan17G
}) => {
  const downloadOps = props.edm.download || {}
  const translateFile = getTranslateFile({ api, isChunk, isLessThan17G, file, state })
  const handleSuccess = getHandleSuccess({ downloadOps, file, translateFile, isChunk, state, isLessThan17G })
  const calcProgress = getCalcProgress()

  let { isFinished = false } = {}

  if (!isBatch) {
    const args = {
      calcProgress,
      isFinished,
      handleSuccess,
      range,
      batchIndex,
      isBatch,
      downloadOps,
      file,
      isChunk,
      isLessThan17G
    }

    api.downloadFileSingle(args)

    return
  }

  const params = { downloadOps, file, calcProgress, handleSuccess, range }
  isBatch && api.downloadFileBatch(params)
}

export const afterDownload = ({ api, state }) => ({
  batchIndex,
  range,
  data,
  file,
  isBatch,
  isChunk,
  isLessThan17G
}) => {
  if (data.status === 200) {
    const key = file.docId + '-' + batchIndex
    const count = state.downloadBatchQueue[key]
    state.downloadBatchQueue[key] = count + 1
  } else {
    const countDownloadReplay = state.downloadReplayAtoms[file.docId + '-' + range.index]

    if (countDownloadReplay && countDownloadReplay >= 2) {
      const msgArray = [
        'The number of retry times exceeds the threshold! [docId:',
        file.docId,
        ', chunk:',
        range.index,
        ']'
      ]

      log.logger.warn(msgArray.join(''))
      delete state.downloadReplayAtoms[file.docId + '-' + range.index]
    } else {
      const msgArray = ['replay ', countDownloadReplay, '! [docId:', file.docId, ', chunk:', range.index, ']']

      log.logger.warn(msgArray.join(''))

      state.downloadReplayAtoms[file.docId + '-' + range.index] = countDownloadReplay + 1

      api.downloadFileInner({ batchIndex, range, file, isBatch, isChunk, isLessThan17G })
    }
  }
}

export const setWriterFile = ({ state, emit, Streamsaver }) => ({ data, index, isLessThan17G, file }) => {
  let { fileStream, writer, fileData = [], downloaded = 0 } = {}
  const { checkcode } = data.headers
  const content = data.headers['content-disposition']
  const name = content.match(/fileName.?=(.*)/)[1] || content.match(/fileName=(.*)/)[1]

  let { chunkNum, fileSize, docName } = state.downloadChunkFile[file.docId]
  docName = name || docName

  if (!isLessThan17G) {
    fileStream = Streamsaver.createWriteStream(docName, { size: data.byteLength })
    writer = fileStream.getWriter()
  }

  const writerStreamSaver = () => {
    const downloadChunkFile = state.downloadChunkFile[file.docId] || {}
    let chunk = downloadChunkFile[index]

    if (chunk) {
      if (!isLessThan17G) {
        writer.write(chunk).then(() => {
          downloaded += chunk.byteLength

          downloadChunkFile[index] = null
          delete downloadChunkFile[index]
          if (index + 1 >= chunkNum) {
            delete state.downloadChunkFile[file.docId]

            emit('download', 100, '', { fileSize, checkcode })
            writer.close()
          } else {
            const progress = Math.ceil((downloaded / fileSize) * 100) || 0
            progress !== 100 && emit('download', progress)
            index++
            writerStreamSaver()
          }
        })
      } else {
        fileData.push(chunk)
        downloaded += chunk.size
        state.downloadChunkFile[file.docId][index] = null
        delete state.downloadChunkFile[file.docId][index]
        if (index + 1 >= chunkNum) {
          delete state.downloadChunkFile[file.docId]
          aLinkDownload({ blob: new Blob(fileData), name: docName })
          emit('download', 100, '', { fileSize, checkcode })
        } else {
          const progress = Math.ceil((downloaded / fileSize) * 100) || 0
          progress !== 100 && emit('download', progress)
          index++
          writerStreamSaver()
        }
      }
    } else {
      setTimeout(() => writerStreamSaver(), 1000)
    }
  }

  writerStreamSaver()

  // 中止下载时需要清空数据
  return (docId) => {
    const downloadChunkFile = state.downloadChunkFile[docId]
    Object.keys(downloadChunkFile).forEach((k) => (downloadChunkFile[k] = null))
    delete state.downloadChunkFile[docId]

    if (isLessThan17G) {
      fileData = []
    } else {
      writer && writer.close()
    }
  }
}

export const getFormData = ({ constants, props, state }) => ({ formData, file, type }) => {
  if (state.isEdm && props.edm.upload) {
    const params = Object.assign({}, props.data || {}, props.edm.upload.params || {})

    for (let key in params) {
      formData.set(key, params[key] || '')
    }
  }

  if (props.edm.isCheckCode === true) {
    formData.append(constants.EDM.ISCHECKCODE, 'Y')
    file.hash && formData.append(constants.EDM.CHECKCODE, file.hash)
  } else {
    formData.append(constants.EDM.ISCHECKCODE, 'N')
  }

  const updateId = state.updateId || props.edm.updateId
  if (type === constants.EDM.CHUNKINIT) {
    formData.append(constants.EDM.FILESIZE, file.size)
    formData.append(constants.EDM.CHUNKS, file.chunkSize)
    formData.append(constants.EDM.FILENAME, file.name)

    updateId && formData.append(constants.EDM.DOCID, updateId)
  } else {
    formData.append(constants.EDM.MULTIPART, file, file.filename)
    formData.append(constants.EDM.CHUNK, file.chunk)
    formData.append(constants.EDM.LOWERNAME, file.filename)

    const docId = updateId || file.docId
    formData.append(constants.EDM.DOCID, docId)
  }

  updateId && formData.append('updateFile', true)

  return formData
}

export const largeDocumentUpload = ({ api, Modal, state, t, emit, constants }) => (file) => {
  const chunkSize = Math.ceil(file.size / state.chunkSize)

  file.chunkSize = chunkSize
  file.cancelToken = []

  api
    .segmentUploadInit(file)
    .then((data) => {
      if (data) {
        file.records = data.chunks
        file.docId = data.docId
        state.largeFileInfo[data.docId] = file

        const batches = api.sliceChunk(file)

        api.batchSegmentUpload({
          docId: data.docId,
          batchIndex: 0,
          batches,
          progress: { size: file.size, trunks: [], file }
        })
      } else {
        Modal.message({
          message: t('ui.fileUpload.init'),
          status: 'warning',
          duration: '1000'
        })

        const file = api.getFile(file)

        state.uploadFiles.splice(state.uploadFiles.indexOf(file), 1)
      }
    })
    .catch((err) => {
      file.status = constants.FILE_STATUS.FAIL
      emit('error', err, file, state.uploadFiles)
    })
}

export const segmentUploadInit = ({ api, props, service, state, constants }) => (file) => {
  const formData = new FormData()

  return new Promise((resolve, reject) => {
    service.getLargeFileInitUrl().then((data) => {
      service
        .request({
          method: 'post',
          url: xss.filterUrl(data),
          data: api.getFormData({ formData, file, type: constants.EDM.CHUNKINIT }),
          withCredentials: props.withCredentials,
          headers: Object.assign(props.headers, state.headers)
        })
        .then((data) => {
          if (data.data.status === 200) {
            resolve(data.data.result)
          } else {
            reject(data)
          }
        })
    })
  })
}

const afterUpload = ({ data, file, batchIndex, state, api, progress }) => {
  if (data.status === 200) {
    const key = file.docId + '-' + batchIndex
    const count = state.batchQueue[key]

    state.batchQueue[key] = count + 1
  } else {
    const countReplay = state.replayAtoms[file.docId + '-' + file.chunk]

    if (countReplay && countReplay >= 2) {
      const msgArray = [
        'The number of retry times exceeds the threshold! [docId:',
        file.docId,
        ', chunk:',
        file.chunk,
        ']'
      ]
      log.logger.warn(msgArray.join(''))

      delete state.replayAtoms[file.docId + '-' + file.chunk]
    } else {
      const msgArray = ['replay ', countReplay, '! [docId:', file.docId, ', chunk:', file.chunk, ']']

      log.logger.warn(msgArray.join(''))

      state.replayAtoms[file.docId + '-' + file.chunk] = countReplay + 1

      api.segmentUpload(batchIndex, file, progress)
    }
  }
}

const segmentUploadInner = ({ api, props, service, state, emit, constants, batchIndex, file, progress }) => {
  const formData = new FormData()
  const postChunk = (url) => {
    const source = service.cancelToken()

    if (progress.file.cancelToken) {
      progress.file.cancelToken.push(source.cancel)
      const { SUCESS, FAIL } = constants.FILE_STATUS

      service
        .request({
          method: 'post',
          url: xss.filterUrl(url),
          data: api.getFormData({ formData, file, type: '' }),
          withCredentials: props.withCredentials,
          headers: Object.assign(props.headers, state.headers),
          cancelToken: source.token,
          hideErr: true,
          onUploadProgress(event) {
            progress.trunks[file.chunk] = event.loaded

            const count = progress.trunks.reduce((a, b) => a + b)
            let percentage = Math.floor((count / progress.size) * 100) || 0
            file.percentage = Math.floor((event.loaded / event.total) * 100)
            event.percentage = progress.file.percentage = percentage > 100 ? 100 : percentage
            percentage >= 100 && (progress.file.isFinished = true)

            emit('progress', progress.file, state.uploadFiles, api.calcUploadingFilesInfo())
          }
        })
        .then((data) => {
          afterUpload({ data, file, batchIndex, state, api, progress })
          progress.file.percentage === 100 && (progress.file.status = SUCESS)
        })
        .catch((data) => {
          if (data.response && state.errorStatusCodes.includes(data.response.status)) {
            const tokenParams = { token: props.edm.upload.token, file, type: 'upload' }
            api.getToken(tokenParams).then((data) => afterUpload({ data, file, batchIndex, state, api, progress }))
          } else {
            progress.file.status !== FAIL && emit('error', data, progress.file, state.uploadFiles)
            progress.file.status = FAIL
            progress.file.docId = ''
          }
        })
    }
  }

  if (!state.chunkUploadUrl) {
    service.getChunkUploadUrl().then((data) => {
      state.chunkUploadUrl = data
      postChunk(data)
    })
  } else {
    postChunk(state.chunkUploadUrl)
  }
}

export const segmentUpload = ({ api, props, service, state, emit, constants, CryptoJS }) => (
  batchIndex,
  file,
  progress
) => {
  if (typeof file.then === 'function') {
    file
      .then(
        (file) =>
          new Promise((resolve) => {
            if (props.edm.isCheckCode !== true) return resolve(file)
            const reader = new FileReader()

            reader.readAsArrayBuffer(file)
            reader.onload = (e) => {
              if (props.edm.isCheckCode === true) {
                let wordArray = CryptoJS.lib.WordArray.create(e.target.result)
                const hash = CryptoJS.SHA256(wordArray).toString()
                file.hash = hash
              }
              resolve(file)
            }
          })
      )
      .then((file) => {
        segmentUploadInner({
          batchIndex,
          api,
          service,
          state,
          emit,
          props,
          file,
          constants,
          progress
        })
      })
  } else {
    segmentUploadInner({
      api,
      props,
      service,
      state,
      emit,
      constants,
      batchIndex,
      file,
      progress
    })
  }
}

export const batchSegmentUpload = ({ api, constants, props, vm, state }) => ({
  docId,
  batchIndex,
  batches,
  progress
}) => {
  if (batchIndex < batches.length && progress.file.cancelToken) {
    const key = docId + '-' + batchIndex
    const batch = batches[batchIndex]

    Object.defineProperty(state.batchQueue, key, {
      get() {
        return state.batchQueueListen[key]
      },
      set(value) {
        state.batchQueueListen[key] = value

        if (value >= batch.length) {
          api.batchSegmentUpload({
            docId,
            batchIndex: ++batchIndex,
            batches,
            progress
          })
        }
      }
    })

    let index = 0

    while (batch.length - index > 0) {
      api.segmentUpload(batchIndex, batch[index++], progress)
    }
  } else {
    typeof props.edm.upload.closeloading === 'function' && props.edm.upload.closeloading()

    vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].upload(state.largeFileInfo[docId])
  }
}

export const sliceChunk = ({ state }) => (file) => {
  const chunkSize = file.chunkSize
  const chunkBatchArray = [[]]

  state.batchQueue[file.docId + '-0'] = 0
  state.batchQueueListen[file.docId + '-0'] = 0

  for (let i = 0; i < chunkSize; i++) {
    if (file.records.includes(i.toString())) {
      continue
    }

    const start = i * state.chunkSize
    const end = Math.min(file.size, start + state.chunkSize)
    const atom = file.raw.slice(start, end)

    atom.chunk = i + 1
    atom.filename = file.name
    atom.docId = file.docId
    atom.chunkSize = chunkSize
    atom.cacheSign = file.cacheSign
    atom.records = file.records
    atom.percentage = file.percentage

    const promise = Promise.resolve(atom)

    const lastIndex = chunkBatchArray.length - 1

    if (chunkBatchArray[lastIndex].length < state.chunkBatchLimit) {
      chunkBatchArray[lastIndex].push(promise)
    } else {
      state.batchQueue[file.docId + '-' + chunkBatchArray.length] = 0
      state.batchQueueListen[file.docId + '-' + chunkBatchArray.length] = 0
      chunkBatchArray.push([])
      chunkBatchArray[lastIndex + 1].push(promise)
    }
  }

  return chunkBatchArray
}

export const getToken = ({ constants, props, state, t, Modal }) => ({
  token,
  file,
  isOnlinePreview = false,
  type = '',
  isinit = false
}) => {
  if (props.edm.isExtranet && !isOnlinePreview) {
    // EDM 外网场景除在线预览其他场景不需要调用 EDM Token
    state.isSuccess = true
    state.accept = props.accept
    state.singleMaxSize = props.edm.singleFileMaxSize || 200

    return Promise.resolve(true)
  }

  if ((state.isEdm && !token) || typeof token !== 'function') {
    Modal.message({
      message: t(constants.EDM.I18NKEY),
      status: 'warning',
      duration: '2000'
    })

    return new Promise((resolve) => {
      resolve(false)
    })
  }

  return new Promise((resolve, reject) => {
    try {
      let promise

      if (isinit) {
        !initTokenPromise && (initTokenPromise = token(file))
        promise = initTokenPromise
      } else {
        promise = token(file)
      }

      promise.then((data) => {
        const result = data || {}
        const whitelist = (result.config && result.config.fileWhiteList) || ''

        state.isSuccess = true
        state.accept =
          type === 'download' || type === 'preview'
            ? props.accept
            : `${whitelist}${props.accept ? `,${props.accept}` : ''}`

        state.headers[constants.EDM.EDMTOKEN] = result.edmToken || ''
        state.headers[constants.EDM.TRACEID] = result.traceId || ''

        if (result.config) {
          state.singleMaxSize = result.config.singleFileMaxSize
        }
        state.edmToken = result
        resolve(true)
      })
    } catch (error) {
      reject(new Error(error))
    }
  })
}

export const previewFile = ({ api, props }) => (file, open = false) => {
  return new Promise((resolve, reject) => {
    try {
      const tokenParams = { isOnlinePreview: true, file, type: 'preview', token: props.edm.preview.token }

      api
        .getToken(tokenParams)
        .then((data) => {
          if (!data) {
            const message = '[TINY Error][FileUpload] No edm token'
            reject(new Error(message))
            return
          }

          if (isObject(file) || (Array.isArray(file) && file.length === 1)) {
            api.previewFileSingle({ file: Array.isArray(file) ? { ...file[0] } : file, resolve, open })
          } else if (Array.isArray(file) && file.length > 1) {
            api.previewFileBatch({ file, resolve, open })
          }
        })
        .catch((e) => reject(new Error(e)))
    } catch (e) {
      reject(new Error(e))
    }
  })
}

export const getNewTabPreviewUrl = ({ api }) => (file) => api.previewFile(file, true)

export const previewFileSingle = ({ api, state, props, constants, service }) => ({ file, resolve, open }) => {
  const iframeUrl = api.getPreviewUrlSync(file)

  // 新标签页打开
  if (open) return resolve(iframeUrl)

  // iframe打开
  if (iframeUrl) {
    state.showPreview = true
    state.iframeUrl = iframeUrl
    resolve(state.iframeUrl)
    return
  }

  const watermark = props.edm.preview.watermark || {}
  const params = state.fileWater ? constants.EDM.FORMAT : ''
  const downParams = state.fileWater ? constants.EDM.WATER : constants.EDM.SOURCE
  const tools = props.edm.preview.plugin

  service.all([service.getPreviewUrl(), service.getSingleDownloadUrl()]).then(
    service.spread((previewUrl, downloadurl) => {
      const serviceUrl = props.edm.preview.serviceUrl
      const infoUrl =
        serviceUrl || previewUrl.replace(/{docId}/, file.docId) + `?${params}docVersion=${file.docVersion}`

      const pageUrl =
        serviceUrl ||
        previewUrl.replace(/{docId}/, file.docId) + `?type=doc&pageNum=1&${params}docVersion=${file.docVersion}`

      const downloadUrl =
        serviceUrl +
        downloadurl.replace(/{docId}/, file.docId) +
        `?docId=${file.docId}&docVersion=${file.docVersion}&${downParams}from=Experience&`

      tools.setIsEDM3(true)
      tools.setDocumentInfoUrl(infoUrl)
      tools.setDownloadUrl(downloadUrl, true)
      tools.setPageUrl(pageUrl)

      tools.setWatermarkParameters({
        showWatermark: watermark.showWatermark || 1,
        rotation: watermark.rotation || 30,
        text: watermark.text || ''
      })

      tools.setPdfjsPaht(props.edm.preview.packageName || constants.EDM.JSLIB)
      tools.setAuthToken(state.headers[constants.EDM.EDMTOKEN])

      state.showPreview = true
      state.iframeUrl = props.edm.preview.previewUrl + `${constants.EDM.URLCONTS}${file.docVersion}&docId=${file.docId}`
      resolve(state.iframeUrl)
    })
  )
}

export const previewFileBatch = ({ service, props, state, api }) => ({ file, resolve, open }) => {
  service.getPreviewUrlBatch().then((url) => {
    const edm = props.edm || {}
    const preview = edm.preview || {}
    const online = preview.online || {}
    const { jslibhtml, baseurl } = online
    const { text } = preview.watermark || {}

    service
      .request({
        method: 'post',
        url: xss.filterUrl(url),
        withCredentials: props.withCredentials,
        headers: state.headers,
        data: {
          documents: file,
          asposeClient: jslibhtml,
          asposeService: baseurl,
          watermark: text
        }
      })
      .then(({ data }) => {
        const iframeUrl = api.getPreviewUrlSync({ generate: data.result.generate, size: file.length }, true)
        // 新标签页打开
        if (open) return resolve(iframeUrl)

        // iframe打开
        if (iframeUrl) {
          state.showPreview = true
          state.iframeUrl = iframeUrl
          resolve(state.iframeUrl)
        }
      })
  })
}

export const getPreviewUrlSync = ({ constants, props, state }) => (file, batch) => {
  const { ASPOSE, WPS } = constants.EDM.FILE_PREVIEW_TYPE
  const edm = props.edm || {}
  const preview = edm.preview || {}

  const { watermark, online, bar = {}, lang } = preview
  const { filePreviewType = ASPOSE, http = false, jslibhtml, appid, baseurl } = online
  const { styles } = bar
  bar.styles = JSON.stringify(styles)

  let html
  if (filePreviewType === WPS) {
    html = `${http ? 'http:' : 'https:'}${baseurl.replace(/\/$/, '')}/edm/projects/${appid}/web/preview`
  } else {
    html = jslibhtml.split('?').shift()
  }

  const params = []
  let paramsData
  const edmToken = state.headers[constants.EDM.EDMTOKEN]

  if (batch) {
    // 批量预览
    html = html = `${baseurl.replace(/\/$/, '')}/edm/projects/${appid}/web/batchPreview`
    const { generate, size } = file
    paramsData = { generate, 'EDM-Authorization': edmToken, docIndex: 1, size }
  } else {
    // 单文件预览
    paramsData = Object.assign(
      {},
      online,
      watermark,
      filePreviewType === WPS ? { 'EDM-Authorization': edmToken } : { authToken: edmToken },
      {
        jslibhtml: html,
        docId: file.docId,
        docVersion: file.docVersion || file.version || 'V1',
        type: 'doc',
        pageNum: '1',
        lang,
        bar: window.btoa(JSON.stringify(bar))
      }
    )
  }

  for (let key in paramsData) {
    const val = paramsData[key]
    if (!isObject(val)) {
      if (key === 'text') {
        params.push(`watermark=${encodeURIComponent(val)}`)
      }
      params.push(`${key}=${val}`)
    }
  }

  return html + '?' + params.join('&')
}

export const previewImage = ({ api, props, service }) => (file) => {
  return new Promise((resolve, reject) => {
    try {
      api
        .getToken({
          token: props.edm.preview.token,
          file,
          type: 'preview'
        })
        .then((data) => {
          if (!data) {
            reject(new Error('[TINY Error][FileUpload] No edm token'))
            return
          }

          service.getPreviewUrl().then((url) => {
            if (isObject(file) || (Array.isArray(file) && file.length === 1)) {
              api
                .previewImageSingle({ url, file: Array.isArray(file) ? { ...file[0] } : file })
                .then((link) => resolve(link))
            } else if (Array.isArray(file) && file.length > 1) {
              api.previewImageBatch({ url, file }).then((links) => resolve(links))
            }
          })
        })
    } catch (e) {
      reject(new Error(e))
    }
  })
}

export const previewImageSingle = ({ service, state, props }) => ({ file, url }) => {
  const edm = props.edm || {}
  const preview = edm.preview || {}
  let { text, textStyle } = preview.watermark || {}
  textStyle = { tile: true, ...textStyle }

  const imgParam = Object.assign(file, {
    type: 'image',
    imageType: 'image',
    watermark: text,
    textStyle
  })

  return service
    .post(xss.filterUrl(url.replace(/{docId}/, file.docId)), imgParam, {
      withCredentials: props.withCredentials,
      headers: Object.assign(props.headers, state.headers),
      responseType: 'blob'
    })
    .then((data) => {
      const blob = new Blob([data.data])
      const URL = window.URL || window.webkitURL
      return URL.createObjectURL(blob)
    })
}

export const previewImageBatch = ({ service, api }) => ({ url, file }) => {
  const promises = []
  file.forEach((f) => {
    promises.push(api.previewImageSingle({ url, file: f }))
  })
  return service.all(promises)
}

export const getDialogConfigObj = ({ props, state }) => () => {
  const dialogConfigDefault = {
    class: 'single-download-modal single-download-modal1',
    style: '',
    props: {
      lockScroll: true,
      visible: state.showPreview,
      dragable: true,
      title: '文档预览',
      width: '60%'
    },
    on: {
      'update:visible': (value) => (state.showPreview = value)
    }
  }
  let dialogConfig = {}

  if (props.edm && props.edm.preview && typeof props.edm.preview.dialogConfig === 'object') {
    dialogConfig = props.edm.preview.dialogConfig || {}
  }

  const dialogConfigCopy = extend(true, {}, dialogConfig)
  const events = dialogConfigCopy.events || {}
  // clazz、style只接受字符串值
  const clazz = dialogConfigCopy.class || ''
  const style = dialogConfigCopy.style || ''

  delete dialogConfigCopy.events
  delete dialogConfigCopy.class
  delete dialogConfigCopy.style

  return extend(true, {}, dialogConfigDefault, {
    class: `${dialogConfigDefault.class} ${clazz}`,
    style: `${style}`,
    props: { ...dialogConfigCopy },
    on: { ...events }
  })
}

export const computeDocChunkSize = ({ props, state, constants }) => () => {
  const isDefaultChunkSize = !(props.edm && props.edm.chunkSize)
  const { SIZE_0M, SIZE_2M, SIZE_4M, SIZE_8M, SIZE_16M, SIZE_20M, SIZE_32M, SIZE_64M, SIZE_2G } = constants.EDM

  let { docSize = SIZE_20M, chunkSize = SIZE_8M } = props.edm || {}
  docSize = docSize < 0 ? 0 : docSize
  docSize = docSize > SIZE_2G ? SIZE_2G : docSize

  if (docSize) chunkSize = chunkSize < 0 ? 0 : chunkSize
  if (!isDefaultChunkSize) {
    const chunkSizes = [SIZE_64M, SIZE_32M, SIZE_16M, SIZE_8M, SIZE_4M, SIZE_2M, SIZE_0M]
    chunkSizes.some((size) => {
      if (chunkSize >= size) {
        chunkSize = Math.max(size, SIZE_2M)
        return true
      }
    })
  }

  state.docSize = docSize * 1024
  state.chunkSize = chunkSize * 1024
}

export const updateFile = ({ constants, vm }) => (file) => {
  vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].handleUpdate(file)
}

export const handleChange = ({ vm, constants }) => (file) => {
  if (typeof file === 'object' && file !== null && file !== undefined) {
    let files = file
    if (!Array.isArray(file)) {
      files = [file]
    }
    vm.$refs[constants.UPLOAD_INNER].$refs[constants.UPLOAD_INNER_TEMPLATE].handleChange({ target: { files } })
  }
}

export const onBeforeDestroy = (state) => () => {
  state.uploadFiles.forEach((file) => {
    if (file.url && file.url.indexOf('blob:') === 0) {
      URL.revokeObjectURL(file.url)
    }
  })
}

export const handleClickFileList = ({ state, emit }) => (file) => {
  state.selected = file
  emit('click-file-list', file)
}

export const mounted = ({ vm, state }) => () => {
  vm.$on('drag-over', (isDragover) => (state.isDragover = isDragover))
}
