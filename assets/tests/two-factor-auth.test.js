import React from "react"
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

/* eslint-disable */
import regeneratorRuntime from "regenerator-runtime";
/* eslint-enable */

import TwoFactorAuth from "../sdk/components/two-factor-auth"


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

it("TwoFactorAuth renders WAITING_FOR_METHOD_CHOICE", async () => {
    const mockDoneRealtime = (data) => {
        expect(data).toBe(undefined)
    }

    await act(async () => {
        render(<TwoFactorAuth 
            doneRealtime={mockDoneRealtime}
            twoFactorAuthData={{ info: { method_list: [] } }}
            twoFactorAuthState={'WAITING_FOR_METHOD_CHOICE'} />, container)
    });
    expect(container.querySelector("#real-time-page > h3").textContent).toBe("Choose Two Factor Authentication Method");
});

it("TwoFactorAuth renders WAITING_FOR_TWO_FACTOR_CODE", async () => {
    const mockDoneRealtime = (data) => {
        expect(data).toBe(undefined)
    }

    await act(async () => {
        render(<TwoFactorAuth 
            doneRealtime={mockDoneRealtime}
            twoFactorAuthData={{ info: { method_list: [] } }}
            twoFactorAuthState={'WAITING_FOR_TWO_FACTOR_CODE'} />, container)
    });
    expect(container.querySelector("#real-time-page > h3").textContent).toBe("Enter Two Factor Code");
});