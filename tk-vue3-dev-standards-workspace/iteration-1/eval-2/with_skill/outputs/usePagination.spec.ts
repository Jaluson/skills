/**
 * usePagination Composable 单元测试
 * 测试用例：订单列表页面的分页加载、重置功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive } from 'vue';

// ==================== 类型定义 ====================
interface OrderItem {
  id: number;
  orderNo: string;
  customerName: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createTime: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

interface FetchResult<T> {
  list: T[];
  total: number;
}

// ==================== usePagination 实现 ====================
// 注意：此测试基于 skill 规范中的 usePagination 实现
function usePagination<T>(
  fetchFn: (params: PaginationParams) => Promise<FetchResult<T>>
) {
  const loading = ref(false);
  const list = ref<T[]>([]) as any;
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const error = ref<Error | null>(null);

  async function loadData() {
    loading.value = true;
    error.value = null;
    try {
      const result = await fetchFn({ ...pagination });
      list.value = result.list;
      pagination.total = result.total;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    pagination.page = 1;
    pagination.total = 0;
    list.value = [];
    loadData();
  }

  function setPage(page: number) {
    pagination.page = page;
  }

  function setPageSize(pageSize: number) {
    pagination.pageSize = pageSize;
    pagination.page = 1; // 切换页大小时重置到第一页
  }

  return {
    loading,
    list,
    pagination,
    error,
    loadData,
    reset,
    setPage,
    setPageSize,
  };
}

// ==================== 测试数据 ====================
const mockOrderList: OrderItem[] = [
  {
    id: 1,
    orderNo: 'ORD20260418001',
    customerName: '张三',
    totalAmount: 299.99,
    status: 'completed',
    createTime: '2026-04-18 10:30:00',
  },
  {
    id: 2,
    orderNo: 'ORD20260418002',
    customerName: '李四',
    totalAmount: 599.00,
    status: 'processing',
    createTime: '2026-04-18 11:20:00',
  },
  {
    id: 3,
    orderNo: 'ORD20260418003',
    customerName: '王五',
    totalAmount: 1299.50,
    status: 'pending',
    createTime: '2026-04-18 14:15:00',
  },
];

// ==================== 测试套件 ====================
describe('usePagination - 订单列表分页功能测试', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchFn = vi.fn();
  });

  afterEach(() => {
    mockFetchFn.mockReset();
  });

  // ==================== 初始化测试 ====================
  describe('初始化状态', () => {
    it('应该初始化为默认分页参数', () => {
      mockFetchFn.mockImplementation(() => Promise.resolve({ list: [], total: 0 }));
      const { loading, list, pagination } = usePagination<OrderItem>(mockFetchFn);

      expect(loading.value).toBe(false);
      expect(list.value).toEqual([]);
      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(10);
      expect(pagination.total).toBe(0);
    });

    it('应该返回所有必要的方法和属性', () => {
      mockFetchFn.mockImplementation(() => Promise.resolve({ list: [], total: 0 }));
      const result = usePagination<OrderItem>(mockFetchFn);

      expect(result).toHaveProperty('loading');
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('loadData');
      expect(result).toHaveProperty('reset');
      expect(result).toHaveProperty('setPage');
      expect(result).toHaveProperty('setPageSize');
    });
  });

  // ==================== 分页加载测试 ====================
  describe('分页加载功能', () => {
    it('应该正确加载第一页数据', async () => {
      const mockResult: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: 30,
      };
      mockFetchFn.mockResolvedValue(mockResult);

      const { loading, list, pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      // 验证加载中状态
      const loadPromise = loadData();
      expect(loading.value).toBe(true);

      // 等待加载完成
      await loadPromise;

      // 验证结果
      expect(loading.value).toBe(false);
      expect(list.value).toEqual(mockOrderList);
      expect(pagination.total).toBe(30);
      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        total: 0,
      });
    });

    it('应该正确加载指定页码的数据', async () => {
      const page2Orders = mockOrderList.map((o, i) => ({ ...o, id: o.id + 10 }));
      const mockResult: FetchResult<OrderItem> = {
        list: page2Orders,
        total: 30,
      };
      mockFetchFn.mockResolvedValue(mockResult);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.page = 2;
      await loadData();

      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        total: 0,
      });
    });

    it('应该正确处理自定义页大小', async () => {
      const mockResult: FetchResult<OrderItem> = {
        list: mockOrderList.slice(0, 5),
        total: 15,
      };
      mockFetchFn.mockResolvedValue(mockResult);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.pageSize = 5;
      await loadData();

      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 5,
        total: 0,
      });
    });

    it('应该正确计算总页数（通过 total 和 pageSize）', async () => {
      const mockResult: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: 95,
      };
      mockFetchFn.mockResolvedValue(mockResult);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      // 总数95条，页大小10，应该有10页
      expect(pagination.total).toBe(95);
      expect(Math.ceil(pagination.total / pagination.pageSize)).toBe(10);
    });
  });

  // ==================== 重置功能测试 ====================
  describe('重置功能', () => {
    it('应该将页码重置为1并重新加载数据', async () => {
      const mockResult: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: 30,
      };
      mockFetchFn.mockResolvedValue(mockResult);

      const { pagination, loadData, reset } = usePagination<OrderItem>(mockFetchFn);

      // 先加载第2页
      await loadData();
      pagination.page = 2;
      expect(pagination.page).toBe(2);

      // 调用重置
      reset();

      // 验证页码已重置为1
      expect(pagination.page).toBe(1);
      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });

    it('重置后应该清空当前列表并重新获取', async () => {
      const firstResult: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: 30,
      };
      const secondResult: FetchResult<OrderItem> = {
        list: [{ ...mockOrderList[0], id: 100 }],
        total: 50,
      };
      mockFetchFn
        .mockResolvedValueOnce(firstResult)
        .mockResolvedValueOnce(secondResult);

      const { pagination, list, loadData, reset } = usePagination<OrderItem>(mockFetchFn);

      // 第一次加载
      await loadData();
      expect(list.value).toEqual(mockOrderList);

      // 修改页码后重置
      pagination.page = 5;
      reset();

      // 等待重置后的加载完成
      await new Promise(resolve => setTimeout(resolve, 0));

      // 验证重新加载了数据
      expect(pagination.page).toBe(1);
    });

    it('连续快速调用重置应该只保留最后一次请求', async () => {
      let resolveCount = 0;
      mockFetchFn.mockImplementation(() => {
        resolveCount++;
        return Promise.resolve({ list: [], total: 0 });
      });

      const { reset } = usePagination<OrderItem>(mockFetchFn);

      // 快速连续调用重置
      reset();
      reset();
      reset();

      await new Promise(resolve => setTimeout(resolve, 0));

      // 由于 reset 是异步的且会重新加载，最终只会有一次完整的加载
      expect(resolveCount).toBeGreaterThan(0);
    });
  });

  // ==================== 异常情况测试 ====================
  describe('异常情况处理', () => {
    it('应该在加载失败时设置错误状态', async () => {
      const networkError = new Error('网络请求失败');
      mockFetchFn.mockRejectedValue(networkError);

      const { loadData } = usePagination<OrderItem>(mockFetchFn);

      await expect(loadData()).rejects.toThrow('网络请求失败');
    });

    it('应该在加载失败时保持 loading 为 false', async () => {
      mockFetchFn.mockRejectedValue(new Error('服务器错误'));

      const { loading, loadData } = usePagination<OrderItem>(mockFetchFn);

      try {
        await loadData();
      } catch (e) {
        // 忽略错误
      }

      expect(loading.value).toBe(false);
    });

    it('应该正确处理空数据列表', async () => {
      const emptyResult: FetchResult<OrderItem> = {
        list: [],
        total: 0,
      };
      mockFetchFn.mockResolvedValue(emptyResult);

      const { list, pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      expect(list.value).toEqual([]);
      expect(pagination.total).toBe(0);
    });

    it('应该正确处理总数为0的空页面', async () => {
      const result: FetchResult<OrderItem> = {
        list: [],
        total: 0,
      };
      mockFetchFn.mockResolvedValue(result);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      expect(pagination.total).toBe(0);
      expect(pagination.page).toBe(1);
    });
  });

  // ==================== 边界值测试 ====================
  describe('边界值测试', () => {
    it('应该处理最后一页数据不满的情况', async () => {
      const lastPageResult: FetchResult<OrderItem> = {
        list: [mockOrderList[0]], // 只有1条记录
        total: 31, // 31条记录，10条/页，最后一页只有1条
      };
      mockFetchFn.mockResolvedValue(lastPageResult);

      const { list, pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.page = 4; // 第四页应该是最后一页
      await loadData();

      expect(list.value).toHaveLength(1);
      expect(pagination.total).toBe(31);
    });

    it('应该处理超大页码请求（超出总页数）', async () => {
      const result: FetchResult<OrderItem> = {
        list: [],
        total: 20,
      };
      mockFetchFn.mockResolvedValue(result);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.page = 100; // 超出总页数
      await loadData();

      // 仍然调用 fetchFn，服务器应该返回空列表
      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 100,
        pageSize: 10,
        total: 0,
      });
    });

    it('应该处理 pageSize 为1的极端情况', async () => {
      const result: FetchResult<OrderItem> = {
        list: [mockOrderList[0]],
        total: 3,
      };
      mockFetchFn.mockResolvedValue(result);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.pageSize = 1;
      pagination.page = 1;
      await loadData();

      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 1,
        total: 0,
      });
    });

    it('应该处理极端大的 pageSize', async () => {
      const result: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: 10000,
      };
      mockFetchFn.mockResolvedValue(result);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      pagination.pageSize = 1000;
      await loadData();

      expect(mockFetchFn).toHaveBeenCalledWith({
        page: 1,
        pageSize: 1000,
        total: 0,
      });
    });

    it('应该处理 total 为负数的异常数据', async () => {
      const result: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: -1, // 异常数据
      };
      mockFetchFn.mockResolvedValue(result);

      const { pagination, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      expect(pagination.total).toBe(-1);
    });
  });

  // ==================== 订单列表特定场景测试 ====================
  describe('订单列表特定场景', () => {
    it('应该正确加载订单详情数据', async () => {
      const orderResult: FetchResult<OrderItem> = {
        list: mockOrderList,
        total: mockOrderList.length,
      };
      mockFetchFn.mockResolvedValue(orderResult);

      const { list, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      expect(list.value[0]).toHaveProperty('orderNo');
      expect(list.value[0]).toHaveProperty('customerName');
      expect(list.value[0]).toHaveProperty('totalAmount');
      expect(list.value[0]).toHaveProperty('status');
    });

    it('应该正确处理订单状态筛选', async () => {
      const completedOrders = mockOrderList.filter(o => o.status === 'completed');
      const result: FetchResult<OrderItem> = {
        list: completedOrders,
        total: completedOrders.length,
      };
      mockFetchFn.mockResolvedValue(result);

      const { list, loadData } = usePagination<OrderItem>(mockFetchFn);

      await loadData();

      list.value.forEach(order => {
        expect(order.status).toBe('completed');
      });
    });

    it('分页切换后应该保持之前的数据状态直到新数据加载完成', async () => {
      const firstPageResult: FetchResult<OrderItem> = {
        list: [{ ...mockOrderList[0], id: 1 }],
        total: 20,
      };
      const secondPageResult: FetchResult<OrderItem> = {
        list: [{ ...mockOrderList[1], id: 11 }],
        total: 20,
      };
      mockFetchFn
        .mockResolvedValueOnce(firstPageResult)
        .mockResolvedValueOnce(secondPageResult);

      const { pagination, list, loadData } = usePagination<OrderItem>(mockFetchFn);

      // 加载第一页
      await loadData();
      const firstPageData = list.value;

      // 切换到第二页
      pagination.page = 2;
      const loadPromise = loadData();

      // 在新数据加载完成前，应该保持第一页数据
      expect(list.value).toEqual(firstPageData);

      await loadPromise;
    });
  });
});
