import type { LROperation } from '../operation-runner';

import { registrationOperation } from './registration';
import { loginOperation } from './login';
import { getUserInfoOperation } from './get-user-info';
import { siteConfigOperation } from './site-config';
import { forgotPasswordOperation } from './forgot-password';
import { changePasswordOperation } from './change-password';

export const OPERATIONS: LROperation[] = [
  loginOperation,
  registrationOperation,
  getUserInfoOperation,
  siteConfigOperation,
  forgotPasswordOperation,
  changePasswordOperation,
];
