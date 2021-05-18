import { sdkAxiosMaker, sdkAxios } from '../shared/services/axios';

it("Test sdkAxiosMaker no tenant", () => {
    expect(sdkAxios.defaults.headers['X-Is-Demo']).toBe('1')
    expect(sdkAxios.defaults.headers['X-SDK-Version']).toBe('N/A')
    expect(sdkAxios.defaults.headers['X-TPAStream-Token']).toBe(undefined)
    expect(sdkAxios.defaults.headers['X-Tenant-Label']).toBe(undefined)
    expect(sdkAxios.defaults.headers['X-Tenant-Key']).toBe(undefined)

    sdkAxiosMaker({
        apiToken: 'test-token',
        version: 'testVersion',
        isDemo: false,
        tenant: undefined
    });

    expect(sdkAxios.defaults.headers['X-Is-Demo']).toBe('0')
    expect(sdkAxios.defaults.headers['X-SDK-Version']).toBe('testVersion')
    expect(sdkAxios.defaults.headers['X-TPAStream-Token']).toBe('test-token')
    expect(sdkAxios.defaults.headers['X-Tenant-Label']).toBe(undefined)
    expect(sdkAxios.defaults.headers['X-Tenant-Key']).toBe(undefined)
});