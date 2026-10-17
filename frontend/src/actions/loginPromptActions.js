import { LOGIN_PROMPT_OPEN, LOGIN_PROMPT_CLOSE } from '../constants/loginPromptConstants'

// redirect chỉ nên là đường dẫn, không kèm query, vì LoginScreen tách tham số bằng dấu =
export const openLoginPrompt = (redirect = '/') => ({ type: LOGIN_PROMPT_OPEN, payload: redirect })
export const closeLoginPrompt = () => ({ type: LOGIN_PROMPT_CLOSE })
