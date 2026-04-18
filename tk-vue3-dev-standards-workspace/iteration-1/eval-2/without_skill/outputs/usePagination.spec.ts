import { describe, it, expect, beforeEach } from 'vitest'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  describe('分页状态初始化', () => {
    it('应该使用默认配置初始化', () => {
      const { page, pageSize, total, totalPages, isFirstPage, isLastPage } = usePagination()

      expect(page.value).toBe(1)
      expect(pageSize.value).toBe(10)
      expect(total.value).toBe(0)
      expect(totalPages.value).toBe(0)
      expect(isFirstPage.value).toBe(true)
      expect(isLastPage.value).toBe(true)
    })

    it('应该使用自定义初始值初始化', () => {
      const { page, pageSize, total } = usePagination({
        initialPage: 3,
        initialPageSize: 20,
        total: 100
      })

      expect(page.value).toBe(3)
      expect(pageSize.value).toBe(20)
      expect(total.value).toBe(100)
    })

    it('应该正确计算总页数', () => {
      const { totalPages } = usePagination({ total: 100, initialPageSize: 10 })
      expect(totalPages.value).toBe(10)
    })

    it('当总数为0时总页数应为0', () => {
      const { totalPages } = usePagination({ total: 0 })
      expect(totalPages.value).toBe(0)
    })

    it('当总数不是页面大小的整数倍时，应向上取整', () => {
      const { totalPages } = usePagination({ total: 95, initialPageSize: 10 })
      expect(totalPages.value).toBe(10)
    })
  })

  describe('分页加载功能 - 下一页', () => {
    it('下一页应该使页码增加', () => {
      const { page, total, nextPage } = usePagination({ total: 100 })

      expect(page.value).toBe(1)
      nextPage()
      expect(page.value).toBe(2)
    })

    it('在最后一页时调用下一页不应增加页码', () => {
      const { page, total, nextPage } = usePagination({ total: 20, initialPageSize: 10 })

      expect(page.value).toBe(1)
      nextPage()
      expect(page.value).toBe(2)
      nextPage()
      expect(page.value).toBe(2) // 已经是最后一页
    })

    it('isLastPage 应在最后一页时返回 true', () => {
      const { page, total, isLastPage, nextPage } = usePagination({ total: 20, initialPageSize: 10 })

      expect(isLastPage.value).toBe(true)
      nextPage()
      expect(isLastPage.value).toBe(true)
    })
  })

  describe('分页加载功能 - 上一页', () => {
    it('上一页应该使页码减少', () => {
      const { page, total, nextPage, prevPage } = usePagination({ total: 100 })

      nextPage()
      expect(page.value).toBe(2)
      prevPage()
      expect(page.value).toBe(1)
    })

    it('在第一页时调用上一页不应减少页码', () => {
      const { page, prevPage } = usePagination({ total: 100 })

      expect(page.value).toBe(1)
      prevPage()
      expect(page.value).toBe(1) // 已经是最前页
    })

    it('isFirstPage 应在第一页时返回 true', () => {
      const { isFirstPage, nextPage, prevPage } = usePagination({ total: 100 })

      expect(isFirstPage.value).toBe(true)
      nextPage()
      expect(isFirstPage.value).toBe(false)
      prevPage()
      expect(isFirstPage.value).toBe(true)
    })
  })

  describe('分页加载功能 - 跳页', () => {
    it('goToPage 应该跳转到指定页', () => {
      const { page, total, goToPage } = usePagination({ total: 100 })

      goToPage(5)
      expect(page.value).toBe(5)
    })

    it('goToPage 跳转到超过最大页数应停留在最后一页', () => {
      const { page, total, goToPage } = usePagination({ total: 100, initialPageSize: 10 })

      goToPage(20) // 最大页数是10
      expect(page.value).toBe(10)
    })

    it('goToPage 跳转到小于1的页数应停留在第一页', () => {
      const { page, total, goToPage } = usePagination({ total: 100 })

      goToPage(-5)
      expect(page.value).toBe(1)
    })

    it('goToPage 跳转到0页应停留在第一页', () => {
      const { page, goToPage } = usePagination({ total: 100 })

      goToPage(0)
      expect(page.value).toBe(1)
    })

    it('goToPage 跳转到第一页应正确响应', () => {
      const { page, total, goToPage } = usePagination({ total: 100 })

      goToPage(5)
      expect(page.value).toBe(5)
      goToPage(1)
      expect(page.value).toBe(1)
    })
  })

  describe('重置功能', () => {
    it('reset 应将页码重置为初始页', () => {
      const { page, total, nextPage, reset } = usePagination({ total: 100, initialPage: 1 })

      nextPage()
      nextPage()
      expect(page.value).toBe(3)
      reset()
      expect(page.value).toBe(1)
    })

    it('reset 应将页大小重置为初始大小', () => {
      const { pageSize, total, nextPage, setPageSize, reset } = usePagination({
        total: 100,
        initialPageSize: 10
      })

      setPageSize(50)
      expect(pageSize.value).toBe(50)
      reset()
      expect(pageSize.value).toBe(10)
    })

    it('reset 后应能正常使用分页功能', () => {
      const { page, total, nextPage, reset } = usePagination({ total: 100 })

      nextPage()
      nextPage()
      reset()
      nextPage()

      expect(page.value).toBe(2)
    })
  })

  describe('offset 计算', () => {
    it('应该正确计算当前页的偏移量', () => {
      const { offset } = usePagination({ total: 100, initialPageSize: 10 })

      expect(offset.value).toBe(0) // 第1页: (1-1) * 10 = 0
    })

    it('第2页的偏移量应为10', () => {
      const { offset, nextPage } = usePagination({ total: 100, initialPageSize: 10 })

      nextPage()
      expect(offset.value).toBe(10) // 第2页: (2-1) * 10 = 10
    })

    it('第5页的偏移量应为40', () => {
      const { offset, goToPage } = usePagination({ total: 100, initialPageSize: 10 })

      goToPage(5)
      expect(offset.value).toBe(40) // 第5页: (5-1) * 10 = 40
    })

    it('当页面大小改变时偏移量应重新计算', () => {
      const { offset, nextPage, setPageSize } = usePagination({ total: 100, initialPageSize: 10 })

      nextPage() // 第2页，offset = 10
      expect(offset.value).toBe(10)
      setPageSize(20) // 第2页，offset = (2-1) * 20 = 20
      expect(offset.value).toBe(20)
    })
  })

  describe('设置页面大小', () => {
    it('setPageSize 应正确设置页面大小', () => {
      const { pageSize, setPageSize } = usePagination({ total: 100 })

      setPageSize(25)
      expect(pageSize.value).toBe(25)
    })

    it('setPageSize 应拒绝小于1的值', () => {
      const { pageSize, setPageSize } = usePagination({ total: 100 })

      setPageSize(0)
      expect(pageSize.value).toBe(1)
      setPageSize(-5)
      expect(pageSize.value).toBe(1)
    })

    it('当页面大小增加导致总页数减少时，当前页码应调整', () => {
      const { page, setPageSize } = usePagination({ total: 100, initialPageSize: 10 })

      // 总共10页，当前在第10页
      expect(page.value).toBe(1)
      // 设置更大的页面大小，总页数会减少
      setPageSize(20) // 总共5页，但当前页仍为10，需要调整
      // 由于总页数变为5，当前页10 > 5，应调整到5
      expect(page.value).toBe(5)
    })
  })

  describe('边界条件测试', () => {
    it('total 为 0 时不应出现除零错误', () => {
      const { totalPages, nextPage, prevPage, goToPage } = usePagination({ total: 0 })

      expect(totalPages.value).toBe(0)
      expect(() => nextPage()).not.toThrow()
      expect(() => prevPage()).not.toThrow()
      expect(() => goToPage(5)).not.toThrow()
    })

    it('页面大小为0时不应出现除零错误', () => {
      const { totalPages, setPageSize } = usePagination({ total: 100, initialPageSize: 10 })

      setPageSize(0)
      // 页面大小为0时，总页数计算为0，避免除零
      expect(totalPages.value).toBe(0)
    })

    it('大数据总量应正确计算', () => {
      const { totalPages } = usePagination({ total: 1000000, initialPageSize: 10 })

      expect(totalPages.value).toBe(100000)
    })
  })
})

