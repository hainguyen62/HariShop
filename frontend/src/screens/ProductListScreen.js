import React, { useEffect, useState } from 'react'
import axios from 'axios'

import { LinkContainer } from 'react-router-bootstrap'
import { Table, Button, Row, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import {
  listProducts,
  deleteProduct,
} from '../actions/productActions'
import { PRODUCT_CREATE_RESET } from '../constants/productConstants'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import SortableHeader from '../components/SortableHeader'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'

const DEFAULT_FILTERS = {
  keyword: '', brand: '', category: '', minPrice: '', maxPrice: '',
  stockStatus: '', minStock: '', maxStock: '', startDate: '', endDate: '',
}

const toOptions = (list) => [{ value: '', label: 'Tất cả' }, ...list.map((x) => ({ value: x, label: x }))]


const ProductListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const productList = useSelector((state) => state.productList)
  const { loading, error, products, page, pages } = productList

  const productDelete = useSelector((state) => state.productDelete)
  const {
    loading: loadingDelete,
    error: errorDelete,
    success: successDelete,
  } = productDelete

  const productCreate = useSelector((state) => state.productCreate)
  const {
    loading: loadingCreate,
    error: errorCreate,
  } = productCreate

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const { filters, applyFilters, sortConfig, handleSort, page: pageNumber, setPage, params, paramsKey } = useListControls(DEFAULT_FILTERS)
  const [options, setOptions] = useState({ brands: [], categories: [] })

  useEffect(() => {
    axios.get('/api/products/filter-options').then(({ data }) => setOptions(data)).catch(() => {})
  }, [])

  const filterFields = [
    { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm' },
    { key: 'brand', label: 'Hãng', type: 'select', advanced: true, options: toOptions(options.brands) },
    { key: 'category', label: 'Danh mục', type: 'select', advanced: true, options: toOptions(options.categories) },
    { key: 'minPrice', label: 'Giá từ (đ)', type: 'number', advanced: true, placeholder: '0' },
    { key: 'maxPrice', label: 'Giá đến (đ)', type: 'number', advanced: true, placeholder: '50000000' },
    {
      key: 'stockStatus', label: 'Tình trạng kho', type: 'select', advanced: true,
      options: [
        { value: '', label: 'Tất cả' },
        { value: 'out', label: 'Hết hàng' },
        { value: 'low', label: 'Sắp hết (1 đến 5)' },
        { value: 'in', label: 'Còn nhiều (trên 5)' },
      ],
    },
    { key: 'minStock', label: 'Tồn kho từ', type: 'number', advanced: true },
    { key: 'maxStock', label: 'Tồn kho đến', type: 'number', advanced: true },
    { key: 'startDate', label: 'Tạo từ ngày', type: 'date', advanced: true },
    { key: 'endDate', label: 'Tạo đến ngày', type: 'date', advanced: true },
  ]

  useEffect(() => {
    dispatch({ type: PRODUCT_CREATE_RESET })

    if (!userInfo || !userInfo.isAdmin) {
      history.push('/login')
    }

    const { pageNumber: pn, keyword, brand, category, ...rest } = params
    dispatch(
      listProducts(
        {
          ...rest,
          keyword: encodeURIComponent(keyword || ''),
          brand: encodeURIComponent(brand || ''),
          category: encodeURIComponent(category || ''),
          sort: '',
        },
        pn
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, history, userInfo, successDelete, paramsKey])

  useEffect(() => {
    if (!loading && products && products.length === 0 && pageNumber > 1) setPage(pageNumber - 1)
  }, [loading, products, pageNumber, setPage])

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const deleteHandler = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }


  const createProductHandler = () => {
    history.push('/admin/product/new')
  }

  return (
    <>
      <ConfirmDeleteModal
        show={showConfirm}
        title={'Xoá sản phẩm này?'}
        confirmText={'Xoá'}
        cancelText={'Huỷ'}
        onCancel={() => {
          setShowConfirm(false)
          setDeleteId(null)
        }}
        onConfirm={() => {
          dispatch(deleteProduct(deleteId))
          setShowConfirm(false)
          setDeleteId(null)
        }}
      />

      <h1 className='text-center'>Sản Phẩm</h1>
      <Row className='justify-content-end mb-3'>
        <Col xs='auto'>
          <Button onClick={createProductHandler}>
            <i className='fas fa-plus'></i> Tạo Sản Phẩm
          </Button>
        </Col>
      </Row>
      <ListFilterBar
        fields={filterFields}
        values={filters}
        defaults={DEFAULT_FILTERS}
        onApply={applyFilters}
        pairs={[['minPrice', 'maxPrice'], ['minStock', 'maxStock'], ['startDate', 'endDate']]}
        quickDates
      />
      {loadingDelete && <Loader />}
      {errorDelete && <Message variant='danger'>{errorDelete}</Message>}
      {loadingCreate && <Loader />}
      {errorCreate && <Message variant='danger'>{errorCreate}</Message>}
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          <Table striped bordered hover responsive className='table-sm'>
            <thead>
              <tr>
                <th>Mã SP</th>
                <SortableHeader label='Tên' sortKey='name' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Giá' sortKey='price' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Danh Mục' sortKey='category' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Hãng' sortKey='brand' sortConfig={sortConfig} onSort={handleSort} />
                <th>Màu sắc</th>
                <SortableHeader label='Tồn kho' sortKey='countInStock' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Đánh giá' sortKey='rating' sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label='Ngày tạo' sortKey='createdAt' sortConfig={sortConfig} onSort={handleSort} />
                <th></th>


              </tr>
            </thead>
            <tbody>
              {(products || []).length === 0 && (
                <tr><td colSpan={10} className='text-center text-muted'>Không có sản phẩm phù hợp</td></tr>
              )}
              {(products || []).map((product) => (
                <tr key={product._id}>
                  <td>{product.productCode || '—'}</td>
                  <td title={product._id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                      )}
                      <span
                        title={product.name}
                        style={{
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td>{product.price.toLocaleString('vi-VN')}đ</td>
                  <td>{product.category}</td>
                  <td>{product.brand}</td>
                  <td>
                    {Array.isArray(product.colors) && product.colors.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {product.colors.map((c) => (
                          <span
                            key={c.name}
                            title={c.name}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: c.hexCode || '#888888',
                              border: '1px solid rgba(0,0,0,0.2)',
                              display: 'inline-block',
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>

                  <td>{Number.isFinite(product.countInStock) ? product.countInStock : 0}</td>
                  <td>{Number(product.rating || 0).toFixed(1)} ★</td>
                  <td>
                    {product.createdAt
                      ? new Date(product.createdAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>

                  <td>

                    <LinkContainer to={`/admin/product/${product._id}/edit`}>
                      <Button variant='light' className='btn-sm'>
                        <i className='fas fa-edit'></i>
                      </Button>
                    </LinkContainer>
                    <Button
                      variant='danger'
                      className='btn-sm'
                      onClick={() => deleteHandler(product._id)}
                    >
                      <i className='fas fa-trash'></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginate pages={pages} page={page} onPageChange={setPage} />
        </>
      )}
    </>
  )
}

export default ProductListScreen