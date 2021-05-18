import React from "react"
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

/* eslint-disable */
import regeneratorRuntime from "regenerator-runtime";
/* eslint-enable */

import RealTimeVerification from "../sdk/components/realtime-validation"


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

it("Realtime Validation renders", async () => {
    const mockDoneRealTime = (data) => {
        expect(data).toBe(undefined)
    }

    await act(async () => {
        render(<RealTimeVerification 
            taskId={'fake-task-id'}
            doneRealtime={mockDoneRealTime} />, container)
    });
    expect(container.querySelector("#real-time-page > h3").textContent).toBe("Now Doing Real Time Validation...");
});