describe('订单列表分页集成场景', () => {
  it('模拟订单列表的完整分页流程', () => {
    const { page, pageSize, total, totalPages, nextPage, prevPage, goToPage, reset } =
      usePagination({ total: 55, initialPageSize: 10 })

    // 初始状态
    expect(page.value).toBe(1)
    expect(totalPages.value).toBe(6) // 55条数据，每页10条，共6页

    // 加载第二页
    nextPage()
    expect(page.value).toBe(2)

    // 跳到第5页
    goToPage(5)
    expect(page.value).toBe(5)

    // 返回上一页到第4页
    prevPage()
    expect(page.value).toBe(4)

    // 跳到不存在的页（超过最大页数）
    goToPage(100)
    expect(page.value).toBe(6) // 停留在最后一页

    // 重置分页
    reset()
    expect(page.value).toBe(1)
    expect(pageSize.value).toBe(10)
  })

  it('模拟切换每页显示条数的场景', () => {
    const { page, pageSize, totalPages, goToPage, setPageSize } = usePagination({
      total: 100,
      initialPageSize: 10
    })

    // 当前每页10条，共10页
    expect(totalPages.value).toBe(10)

    // 跳到第8页
    goToPage(8)
    expect(page.value).toBe(8)

    // 切换到每页50条
    setPageSize(50)
    expect(pageSize.value).toBe(50)
    expect(totalPages.value).toBe(2) // 100/50 = 2页
    // 当前页8 > 总页数2，应自动调整到2
    expect(page.value).toBe(2)

    // 切换到每页100条
    setPageSize(100)
    expect(pageSize.value).toBe(100)
    expect(totalPages.value).toBe(1)
    expect(page.value).toBe(1)
  })
})
