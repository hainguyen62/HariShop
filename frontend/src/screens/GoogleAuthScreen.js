import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Loader from '../components/Loader'
import Message from '../components/Message'
import { loginWithGoogleSession } from '../actions/userActions'

const GoogleAuthScreen = ({ location, history }) => {
  const dispatch = useDispatch()
  const handled = useRef(false)

  const userLogin = useSelector((state) => state.userLogin)
  const { error, userInfo } = userLogin

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(location.search)
    if (params.get('error')) {
      history.push('/login')
      return
    }

    // Token nằm ở cookie refresh do backend đặt, không còn trên URL
    dispatch(loginWithGoogleSession())
  }, [dispatch, location.search, history])

  useEffect(() => {
    if (userInfo) {
      history.push('/')
    }
  }, [userInfo, history])

  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      {error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          <Loader />
          <p style={{ color: '#b8bcc8', marginTop: '1rem' }}>Đang đăng nhập bằng Google...</p>
        </>
      )}
    </div>
  )
}

export default GoogleAuthScreen