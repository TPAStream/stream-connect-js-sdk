import React from "react"
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

/* eslint-disable */
import regeneratorRuntime from "regenerator-runtime";
/* eslint-enable */

import SDK from "../sdk/components/sdk"

const sdkrequest = require('../shared/requests/sdk');

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("Renders error form when error is present", async () => {
    const fakeSDKResponse = {
        user: {},
        payers: [],
        tenant: {},
        employer: {},
        error: "this is a config error"
    }
    jest.spyOn(sdkrequest, "getSDK").mockImplementation(() =>
        Promise.resolve(fakeSDKResponse)
    );

    await act(async () => {
        render(<SDK handleInitErrors={() => {}} />, container)
    });
    expect(container.textContent).toBe("This widget has encountered a configuration error. Please contact the site host.");


    sdkrequest.getSDK.mockRestore();
});

it("Renders choose payer widget when renderChoosePayer is true and init occurs", async () => {
    const fakeSDKResponse = {
        user: {
            policy_holders: []
        },
        payers: [],
        tenant: {},
        employer: {},
        error: undefined
    }
    jest.spyOn(sdkrequest, "getSDK").mockImplementation(() =>
        Promise.resolve(fakeSDKResponse)
    );

    const mockDoneStep3 = (data) => {
        
        expect(typeof data).toBe("undefined")
    }

    await act(async () => {
        render(<SDK 
            handleInitErrors={() => {}} 
            doneStep3={mockDoneStep3}
            renderChoosePayer={true} />, container)
    });
    expect(container.querySelector("#choose-payer > h3").textContent).toBe("Choose an Account to add Below");


    sdkrequest.getSDK.mockRestore();
});

it("Doesn't render ChoosePayer when renderChoosePayer is false. Instead calls step3 with values", async () => {
    const fakeSDKResponse = {
        user: {
            policy_holders: []
        },
        payers: [],
        tenant: {},
        employer: {
            // for dropdown in mockDoneStep3
            show_all_payers_in_easy_enroll: true 
        },
        error: undefined
    }
    jest.spyOn(sdkrequest, "getSDK").mockImplementation(() =>
        Promise.resolve(fakeSDKResponse)
    );

    const mockDoneStep3 = ({ choosePayer, usedPayers, dropDown, streamPayers, streamEmployer }) => {
        
        expect(typeof choosePayer).toBe("function")
        expect(typeof usedPayers).toBe("object")
        expect(typeof dropDown).toBe("boolean")
        expect(typeof streamPayers).toBe("object")
        expect(typeof streamEmployer).toBe("object")
    }

    await act(async () => {
        render(<SDK 
            handleInitErrors={() => {}} 
            doneStep3={mockDoneStep3}
            renderChoosePayer={false} />, container)
    });
    // Confirm there is no choose-payer container
    expect(container.querySelector("#choose-payer")).toBe(null);

    sdkrequest.getSDK.mockRestore();
});