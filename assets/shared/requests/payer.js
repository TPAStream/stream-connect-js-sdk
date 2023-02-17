import { sdkAxios } from '../services/axios';

export const getPayer = async ({
  email,
  employerId,
  payerId,
  interoperabilityRedirectUrl
}) => {
  const payerResponse = await sdkAxios.get(
    `https://app.tpastream.com/sdk-api/payer/${employerId}/${payerId}`,
    {
      params: {
        email: email,
        referer: interoperabilityRedirectUrl
      }
    }
  );
  return payerResponse.data.data;
};
