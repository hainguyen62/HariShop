import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Breadcrumb, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Product from '../components/Product'
import Loader from '../components/Loader'
import Message from '../components/Message'
import Paginate from '../components/Paginate'
import Meta from '../components/Meta'
import { listProducts } from '../actions/productActions'

// ─── Breadcrumb style ──────────────────────────────────────────

const BREADCRUMB_STYLE = `
.lux-filter-breadcrumb .breadcrumb {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 12px 20px;
  margin-bottom: 20px;
}
.lux-filter-breadcrumb .breadcrumb-item {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.lux-filter-breadcrumb .breadcrumb-item a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: color 0.2s ease;
}
.lux-filter-breadcrumb .breadcrumb-item a:hover {
  color: #33FFCC;
}
.lux-filter-breadcrumb .breadcrumb-item.active {
  color: #33FFCC;
  font-weight: 800;
}
.lux-filter-breadcrumb .breadcrumb-item + .breadcrumb-item::before {
  color: rgba(255,255,255,0.25);
  font-weight: 700;
  content: "/";
  padding: 0 10px;
}
`

if (typeof document !== 'undefined') {
  const id = 'hs-breadcrumb-style'
  const existing = document.getElementById(id)
  if (!existing) {
    const tag = document.createElement('style')
    tag.id = id
    tag.textContent = BREADCRUMB_STYLE
    document.head.appendChild(tag)
  } else {
    existing.textContent = BREADCRUMB_STYLE
  }
}

const FilteredProductsScreen = ({ match, location }) => {
  const value = match.params.value
  const pageNumber = match.params.pageNumber || 1

  // 🔹 SORT STATE
  const [sort, setSort] = useState('latest')

  const dispatch = useDispatch()

  const productList = useSelector((state) => state.productList)
  const { loading, error, products, page, pages } = productList

  // 🔹 XÁC ĐỊNH LOẠI FILTER
  const isBrand = location.pathname.startsWith('/brand')
  const isCategory = location.pathname.startsWith('/category')
  const isPrice = location.pathname.startsWith('/price')

  let brand = ''
  let category = ''
  let minPrice = ''
  let maxPrice = ''

  const queryParams = new URLSearchParams(location.search)
  const categoryFromQuery = queryParams.get('category') || ''

  if (isBrand) {
    brand = value
    // Cho phép thu hẹp thêm theo danh mục, vd: /brand/Apple?category=Điện thoại
    // để không lẫn phụ kiện (tai nghe, sạc...) của cùng hãng vào kết quả
    if (categoryFromQuery) category = categoryFromQuery
  }

  if (isCategory) {
    category = value
  }

  if (isPrice) {
    if (value === 'duoi-10tr') {
      minPrice = 0
      maxPrice = 10000000
    } else if (value === '10-20tr') {
      minPrice = 10000000
      maxPrice = 20000000
    } else if (value === 'tren-20tr') {
      minPrice = 20000000
    }
  }

  // 🔹 FETCH PRODUCTS (FILTER + SORT + PAGINATION)
  useEffect(() => {
    dispatch(
      listProducts(
        { brand, category, minPrice, maxPrice, sort },
        pageNumber
      )
    )
  }, [dispatch, brand, category, minPrice, maxPrice, sort, pageNumber])

  const getTitle = () => {
    if (isBrand) {
      return categoryFromQuery ? `Hãng: ${value} - ${categoryFromQuery}` : `Hãng: ${value}`
    }
    if (isCategory) return `Danh mục: ${value}`
    if (isPrice) {
      if (value === 'duoi-10tr') return 'Giá dưới 10 triệu'
      if (value === '10-20tr') return 'Giá từ 10 – 20 triệu'
      if (value === 'tren-20tr') return 'Giá trên 20 triệu'
    }
    return 'Sản phẩm'
  }

  return (
    <>
      <Meta title={getTitle()} />

      <Breadcrumb className="lux-filter-breadcrumb">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{getTitle()}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className='align-items-center mb-3'>
        <Col md={9}>
          <h2>{getTitle()}</h2>
        </Col>
        <Col md={3}>
          <Form.Control
            as="select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value='latest'>Mới nhất</option>
            <option value='priceAsc'>Giá tăng dần</option>
            <option value='priceDesc'>Giá giảm dần</option>
          </Form.Control>
        </Col>
      </Row>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : products.length === 0 ? (
        <Message>Không có sản phẩm phù hợp</Message>
      ) : (
        <>
          <Row>
            {products.map((product) => (
              <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                <Product product={product} />
              </Col>
            ))}
          </Row>

          <Paginate
            pages={pages}
            page={page}
            keyword={`${isBrand ? 'brand' : 'price'}/${value}`}
          />
        </>
      )}
    </>
  )
}

export default FilteredProductsScreen