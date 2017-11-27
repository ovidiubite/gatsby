const _ = require(`lodash`)
const crypto = require(`crypto`)
const stringify = require(`json-stringify-safe`)
const deepMap = require(`deep-map`)

const digest = str =>
  crypto
    .createHash(`md5`)
    .update(str)
    .digest(`hex`)
const typePrefix = `Contentful`
const makeTypeName = type => _.upperFirst(_.camelCase(`${typePrefix} ${type}`))

const getLocalizedField = () => {
  if (field[locale.code]) {
    return field[locale.code]
  } else if (field[locale.fallbackCode]) {
    return field[locale.fallbackCode]
  } else {
    return null
  }
}

const makeGetLocalizedField = () => field =>
  getLocalizedField(field, locale, defaultLocale)

exports.getLocalizedField = getLocalizedField

const fixId = id => {
  if (!_.isString(id)) {
    id = id.toString()
  }
  if (!isNaN(id.slice(0, 1))) {
    return `c${id}`
  }
  return id
}
exports.fixId = fixId

exports.fixIds = object =>
  deepMap(object, (v, k) => (k === `id` ? fixId(v) : v))

const makeId = () =>
  currentLocale === defaultLocale ? id : `${id}___${currentLocale}`

exports.makeId = makeId

const makeMakeId = () => id =>
  makeId(id, currentLocale, defaultLocale)

exports.buildEntryList = () =>
  contentTypeItems.map(contentType =>
    currentSyncData.entries.filter(
      entry => entry.sys.contentType.sys.id === contentType.sys.id
    )
  )

exports.buildResolvableSet = (
  entryList,
  existingNodes,
  assets,
  locales,
  defaultLocale
) => {
  const resolvable = new Set()
  existingNodes.forEach(n => resolvable.add(n.id))

  entryList.forEach(entries => {
    entries.forEach(entry => {
      resolvable.add(entry.sys.id)
    })
  })
  assets.forEach(assetItem => resolvable.add(assetItem.sys.id))

  return resolvable
}

exports.buildForeignReferenceMap = (
  contentTypeItems,
  entryList,
  resolvable,
  defaultLocale,
  locales
) => {
  const foreignReferenceMap = {}
  contentTypeItems.forEach((contentTypeItem, i) => {
    const contentTypeItemId = contentTypeItem.name.toLowerCase()
    entryList[i].forEach(entryItem => {
      const entryItemFields = entryItem.fields
      Object.keys(entryItemFields).forEach(entryItemFieldKey => {
        if (entryItemFields[entryItemFieldKey]) {
          let entryItemFieldValue =
            entryItemFields[entryItemFieldKey][defaultLocale]
          if (Array.isArray(entryItemFieldValue)) {
            if (
              entryItemFieldValue[0] &&
              entryItemFieldValue[0].sys &&
              entryItemFieldValue[0].sys.type &&
              entryItemFieldValue[0].sys.id
            ) {
              entryItemFieldValue.forEach(v => {
                if (!resolvable.has(v.sys.id)) {
                  return
                }

                if (!foreignReferenceMap[v.sys.id]) {
                  foreignReferenceMap[v.sys.id] = []
                }
                foreignReferenceMap[v.sys.id].push({
                  name: `${contentTypeItemId}___NODE`,
                  id: entryItem.sys.id,
                })
              })
            }
          } else if (
            entryItemFieldValue &&
            entryItemFieldValue.sys &&
            entryItemFieldValue.sys.type &&
            entryItemFieldValue.sys.id &&
            resolvable.has(entryItemFieldValue.sys.id)
          ) {
            if (!foreignReferenceMap[entryItemFieldValue.sys.id]) {
              foreignReferenceMap[entryItemFieldValue.sys.id] = []
            }
            foreignReferenceMap[entryItemFieldValue.sys.id].push({
              name: `${contentTypeItemId}___NODE`,
              id: entryItem.sys.id,
            })
          }
        }
      })
    })
  })

  return foreignReferenceMap
}

function createTextNode(node, key, text, createNode) {
  const str = _.isString(text) ? text : ` `
  const textNode = {
    id: `${node.id}${key}TextNode`,
    parent: node.id,
    children: [],
    key: str,
    internal: {
      type: _.camelCase(`${node.internal.type} ${key} TextNode`),
      mediaType: `text/markdown`,
      content: str,
      contentDigest: digest(str),
    },
  }

  node.children = node.children.concat([textNode.id])
  createNode(textNode)

  return textNode.id
}
exports.createTextNode = createTextNode
