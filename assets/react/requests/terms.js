import { sdkAxios } from '../services/axios';

export const getTerms = async ({ email }) => {
  const termsResponse = await sdkAxios.get(
    `https://jason.dev.sso.tpastream.com/sdk-api/terms_of_service`,
    {
      params: {
        email: email
      }
    }
  );
  return termsResponse.data.data.html_string;
};
