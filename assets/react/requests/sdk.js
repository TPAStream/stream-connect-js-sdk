import { sdkAxios } from '../services/axios';

export const getSDK = async ({
  signature,
  employer,
  user,
  isDemo,
  doneGetSDK
}) => {
  let sdkResponse = {};
  if (isDemo) {
    sdkResponse = await sdkAxios.get(
      'https://app.tpastream.com/sdk-api/tpastream_sdk'
    );
  } else {
    sdkResponse = await sdkAxios.post(
      'https://app.tpastream.com/sdk-api/tpastream_sdk',
      {
        tenant_id: signature,
        system_key: employer.systemKey,
        vendor: employer.vendor,
        employer_name: employer.name,
        user_first_name: user.firstName,
        user_last_name: user.lastName,
        user_email: user.email,
        phone_number: user.phoneNumber,
        member_system_key: user.memberSystemKey,
        date_of_birth: user.dateOfBirth
      }
    );
  }

  const data = {
    user: sdkResponse.data.data.user,
    payers: sdkResponse.data.data.payers,
    employer: sdkResponse.data.data.employer,
    tenant: sdkResponse.data.data.tenant
  };

  doneGetSDK(data);

  return data;
};

export const postCredentials = async ({
  params,
  policyHolderId,
  handleFormErrors
}) => {
  let response = null;
  try {
    response = policyHolderId
      ? await sdkAxios.put(
          `https://app.tpastream.com/sdk-api/policy_holder_sdk/policy_holder/${policyHolderId}`,
          params
        )
      : await sdkAxios.post(
          'https://app.tpastream.com/sdk-api/policy_holder_sdk/policy_holder',
          params
        );
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
    `https://app.tpastream.com/sdk-api/policy_holder_sdk/policy_holder/${policyHolderId}`,
    {
      params: {
        employer_id: employerId,
        email: email
      }
    }
  );
  return policyHolderResponse.data.data;
};
