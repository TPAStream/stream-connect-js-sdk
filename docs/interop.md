# Interop
TPAStream now supports Interoperability Access APIs for SDK users. This new way of patient access apis allows a user to authenticate securely on a payers website and then from there have a 90 day access token save within our system which we can use to harvest the data. In order to support this functionality we have implemented a new field to integrate with the interoperability payers known as `interoperabilityRedirectUrl`

## Client Usage
When `interoperabilityRedirectUrl` is set and your given tenant / token is configured within TPAStream to be interoperability compliant you will gain access to certain payers within our system which will require redirects off of your main webpage in order to service.

Here's how the flow goes at a top level:

![Interop Payer Pattern](interop-screenshots/Interop%20SDK%20Flow.png)


As you can see there is a redirect within the center of the flow where the user will go through the Payer Website then through TPAStream.
Then from TPAStream we will redirect the user back to what ever URL you configured within the SDK instance.

An implementor should use the flexibility of this redirect URL to preserve the state of the enrollment process and the users authentication on their application.
