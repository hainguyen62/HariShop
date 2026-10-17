import React, { useEffect, useState } from 'react'

import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { listUsers, deleteUser } from '../actions/userActions'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import SortableHeader from '../components/SortableHeader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'

const DEFAULT_FILTERS = { keyword: '', role: '', provider: '', startDate: '', endDate: '' }

const FILTER_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên, email hoặc số điện thoại' },
  {
    key: 'role', label: 'Vai trò', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'admin', label: 'Admin' }, { value: 'customer', label: 'Khách hàng' }],
  },
  {
    key: 'provider', label: 'Kiểu đăng nhập', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'local', label: 'Email và mật khẩu' }, { value: 'google', label: 'Google' }],
  },
  { key: 'startDate', label: 'Đăng ký từ ngày', type: 'date', advanced: true },
  { key: 'endDate', label: 'Đăng ký đến ngày', type: 'date', advanced: true },
]


const UserListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const userList = useSelector((state) => state.userList)
  const { loading, error, users, page: currentPage, pages } = userList

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const userDelete = useSelector((state) => state.userDelete)
  const { success: successDelete } = userDelete

  const { filters, applyFilters, sortConfig, handleSort, page, setPage, params, paramsKey } = useListControls(DEFAULT_FILTERS)

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listUsers(params))
    } else {
      history.push('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, history, successDelete, userInfo, paramsKey])

  useEffect(() => {
    if (!loading && users && users.length === 0 && page > 1) setPage(page - 1)
  }, [loading, users, page, setPage])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const deleteHandler = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }


  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá tài khoản này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          dispatch(deleteUser(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />
      <h1>Users</h1>

      <ListFilterBar
        fields={FILTER_FIELDS}
        values={filters}
        defaults={DEFAULT_FILTERS}
        onApply={applyFilters}
        pairs={[['startDate', 'endDate']]}
        quickDates
      />

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>ID</th>
              <SortableHeader label='Tên' sortKey='name' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='EMAIL' sortKey='email' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='ADMIN' sortKey='isAdmin' sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label='Ngày tạo' sortKey='createdAt' sortConfig={sortConfig} onSort={handleSort} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(users || []).length === 0 && (
              <tr><td colSpan={6} className='text-center text-muted'>Không có người dùng phù hợp</td></tr>
            )}
            {(users || []).map((user) => (
              <tr key={user._id}>
                <td>{user._id}</td>
                <td>{user.name}</td>
                <td>
                  <a
                    href={`mailto:${user.email}`}
                    style={{ color: 'var(--hs-text, #eef0f7)', textDecoration: 'underline' }}
                  >
                    {user.email}
                  </a>
                </td>
                <td>
                  {user.isAdmin ? (
                    <i className='fas fa-check' style={{ color: 'green' }}></i>
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                    : '—'}
                </td>
                <td>
                  <LinkContainer to={`/admin/user/${user._id}/edit`}>
                    <Button variant='light' className='btn-sm'>
                      <i className='fas fa-edit'></i>
                    </Button>
                  </LinkContainer>
                  <Button
                    variant='danger'
                    className='btn-sm'
                    onClick={() => deleteHandler(user._id)}
                  >
                    <i className='fas fa-trash'></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Paginate pages={pages || 1} page={currentPage || page} onPageChange={setPage} />
        </>
      )}
    </>
  )
}

export default UserListScreen