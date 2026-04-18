/**
 * 用户管理模块类型定义
 */

// 用户信息
export interface UserInfo {
  id: string | number;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  roles?: string[];
  permissions?: string[];
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

// 登录请求参数
export interface LoginParams {
  username: string;
  password: string;
  /** 记住我 */
  rememberMe?: boolean;
  /** 验证码 */
  captcha?: string;
  /** 验证码 key */
  captchaKey?: string;
  [key: string]: unknown;
}

// 登录响应
export interface LoginResult {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 令牌类型 */
  tokenType?: string;
  /** 过期时间（秒） */
  expiresIn?: number;
  /** 用户信息 */
  userInfo: UserInfo;
}

// 获取用户信息响应
export interface GetUserInfoResult {
  userInfo: UserInfo;
  /** 用户权限列表 */
  permissions: string[];
  /** 用户角色列表 */
  roles: string[];
}

// 统一响应结构（如果后端有统一的响应格式）
export interface ApiResponse<T = unknown> {
  code: number | string;
  message: string;
  data: T;
  success: boolean;
}

// Store 状态类型
export interface UserState {
  /** 用户信息 */
  userInfo: UserInfo | null;
  /** 访问令牌 */
  accessToken: string | null;
  /** 刷新令牌 */
  refreshToken: string | null;
  /** 登录状态 */
  isLoggedIn: boolean;
  /** 用户权限 */
  permissions: string[];
  /** 用户角色 */
  roles: string[];
  /** 加载状态 */
  loading: boolean;
}

// Store Actions 参数类型
export interface UserStoreActions {
  login: (params: LoginParams) => Promise<LoginResult>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<GetUserInfoResult>;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
}

// Store Getters 类型
export interface UserStoreGetters {
  /** 是否已登录 */
  isLogin: (state: UserState) => boolean;
  /** 用户名 */
  username: (state: UserState) => string;
  /** 用户昵称 */
  nickname: (state: UserState) => string;
  /** 是否有指定权限 */
  hasPermission: (permission: string) => (state: UserState) => boolean;
  /** 是否有指定角色 */
  hasRole: (role: string) => (state: UserState) => boolean;
}
