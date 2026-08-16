import React from 'react'
import { Pagination } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'

const Paginate = ({ pages, page, isAdmin = false, keyword = '' }) => {
  const buildPath = (p) => {
    if (isAdmin) return `/admin/productlist/${p}`
    return keyword ? `/search/${keyword}/page/${p}` : `/page/${p}`
  }

  return (
    pages > 1 && (
      <>
        <style>{`
          .harishop-pagination .page-link {
            background-color: #1a1a2e;
            border: 1px solid rgba(51,255,204,0.25);
            color: #b8bcc8;
            margin: 0 4px;
            border-radius: 8px;
            min-width: 38px;
            text-align: center;
          }
          .harishop-pagination .page-link:hover {
            background-color: rgba(51,255,204,0.12);
            border-color: #33FFCC;
            color: #33FFCC;
          }
          .harishop-pagination .page-item.active .page-link {
            background-color: #33FFCC;
            border-color: #33FFCC;
            color: #0f0f23;
            font-weight: 700;
          }
          .harishop-pagination .page-item.disabled .page-link {
            background-color: #14142a;
            border-color: rgba(255,255,255,0.08);
            color: #4a4f63;
          }
        `}</style>
        <Pagination className='harishop-pagination'>
          <LinkContainer to={buildPath(1)}>
            <Pagination.First disabled={page <= 1}>
              <i className='fas fa-angle-double-left'></i>
            </Pagination.First>
          </LinkContainer>

          <LinkContainer to={buildPath(Math.max(page - 1, 1))}>
            <Pagination.Prev disabled={page <= 1}>
              <i className='fas fa-chevron-left'></i>
            </Pagination.Prev>
          </LinkContainer>

          {[...Array(pages).keys()].map((x) => (
            <LinkContainer key={x + 1} to={buildPath(x + 1)}>
              <Pagination.Item active={x + 1 === page}>{x + 1}</Pagination.Item>
            </LinkContainer>
          ))}

          <LinkContainer to={buildPath(Math.min(page + 1, pages))}>
            <Pagination.Next disabled={page >= pages}>
              <i className='fas fa-chevron-right'></i>
            </Pagination.Next>
          </LinkContainer>

          <LinkContainer to={buildPath(pages)}>
            <Pagination.Last disabled={page >= pages}>
              <i className='fas fa-angle-double-right'></i>
            </Pagination.Last>
          </LinkContainer>
        </Pagination>
      </>
    )
  )
}

export default Paginate