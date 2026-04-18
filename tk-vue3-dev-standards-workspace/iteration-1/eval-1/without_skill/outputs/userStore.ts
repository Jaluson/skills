/**
 * 用户管理 Pinia Store
 * 包含登录、获取用户信息、退出登录功能
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  UserInfo,
  LoginParams,
  LoginResult,
  GetUserInfoResult,
  UserState,
  UserStoreActions,
  UserStoreGetters,
} from './types';

/**
 * 用户 Store
 */
export const useUserStore = defineStore<
  'user',
  UserState,
  UserStoreGetters,
  UserStoreActions
>('user', () => {
  // ========== State ==========
  const userInfo = ref<UserInfo | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoggedIn = ref(false);
  const permissions = ref<string[]>([]);
  const roles = ref<string[]>([]);
  const loading = ref(false);

  // ========== Getters ==========
  const isLogin = computed(() => isLoggedIn.value);

  const username = computed(() => userInfo.value?.username ?? '');

  const nickname = computed(() => userInfo.value?.nickname ?? userInfo.value?.username ?? '');

  const hasPermission = computed(() => (permission: string) => {
    if (permissions.value.includes('*')) return true;
    return permissions.value.includes(permission);
  });

  const hasRole = computed(() => (role: string) => {
    if (roles.value.includes('*')) return true;
    return roles.value.includes(role);
  });

  // ========== Actions ==========

  /**
   * 用户登录
   * @param params 登录参数
   * @returns 登录结果
   */
  async function login(params: LoginParams): Promise<LoginResult> {
    loading.value = true;
    try {
      // TODO: 根据实际项目修改 API 调用方式
      // 示例: const result = await api.post<LoginResult>('/auth/login', params);

      // 模拟 API 调用
      const result = await mockLoginApi(params);

      // 保存令牌
      setTokens(result.accessToken, result.refreshToken);

      // 保存用户信息
      userInfo.value = result.userInfo;
      isLoggedIn.value = true;

      // 权限和角色
      permissions.value = result.userInfo.permissions ?? [];
      roles.value = result.userInfo.roles ?? [];

      // 持久化存储
      saveToStorage();

      return result;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取用户信息
   * @returns 用户信息结果
   */
  async function getUserInfo(): Promise<GetUserInfoResult> {
    loading.value = true;
    try {
      // TODO: 根据实际项目修改 API 调用方式
      // 示例: const result = await api.get<GetUserInfoResult>('/user/info');

      // 模拟 API 调用
      const result = await mockGetUserInfoApi();

      // 保存用户信息
      userInfo.value = result.userInfo;
      permissions.value = result.permissions;
      roles.value = result.roles;
      isLoggedIn.value = true;

      return result;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 用户退出登录
   */
  async function logout(): Promise<void> {
    loading.value = true;
    try {
      // TODO: 根据实际项目修改 API 调用方式
      // 示例: await api.post('/auth/logout');

      // 模拟 API 调用
      await mockLogoutApi();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // 无论成功失败都清除本地状态
      clearAuth();
      loading.value = false;
    }
  }

  /**
   * 设置令牌
   * @param accessToken 访问令牌
   * @param refreshToken 刷新令牌（可选）
   */
  function setTokens(accessTokenValue: string, refreshTokenValue?: string): void {
    accessToken.value = accessTokenValue;
    if (refreshTokenValue) {
      refreshToken.value = refreshTokenValue;
    }
  }

  /**
   * 清除认证信息
   */
  function clearAuth(): void {
    userInfo.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    isLoggedIn.value = false;
    permissions.value = [];
    roles.value = [];
    clearStorage();
  }

  /**
   * 从存储恢复状态
   */
  function restoreFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedUserInfo = localStorage.getItem('user_info');

      if (storedToken) {
        accessToken.value = storedToken;
        refreshToken.value = storedRefreshToken;
        isLoggedIn.value = true;
      }

      if (storedUserInfo) {
        userInfo.value = JSON.parse(storedUserInfo);
        permissions.value = userInfo.value?.permissions ?? [];
        roles.value = userInfo.value?.roles ?? [];
      }
    } catch (error) {
      console.error('Failed to restore from storage:', error);
      clearAuth();
    }
  }

  /**
   * 保存到本地存储
   */
  function saveToStorage(): void {
    try {
      if (accessToken.value) {
        localStorage.setItem('access_token', accessToken.value);
      }
      if (refreshToken.value) {
        localStorage.setItem('refresh_token', refreshToken.value);
      }
      if (userInfo.value) {
        localStorage.setItem('user_info', JSON.stringify(userInfo.value));
      }
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  /**
   * 清除本地存储
   */
  function clearStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }

  // ========== 模拟 API（实际项目中替换为真实 API） ==========

  async function mockLoginApi(params: LoginParams): Promise<LoginResult> {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 模拟登录验证
    if (params.username === 'admin' && params.password === 'admin123') {
      return {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 7200,
        userInfo: {
          id: 1,
          username: 'admin',
          nickname: '管理员',
          email: 'admin@example.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          roles: ['admin'],
          permissions: ['*'],
        },
      };
    }

    throw new Error('用户名或密码错误');
  }

  async function mockGetUserInfoApi(): Promise<GetUserInfoResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      userInfo: {
        id: 1,
        username: 'admin',
        nickname: '管理员',
        email: 'admin@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        createTime: '2024-01-01 00:00:00',
        updateTime: '2024-01-01 00:00:00',
      },
      permissions: ['*'],
      roles: ['admin'],
    };
  }

  async function mockLogoutApi(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // ========== 初始化 ==========
  // 恢复存储状态
  restoreFromStorage();

  return {
    // State
    userInfo,
    accessToken,
    refreshToken,
    isLoggedIn,
    permissions,
    roles,
    loading,
    // Getters
    isLogin,
    username,
    nickname,
    hasPermission,
    hasRole,
    // Actions
    login,
    logout,
    getUserInfo,
    setTokens,
    clearAuth,
    restoreFromStorage,
    saveToStorage,
    clearStorage,
  };
});

// ========== 组合式函数（方便组件使用）==========

/**
 * 获取用户 Store 实例（适用于 Options API）
 */
export function useUserStoreInstance() {
  return useUserStore();
}
