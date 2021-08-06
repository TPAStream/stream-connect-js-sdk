import { sdkAxios } from '../services/axios';

export const validateCredentials = async ({
  taskId,
  policyHolderId,
  email
}) => {
  const validateCredsResponse = await sdkAxios.get(
    `https://jason.dev.sso.tpastream.com/sdk-api/validate-credentials/${policyHolderId}/${taskId}`,
    {
      params: {
        email: email
      }
    }
  );
  return validateCredsResponse.data.data;
};

export const putTask = async ({ taskId, policyHolderId, params }) => {
  const validateCredsResponse = await sdkAxios.put(
    `https://jason.dev.sso.tpastream.com/sdk-api/validate-credentials/${policyHolderId}/${taskId}`,
    params
  );
  return validateCredsResponse.data.data;
};
