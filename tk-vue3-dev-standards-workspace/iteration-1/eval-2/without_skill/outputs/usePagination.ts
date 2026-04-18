import { ref, computed, Ref } from 'vue'

export interface PaginationOptions {
  initialPage?: number
  initialPageSize?: number
  total?: number
}

export interface PaginationReturn {
  page: Ref<number>
  pageSize: Ref<number>
  total: Ref<number>
  totalPages: computed<number>
  isFirstPage: computed<boolean>
  isLastPage: computed<boolean>
  offset: computed<number>
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  reset: () => void
  setPageSize: (size: number) => void
}

export function usePagination(options: PaginationOptions = {}): PaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 10,
    total = 0
  } = options

  const page = ref(initialPage)
  const pageSize = ref(initialPageSize)
  const totalItems = ref(total)

  const totalPages = computed(() => {
    if (pageSize.value <= 0) return 0
    return Math.ceil(totalItems.value / pageSize.value)
  })

  const isFirstPage = computed(() => page.value <= 1)
  const isLastPage = computed(() => page.value >= totalPages.value)

  const offset = computed(() => (page.value - 1) * pageSize.value)

  function nextPage() {
    if (!isLastPage.value) {
      page.value++
    }
  }

  function prevPage() {
    if (!isFirstPage.value) {
      page.value--
    }
  }

  function goToPage(targetPage: number) {
    const validPage = Math.max(1, Math.min(targetPage, totalPages.value || 1))
    page.value = validPage
  }

  function reset() {
    page.value = initialPage
    pageSize.value = initialPageSize
  }

  function setPageSize(size: number) {
    const newSize = Math.max(1, size)
    const newTotalPages = Math.ceil(totalItems.value / newSize)
    if (page.value > newTotalPages && newTotalPages > 0) {
      page.value = newTotalPages
    }
    pageSize.value = newSize
  }

  return {
    page,
    pageSize,
    total: totalItems,
    totalPages,
    isFirstPage,
    isLastPage,
    offset,
    nextPage,
    prevPage,
    goToPage,
    reset,
    setPageSize
  }
}
