import React, { useEffect, useMemo, useState } from 'react'
import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'

import Message from '../components/Message'
import Loader from '../components/Loader'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

import { listVouchers, deleteVoucher } from '../actions/voucherAdminActions'
import { VOUCHER_DELETE_RESET } from '../constants/voucherConstants'
import SortableHeader from '../components/SortableHeader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'

const DEFAULT_FILTERS = { keyword: '', type: '', status: '', startDate: '', endDate: '' }

const FILTER_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Mã hoặc tên voucher' },
  {
    key: 'type', label: 'Loại', type: 'select', advanced: true,
    options: [
      { value: '', label: 'Tất cả' },
      { value: 'percent', label: 'Giảm theo %' },
      { value: 'fixed', label: 'Giảm số tiền' },
      { value: 'freeship', label: 'Freeship' },
    ],
  },
  {
    key: 'status', label: 'Trạng thái', type: 'select', advanced: true,
    options: [
      { value: '', label: 'Tất cả' },
      { value: 'active', label: 'Đang hoạt động' },
      { value: 'upcoming', label: 'Sắp diễn ra' },
      { value: 'expired', label: 'Hết hạn' },
      { value: 'exhausted', label: 'Hết lượt' },
      { value: 'paused', label: 'Tạm dừng' },
    ],
  },
  { key: 'startDate', label: 'Hiệu lực từ ngày', type: 'date', advanced: true },
  { key: 'endDate', label: 'Hiệu lực đến ngày', type: 'date', advanced: true },
]

const voucherStatus = (v, now = new Date()) => {
  if (!v?.isActive) return { label: 'Tạm dừng', color: '#ff6b6b' }
  if (v?.expiresAt && new Date(v.expiresAt) < now) return { label: 'Hết hạn', color: '#8a8fa3' }
  if (v?.startsAt && new Date(v.startsAt) > now) return { label: 'Sắp diễn ra', color: '#5eb3f6' }
  if (Number(v?.usageLimit || 0) > 0 && Number(v?.usedCount || 0) >= Number(v.usageLimit)) {
    return { label: 'Hết lượt', color: '#ffd166' }
  }
  return { label: 'Đang hoạt động', color: '#4cdb80' }
}

const formatDate = (value) => {
  if (!value) return null
  const s = typeof value === 'string' ? value : new Date(value).toISOString()
  return s?.length >= 10 ? s.substring(0, 10) : null
}

const VoucherListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const voucherList = useSelector((state) => state.voucherList)
  const { loading, error, vouchers, page: currentPage, pages } = voucherList

  const voucherDelete = useSelector((state) => state.voucherDelete)
  const { loading: loadingDelete, error: errorDelete, success: successDelete } = voucherDelete

  const { filters, applyFilters, sortConfig, handleSort, page, setPage, params, paramsKey } = useListControls(DEFAULT_FILTERS)

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(listVouchers(params))
    } else {
      history.push('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, history, userInfo, paramsKey])

  useEffect(() => {
    if (successDelete) {
      dispatch({ type: VOUCHER_DELETE_RESET })
      dispatch(listVouchers(params))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, successDelete])

  useEffect(() => {
    if (!loading && vouchers && vouchers.length === 0 && page > 1) setPage(page - 1)
  }, [loading, vouchers, page, setPage])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const remainingLabel = useMemo(() => {
    return (usageLimit, usedCount) => {
      const ul = Number(usageLimit || 0)
      const uc = Number(usedCount || 0)
      if (ul === 0) return 'Không giới hạn'
      const left = ul - uc
      return left <= 0 ? '0' : String(left)
    }
  }, [])

  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá voucher này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          if (deleteId) dispatch(deleteVoucher(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />

      <h1>Danh sách voucher</h1>

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
          {loadingDelete ? <Loader /> : null}
          {errorDelete ? <Message variant='danger'>{errorDelete}</Message> : null}
          {successDelete ? <Message variant='success'>Đã xoá voucher.</Message> : null}

          <Table striped bordered hover responsive className='table-sm'>
            <thead>
              <tr>
                <SortableHeader label='Mã' sortKey='code' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Tên' sortKey='name' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Loại' sortKey='type' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Giá trị' sortKey='value' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Đơn tối thiểu' sortKey='minOrder' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Max giảm' sortKey='maxDiscount' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Giới hạn lượt' sortKey='usageLimit' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Đã dùng' sortKey='usedCount' sortConfig={sortConfig} onSort={handleSort} />
                <th>Còn lại</th>
                <SortableHeader label='Hiệu lực' sortKey='expiresAt' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Trạng thái' sortKey='isActive' sortConfig={sortConfig} onSort={handleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(vouchers || []).length === 0 && (
                <tr><td colSpan={12} className='text-center text-muted'>Không có voucher phù hợp</td></tr>
              )}
              {(vouchers || []).map((v) => {
                const usageLimit = Number(v?.usageLimit || 0)
                const usedCount = Number(v?.usedCount || 0)
                return (
                  <tr key={v?._id || v?.id}>
                    <td>{v?.code}</td>
                    <td>{v?.name || '—'}</td>
                    <td>{v?.type === 'percent' ? '%' : v?.type === 'freeship' ? 'Freeship' : 'VNĐ'}</td>
                    <td>{Number(v?.value || 0).toLocaleString('vi-VN')}</td>
                    <td>{Number(v?.minOrder || 0).toLocaleString('vi-VN')}đ</td>
                    <td>{Number(v?.maxDiscount || 0).toLocaleString('vi-VN')}đ</td>
                    <td>{usageLimit === 0 ? 'Không giới hạn' : usageLimit}</td>
                    <td>{usedCount}</td>
                    <td>{remainingLabel(usageLimit, usedCount)}</td>
                    <td>
                      {formatDate(v?.startsAt)} → {formatDate(v?.expiresAt)}
                    </td>
                    <td>
                      <span style={{ color: voucherStatus(v).color, fontWeight: 700 }}>{voucherStatus(v).label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <LinkContainer to={`/admin/voucher/${v?._id}/edit`}>
                          <Button variant='light' size='sm'>
                            <i className='fas fa-edit' />
                          </Button>
                        </LinkContainer>
                        {userInfo?.isAdmin && (
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={() => {
                              setDeleteId(v?._id)
                              setShowConfirm(true)
                            }}
                            disabled={voucherDelete?.loading}
                          >
                            <i className='fas fa-trash' />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <Paginate pages={pages || 1} page={currentPage || page} onPageChange={setPage} />
        </>
      )}
    </>
  )
}

export default VoucherListScreen