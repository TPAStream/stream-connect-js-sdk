import {
  type StreamEmployer,
  type StreamPayer,
  type StreamPolicyHolder,
  type StreamTenant,
  type StreamUser,
  VALID_LOGIN_PROBLEMS,
  type ValidateCredsResponse
} from '../types';
import type { InitEmployer, InitUser } from '../types-init';
import { sdkAxios } from './axios';

/**
 * Thin axios wrappers around the sdk-api endpoints. Each function
 * matches the wire format the legacy SDK consumed; callers and
 * customer-side custom render props read snake_case keys directly.
 */

interface GetSDKArgs {
  employer?: InitEmployer;
  user?: InitUser;
  isDemo?: boolean;
  doneGetSDK?: (data: unknown) => void;
}

interface GetSDKResult {
  user?: StreamUser;
  payers?: StreamPayer[];
  employer?: StreamEmployer;
  tenant?: StreamTenant;
  error?: unknown;
}

export const getSDK = async ({
  employer,
  user,
  isDemo,
  doneGetSDK
}: GetSDKArgs): Promise<GetSDKResult> => {
  try {
    const response = isDemo
      ? await sdkAxios.get('tpastream_sdk')
      : await sdkAxios.post('tpastream_sdk', {
          system_key: employer?.systemKey,
          vendor: employer?.vendor,
          employer_name: employer?.name,
          user_first_name: user?.firstName,
          user_last_name: user?.lastName,
          user_email: user?.email,
          phone_number: user?.phoneNumber,
          member_system_key: user?.memberSystemKey,
          date_of_birth: user?.dateOfBirth
        });
    const data: GetSDKResult = {
      user: response.data.data.user,
      payers: response.data.data.payers,
      employer: response.data.data.employer,
      tenant: response.data.data.tenant
    };
    doneGetSDK?.(data);
    return data;
  } catch (error) {
    console.error(error);
    doneGetSDK?.(error);
    return { error };
  }
};

interface PostCredentialsArgs {
  params: Record<string, unknown>;
  policyHolderId?: number | null;
  handleFormErrors?: (error: unknown, ctx?: unknown) => void;
}

interface PostCredentialsResult {
  taskId: string | null;
  /** Short-lived JWT minted by the backend for SDK SSE auth. Bound to
   * (user_id, task_id) and good for ~10 min — passed to
   * `subscribeToProgress` as the cross-origin auth credential. */
  taskToken: string | null;
  policyHolderId: number | null;
  errorMessage: string | false;
}

export const postCredentials = async ({
  params,
  policyHolderId,
  handleFormErrors
}: PostCredentialsArgs): Promise<PostCredentialsResult> => {
  try {
    const response = policyHolderId
      ? await sdkAxios.put(
          `policy_holder_sdk/policy_holder/${policyHolderId}`,
          params
        )
      : await sdkAxios.post('policy_holder_sdk/policy_holder', params);
    return {
      taskId: response.data.data.task_id,
      taskToken: response.data.data.task_token || null,
      policyHolderId: response.data.data.policy_holder_id,
      errorMessage: false
    };
  } catch (error: unknown) {
    const e = error as {
      response?: { data?: { message?: string } };
      request?: unknown;
      config?: unknown;
    };
    handleFormErrors?.(error, {
      response: e.response,
      request: e.request,
      config: e.config
    });
    const errorMessage =
      e.response?.data?.message ||
      'There was an issue submitting your credentials.';
    return {
      taskId: null,
      taskToken: null,
      policyHolderId: null,
      errorMessage
    };
  }
};

interface GetPolicyHolderArgs {
  policyHolderId: number;
  employerId: number;
  email: string;
}

export const getPolicyHolder = async ({
  policyHolderId,
  employerId,
  email
}: GetPolicyHolderArgs): Promise<StreamPolicyHolder> => {
  const response = await sdkAxios.get(
    `policy_holder_sdk/policy_holder/${policyHolderId}`,
    { params: { employer_id: employerId, email } }
  );
  const ph = response.data.data as StreamPolicyHolder;
  // Attach the helper the legacy controller calls inline.
  // login_problem === null means "no problem at all" (clean account);
  // a non-null value names a specific issue and is only "valid" if it
  // falls into the explicitly-OK set (e.g. needs-mfa-on-next-login).
  // Without the null-is-valid branch, a freshly-validated PH whose
  // server-side check cleared without raising would be marked failure.
  ph.loginProblemIsValid = () =>
    ph.login_problem === null || VALID_LOGIN_PROBLEMS.has(ph.login_problem);
  return ph;
};

export const getFixCredentials = async ({
  email
}: {
  email: string;
}): Promise<{ user: StreamUser }> => {
  const response = await sdkAxios.get('fix-credentials', { params: { email } });
  return response.data.data;
};

interface GetPayerArgs {
  email: string;
  employerId: number;
  payerId: number;
  referer?: string;
}

export const getPayer = async ({
  email,
  employerId,
  payerId,
  referer
}: GetPayerArgs): Promise<StreamPayer> => {
  const response = await sdkAxios.get(`payer/${employerId}/${payerId}`, {
    params: { email, referer }
  });
  return response.data.data;
};

export const getTerms = async ({
  email
}: {
  email: string;
}): Promise<string> => {
  const response = await sdkAxios.get('terms_of_service', {
    params: { email }
  });
  return response.data.data.html_string;
};

export const beginInterop = async ({ email }: { email: string }) => {
  const response = await sdkAxios.post('interop', { user_email: email });
  return response.data.data;
};

export const getInteropState = async ({
  email
}: {
  email: string;
}): Promise<{ status: string; ph_id?: number; error?: string }> => {
  const response = await sdkAxios.get('interop', { params: { email } });
  return response.data.data;
};

interface ValidateCredentialsArgs {
  taskId: string;
  policyHolderId: number;
  email: string;
}

export const validateCredentials = async ({
  taskId,
  policyHolderId,
  email
}: ValidateCredentialsArgs): Promise<ValidateCredsResponse> => {
  const response = await sdkAxios.get(
    `validate-credentials/${policyHolderId}/${taskId}`,
    { params: { email } }
  );
  return response.data.data;
};

interface PutTaskArgs {
  taskId: string;
  policyHolderId: number;
  params: Record<string, unknown>;
}

export const putTask = async ({
  taskId,
  policyHolderId,
  params
}: PutTaskArgs) => {
  const response = await sdkAxios.put(
    `validate-credentials/${policyHolderId}/${taskId}`,
    params
  );
  return response.data.data;
};
