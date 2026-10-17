import React from 'react'
import { Pagination } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'

const Paginate = ({ pages, page, isAdmin = false, keyword = '', onPageChange }) => {
  const buildPath = (p) => {
    if (isAdmin) return `/admin/productlist/${p}`
    return keyword ? `/search/${keyword}/page/${p}` : `/page/${p}`
  }

  // Có onPageChange thì chuyển trang bằng state (trang không dùng route), không thì dùng link
  const Nav = ({ to, children }) =>
    onPageChange ? children(() => onPageChange(to)) : <LinkContainer to={buildPath(to)}>{children()}</LinkContainer>

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
          <Nav to={1}>
            {(onClick) => (
              <Pagination.First disabled={page <= 1} onClick={onClick}>
                <i className='fas fa-angle-double-left'></i>
              </Pagination.First>
            )}
          </Nav>

          <Nav to={Math.max(page - 1, 1)}>
            {(onClick) => (
              <Pagination.Prev disabled={page <= 1} onClick={onClick}>
                <i className='fas fa-chevron-left'></i>
              </Pagination.Prev>
            )}
          </Nav>

          {[...Array(pages).keys()].map((x) => (
            <Nav key={x + 1} to={x + 1}>
              {(onClick) => (
                <Pagination.Item active={x + 1 === page} onClick={onClick}>{x + 1}</Pagination.Item>
              )}
            </Nav>
          ))}

          <Nav to={Math.min(page + 1, pages)}>
            {(onClick) => (
              <Pagination.Next disabled={page >= pages} onClick={onClick}>
                <i className='fas fa-chevron-right'></i>
              </Pagination.Next>
            )}
          </Nav>

          <Nav to={pages}>
            {(onClick) => (
              <Pagination.Last disabled={page >= pages} onClick={onClick}>
                <i className='fas fa-angle-double-right'></i>
              </Pagination.Last>
            )}
          </Nav>
        </Pagination>
      </>
    )
  )
}

export default Paginate
