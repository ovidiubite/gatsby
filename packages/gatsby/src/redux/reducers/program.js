module.exports = (state = { directory: `/` }, action) => {
  switch (action.type) {
    case `SET_PROGRAM`:
      return {
      }

    case `SET_PROGRAM_EXTENSIONS`:
      return {
        extensions: action.payload,
      }

    default:
      return state
  }
}
