# FAQ
Here we attempt to address several of the common questions which might pop-up while an implementor is working with the StreamConnect SDK


## What is a user in the configuration block?
A `user` is a TPAStream concept which consolidates all of the information of a given set of participant credentials. Underneath a user:
there are members which have credentials, unique-keys defined by an implementor to identify the user in the system, a unique email which acts as the default identifier of the participant, and a name.

An example of a TPAStream user is an implementor's Admin Credentials for TPAStream. However, these users are configured as policy holders.

Notes for users in the configuration block: 
* A user cannot be an Admin within the TPAStream system.
* A user cannot be associated with 2 different SDK Tokens.
* A user must have a first and last name provided.
* A user must have a unique email.

For more information on configuration objects see our [Client Usage Docs](client-usage.md).

## How do I make test users for the SDK (A Useful Gmail Trick)?
When implementing the StreamConnect SDK it can be useful to use a test user object if you do not have access to provided user credentials.

We suggest that you use an email which does not currently have an account in TPAStream, however, if you have a gmail configured to the TPAStream Admin portal you can follow this pattern to create a new unique user in TPAStream that still will receive the same emails.

```
youremail@gmail.com -> youremail+testingsdk@gmail.com
```

## I'd like to use React Native

Embed the SDK in a WebView via [`react-native-webview`](https://github.com/react-native-webview/react-native-webview) and ferry callbacks to the native shell via `postMessage`. The [Quickstart](./quickstart.md#react-native) has a full walkthrough, and the [SDK Hook docs](../sdk-hook/docs/README.md#recommended-webview-pattern-for-react-native) cover Patient Access API redirects and the SDK's complete callback surface.

The older `stream-connect-sdk-hook` npm package (v0.6.2) is deprecated. Existing integrations keep working but won't receive feature updates: no SSE-driven validation, no inline 2FA, no fix-credentials status badges, no PAA support. New integrations should use the WebView pattern.

## I'd like to create a more customized flow for how a user enters credentials and validation.
The default recommendation for customizing the SDK flow is to use the various sdk [Callbacks](client-usage.md#lifecycle-callbacks-in-detail).

The SDK renders various steps with default templates which should be editted post render using JS and CSS. However, if you would like
to create more customized widgets it is possible to turn off the default rendering using the various `renderXStep` values within the
configuration.

If you are to turn of the default template rendering, the callbacks associated with each of those steps will provide functions and
objects in their parameters which will allow an implementor to mirror all of the functionality previously defined in the default
template.

Each of the provided information is present in the [Callbacks](client-usage.md#lifecycle-callbacks-in-detail) docs.

## How do I use the data from the SDK?
The StreamConnect SDK is designed to take in carrier credentials, save them to the TPAStream sytem, and then validate the credentials.
If you are implementing the whole Stream Connect flow, including interfacing with the TPAStream API and using TPAStream webhooks, you will find the [doneEasyEnroll](client-usage.md#doneeasyenroll) callback to hold the main pieces of information you need.

There we define specifically a `policyHolder` which can be thought of as the carrier credentials that were just submitted.
This `policyHolder` will have:
* An `policy_holder_id` which is its unique identifier in TPAStream
* A `login_problem` which will define the state of the credentials. See [doneEasyEnroll](client-usage.md#doneeasyenroll)
* And a `payer_id` all of which can be useful when implementing the TPAStream Webhooks.

For implementing the TPAStream webhooks to get information on when a new claim is added to TPAStream or when the first crawl of the credentials is completed see our [Webhook Docs](https://developers.tpastream.com/en/latest/connect.html#webhooks)

## What is the tenant configuration block?
Within the TPAStream configuration examples as well as the [Client Usage Docs](client-usage.md) you might sometimes see
a `tenant` block defined within it. This specific configuraiton option is determined when your `sdkToken` is created.

This can almost always be left blank, unless you are an entity which is managing multiple different tenants within TPAStream.
If the latter is the case you will have been informed when your token was created.

## What is "vendor" within the various configuration blocks?
When configuring the SDK a user will see "`vendor`" within the configuration block of the `employer` object. This `vendor` value
will almost always be set to the value `"internal"`.

A Vendor in TPA Stream indicates which System of Record an identifier belongs to. If the identifier is the unique database ID from your
own in-house system, simply refer to it as "internal"

## I have a unique key for my participants, how can I associate those in TPAStream?
Using the `user` configuration object you can define `memberSystemKey`. This system key will be defined under the same vendor as the
employer block, since a member can only exist under 1 employer.

See our [Client Usage Docs](client-usage.md) for more information on the `user` object block.

## Restricting which sites may embed your key
By default an `sdkToken` works from any HTTPS page, because the token is public and ships in your page source.
You can optionally limit a key to your own sites. Only TPAStream staff can change these settings, so to turn this on, ask TPAStream support to enable it for your key and tell them the list of origins and the mode you want. Each key has two settings:

* **Embed origins**: a list of origins such as `https://benefits.example.com` or `https://*.example.com`.
* **Mode**: one of the three below.

| Mode | What happens to a request from a browser origin that is not on the list |
|---|---|
| `off` (default) | Nothing. The list is ignored and behavior is unchanged. |
| `report` | The request succeeds, and TPAStream logs it so you can see what would be blocked. |
| `enforce` | The request fails with HTTP 403 and `{"error_code": "origin_not_allowed", "docs_url": "..."}`. See [Error Documentation](./error.md#origin_not_allowed). |

The check uses the browser's `Origin` header on every SDK request that carries the key. Requests with no `Origin` header (server-to-server calls) are never affected, and neither are CORS preflight (`OPTIONS`) requests.

**Suggested rollout:**
1. Leave the key on `off` while you collect every site that embeds the SDK, including staging and QA.
2. Ask TPAStream support to enter those origins and switch the key to `report`. Run for about a week and ask TPAStream support for the logged origins that were not on the list.
3. Ask support to add anything you missed, then switch to `enforce`.

Notes:
* A wildcard such as `https://*.example.com` matches subdomains (`https://benefits.example.com`). It never matches the bare `https://example.com`, so list the bare origin separately if you need it.
* Local development origins must be listed too, for example `http://localhost:3000`. Include the port.
* This restricts which websites can use a key from a browser. It does not protect a key used from a server, because server callers send no `Origin` header. For that, use server-side [connect access tokens](./connect-access-token.md).
