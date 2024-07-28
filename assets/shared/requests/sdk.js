import { sdkAxios } from '../services/axios';

export const getSDK = async ({ employer, user, isDemo, doneGetSDK }) => {
  let sdkResponse = {};
  try {
    if (isDemo) {
      sdkResponse = await sdkAxios.get('tpastream_sdk');
    } else {
      sdkResponse = await sdkAxios.post('tpastream_sdk', {
        system_key: employer.systemKey,
        vendor: employer.vendor,
        employer_name: employer.name,
        user_first_name: user.firstName,
        user_last_name: user.lastName,
        user_email: user.email,
        phone_number: user.phoneNumber,
        member_system_key: user.memberSystemKey,
        date_of_birth: user.dateOfBirth
      });
    }
    const data = {
      user: sdkResponse.data.data.user,
      payers: sdkResponse.data.data.payers,
      employer: sdkResponse.data.data.employer,
      tenant: sdkResponse.data.data.tenant
    };
    doneGetSDK(data);
    return data;
  } catch (e) {
    console.error(e);
    doneGetSDK(e);
    return {
      error: e
    };
  }
};
