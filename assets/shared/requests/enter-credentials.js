import { sdkAxios } from '../services/axios';

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
  const policyHolderResponse = await sdkAxios.get(
    `policy_holder_sdk/policy_holder/${policyHolderId}`,
    {
      params: {
        employer_id: employerId,
        email: email
      }
    }
  );
  return policyHolderResponse.data.data;
};
