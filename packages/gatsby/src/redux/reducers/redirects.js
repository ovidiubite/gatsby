module.exports = (state = [], action) => {
  switch (action.type) {
    case `CREATE_REDIRECT`:
      return [action.payload]
    default:
      return state
  }
}
