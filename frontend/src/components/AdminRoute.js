import React from 'react'
import { Route, Redirect } from 'react-router-dom'
import { useSelector } from 'react-redux'

const AdminRoute = ({ component: Component, ...rest }) => {
  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  return (
    <Route
      {...rest}
      render={(props) => {
        if (!userInfo) {
          return <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
        }
        if (!userInfo.isAdmin) {
          return <Redirect to='/' />
        }
        return <Component {...props} />
      }}
    />
  )
}

export default AdminRoute