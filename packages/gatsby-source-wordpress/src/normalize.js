const crypto = require(`crypto`)
const deepMapKeys = require(`deep-map-keys`)
const _ = require(`lodash`)
const uuidv5 = require(`uuid/v5`)

const colorized = require(`./output-color`)
const conflictFieldPrefix = `wordpress_`
const restrictedNodeFields = [`id`, `children`, `parent`, `fields`, `internal`]

const digest = str =>
  crypto
    .createHash(`md5`)
    .update(str)
    .digest(`hex`)

function getValidKey() {
  let nkey = "" + key
  const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/
  let changed = false

  if (!NAME_RX.test(nkey)) {
    changed = true
    nkey = nkey.replace(/-|__|:|\.|\s/g, `_`)
  }

  if (!NAME_RX.test(nkey.slice(0, 1))) {
    changed = true
    nkey = `${conflictFieldPrefix}${nkey}`
  }
  if (restrictedNodeFields.includes(nkey)) {
    changed = true
    nkey = `${conflictFieldPrefix}${nkey}`.replace(/-|__|:|\.|\s/g, `_`)
  }
  if (changed && verbose)
    console.log(
      colorized.out(
        `Object with key "${
          key
        }" breaks GraphQL naming convention. Renamed to "${nkey}"`,
        colorized.color.Font.FgRed
      )
    )

  return nkey
}

exports.getValidKey = getValidKey

const normalizeACF = entities =>
  entities.map(e => {
    if (!_.isObject(e[`acf`])) {
      delete e[`acf`]
    }
    return e
  })

exports.normalizeACF = normalizeACF

// Create entities from the few the WordPress API returns as an object for presumably
// legacy reasons.
const normalizeEntities = entities => {
  const mapType = e =>
    Object.keys(e)
      .filter(key => key != `__type`)
      .map(key => {
        return {
          id: key,
          __type: e.__type,
        }
      })

  return entities.reduce((acc, e) => {
    switch (e.__type) {
      case `wordpress__wp_types`:
        return acc.concat(mapType(e))
      case `wordpress__wp_api_menus_menu_locations`:
        return acc.concat(mapType(e))
      case `wordpress__wp_statuses`:
        return acc.concat(mapType(e))
      case `wordpress__wp_taxonomies`:
        return acc.concat(mapType(e))
      case `wordpress__acf_options`:
        return acc.concat(mapType(e))
      default:
        return acc.concat(e)
    }
  }, [])
}

exports.normalizeEntities = normalizeEntities

exports.standardizeKeys = entities =>
  entities.map(e =>
    deepMapKeys(
      e,
      key => (key == `ID` ? getValidKey({ key: `id` }) : getValidKey({ key }))
    )
  )

exports.standardizeDates = entities =>
  entities.map(e => {
    Object.keys(e).forEach(key => {
      if (e[`${key}_gmt`]) {
        e[key] = new Date(e[`${key}_gmt`] + `z`).toJSON()
        delete e[`${key}_gmt`]
      }
    })

    return e
  })

exports.liftRenderedField = entities =>
  entities.map(e => {
    Object.keys(e).forEach(key => {
      const value = e[key]
      if (_.isObject(value) && _.isString(value.rendered)) {
        e[key] = value.rendered
      }
    })

    return e
  })

exports.excludeUnknownEntities = entities =>
  entities.filter(e => e.wordpress_id)

const seedConstant = `b2012db8-fafc-5a03-915f-e6016ff32086`
const typeNamespaces = {}
exports.createGatsbyIds = entities =>
  entities.map(e => {
    let namespace
    if (typeNamespaces[e.__type]) {
      namespace = typeNamespaces[e.__type]
    } else {
      typeNamespaces[e.__type] = uuidv5(e.__type, seedConstant)
      namespace = typeNamespaces[e.__type]
    }

    e.id = uuidv5(e.wordpress_id.toString(), namespace)
    return e
  })

exports.mapTypes = entities => {
  const groups = _.groupBy(entities, e => e.__type)
  for (let groupId in groups) {
    groups[groupId] = groups[groupId].map(e => {
      return {
        wordpress_id: e.wordpress_id,
        id: e.id,
      }
    })
  }

  return groups
}

exports.mapAuthorsToUsers = entities => {
  const users = entities.filter(e => e.__type == `wordpress__wp_users`)
  return entities.map(e => {
    if (e.author) {
      // Find the user
      const user = users.find(u => u.wordpress_id === e.author)
      if (user) {
        e.author___NODE = user.id

        if (!user.all_authored_entities___NODE) {
          user.all_authored_entities___NODE = []
        }
        user.all_authored_entities___NODE.push(e.id)
        if (!user[`authored_${e.__type}___NODE`]) {
          user[`authored_${e.__type}___NODE`] = []
        }
        user[`authored_${e.__type}___NODE`].push(e.id)

        delete e.author
      }
    }
    return e
  })
}

exports.mapPostsToTagsCategories = entities => {
  const tags = entities.filter(e => e.__type == `wordpress__TAG`)
  const categories = entities.filter(e => e.__type == `wordpress__CATEGORY`)

  return entities.map(e => {
    if (e.__type === `wordpress__POST`) {

      if (e.tags.length) {
        e.tags___NODE = e.tags.map(
          t => tags.find(tObj => t === tObj.wordpress_id).id
        )
        delete e.tags
      }
      if (e.categories.length) {
        e.categories___NODE = e.categories.map(
          c => categories.find(cObj => c === cObj.wordpress_id).id
        )
        delete e.categories
      }
    }
    return e
  })
}


exports.mapTagsCategoriesToTaxonomies = entities =>
  entities.map(e => {
    if (e.taxonomy && e.__type != `wordpress__wp_api_menus_menus`) {
      e.taxonomy___NODE = entities.find(t => t.wordpress_id == e.taxonomy).id
      delete e.taxonomy
    }
    return e
  })

