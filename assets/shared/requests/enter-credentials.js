import { sdkAxios } from '../services/axios';

const VALID_LOGIN_PROBLEMS = new Set([
  'valid',
  'incomplete',
  'inactive',
  'mfa_carrier',
  'migrating',
  'needs_two_factor'
]);

export const postCredentials = async ({
  params,
  policyHolderId,
  handleFormErrors
}) => {
  let response = null;
  try {
    response = policyHolderId
      ? await sdkAxios.put(
          `policy_holder_sdk/policy_holder/${policyHolderId}`,
          params
        )
      : await sdkAxios.post('policy_holder_sdk/policy_holder', params);
  } catch (error) {
    handleFormErrors(error, {
      response: error.response,
      request: error.request,
      config: error.config
    });
    const errorMessage =
      error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'There was an issue submitting your credentials.';
    return { taskId: null, policyHolderId: null, errorMessage: errorMessage };
  }
  return {
    taskId: response.data.data.task_id,
    policyHolderId: response.data.data.policy_holder_id,
    errorMessage: false
  };
};

export const getPolicyHolder = async ({
  policyHolderId,
  employerId,
  email
}) => {
  const response = await sdkAxios.get(
    `policy_holder_sdk/policy_holder/${policyHolderId}`,
    {
      params: {
        employer_id: employerId,
        email: email
      }
    }
  );

  const ph = response.data.data;
  ph.loginProblemIsValid = () =>
    ph.login_problem && VALID_LOGIN_PROBLEMS.has(ph.login_problem);
  return ph;
};
