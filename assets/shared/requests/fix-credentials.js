import { sdkAxios } from '../services/axios';

export const getFixCredentials = async ({ email }) => {
  const fixCredentialsResponse = await sdkAxios.get(
    `https://jason.dev.sso.tpastream.com/sdk-api/fix-credentials`,
    {
      params: {
        email: email
      }
    }
  );
  console.log(fixCredentialsResponse);
  return fixCredentialsResponse.data.data;
};
