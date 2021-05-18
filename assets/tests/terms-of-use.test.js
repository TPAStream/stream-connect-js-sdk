import React from "react"
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

/* eslint-disable */
import regeneratorRuntime from "regenerator-runtime";
/* eslint-enable */

import TermsOfUse from "../sdk/components/terms-of-use"


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

it("TermsOfUse renders", async () => {
    const mockDoneTermsOfService = (data) => {
        expect(data).toBe(undefined)
    }

    await act(async () => {
        render(<TermsOfUse 
            returnButton={() => {}}
            termsHtmlString={'<div>Terms of Use</div>'}
            doneTermsOfService={mockDoneTermsOfService} />, container)
    });
    expect(container.querySelector("#terms-of-use > div > div").textContent).toBe("Terms of Use");
});