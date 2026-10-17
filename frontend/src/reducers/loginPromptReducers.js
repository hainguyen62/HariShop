import { LOGIN_PROMPT_OPEN, LOGIN_PROMPT_CLOSE } from '../constants/loginPromptConstants'

export const loginPromptReducer = (state = { open: false, redirect: '/' }, action) => {
  switch (action.type) {
    case LOGIN_PROMPT_OPEN:
      return { open: true, redirect: action.payload || '/' }
    case LOGIN_PROMPT_CLOSE:
      return { ...state, open: false }
    default:
      return state
  }
}
