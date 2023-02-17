import React from 'react';

export const InteroperabilityPayerForm = ({ streamPayer }) => (
  <form id="easy-enroll-form">
    <h2 id="interoperability-api-notification">Connect to PAYERWEBSITE</h2>
    <p class="lead">
      The security of your information is very important to us. You're being
      redirected to securely login on PAYERSNAME's website and connect to TPA
      Stream. This verifies that it's OK to share your information with us to
      process your claims.
    </p>
    <div class="row" style="margin-top: 30px; border-top: 1px solid #ccc;">
      <div class="col-sm-12">
        <div class="form-group text-left">
          <div class="checkbox">
            <input type="checkbox" />
            <label for="accept">
              I have read and I agree to the{' '}
              <button type="button" class="btn btn-link" style="padding: 0;">
                Terms Of Use
              </button>
            </label>
          </div>
          <div class="checkbox">
            <input
              style="margin-left:0"
              id="accept_<%- tenant.tenant_id %>"
              name="tenants_accept"
              value="<%- tenant.tenant_id %>"
              type="checkbox"
            />
            <label for="accept_<%- tenant.tenant_id %>">
              I have read and agree to the above Terms of Use for{' '}
              <strong>TERMS MESSAGE</strong> and I acknowledge that my claims
              will be automatically sent to
              <strong>TERMS MESSAGE</strong>
            </label>
          </div>
        </div>
      </div>
      <div class="form-group" style="padding: 10px;">
        <button
          type="submit"
          class="btn btn-lg btn-block btn-primary js-beginOauth"
        >
          Connect to PAYERWEBSITE
        </button>
      </div>
    </div>
  </form>
);
