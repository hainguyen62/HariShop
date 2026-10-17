import { useState, useCallback } from 'react'
import { getNextSortConfig, sortConfigToQuery } from './sortHelper'

// Gộp bộ lọc, sắp xếp, trang vào một chỗ; đổi lọc hoặc sắp xếp thì về trang 1
export const useListControls = (defaultFilters = {}) => {
  const [filters, setFilters] = useState(defaultFilters)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null })
  const [page, setPage] = useState(1)

  const applyFilters = useCallback((next) => {
    setFilters(next)
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => getNextSortConfig(prev, key))
    setPage(1)
  }, [])

  const params = {
    ...filters,
    ...sortConfigToQuery(sortConfig),
    pageNumber: page,
  }

  const paramsKey = JSON.stringify(params)

  return { filters, applyFilters, resetFilters, sortConfig, handleSort, page, setPage, params, paramsKey }
}

export const cleanParams = (params) =>
  Object.entries(params || {}).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null && v !== '') acc[k] = v
    return acc
  }, {})

export const toQueryString = (params) => new URLSearchParams(cleanParams(params)).toString()

const pad = (n) => String(n).padStart(2, '0')
export const dateToInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const lastDaysRange = (days) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  return { startDate: dateToInput(start), endDate: dateToInput(end) }
}

export const thisMonthRange = () => {
  const now = new Date()
  return { startDate: dateToInput(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: dateToInput(now) }
}
