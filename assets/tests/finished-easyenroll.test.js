import React from "react"
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

/* eslint-disable */
import regeneratorRuntime from "regenerator-runtime";
/* eslint-enable */

import FinishedEasyEnroll from "../sdk/components/finished-easyenroll"


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

it("FinishedEasyEnroll renders invalid creds", async () => {
    const mockDoneEasyEnroll = (data) => {
        expect(typeof data).toBe("object")
    }

    await act(async () => {
        render(<FinishedEasyEnroll 
            doneEasyEnroll={mockDoneEasyEnroll}
            tenant={{ name: 'test' }} 
            employer={{ support_email_derived: 'test@email.com' }}
            payer={{ register_url: 'https://wow.test.com' }}/>, container)
    });
    expect(container.querySelector("#finished-with-easy-enroll > h2").textContent).toBe("Invalid Credentials");
});

it("FinishedEasyEnroll renders valid creds", async () => {
    const mockDoneEasyEnroll = (data) => {
        expect(typeof data).toBe("object")
    }

    await act(async () => {
        render(<FinishedEasyEnroll 
            doneEasyEnroll={mockDoneEasyEnroll}
            tenant={{ name: 'test' }} 
            employer={{ support_email_derived: 'test@email.com' }}
            payer={{ register_url: 'https://wow.test.com' }}
            credentialsValid={true} />, container)
    });
    expect(container.querySelector("#finished-with-easy-enroll > h2").textContent).toBe("Success!");
});

it("FinishedEasyEnroll renders pending creds", async () => {
    const mockDoneEasyEnroll = (data) => {
        expect(typeof data).toBe("object")
    }

    await act(async () => {
        render(<FinishedEasyEnroll 
            doneEasyEnroll={mockDoneEasyEnroll}
            tenant={{ name: 'test' }} 
            employer={{ support_email_derived: 'test@email.com' }}
            payer={{ register_url: 'https://wow.test.com' }}
            pending={true} />, container)
    });
    expect(container.querySelector("#finished-with-easy-enroll > h2").textContent).toBe("Pending...");
});