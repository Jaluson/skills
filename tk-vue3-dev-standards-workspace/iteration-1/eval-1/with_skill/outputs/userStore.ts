/**
 * 用户管理模块 - Pinia Store
 * 包含：登录、获取用户信息、退出登录功能
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// ==================== 类型定义 ====================

/** 用户信息 */
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: UserStatus;
  createTime: string;
}

/** 用户状态 */
export type UserStatus = 0 | 1;

/** 登录请求参数 */
export interface LoginDTO {
  username: string;
  password: string;
}

/** 登录响应数据 */
export interface LoginResponse {
  token: string;
  userInfo: UserInfo;
}

/** 用户角色 */
export type UserRole = 'admin' | 'user' | 'guest';

// ==================== API 模块 ====================

/**
 * 用户 API 模块
 * 实际项目中替换为真实的 API 调用
 */
const userApi = {
  /**
   * 用户登录
   */
  async login(data: LoginDTO): Promise<LoginResponse> {
    // 模拟 API 调用
    // 实际使用: return request.post<LoginResponse>('/auth/login', data);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock_token_' + Date.now(),
          userInfo: {
            id: 1,
            username: data.username,
            email: `${data.username}@example.com`,
            avatar: undefined,
            phone: '138****8888',
            status: 1,
            createTime: new Date().toISOString(),
          },
        });
      }, 500);
    });
  },

  /**
   * 获取当前用户信息
   */
  async getUserInfo(): Promise<UserInfo> {
    // 模拟 API 调用
    // 实际使用: return request.get<UserInfo>('/auth/userinfo');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          avatar: undefined,
          phone: '138****8888',
          status: 1,
          createTime: '2024-01-01T00:00:00.000Z',
        });
      }, 300);
    });
  },

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    // 模拟 API 调用
    // 实际使用: return request.post<void>('/auth/logout');
    return new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  },
};

// ==================== Store 定义 ====================

/**
 * 用户 Store
 * @description 管理用户登录状态、用户信息，提供登录、获取用户信息、退出登录等操作
 */
export const useUserStore = defineStore('user', () => {
  // ==================== State ====================

  /** 用户信息 */
  const userInfo = ref<UserInfo | null>(null);

  /** 认证令牌 */
  const token = ref<string>('');

  /** 加载状态 */
  const loading = ref(false);

  // ==================== Getters ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value);

  /** 显示名称（优先使用用户名，否则显示"未登录"） */
  const displayName = computed(() => userInfo.value?.username ?? '未登录');

  /** 用户头像 */
  const avatar = computed(() => userInfo.value?.avatar ?? '');

  /** 是否为管理员 */
  const isAdmin = computed(() => userInfo.value?.status === 1);

  /** 用户角色 */
  const userRole = computed<UserRole>(() => {
    if (!userInfo.value) return 'guest';
    // 根据实际业务逻辑判断角色
    return userInfo.value.username === 'admin' ? 'admin' : 'user';
  });

  // ==================== Actions ====================

  /**
   * 用户登录
   * @param credentials - 登录凭据（用户名、密码）
   */
  async function login(credentials: LoginDTO): Promise<void> {
    if (loading.value) return;

    loading.value = true;
    try {
      const response = await userApi.login(credentials);
      token.value = response.token;
      userInfo.value = response.userInfo;
    } finally {
      loading.value = false;
    }
  },

  /**
   * 获取用户信息
   * @description 从服务器获取最新用户信息并更新本地状态
   */
  async function fetchUserInfo(): Promise<void> {
    if (loading.value) return;

    loading.value = true;
    try {
      const info = await userApi.getUserInfo();
      userInfo.value = info;
    } finally {
      loading.value = false;
    }
  },

  /**
   * 退出登录
   * @description 清除本地用户状态，如需服务器端注销可调用 userApi.logout()
   */
  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await userApi.logout();
    } finally {
      // 无论服务器端是否成功，本地状态都需要清除
      userInfo.value = null;
      token.value = '';
      loading.value = false;
    }
  },

  /**
   * 设置用户信息（内部使用）
   * @param info - 用户信息对象
   */
  function setUserInfo(info: UserInfo): void {
    userInfo.value = info;
  },

  /**
   * 设置令牌（内部使用）
   * @param newToken - 认证令牌
   */
  function setToken(newToken: string): void {
    token.value = newToken;
  },

  /**
   * 清空所有状态（内部使用）
   */
  function clearAll(): void {
    userInfo.value = null;
    token.value = '';
    loading.value = false;
  },

  // ==================== 初始化检查 ====================

  /**
   * 从本地存储恢复登录状态
   * @description 应用启动时调用，检查是否存在已保存的登录状态
   */
  function restoreState(): void {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      token.value = savedToken;
    }
  }

  // ==================== 返回 ====================

  return {
    // State
    userInfo,
    token,
    loading,
    // Getters
    isLoggedIn,
    displayName,
    avatar,
    isAdmin,
    userRole,
    // Actions
    login,
    fetchUserInfo,
    logout,
    setUserInfo,
    setToken,
    clearAll,
    restoreState,
  };
});

// ==================== 类型导出 ====================

export type { LoginDTO, LoginResponse, UserStatus, UserRole };
